import { create } from 'zustand';
import { collection, collectionGroup, onSnapshot, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { db, auth } from '../services/firebase';
import { useAuthStore } from './useAuthStore';
import { Invoice, Customer, Expense, Quote, Product } from '../types';

interface DataState {
    invoices: Invoice[];
    customers: Customer[];
    expenses: Expense[];
    quotes: Quote[];
    products: Product[];
    loading: boolean;
    unsubscribeFunctions: (() => void)[];
    selectedUserId: string | null;
    allUsers: { uid: string, email: string, role: string }[];

    initializeData: (userId: string, role?: string | null) => void;
    cleanup: () => void;

    saveInvoice: (invoice: Invoice) => Promise<void>;
    deleteInvoice: (id: string) => Promise<void>;
    saveCustomer: (customer: Customer) => Promise<void>;
    deleteCustomer: (id: string) => Promise<void>;
    saveExpense: (expense: Expense) => Promise<void>;
    deleteExpense: (id: string) => Promise<void>;
    saveQuote: (quote: Quote) => Promise<void>;
    deleteQuote: (id: string) => Promise<void>;
    saveProduct: (product: Product) => Promise<void>;
    deleteProduct: (id: string) => Promise<void>;
    setSelectedUserId: (uid: string | null) => void;
}

export const useDataStore = create<DataState>((set, get) => ({
    invoices: [],
    customers: [],
    expenses: [],
    quotes: [],
    products: [],
    loading: false,
    unsubscribeFunctions: [],
    selectedUserId: null,
    allUsers: [],

    initializeData: (userId: string, role?: string | null) => {
        set({ loading: true });
        const targetUserId = get().selectedUserId || userId;

        // Cleanup previous listeners
        get().cleanup();

        // 1. Fetch data for the target user (or all if admin and no target)
        const invoicesQuery = (role === 'admin' && !get().selectedUserId)
            ? collectionGroup(db, 'invoices')
            : collection(db, 'users', targetUserId, 'invoices');

        const unsubInvoices = onSnapshot(invoicesQuery, (snapshot) => {
            const data = snapshot.docs.map(doc => ({ ...doc.data() as Invoice }));
            set({ invoices: data });
        });

        const customersQuery = (role === 'admin' && !get().selectedUserId)
            ? collectionGroup(db, 'customers')
            : collection(db, 'users', targetUserId, 'customers');

        const unsubCustomers = onSnapshot(customersQuery, (snapshot) => {
            const data = snapshot.docs.map(doc => ({ ...doc.data() as Customer }));
            set({ customers: data });
        });

        const expensesQuery = (role === 'admin' && !get().selectedUserId)
            ? collectionGroup(db, 'expenses')
            : collection(db, 'users', targetUserId, 'expenses');

        const unsubExpenses = onSnapshot(expensesQuery, (snapshot) => {
            const data = snapshot.docs.map(doc => ({ ...doc.data() as Expense }));
            set({ expenses: data });
        });

        const quotesQuery = (role === 'admin' && !get().selectedUserId)
            ? collectionGroup(db, 'quotes')
            : collection(db, 'users', targetUserId, 'quotes');

        const unsubQuotes = onSnapshot(quotesQuery, (snapshot) => {
            const data = snapshot.docs.map(doc => ({ ...doc.data() as Quote }));
            set({ quotes: data });
        });

        const productsQuery = (role === 'admin' && !get().selectedUserId)
            ? collectionGroup(db, 'products')
            : collection(db, 'users', targetUserId, 'products');

        const unsubProducts = onSnapshot(productsQuery, (snapshot) => {
            const data = snapshot.docs.map(doc => ({ ...doc.data() as Product }));
            set({ products: data });
            set({ loading: false });
        });

        const unsubscribeFunctions = [unsubInvoices, unsubCustomers, unsubExpenses, unsubQuotes, unsubProducts];

        // 2. If Admin, also fetch list of users for the selector
        if (role === 'admin') {
            const unsubUsers = onSnapshot(collection(db, 'users'), (snapshot) => {
                const users = snapshot.docs.map(doc => ({
                    uid: doc.id,
                    email: doc.data().email || 'No email',
                    role: doc.data().role || 'user'
                }));
                set({ allUsers: users });
            });
            unsubscribeFunctions.push(unsubUsers);
        }

        set({ unsubscribeFunctions });
    },

    cleanup: () => {
        get().unsubscribeFunctions.forEach(unsub => unsub());
        set({ unsubscribeFunctions: [] });
    },

    saveInvoice: async (invoice) => {
        const userId = auth.currentUser?.uid;
        if (!userId) return;
        const cleaned = JSON.parse(JSON.stringify(invoice, (k, v) => v === undefined ? null : v)); // Standard way to strip undefined or convert to null. Firestore prefers null or missing.
        // Actually, better to remove the keys entirely.
        const removeUndefined = (obj: any): any => {
            if (Array.isArray(obj)) return obj.map(removeUndefined);
            if (obj !== null && typeof obj === 'object') {
                return Object.entries(obj).reduce((acc, [key, value]) => {
                    if (value !== undefined) {
                        acc[key] = removeUndefined(value);
                    }
                    return acc;
                }, {} as any);
            }
            return obj;
        };
        await setDoc(doc(db, 'users', userId, 'invoices', invoice.id), removeUndefined(invoice));
    },

    deleteInvoice: async (id) => {
        const userId = auth.currentUser?.uid;
        if (!userId) return;
        await deleteDoc(doc(db, 'users', userId, 'invoices', id));
    },

    saveCustomer: async (customer) => {
        const userId = auth.currentUser?.uid;
        if (!userId) return;
        const removeUndefined = (obj: any): any => {
            if (Array.isArray(obj)) return obj.map(removeUndefined);
            if (obj !== null && typeof obj === 'object') {
                return Object.entries(obj).reduce((acc, [key, value]) => {
                    if (value !== undefined) {
                        acc[key] = removeUndefined(value);
                    }
                    return acc;
                }, {} as any);
            }
            return obj;
        };
        await setDoc(doc(db, 'users', userId, 'customers', customer.id), removeUndefined(customer));
    },

    deleteCustomer: async (id) => {
        const userId = auth.currentUser?.uid;
        if (!userId) return;
        await deleteDoc(doc(db, 'users', userId, 'customers', id));
    },

    saveExpense: async (expense) => {
        const userId = auth.currentUser?.uid;
        if (!userId) return;
        const removeUndefined = (obj: any): any => {
            if (Array.isArray(obj)) return obj.map(removeUndefined);
            if (obj !== null && typeof obj === 'object') {
                return Object.entries(obj).reduce((acc, [key, value]) => {
                    if (value !== undefined) {
                        acc[key] = removeUndefined(value);
                    }
                    return acc;
                }, {} as any);
            }
            return obj;
        };
        await setDoc(doc(db, 'users', userId, 'expenses', expense.id), removeUndefined(expense));
    },

    deleteExpense: async (id) => {
        const userId = auth.currentUser?.uid;
        if (!userId) return;
        await deleteDoc(doc(db, 'users', userId, 'expenses', id));
    },

    saveQuote: async (quote) => {
        const userId = auth.currentUser?.uid;
        if (!userId) return;
        const removeUndefined = (obj: any): any => {
            if (Array.isArray(obj)) return obj.map(removeUndefined);
            if (obj !== null && typeof obj === 'object') {
                return Object.entries(obj).reduce((acc, [key, value]) => {
                    if (value !== undefined) {
                        acc[key] = removeUndefined(value);
                    }
                    return acc;
                }, {} as any);
            }
            return obj;
        };
        await setDoc(doc(db, 'users', userId, 'quotes', quote.id), removeUndefined(quote));
    },

    deleteQuote: async (id) => {
        const userId = auth.currentUser?.uid;
        if (!userId) return;
        await deleteDoc(doc(db, 'users', userId, 'quotes', id));
    },

    saveProduct: async (product) => {
        const userId = auth.currentUser?.uid;
        if (!userId) return;
        const removeUndefined = (obj: any): any => {
            if (Array.isArray(obj)) return obj.map(removeUndefined);
            if (obj !== null && typeof obj === 'object') {
                return Object.entries(obj).reduce((acc, [key, value]) => {
                    if (value !== undefined) {
                        acc[key] = removeUndefined(value);
                    }
                    return acc;
                }, {} as any);
            }
            return obj;
        };
        await setDoc(doc(db, 'users', userId, 'products', product.id), removeUndefined(product));
    },

    deleteProduct: async (id) => {
        const userId = auth.currentUser?.uid;
        if (!userId) return;
        await deleteDoc(doc(db, 'users', userId, 'products', id));
    },
    setSelectedUserId: (uid) => {
        set({ selectedUserId: uid });
        // Re-initialize data fetching with the new user context
        const { initializeData } = get();
        const userId = auth.currentUser?.uid;
        const { role } = useAuthStore.getState();
        if (userId) initializeData(userId, role);
    }
}));
