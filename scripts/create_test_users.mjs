
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

const createSampleUser = async (email, password, role) => {
    try {
        console.log(`Creating user: ${email}...`);
        // Create or update user
        let user;
        try {
            user = await auth.getUserByEmail(email);
            console.log(`ℹ️ User exists, updating password...`);
            await auth.updateUser(user.uid, { password });
        } catch (e) {
            if (e.code === 'auth/user-not-found') {
                user = await auth.createUser({ email, password });
                console.log(`✅ User created via Admin SDK: ${email}`);
            } else {
                throw e;
            }
        }

        // Set Firestore profile
        await db.collection('users').doc(user.uid).set({
            email: user.email,
            createdAt: new Date().toISOString(),
            role: role
        }, { merge: true });

        console.log(`✅ Profile set for ${email} as ${role}`);

    } catch (error) {
        console.error(`❌ Failed to process ${email}:`, error);
    }
};

const run = async () => {
    await createSampleUser('admin@garsia.sk', 'garsiagarsia', 'admin');
    await createSampleUser('user@garsia.sk', 'user123', 'user');
    console.log('Done.');
};

run();
