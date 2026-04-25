import React, { useState } from 'react';
import { Expense } from '../types';
import { Plus, Trash2, Receipt, Search, Filter, Calendar, Tag, DollarSign, CheckCircle, XCircle, X, Save, TrendingDown, Upload, Loader2, ScanLine } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { motion, AnimatePresence } from 'framer-motion';

interface ExpenseManagerProps {
    expenses: Expense[];
    onSave: (expense: Expense) => void;
    onDelete: (id: string) => void;
}

const CATEGORIES = [
    { id: 'cat_office', key: 'cat_office' },
    { id: 'cat_travel', key: 'cat_travel' },
    { id: 'cat_software', key: 'cat_software' },
    { id: 'cat_marketing', key: 'cat_marketing' },
    { id: 'cat_rent', key: 'cat_rent' },
    { id: 'cat_utilities', key: 'cat_utilities' },
    { id: 'cat_hardware', key: 'cat_hardware' },
    { id: 'cat_meals', key: 'cat_meals' },
    { id: 'cat_professional', key: 'cat_professional' },
    { id: 'cat_other', key: 'cat_other' }
];

const ExpenseManager: React.FC<ExpenseManagerProps> = ({ expenses, onSave, onDelete }) => {
    const { t } = useAppStore();
    const [isAdding, setIsAdding] = useState(false);
    const [search, setSearch] = useState('');
    const [filterCategory, setFilterCategory] = useState('All');

    // Form State
    const [newExpense, setNewExpense] = useState<Partial<Expense>>({
        description: '',
        amount: 0,
        category: 'cat_office',
        date: new Date().toISOString().split('T')[0],
        vendor: '',
        taxDeductible: true,
        vatRate: 20
    });

    const handleSave = () => {
        if (!newExpense.description || !newExpense.amount) {
            alert(t('expenseDescription') + " and " + t('amount') + " are required.");
            return;
        }

        onSave({
            ...newExpense,
            id: newExpense.id || Math.random().toString(36).substr(2, 9)
        } as Expense);

        setIsAdding(false);
        setNewExpense({
            description: '',
            amount: 0,
            category: 'cat_office',
            date: new Date().toISOString().split('T')[0],
            vendor: '',
            taxDeductible: true,
            vatRate: 20
        });
    };

    const handleScanReceipt = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const btn = document.getElementById('expense-scan-label');
        if (btn) btn.innerText = "Analyzing...";

        const reader = new FileReader();
        reader.onloadend = async () => {
            const base64 = reader.result as string;
            try {
                const { extractExpenseFromImage } = await import('../services/geminiService');
                const result = await extractExpenseFromImage(base64);
                if (result && !result.error) {
                    setNewExpense(prev => ({ ...prev, ...result }));
                    alert("Receipt scanned successfully!");
                } else {
                    alert(result?.error || "Could not extract details. Please try again or enter manually.");
                }
            } catch (err) {
                console.error(err);
                alert("Scan failed. Please check your internet connection.");
            } finally {
                if (btn) btn.innerText = "Scan Receipt / Invoice";
                e.target.value = '';
            }
        };
        reader.readAsDataURL(file);
    };

    const filteredExpenses = expenses.filter(e => {
        const matchesSearch = e.description.toLowerCase().includes(search.toLowerCase()) ||
            (e.vendor?.toLowerCase() || '').includes(search.toLowerCase());
        const matchesCategory = filterCategory === 'All' || e.category === filterCategory;
        return matchesSearch && matchesCategory;
    });

    const totalAmount = filteredExpenses.reduce((acc, e) => acc + e.amount, 0);

    return (
        <div className="space-y-8 animate-fade-in pb-20">
            {/* Header Controls */}
            <div className="flex flex-col md:flex-row gap-4 md:items-center justify-between bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
                <div className="flex-1 relative group">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-brand transition-colors" />
                    <input
                        type="text"
                        placeholder={t('searchExpenses')}
                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl pl-11 pr-4 py-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand focus:bg-white dark:focus:bg-slate-800 transition-all font-medium shadow-inner"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
                <div className="flex gap-3">
                    <div className="relative">
                        <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                        <select
                            className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl pl-10 pr-10 py-3.5 text-sm font-bold text-slate-700 dark:text-slate-300 appearance-none focus:ring-2 focus:ring-brand cursor-pointer shadow-inner"
                            value={filterCategory}
                            onChange={(e) => setFilterCategory(e.target.value)}
                        >
                            <option value="All">{t('allCategories' as any)}</option>
                            {CATEGORIES.map(c => <option key={c.id} value={c.id}>{t(c.key as any)}</option>)}
                        </select>
                    </div>
                    <button
                        onClick={() => setIsAdding(true)}
                        className="bg-brand hover:brightness-110 text-white px-8 py-3.5 rounded-xl text-sm font-bold flex items-center gap-2 shadow-xl shadow-brand/20 transition-all active:scale-95"
                    >
                        <Plus className="w-5 h-5" /> {t('addExpense')}
                    </button>
                </div>
            </div>

            {/* Total Summary Bar */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-gradient-to-br from-red-500 via-rose-600 to-pink-600 rounded-[2.5rem] p-8 md:p-12 text-white shadow-2xl shadow-rose-500/20 flex flex-col md:flex-row justify-between items-center gap-10 relative overflow-hidden"
            >
                <div className="relative z-10 text-center md:text-left">
                    <p className="text-rose-100 text-sm font-bold uppercase tracking-[0.2em] mb-3">{t('totalExpenses')}</p>
                    <h2 className="text-5xl md:text-7xl font-black tracking-tight">{new Intl.NumberFormat('sk-SK', { style: 'currency', currency: 'EUR' }).format(totalAmount)}</h2>
                </div>
                <div className="flex gap-6 w-full md:w-auto relative z-10">
                    <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-6 border border-white/20 flex-1 md:w-48 shadow-lg">
                        <p className="text-xs font-bold text-rose-100/70 uppercase mb-2">{t('taxDeductible')}</p>
                        <p className="text-2xl font-black">{new Intl.NumberFormat('sk-SK', { style: 'currency', currency: 'EUR' }).format(filteredExpenses.filter(e => e.taxDeductible).reduce((acc, e) => acc + e.amount, 0))}</p>
                    </div>
                    <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-6 border border-white/20 flex-1 md:w-48 shadow-lg">
                        <p className="text-xs font-bold text-rose-100/70 uppercase mb-2">Items</p>
                        <p className="text-2xl font-black">{filteredExpenses.length}</p>
                    </div>
                </div>
                <TrendingDown className="absolute -bottom-10 -right-10 w-64 h-64 text-white/5 pointer-events-none transform -rotate-12" />
            </motion.div>

            {/* Add Expense Modal */}
            <AnimatePresence>
                {isAdding && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="bg-white dark:bg-slate-900 w-full max-w-xl rounded-[2.5rem] shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh]"
                        >
                            <div className="p-6 md:p-8 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/30 shrink-0">
                                <div className="flex items-center gap-4">
                                    <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-2xl">
                                        <Receipt className="w-6 h-6 text-red-500" />
                                    </div>
                                    <h3 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white">
                                        {t('addExpense')}
                                    </h3>
                                </div>
                                <button onClick={() => setIsAdding(false)} className="p-3 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-2xl transition-colors text-slate-400">
                                    <X className="w-6 h-6" />
                                </button>
                            </div>

                            <div className="p-6 md:p-10 space-y-6 md:space-y-8 overflow-y-auto">
                                <div className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-2xl border border-dotted border-slate-300 dark:border-slate-700 flex flex-col items-center justify-center relative group min-h-[150px]">
                                    <input
                                        type="file"
                                        id="expense-scan"
                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
                                        accept="image/*,.pdf"
                                        capture="environment"
                                        onChange={handleScanReceipt}
                                    />
                                    <label htmlFor="expense-scan" id="expense-scan-label" className="flex flex-col items-center gap-2 text-slate-500 dark:text-slate-400 font-bold group-hover:text-brand transition-colors w-full h-full py-2 z-10 pointer-events-none text-center">
                                        <ScanLine className="w-8 h-8 opacity-50 mb-1" />
                                        Scan Receipt / Invoice
                                        <span className="text-[10px] uppercase font-bold opacity-60">Supoprts JPG, PNG, PDF</span>
                                    </label>
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2.5 block">{t('expenseDescription')}</label>
                                    <input
                                        placeholder="e.g. Adobe Creative Cloud"
                                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-5 py-4 text-sm focus:ring-2 focus:ring-brand focus:bg-white dark:focus:bg-slate-800 outline-none transition-all dark:text-white shadow-inner font-medium"
                                        value={newExpense.description}
                                        onChange={e => setNewExpense({ ...newExpense, description: e.target.value })}
                                    />
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
                                    <div>
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2.5 block">{t('amount')} (€)</label>
                                        <input
                                            type="number"
                                            placeholder="0.00"
                                            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-5 py-4 text-sm focus:ring-2 focus:ring-brand focus:bg-white dark:focus:bg-slate-800 outline-none transition-all dark:text-white font-black text-xl shadow-inner"
                                            value={newExpense.amount || ''}
                                            onChange={e => setNewExpense({ ...newExpense, amount: parseFloat(e.target.value) || 0 })}
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2.5 block">{t('date')}</label>
                                        <input
                                            type="date"
                                            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-5 py-4 text-sm focus:ring-2 focus:ring-brand focus:bg-white dark:focus:bg-slate-800 outline-none transition-all dark:text-white dark:[color-scheme:dark] shadow-inner font-bold"
                                            value={newExpense.date}
                                            onChange={e => setNewExpense({ ...newExpense, date: e.target.value })}
                                        />
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
                                    <div>
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2.5 block">{t('category')}</label>
                                        <div className="relative">
                                            <select
                                                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-5 py-4 text-sm focus:ring-2 focus:ring-brand focus:bg-white dark:focus:bg-slate-800 outline-none transition-all dark:text-white appearance-none cursor-pointer shadow-inner font-bold"
                                                value={newExpense.category}
                                                onChange={e => setNewExpense({ ...newExpense, category: e.target.value })}
                                            >
                                                {CATEGORIES.map(c => <option key={c.id} value={c.id}>{t(c.key as any)}</option>)}
                                            </select>
                                            <Calendar className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2.5 block">{t('vatRate')} (%)</label>
                                        <input
                                            type="number"
                                            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-5 py-4 text-sm focus:ring-2 focus:ring-brand focus:bg-white dark:focus:bg-slate-800 outline-none transition-all dark:text-white shadow-inner font-bold"
                                            value={newExpense.vatRate}
                                            onChange={e => setNewExpense({ ...newExpense, vatRate: parseFloat(e.target.value) || 0 })}
                                        />
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-700/50">
                                    <input
                                        type="checkbox"
                                        id="taxDeductible"
                                        className="w-6 h-6 accent-red-500 rounded-lg cursor-pointer shadow-sm"
                                        checked={newExpense.taxDeductible}
                                        onChange={e => setNewExpense({ ...newExpense, taxDeductible: e.target.checked })}
                                    />
                                    <label htmlFor="taxDeductible" className="text-sm font-black text-slate-700 dark:text-slate-300 cursor-pointer">{t('taxDeductible')}</label>
                                </div>
                            </div>
                            <div className="p-6 md:p-8 bg-slate-50/50 dark:bg-slate-800/30 flex gap-4 border-t border-slate-100 dark:border-slate-800 shrink-0">
                                <button onClick={() => setIsAdding(false)} className="flex-1 px-6 py-4 rounded-2xl text-sm font-black text-slate-500 hover:bg-white dark:hover:bg-slate-800 transition-all border border-transparent hover:border-slate-200">
                                    {t('cancel')}
                                </button>
                                <button onClick={handleSave} className="flex-[1.5] px-6 py-4 bg-brand text-white rounded-2xl text-sm font-black hover:brightness-110 shadow-xl shadow-brand/20 transition-all active:scale-95 flex items-center justify-center gap-2">
                                    <Save className="w-5 h-5" /> {t('save')}
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Expenses List */}
            <div className="bg-white dark:bg-slate-900 rounded-[2rem] shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">

                {/* Desktop Table View (Hidden on Mobile) */}
                <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-left text-sm min-w-[700px]">
                        <thead className="bg-slate-50/50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 uppercase tracking-widest text-[10px] font-black">
                            <tr>
                                <th className="px-8 py-6">{t('expenseDescription')} / {t('category')}</th>
                                <th className="px-8 py-6">{t('date')}</th>
                                <th className="px-8 py-6">Status</th>
                                <th className="px-8 py-6 text-right">{t('vatRate')}</th>
                                <th className="px-8 py-6 text-right">{t('amount')}</th>
                                <th className="px-8 py-6"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            <AnimatePresence mode="popLayout">
                                {filteredExpenses.length === 0 ? (
                                    <motion.tr
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        key="empty"
                                    >
                                        <td colSpan={6} className="px-8 py-24 text-center">
                                            <TrendingDown className="w-12 h-12 text-slate-200 dark:text-slate-800 mx-auto mb-4" />
                                            <p className="text-slate-400 dark:text-slate-600 font-bold">{t('noExpenses')}</p>
                                        </td>
                                    </motion.tr>
                                ) : (
                                    filteredExpenses.sort((a, b) => b.date.localeCompare(a.date)).map(expense => (
                                        <motion.tr
                                            layout
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            exit={{ opacity: 0 }}
                                            key={expense.id}
                                            className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors group"
                                        >
                                            <td className="px-8 py-6">
                                                <p className="font-black text-slate-900 dark:text-white uppercase tracking-tight">{expense.description}</p>
                                                <p className="text-[10px] text-brand font-black mt-1 flex items-center gap-1.5 bg-brand/10 w-fit px-2 py-0.5 rounded-lg border border-brand/10">
                                                    <Tag className="w-3 h-3" /> {t(expense.category as any)}
                                                </p>
                                            </td>
                                            <td className="px-8 py-6 text-slate-500 dark:text-slate-400 font-bold">
                                                <div className="flex items-center gap-2">
                                                    <Calendar className="w-4 h-4 opacity-30" /> {expense.date}
                                                </div>
                                            </td>
                                            <td className="px-8 py-6">
                                                {expense.taxDeductible ? (
                                                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 tracking-wider border border-emerald-200/50">
                                                        <CheckCircle className="w-3.5 h-3.5" /> {t('taxDeductible')}
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-600 tracking-wider border border-slate-200/50">
                                                        <XCircle className="w-3.5 h-3.5" /> {t('nonDeductible')}
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-8 py-6 text-right text-slate-400 dark:text-slate-500 font-black text-xs">
                                                {expense.vatRate}%
                                            </td>
                                            <td className="px-8 py-6 text-right">
                                                <p className="text-xl font-black text-slate-900 dark:text-white">{new Intl.NumberFormat('sk-SK', { style: 'currency', currency: 'EUR' }).format(expense.amount)}</p>
                                                <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase mt-0.5">Basic: {new Intl.NumberFormat('sk-SK', { style: 'currency', currency: 'EUR' }).format(expense.amount / (1 + expense.vatRate / 100))}</p>
                                            </td>
                                            <td className="px-8 py-6 text-right">
                                                <button
                                                    onClick={() => onDelete(expense.id)}
                                                    className="p-3 text-slate-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-2xl transition-all opacity-0 group-hover:opacity-100"
                                                >
                                                    <Trash2 className="w-5 h-5" />
                                                </button>
                                            </td>
                                        </motion.tr>
                                    ))
                                )}
                            </AnimatePresence>
                        </tbody>
                    </table>
                </div>

                {/* Mobile Card View (Visible on Mobile) */}
                <div className="md:hidden p-4 space-y-4">
                    <AnimatePresence mode="popLayout">
                        {filteredExpenses.length === 0 ? (
                            <div className="text-center py-12">
                                <TrendingDown className="w-12 h-12 text-slate-200 dark:text-slate-800 mx-auto mb-4" />
                                <p className="text-slate-400 dark:text-slate-600 font-bold">{t('noExpenses')}</p>
                            </div>
                        ) : (
                            filteredExpenses.sort((a, b) => b.date.localeCompare(a.date)).map(expense => (
                                <motion.div
                                    layout
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0 }}
                                    key={expense.id}
                                    className="bg-slate-50 dark:bg-slate-800/50 p-5 rounded-2xl border border-slate-100 dark:border-slate-800 flex flex-col gap-4 relative overflow-hidden"
                                >
                                    <div className="flex justify-between items-start gap-4">
                                        <div className="flex-1 min-w-0">
                                            <p className="font-black text-slate-900 dark:text-white text-lg uppercase tracking-tight leading-tight mb-1 break-words">{expense.description}</p>
                                            <div className="flex items-center gap-2 text-xs font-bold text-slate-400">
                                                <Calendar className="w-3 h-3" /> {expense.date}
                                            </div>
                                        </div>
                                        <div className="text-right shrink-0">
                                            <p className="text-2xl font-black text-slate-900 dark:text-white whitespace-nowrap">{new Intl.NumberFormat('sk-SK', { style: 'currency', currency: 'EUR' }).format(expense.amount)}</p>
                                        </div>
                                    </div>

                                    <div className="flex justify-between items-end mt-2">
                                        <div className="flex flex-wrap gap-2">
                                            <p className="text-[10px] text-brand font-black flex items-center gap-1.5 bg-brand/10 w-fit px-2 py-1 rounded-lg border border-brand/10">
                                                <Tag className="w-3 h-3" /> {t(expense.category as any)}
                                            </p>
                                            {expense.taxDeductible ? (
                                                <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-[10px] font-black uppercase bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 tracking-wider border border-emerald-200/50">
                                                    <CheckCircle className="w-3 h-3" /> {t('taxDeductible')}
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-[10px] font-black uppercase bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-600 tracking-wider border border-slate-200/50">
                                                    <XCircle className="w-3 h-3" /> {t('nonDeductible')}
                                                </span>
                                            )}
                                        </div>

                                        <button
                                            onClick={() => onDelete(expense.id)}
                                            className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-xl transition-all"
                                        >
                                            <Trash2 className="w-5 h-5" />
                                        </button>
                                    </div>
                                </motion.div>
                            ))
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </div>
    );
};

export default ExpenseManager;
