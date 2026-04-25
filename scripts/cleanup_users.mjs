
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

const KEEP_EMAILS = ['admin@garsia.sk', 'user@garsia.sk'];

const run = async () => {
    console.log('Starting user cleanup...');
    let nextPageToken;
    let deletedCount = 0;

    // List all users
    do {
        const listUsersResult = await auth.listUsers(1000, nextPageToken);
        for (const user of listUsersResult.users) {
            if (KEEP_EMAILS.includes(user.email)) {
                console.log(`Skipping protected user: ${user.email} (${user.uid})`);
                continue;
            }

            console.log(`Deleting user: ${user.email} (${user.uid})...`);
            try {
                // Delete from Auth
                await auth.deleteUser(user.uid);

                // Delete from Firestore
                await db.collection('users').doc(user.uid).delete();

                console.log(`✅ Deleted ${user.email}`);
                deletedCount++;
            } catch (error) {
                console.error(`❌ Failed to delete ${user.email}:`, error);
            }
        }
        nextPageToken = listUsersResult.pageToken;
    } while (nextPageToken);

    console.log(`Cleanup complete. Deleted ${deletedCount} users.`);
};

run();
