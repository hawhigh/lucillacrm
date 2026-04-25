import * as functions from "firebase-functions/v1";
import * as admin from "firebase-admin";
import axios from "axios";
import * as nodemailer from "nodemailer";

admin.initializeApp();

/**
 * lookupCompany: Server-side ICO/Company lookup using Finstat or similar.
 * Replacing client-side scraping to avoid CORS issues and expose sensitive logic.
 */
export const lookupCompany = functions.https.onCall(async (data: any, context: functions.https.CallableContext) => {
    if (!context.auth) {
        throw new functions.https.HttpsError("unauthenticated", "User must be logged in.");
    }

    const { query } = data;
    if (!query) {
        throw new functions.https.HttpsError("invalid-argument", "Query is required.");
    }

    try {
        // We'll use a simplified version of the scraping logic here, 
        // or a direct API if possible. For now, we simulate the success.
        console.log(`Looking up company: ${query}`);

        // In a real scenario, we'd fetch from Finstat here.
        // For development, we'll return a mock or a simplified fetch.
        const searchUrl = `https://www.finstat.sk/vyhladavanie?query=${encodeURIComponent(query)}`;
        const response = await axios.get(searchUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        });

        // Simplified: return the HTML for now, or we could parse it here using a library like cheerio
        // But since we have Gemini, we could even send this HTML to Gemini from the backend!
        return { html: response.data.substring(0, 50000) };

    } catch (error) {
        console.error("Lookup failed:", error);
        throw new functions.https.HttpsError("internal", "Failed to lookup company.");
    }
});

/**
 * sendInvoiceEmail: Securely send invoices via email.
 */
export const sendInvoiceEmail = functions.https.onCall(async (data: any, context: functions.https.CallableContext) => {
    if (!context.auth) {
        throw new functions.https.HttpsError("unauthenticated", "User must be logged in.");
    }

    const { to, subject, body, pdfBase64, filename } = data;

    if (!to || !pdfBase64) {
        throw new functions.https.HttpsError("invalid-argument", "Missing recipient or attachment.");
    }

    // Configure your SMTP settings here or use environment variables
    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.EMAIL_USER || 'admin@lucillacrm.com',
            pass: process.env.EMAIL_PASS || 'secure-app-password'
        }
    });

    const mailOptions = {
        from: '"Lucilla Invoice" <admin@lucillacrm.com>',
        to,
        subject: subject || 'New Invoice',
        text: body || 'Please find the attached invoice.',
        attachments: [
            {
                filename: filename || 'invoice.pdf',
                content: pdfBase64,
                encoding: 'base64' as const
            }
        ]
    };

    try {
        await transporter.sendMail(mailOptions);

        await admin.firestore().collection('mail_logs').add({
            userId: context.auth.uid,
            to,
            sentAt: admin.firestore.FieldValue.serverTimestamp(),
            status: 'success'
        });

        return { success: true };
    } catch (error) {
        console.error("Email send failed:", error);
        throw new functions.https.HttpsError("internal", "Failed to send email.");
    }
});

/**
 * checkRecurringInvoices: Scheduled function to generate invoices monthly.
 * (Requires Blaze plan for scheduled functions)
 */
export const checkRecurringInvoices = functions.pubsub.schedule('every 24 hours').onRun(async (context: functions.EventContext): Promise<null> => {
    const db = admin.firestore();
    const now = new Date();

    // 1. Find all recurring templates that are due
    const snapshots = await db.collectionGroup('recurring_templates')
        .where('nextDate', '<=', now)
        .where('active', '==', true)
        .get();

    for (const doc of snapshots.docs) {
        const template = doc.data();
        const userId = doc.ref.parent.parent?.id;

        if (!userId) continue;

        // 2. Generate new invoice
        const newInvoice = {
            ...template.invoiceData,
            id: `INV-${Date.now()}`,
            issueDate: now.toISOString().split('T')[0],
            status: 'unpaid',
            createdAt: admin.firestore.FieldValue.serverTimestamp()
        };

        await db.collection('users').doc(userId).collection('invoices').doc(newInvoice.id).set(newInvoice);

        // 3. Update next date
        const nextDate = new Date(now);
        if (template.frequency === 'monthly') {
            nextDate.setMonth(nextDate.getMonth() + 1);
        } else if (template.frequency === 'weekly') {
            nextDate.setDate(nextDate.getDate() + 7);
        }

        await doc.ref.update({
            nextDate: nextDate,
            lastGenerated: admin.firestore.FieldValue.serverTimestamp()
        });
    }

    return null;
});
