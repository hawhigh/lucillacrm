import { create } from 'zustand';
import { User, onAuthStateChanged, signOut } from 'firebase/auth';
import { auth, db } from '../services/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { UserRole } from '../types';

interface AuthState {
    user: User | null;
    role: UserRole | null;
    loading: boolean;
    setUser: (user: User | null) => void;
    logout: () => Promise<void>;
    initialize: () => () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
    user: null,
    role: null,
    loading: true,
    setUser: (user) => set({ user, loading: false }),
    logout: async () => {
        await signOut(auth);
        set({ user: null, role: null });
    },
    initialize: () => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (user) {
                // Fetch or create user document in Firestore to get the role
                const userDocRef = doc(db, 'users', user.uid);
                const userDoc = await getDoc(userDocRef);

                let role: UserRole = 'user';
                if (userDoc.exists()) {
                    role = userDoc.data().role as UserRole;
                } else {
                    // Default role for new users
                    await setDoc(userDocRef, {
                        role: 'user',
                        email: user.email,
                        createdAt: new Date().toISOString()
                    });
                }
                set({ user, role, loading: false });
            } else {
                set({ user: null, role: null, loading: false });
            }
        });
        return unsubscribe;
    }
}));
