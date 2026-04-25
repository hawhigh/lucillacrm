import React, { useState } from 'react';
import { useAppStore } from '../store/useAppStore';
import { Invoice } from '../types';
import { Mail, CheckCircle, Clock, Send, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface EmailAutomationManagerProps {
    invoices: Invoice[];
}

const EmailAutomationManager: React.FC<EmailAutomationManagerProps> = ({ invoices }) => {
    const { t } = useAppStore();
    const [selectedTab, setSelectedTab] = useState<'overdue' | 'paid'>('overdue');
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

    const overdueInvoices = invoices.filter(i => i.status === 'Overdue');
    const recentlyPaidInvoices = invoices.filter(i => i.status === 'Paid'); // In real app, maybe filter by date

    const currentList = selectedTab === 'overdue' ? overdueInvoices : recentlyPaidInvoices;

    const toggleSelection = (id: string) => {
        const newSet = new Set(selectedIds);
        if (newSet.has(id)) newSet.delete(id);
        else newSet.add(id);
        setSelectedIds(newSet);
    };

    const handleBatchAction = () => {
        const selected = currentList.filter(i => selectedIds.has(i.id));
        if (selected.length === 0) return;

        // In a client-side only app, we can't truly send batch emails via SMTP easily.
        // We will simulate the action or open simulated mailtos (which is annoying for batch).
        // For this demo, we will likely just show a "Sent" success toast or log.
        // Or better, we generate a report of "To Send".

        alert(`Ideally this would trigger a server-side job to send ${selected.length} emails.\n\nRecipients:\n${selected.map(i => i.customer.email).join(', ')}`);

        // Clear selection
        setSelectedIds(new Set());
    };

    return (
        <div className="space-y-6 animate-fade-in pb-12">
            <div className="flex flex-col md:flex-row gap-6 md:items-center justify-between">
                <div>
                    <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">Smart Communication</h2>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">Automate your dunning process and customer retention.</p>
                </div>
                <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                    <button
                        onClick={() => setSelectedTab('overdue')}
                        className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${selectedTab === 'overdue' ? 'bg-white dark:bg-slate-700 shadow-sm text-slate-900 dark:text-white' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                    >
                        Overdue ({overdueInvoices.length})
                    </button>
                    <button
                        onClick={() => setSelectedTab('paid')}
                        className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${selectedTab === 'paid' ? 'bg-white dark:bg-slate-700 shadow-sm text-slate-900 dark:text-white' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                    >
                        Recently Paid ({recentlyPaidInvoices.length})
                    </button>
                </div>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-[2rem] shadow-sm border border-slate-200 dark:border-slate-800 p-8">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="font-bold text-xl flex items-center gap-2">
                        {selectedTab === 'overdue' ? <AlertCircle className="text-red-500" /> : <CheckCircle className="text-emerald-500" />}
                        {selectedTab === 'overdue' ? 'Overdue Invoices' : 'Thank You Notes'}
                    </h3>
                    <button
                        disabled={selectedIds.size === 0}
                        onClick={handleBatchAction}
                        className="bg-brand text-white px-6 py-3 rounded-xl font-bold text-sm shadow-xl shadow-brand/20 disabled:opacity-50 disabled:shadow-none transition-all flex items-center gap-2"
                    >
                        <Send className="w-4 h-4" /> Send {selectedIds.size > 0 ? `(${selectedIds.size})` : ''} Reminders
                    </button>
                </div>

                <div className="space-y-3">
                    {currentList.length === 0 ? (
                        <div className="text-center py-12 text-slate-400 italic">No invoices found in this category.</div>
                    ) : (
                        currentList.map(inv => (
                            <div key={inv.id} className="flex items-center p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/50 hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors cursor-pointer" onClick={() => toggleSelection(inv.id)}>
                                <div className={`w-5 h-5 rounded-md border-2 mr-4 flex items-center justify-center transition-colors ${selectedIds.has(inv.id) ? 'bg-brand border-brand' : 'border-slate-300 dark:border-slate-600'}`}>
                                    {selectedIds.has(inv.id) && <CheckCircle className="w-3.5 h-3.5 text-white" />}
                                </div>
                                <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
                                    <div>
                                        <p className="font-bold text-slate-900 dark:text-white">{inv.number}</p>
                                        <p className="text-xs text-slate-500 dark:text-slate-400">{inv.customer.name}</p>
                                    </div>
                                    <div className="text-right md:text-left">
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide ${inv.status === 'Overdue' ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'
                                            }`}>
                                            {inv.status}
                                        </span>
                                    </div>
                                    <div className="text-sm font-medium text-slate-600 dark:text-slate-300">
                                        Due: {inv.dueDate}
                                    </div>
                                    <div className="text-right font-black text-slate-900 dark:text-white">
                                        {new Intl.NumberFormat('sk-SK', { style: 'currency', currency: 'EUR' }).format(inv.items.reduce((acc, i) => acc + i.quantity * i.unitPrice * (1 + i.vatRate / 100), 0))}
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};

export default EmailAutomationManager;
