// readFirestore.cjs
const admin = require('firebase-admin');
const fs = require('fs');

// Load service account key (ensure the path is correct)
const serviceAccount = require('./service-account.json');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function listSubcollection(userId, subcol) {
    const snapshot = await db.collection('users').doc(userId).collection(subcol).get();
    const docs = [];
    snapshot.forEach(doc => {
        docs.push({ id: doc.id, data: doc.data() });
    });
    return docs;
}

async function main() {
    const usersSnap = await db.collection('users').get();
    const result = [];
    for (const userDoc of usersSnap.docs) {
        const userId = userDoc.id;
        const userData = userDoc.data();
        const userInfo = { userId, userData };
        const subcols = ['invoices', 'customers', 'expenses', 'quotes', 'products'];
        for (const sub of subcols) {
            try {
                const items = await listSubcollection(userId, sub);
                userInfo[sub] = items;
            } catch (e) {
                userInfo[sub] = { error: e.message };
            }
        }
        result.push(userInfo);
    }
    console.log(JSON.stringify(result, null, 2));
    // Write to a file for convenience
    fs.writeFileSync('firestore-data.json', JSON.stringify(result, null, 2));
}

main().catch(err => {
    console.error('Error reading Firestore:', err);
});
