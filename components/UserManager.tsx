import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import { useAppStore } from '../store/useAppStore';
import { Shield, User as UserIcon, Calendar, Mail } from 'lucide-react';
import { motion } from 'framer-motion';

interface UserData {
    id: string;
    email: string;
    role: 'admin' | 'user';
    createdAt: string;
}

const UserManager = () => {
    const { t } = useAppStore();
    const [users, setUsers] = useState<UserData[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsub = onSnapshot(collection(db, 'users'), (snapshot) => {
            const data = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            } as UserData));
            setUsers(data);
            setLoading(false);
        });
        return () => unsub();
    }, []);

    const toggleRole = async (user: UserData) => {
        const newRole = user.role === 'admin' ? 'user' : 'admin';
        try {
            await updateDoc(doc(db, 'users', user.id), { role: newRole });
        } catch (error) {
            console.error("Error updating role:", error);
            alert("Failed to update role. Check permissions.");
        }
    };

    if (loading) return <div className="p-8 text-center text-slate-500 animate-pulse">Loading users...</div>;

    return (
        <div className="space-y-8 animate-fade-in pb-20">
            <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden transition-colors">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm min-w-[800px]">
                        <thead className="bg-gray-50/50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 uppercase tracking-wider text-xs font-bold">
                            <tr>
                                <th className="px-8 py-6">{t('user' as any)}</th>
                                <th className="px-8 py-6">{t('role' as any)}</th>
                                <th className="px-8 py-6">{t('createdAt' as any)}</th>
                                <th className="px-8 py-6 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {users.map(user => (
                                <tr key={user.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors group">
                                    <td className="px-8 py-6">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 dark:text-slate-400">
                                                <UserIcon className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <p className="font-bold text-slate-900 dark:text-white leading-none mb-1">{user.email}</p>
                                                <p className="text-xs text-slate-500 dark:text-slate-400 opacity-60 font-mono">{user.id}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-8 py-6">
                                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide
                                            ${user.role === 'admin'
                                                ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400'
                                                : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'}
                                        `}>
                                            <Shield className="w-3 h-3" />
                                            {t(user.role as any)}
                                        </span>
                                    </td>
                                    <td className="px-8 py-6 text-slate-500 dark:text-slate-400 font-medium">
                                        {new Date(user.createdAt).toLocaleDateString()}
                                    </td>
                                    <td className="px-8 py-6 text-right">
                                        <button
                                            onClick={() => toggleRole(user)}
                                            className="px-4 py-2 bg-slate-50 dark:bg-slate-800 hover:bg-brand hover:text-white text-slate-600 dark:text-slate-300 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-700 transition-all active:scale-95"
                                        >
                                            Toggle to {user.role === 'admin' ? 'User' : 'Admin'}
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default UserManager;
