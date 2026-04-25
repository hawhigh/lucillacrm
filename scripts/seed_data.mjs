
import { initializeApp, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const serviceAccount = require('../service-account.json');

const app = initializeApp({
    credential: cert(serviceAccount)
});

const auth = getAuth(app);
const db = getFirestore(app);

const seedData = async (targetEmail) => {
    try {
        console.log(`Seeding data for: ${targetEmail}...`);
        const user = await auth.getUserByEmail(targetEmail);
        const userId = user.uid;

        // Sample Customer
        const customerId = 'sample-customer-1';
        const customerData = {
            id: customerId,
            name: "TechSolutions s.r.o.",
            addressLine1: "Inovačná 1",
            city: "Košice",
            zip: "040 01",
            country: "Slovensko",
            ico: "12345678",
            dic: "2021123456",
            icDph: "SK2021123456",
            email: "contact@techsolutions.sk"
        };

        await db.collection('users').doc(userId).collection('customers').doc(customerId).set(customerData);
        console.log(`✅ Created customer: ${customerData.name}`);

        // Sample Invoices
        const invoices = [
            {
                id: 'inv-001',
                number: 'INV-2025-001',
                customer: customerData,
                supplier: { name: "Lucilla CRM" }, // Simplified
                issueDate: '2025-01-15',
                dueDate: '2025-01-29',
                deliveryDate: '2025-01-15',
                items: [
                    { description: 'Consulting Services', quantity: 10, unitPrice: 80, vatRate: 20 },
                    { description: 'Software License', quantity: 1, unitPrice: 200, vatRate: 20 }
                ],
                status: 'Paid',
                constantSymbol: '0308',
                variableSymbol: '2025001'
            },
            {
                id: 'inv-002',
                number: 'INV-2025-002',
                customer: customerData,
                supplier: { name: "Lucilla CRM" },
                issueDate: '2025-02-01',
                dueDate: '2025-02-15',
                deliveryDate: '2025-02-01',
                items: [
                    { description: 'Monthly Maintenance', quantity: 1, unitPrice: 150, vatRate: 20 }
                ],
                status: 'Sent',
                constantSymbol: '0308',
                variableSymbol: '2025002'
            }
        ];

        for (const inv of invoices) {
            await db.collection('users').doc(userId).collection('invoices').doc(inv.id).set(inv);
            console.log(`✅ Created invoice: ${inv.number}`);
        }

    } catch (error) {
        console.error("Error seeding data:", error);
    }
};

// Seed for 'user@garsia.sk' so the Admin can see it via Global View
seedData('user@garsia.sk').then(() => console.log('Seeding complete.'));
