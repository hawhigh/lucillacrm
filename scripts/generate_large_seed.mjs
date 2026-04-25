
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';

const serviceAccount = JSON.parse(
    readFileSync('./service-account.json', 'utf8')
);

initializeApp({
    credential: cert(serviceAccount)
});

const db = getFirestore();

// Helper to create random date within last 6 months
const randomDate = () => {
    const date = new Date();
    date.setDate(date.getDate() - Math.floor(Math.random() * 180));
    return date.toISOString().split('T')[0];
};

const SAMPLE_CUSTOMERS = [
    { name: 'TechCorp s.r.o.', city: 'Bratislava', ico: '12345678' },
    { name: 'DesignStudio x', city: 'Košice', ico: '87654321' },
    { name: 'Coffee Roasters', city: 'Nitra', ico: '11223344' },
    { name: 'DevHouse Ltd', city: 'Žilina', ico: '55667788' },
    { name: 'Marketing Pro', city: 'Trnava', ico: '99887766' },
    { name: 'AutoServis Fast', city: 'Prešov', ico: '22334455' },
    { name: 'Legal Advisors', city: 'Banská Bystrica', ico: '66554433' },
    { name: 'Green Foods', city: 'Trenčín', ico: '33445566' },
    { name: 'Logistics Plus', city: 'Senec', ico: '77889900' },
    { name: 'Web Wizards', city: 'Poprad', ico: '44556677' }
];

const TARGET_USER_EMAIL = 'admin@garsia.sk'; // Or admin@garsia.sk

async function seed() {
    console.log('Finding user...');
    const userSnap = await db.collection('users').where('email', '==', TARGET_USER_EMAIL).get();

    if (userSnap.empty) {
        console.error('User not found!');
        return;
    }

    const userId = userSnap.docs[0].id;
    console.log(`Seeding data for user: ${TARGET_USER_EMAIL} (${userId})`);

    // Create Customers
    const customerIds = [];
    for (const c of SAMPLE_CUSTOMERS) {
        const docRef = db.collection('users').doc(userId).collection('customers').doc();
        await docRef.set({
            id: docRef.id,
            name: c.name,
            addressLine1: 'Sample Street 123',
            city: c.city,
            zip: '000 00',
            country: 'Slovakia',
            ico: c.ico,
            dic: '2022' + c.ico,
            icDph: 'SK2022' + c.ico,
            email: `contact@${c.name.replace(/\s+/g, '').toLowerCase()}.sk`
        });
        customerIds.push({ id: docRef.id, name: c.name });
    }
    console.log('Created 10 Customers');

    // Create 10 Invoices
    for (let i = 1; i <= 10; i++) {
        const cust = customerIds[Math.floor(Math.random() * customerIds.length)];
        const id = Math.random().toString(36).substr(2, 9);
        const date = randomDate();

        await db.collection('users').doc(userId).collection('invoices').doc(id).set({
            id: id,
            number: `INV-2025-${String(i).padStart(3, '0')}`,
            customer: { name: cust.name, id: cust.id, addressLine1: 'Test St', city: 'Test City', zip: '12345', country: 'SK', email: 'test@test.com' },
            issueDate: date,
            dueDate: date, // Simplified
            deliveryDate: date,
            items: [
                { description: 'Service Fee', quantity: 1, unit: 'ks', unitPrice: Math.floor(Math.random() * 500) + 100, vatRate: 20 },
                { description: 'Consulting', quantity: Math.floor(Math.random() * 10) + 1, unit: 'h', unitPrice: 50, vatRate: 20 }
            ],
            status: Math.random() > 0.5 ? 'Paid' : 'Sent',
            supplier: { name: 'My Company', addressLine1: 'My St', city: 'My City', zip: '11111', country: 'SK' }
        });
    }
    console.log('Created 10 Invoices');
}

seed().catch(console.error);
