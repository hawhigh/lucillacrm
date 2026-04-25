"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkRecurringInvoices = exports.sendInvoiceEmail = exports.lookupCompany = void 0;
const functions = __importStar(require("firebase-functions/v1"));
const admin = __importStar(require("firebase-admin"));
const axios_1 = __importDefault(require("axios"));
const nodemailer = __importStar(require("nodemailer"));
admin.initializeApp();
exports.lookupCompany = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError("unauthenticated", "User must be logged in.");
    }
    const { query } = data;
    if (!query) {
        throw new functions.https.HttpsError("invalid-argument", "Query is required.");
    }
    try {
        console.log(`Looking up company: ${query}`);
        const searchUrl = `https://www.finstat.sk/vyhladavanie?query=${encodeURIComponent(query)}`;
        const response = await axios_1.default.get(searchUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        });
        return { html: response.data.substring(0, 50000) };
    }
    catch (error) {
        console.error("Lookup failed:", error);
        throw new functions.https.HttpsError("internal", "Failed to lookup company.");
    }
});
exports.sendInvoiceEmail = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError("unauthenticated", "User must be logged in.");
    }
    const { to, subject, body, pdfBase64, filename } = data;
    if (!to || !pdfBase64) {
        throw new functions.https.HttpsError("invalid-argument", "Missing recipient or attachment.");
    }
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
                encoding: 'base64'
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
    }
    catch (error) {
        console.error("Email send failed:", error);
        throw new functions.https.HttpsError("internal", "Failed to send email.");
    }
});
exports.checkRecurringInvoices = functions.pubsub.schedule('every 24 hours').onRun(async (context) => {
    const db = admin.firestore();
    const now = new Date();
    const snapshots = await db.collectionGroup('recurring_templates')
        .where('nextDate', '<=', now)
        .where('active', '==', true)
        .get();
    for (const doc of snapshots.docs) {
        const template = doc.data();
        const userId = doc.ref.parent.parent?.id;
        if (!userId)
            continue;
        const newInvoice = {
            ...template.invoiceData,
            id: `INV-${Date.now()}`,
            issueDate: now.toISOString().split('T')[0],
            status: 'unpaid',
            createdAt: admin.firestore.FieldValue.serverTimestamp()
        };
        await db.collection('users').doc(userId).collection('invoices').doc(newInvoice.id).set(newInvoice);
        const nextDate = new Date(now);
        if (template.frequency === 'monthly') {
            nextDate.setMonth(nextDate.getMonth() + 1);
        }
        else if (template.frequency === 'weekly') {
            nextDate.setDate(nextDate.getDate() + 7);
        }
        await doc.ref.update({
            nextDate: nextDate,
            lastGenerated: admin.firestore.FieldValue.serverTimestamp()
        });
    }
    return null;
});
//# sourceMappingURL=index.js.map