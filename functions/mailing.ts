/**
 * Cloud Function Logic for Sending Invoices via Email
 * 
 * Dependencies:
 * - firebase-functions
 * - firebase-admin
 * - nodemailer (or @sendgrid/mail, postmark)
 */

/*
import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import * as nodemailer from 'nodemailer';

admin.initializeApp();

// Configure Transporter (e.g. Gmail, SendGrid)
// In production, use environment variables: functions.config().gmail.email
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'admin@garsia.sk',
        pass: 'secure-app-password' 
    }
});

export const sendInvoiceEmail = functions.https.onCall(async (data, context) => {
    // 1. Auth Check
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'User must be logged in.');
    }

    const { to, subject, body, pdfBase64, filename } = data;

    // 2. Validation
    if (!to || !pdfBase64) {
        throw new functions.https.HttpsError('invalid-argument', 'Missing recipient or attachment.');
    }

    const mailOptions = {
        from: '"Lucilla Invoice" <admin@lucillacrm.com>',
        to: to,
        subject: subject || 'New Invoice',
        text: body || 'Please find the attached invoice.',
        attachments: [
            {
                filename: filename || 'invoice.pdf',
                content: pdfBase64,
                encoding: 'base64'
            }
        ]
    };

    try {
        // 3. Send Email
        await transporter.sendMail(mailOptions);
        
        // 4. Log Success in Firestore (optional audit trail)
        await admin.firestore().collection('mail_logs').add({
            userId: context.auth.uid,
            to: to,
            sentAt: admin.firestore.FieldValue.serverTimestamp(),
            status: 'success'
        });

        return { success: true };
    } catch (error) {
        console.error('Email send failed:', error);
        throw new functions.https.HttpsError('internal', 'Failed to send email.');
    }
});
*/
