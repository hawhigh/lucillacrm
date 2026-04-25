import React, { useState, useEffect } from 'react';
import { useDataStore } from '../store/useDataStore';
import { useAuthStore } from '../store/useAuthStore';
import { useAppStore } from '../store/useAppStore';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, Clock, RefreshCw, Trash2, Plus, Play, Pause, AlertCircle, X, Check } from 'lucide-react';
import { db } from '../services/firebase';
import { collection, addDoc, serverTimestamp, deleteDoc, doc, updateDoc, onSnapshot, query, where } from 'firebase/firestore';

export const RecurringManager: React.FC = () => {
    const { invoices, customers, allUsers, selectedUserId } = useDataStore();
    const { user, role } = useAuthStore();
    const { t } = useAppStore();
    const [isCreating, setIsCreating] = useState(false);
    const [templates, setTemplates] = useState<any[]>([]);

    const [newTemplate, setNewTemplate] = useState({
        templateName: '',
        customerId: '',
        frequency: 'monthly',
        amount: 0,
        description: '',
        nextDate: new Date(Date.now() + 86400000).toISOString().split('T')[0], // Tomorrow
    });

    useEffect(() => {
        if (!user) return;

        const targetUserId = (role === 'admin' && selectedUserId) ? selectedUserId : user.uid;

        // Listen to recurring templates for target user
        const q = query(collection(db, 'users', targetUserId, 'recurring_templates'));
        const unsub = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setTemplates(data);
        });

        return () => unsub();
    }, [user, selectedUserId, role]);

    const handleCreateTemplate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || !newTemplate.customerId || !newTemplate.templateName) return;

        const targetUserId = (role === 'admin' && selectedUserId) ? selectedUserId : user.uid;

        try {
            await addDoc(collection(db, 'users', targetUserId, 'recurring_templates'), {
                ...newTemplate,
                active: true,
                createdAt: serverTimestamp(),
                lastGenerated: null,
                invoiceData: {
                    customer: customers.find(c => c.id === newTemplate.customerId),
                    items: [{
                        description: newTemplate.description,
                        quantity: 1,
                        unitPrice: Number(newTemplate.amount),
                        vatRate: 20
                    }],
                    status: 'Draft'
                }
            });
            setIsCreating(false);
            setNewTemplate({
                templateName: '',
                customerId: '',
                frequency: 'monthly',
                amount: 0,
                description: '',
                nextDate: new Date(Date.now() + 86400000).toISOString().split('T')[0],
            });
        } catch (err) {
            console.error("Failed to create template:", err);
            alert("Error creating template. Please try again.");
        }
    };

    const toggleActive = async (id: string, current: boolean) => {
        if (!user) return;
        const targetUserId = (role === 'admin' && selectedUserId) ? selectedUserId : user.uid;
        await updateDoc(doc(db, 'users', targetUserId, 'recurring_templates', id), {
            active: !current
        });
    };

    const deleteTemplate = async (id: string) => {
        if (!user || !confirm("Are you sure you want to delete this automation?")) return;
        const targetUserId = (role === 'admin' && selectedUserId) ? selectedUserId : user.uid;
        await deleteDoc(doc(db, 'users', targetUserId, 'recurring_templates', id));
    };

    const selectedUserEmail = allUsers.find(u => u.uid === selectedUserId)?.email;

    return (
        <div className="p-6 max-w-6xl mx-auto">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-slate-800 dark:text-white uppercase tracking-tight">{t('recurringInvoices') || 'Recurring Invoices'}</h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">
                        {selectedUserId ? `Managing automations for: ${selectedUserEmail}` : 'Automate your billing cycle for regular clients.'}
                    </p>
                </div>
                <button
                    onClick={() => setIsCreating(true)}
                    className="flex items-center gap-2 bg-indigo-600 text-white px-6 py-3 rounded-xl font-bold shadow-lg shadow-indigo-600/20 hover:scale-105 transition-transform"
                >
                    <Plus className="w-5 h-5" />
                    {t('createNew') || 'Create Template'}
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <AnimatePresence>
                    {templates.length === 0 ? (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-white dark:bg-slate-900 rounded-2xl p-12 border-2 border-dashed border-slate-200 dark:border-slate-800 flex flex-col items-center justify-center text-center col-span-full"
                        >
                            <div className="w-16 h-16 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4">
                                <Clock className="w-8 h-8 text-slate-300" />
                            </div>
                            <h3 className="text-xl font-bold text-slate-800 dark:text-white">No active automations</h3>
                            <p className="text-slate-500 dark:text-slate-400 max-w-xs mt-2">
                                Create a recurring template to automatically generate invoices every week or month.
                            </p>
                        </motion.div>
                    ) : (
                        templates.map(tmp => (
                            <motion.div
                                key={tmp.id}
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="bg-white dark:bg-slate-800/50 rounded-2xl p-6 border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-md transition-all flex items-center justify-between group"
                            >
                                <div className="flex items-center gap-4">
                                    <div className={`p-3 rounded-xl transition-colors ${tmp.active ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400' : 'bg-slate-50 text-slate-400 dark:bg-slate-900 dark:text-slate-600'}`}>
                                        <RefreshCw className={`w-6 h-6 ${tmp.active ? 'animate-spin-slow' : ''}`} />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-slate-800 dark:text-white">{tmp.templateName}</h3>
                                        <div className="flex flex-wrap items-center gap-3 text-sm text-slate-500 dark:text-slate-400 mt-1">
                                            <span className="flex items-center gap-1 font-medium"><Calendar className="w-4 h-4" /> Next: {tmp.nextDate}</span>
                                            <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded text-[10px] font-black uppercase tracking-wider">{tmp.frequency}</span>
                                            <span className="font-bold text-indigo-600 dark:text-indigo-400">{tmp.amount} EUR</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button
                                        onClick={() => toggleActive(tmp.id, tmp.active)}
                                        className={`p-2 rounded-lg transition-colors ${tmp.active ? 'hover:bg-amber-50 text-amber-500' : 'hover:bg-green-50 text-green-500'}`}
                                        title={tmp.active ? 'Pause' : 'Resume'}
                                    >
                                        {tmp.active ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                                    </button>
                                    <button
                                        onClick={() => deleteTemplate(tmp.id)}
                                        className="p-2 hover:bg-red-50 rounded-lg transition-colors text-red-400"
                                        title="Delete"
                                    >
                                        <Trash2 className="w-5 h-5" />
                                    </button>
                                </div>
                            </motion.div>
                        ))
                    )}
                </AnimatePresence>
            </div>

            {/* Creation Modal */}
            <AnimatePresence>
                {isCreating && (
                    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 20 }}
                            className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-xl overflow-hidden border border-slate-200 dark:border-slate-800"
                        >
                            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
                                <h2 className="text-xl font-bold text-slate-800 dark:text-white">Create Recurring Template</h2>
                                <button onClick={() => setIsCreating(false)} className="p-2 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition-colors">
                                    <X className="w-5 h-5 text-slate-400" />
                                </button>
                            </div>

                            <form onSubmit={handleCreateTemplate} className="p-8 space-y-6">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="col-span-2">
                                        <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Template Name</label>
                                        <input
                                            required
                                            type="text"
                                            value={newTemplate.templateName}
                                            onChange={e => setNewTemplate({ ...newTemplate, templateName: e.target.value })}
                                            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none transition-all dark:text-white"
                                            placeholder="e.g. Monthly Maintenance"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Customer</label>
                                        <select
                                            required
                                            value={newTemplate.customerId}
                                            onChange={e => setNewTemplate({ ...newTemplate, customerId: e.target.value })}
                                            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none transition-all dark:text-white"
                                        >
                                            <option value="">Select Customer</option>
                                            {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Frequency</label>
                                        <select
                                            value={newTemplate.frequency}
                                            onChange={e => setNewTemplate({ ...newTemplate, frequency: e.target.value })}
                                            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none transition-all dark:text-white"
                                        >
                                            <option value="weekly">Weekly</option>
                                            <option value="monthly">Monthly</option>
                                            <option value="quarterly">Quarterly</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Amount (EUR)</label>
                                        <input
                                            required
                                            type="number"
                                            value={newTemplate.amount}
                                            onChange={e => setNewTemplate({ ...newTemplate, amount: Number(e.target.value) })}
                                            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none transition-all dark:text-white"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Start Date</label>
                                        <input
                                            required
                                            type="date"
                                            value={newTemplate.nextDate}
                                            onChange={e => setNewTemplate({ ...newTemplate, nextDate: e.target.value })}
                                            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none transition-all dark:text-white"
                                        />
                                    </div>

                                    <div className="col-span-2">
                                        <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Work Description</label>
                                        <textarea
                                            required
                                            value={newTemplate.description}
                                            onChange={e => setNewTemplate({ ...newTemplate, description: e.target.value })}
                                            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none transition-all dark:text-white h-24 resize-none"
                                            placeholder="Description of the service rendered..."
                                        />
                                    </div>
                                </div>

                                <div className="flex gap-3 pt-4">
                                    <button
                                        type="button"
                                        onClick={() => setIsCreating(false)}
                                        className="flex-1 px-6 py-4 rounded-xl font-bold text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="flex-1 bg-indigo-600 text-white px-6 py-4 rounded-xl font-bold shadow-xl shadow-indigo-600/20 hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2"
                                    >
                                        <Check className="w-5 h-5" />
                                        Save Automation
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            <div className="mt-12 bg-indigo-50 dark:bg-indigo-900/20 rounded-2xl p-6 border border-indigo-100 dark:border-indigo-900/50 flex gap-4">
                <AlertCircle className="w-6 h-6 text-indigo-500 shrink-0" />
                <div className="text-sm text-indigo-800 dark:text-indigo-300">
                    <p className="font-bold">Business Automation Engine</p>
                    <p className="mt-1">Invoices are automatically generated as <b>Drafts</b> on the scheduled date. You will receive a summary notification to review and send them to your clients.</p>
                </div>
            </div>
        </div>
    );
};
