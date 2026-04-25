import React, { useState } from 'react';
import { Quote, Customer, Supplier, LineItem, Product } from '../types';
import { useDataStore } from '../store/useDataStore';
import { useAuthStore } from '../store/useAuthStore';
import { Plus, Trash2, Save, FileText, ArrowLeft, ChevronDown } from 'lucide-react';
import QuoteToInvoice from './QuoteToInvoice';

interface Props {
    supplier: Supplier;
    products: Product[];
}

const QuoteManager: React.FC<Props> = ({ supplier, products }) => {
    const { quotes, customers, saveQuote, deleteQuote, saveInvoice } = useDataStore();
    const { role } = useAuthStore();
    const [mode, setMode] = useState<'list' | 'create' | 'edit'>('list');
    const [activeQuote, setActiveQuote] = useState<Quote | null>(null);

    // Form State
    const [formData, setFormData] = useState<Quote | null>(null);

    const startNewQuote = () => {
        const newQuote: Quote = {
            id: crypto.randomUUID(),
            number: `Q-${new Date().getFullYear()}-${String(quotes.length + 1).padStart(3, '0')}`,
            supplier: supplier,
            customer: { id: '', name: '', addressLine1: '', city: '', zip: '', country: '', ico: '', dic: '', icDph: '', email: '' },
            issueDate: new Date().toISOString().split('T')[0],
            validUntil: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0], // +30 days
            items: [],
            notes: 'Quote is valid for 30 days.',
            status: 'Draft',
            totalAmount: 0
        };
        setFormData(newQuote);
        setMode('create');
    };

    const editQuote = (quote: Quote) => {
        setFormData({ ...quote });
        setMode('edit');
    };

    const handleSave = async () => {
        if (!formData) return;

        // Recalculate total
        const total = formData.items.reduce((acc, item) => {
            return acc + (item.quantity * item.unitPrice * (1 + item.vatRate / 100));
        }, 0);

        const toSave = { ...formData, totalAmount: total };
        await saveQuote(toSave);
        setMode('list');
    };

    const handleConvert = async (invoice: any) => {
        await saveInvoice(invoice);
        if (activeQuote) {
            await saveQuote({ ...activeQuote, status: 'Converted' });
        }
        alert('Quote converted to Invoice successfully!');
        setMode('list');
    };

    // --- Form Helpers ---
    const updateField = (field: keyof Quote, value: any) => {
        if (!formData) return;
        setFormData({ ...formData, [field]: value });
    };

    const updateCustomer = (field: keyof Customer, value: any) => {
        if (!formData) return;
        setFormData({ ...formData, customer: { ...formData.customer, [field]: value } });
    };

    const selectCustomer = (id: string) => {
        const cust = customers.find(c => c.id === id);
        if (cust && formData) {
            setFormData({ ...formData, customer: { ...cust } });
        }
    };

    const selectProduct = (productId: string) => {
        const prod = products.find(p => p.id === productId);
        if (prod && formData) {
            const newItem: LineItem = {
                id: Math.random().toString(36).substr(2, 9),
                description: prod.name,
                quantity: 1,
                unit: prod.unit,
                unitPrice: prod.unitPrice,
                vatRate: prod.vatRate,
                discount: 0
            };
            setFormData({ ...formData, items: [...formData.items, newItem] });
        }
    };

    const addItem = () => {
        if (!formData) return;
        const newItem: LineItem = {
            id: Math.random().toString(36).substr(2, 9),
            description: '', quantity: 1, unit: 'ks', unitPrice: 0, vatRate: 20, discount: 0
        };
        setFormData({ ...formData, items: [...formData.items, newItem] });
    };

    const updateItem = (id: string, field: keyof LineItem, value: any) => {
        if (!formData) return;
        const newItems = formData.items.map(i => i.id === id ? { ...i, [field]: value } : i);
        setFormData({ ...formData, items: newItems });
    };

    const deleteItem = (id: string) => {
        if (!formData) return;
        setFormData({ ...formData, items: formData.items.filter(i => i.id !== id) });
    };

    const baseInputClass = "w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none dark:bg-slate-800 dark:border-slate-700 dark:text-white";

    if (mode === 'list') {
        return (
            <div className="space-y-6">
                <div className="flex justify-between items-center">
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Quotes</h2>
                    {role !== 'accountant' && (
                        <button onClick={startNewQuote} className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2">
                            <Plus className="w-4 h-4" /> New Quote
                        </button>
                    )}
                </div>

                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 text-slate-500 uppercase font-bold text-xs">
                            <tr>
                                <th className="px-6 py-4">Number</th>
                                <th className="px-6 py-4">Customer</th>
                                <th className="px-6 py-4">Date</th>
                                <th className="px-6 py-4 text-right">Total</th>
                                <th className="px-6 py-4 text-center">Status</th>
                                <th className="px-6 py-4"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {quotes.map(quote => (
                                <tr key={quote.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer" onClick={() => { setActiveQuote(quote); editQuote(quote); }}>
                                    <td className="px-6 py-4 font-bold text-indigo-600">{quote.number}</td>
                                    <td className="px-6 py-4 dark:text-slate-300">{quote.customer.name}</td>
                                    <td className="px-6 py-4 text-slate-500">{quote.issueDate}</td>
                                    <td className="px-6 py-4 text-right font-bold dark:text-white">
                                        {new Intl.NumberFormat('sk-SK', { style: 'currency', currency: 'EUR' }).format(quote.totalAmount || 0)}
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <span className={`px-2 py-1 rounded-full text-xs font-bold uppercase
                                    ${quote.status === 'Converted' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'}
                                `}>{quote.status}</span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        {role !== 'accountant' && (
                                            <Trash2 className="w-4 h-4 ml-auto text-slate-400 hover:text-red-500" onClick={(e) => { e.stopPropagation(); deleteQuote(quote.id); }} />
                                        )}
                                    </td>
                                </tr>
                            ))}
                            {quotes.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="px-6 py-8 text-center text-slate-500">No quotes found. Create one above.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        );
    }

    // --- Create / Edit Mode ---
    if (!formData) return null;

    return (
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 overflow-hidden max-w-5xl mx-auto my-4 transition-colors">
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900">
                <button onClick={() => setMode('list')} className="text-slate-500 hover:text-indigo-600 flex items-center gap-2 text-sm font-bold">
                    <ArrowLeft className="w-4 h-4" /> Back to List
                </button>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                    {mode === 'create' ? 'New Quote' : `Edit Quote ${formData.number}`}
                </h2>
            </div>

            <div className="p-6 space-y-8">
                {/* Quote-to-Invoice Action */}
                {mode === 'edit' && formData.status !== 'Converted' && (
                    <QuoteToInvoice quote={formData} onConvert={handleConvert} />
                )}

                {/* Quote Info */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Quote Number</label>
                        <input value={formData.number} onChange={e => updateField('number', e.target.value)} className={baseInputClass} />
                    </div>
                    <div>
                        <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Valid Until</label>
                        <input type="date" value={formData.validUntil} onChange={e => updateField('validUntil', e.target.value)} className={baseInputClass} />
                    </div>
                    <div>
                        <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Status</label>
                        <select value={formData.status} onChange={e => updateField('status', e.target.value)} className={baseInputClass}>
                            <option value="Draft">Draft</option>
                            <option value="Sent">Sent</option>
                            <option value="Accepted">Accepted</option>
                            <option value="Rejected">Rejected</option>
                            <option value="Converted">Converted</option>
                        </select>
                    </div>
                </div>

                {/* Customer */}
                <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                    <div className="flex justify-between items-center">
                        <h3 className="font-bold text-slate-900 dark:text-white">Customer</h3>
                        <select onChange={e => selectCustomer(e.target.value)} className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-sm dark:bg-slate-800 dark:border-slate-700">
                            <option value="">Select Existing...</option>
                            {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <input placeholder="Company Name" value={formData.customer.name} onChange={e => updateCustomer('name', e.target.value)} className={baseInputClass} />
                        <input placeholder="Email" value={formData.customer.email} onChange={e => updateCustomer('email', e.target.value)} className={baseInputClass} />
                        <input placeholder="Address" value={formData.customer.addressLine1} onChange={e => updateCustomer('addressLine1', e.target.value)} className={baseInputClass} />
                        <input placeholder="City" value={formData.customer.city} onChange={e => updateCustomer('city', e.target.value)} className={baseInputClass} />
                        <input placeholder="Zip" value={formData.customer.zip} onChange={e => updateCustomer('zip', e.target.value)} className={baseInputClass} />
                        <input placeholder="ICO" value={formData.customer.ico} onChange={e => updateCustomer('ico', e.target.value)} className={baseInputClass} />
                    </div>
                </div>

                {/* Items */}
                <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                    <div className="flex justify-between items-center">
                        <h3 className="font-bold text-slate-900 dark:text-white">Items</h3>
                        <div className="flex items-center gap-3">
                            <select
                                onChange={e => {
                                    if (e.target.value) {
                                        selectProduct(e.target.value);
                                        e.target.value = "";
                                    }
                                }}
                                className="bg-emerald-50 border border-emerald-100 rounded-lg px-2 py-1 text-sm dark:bg-emerald-900/30 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 font-bold"
                            >
                                <option value="">+ Pick from Library</option>
                                {products.map(p => <option key={p.id} value={p.id}>{p.name} ({p.unitPrice}€)</option>)}
                            </select>
                            <button onClick={addItem} className="text-indigo-600 text-sm font-bold flex items-center gap-1"><Plus className="w-4 h-4" /> Add Custom</button>
                        </div>
                    </div>
                    {formData.items.map((item, idx) => (
                        <div key={item.id} className="grid grid-cols-12 gap-2 items-center">
                            <div className="col-span-5">
                                <input placeholder="Description" value={item.description} onChange={e => updateItem(item.id, 'description', e.target.value)} className={baseInputClass} />
                            </div>
                            <div className="col-span-2">
                                <input type="number" placeholder="Qty" value={item.quantity} onChange={e => updateItem(item.id, 'quantity', parseFloat(e.target.value) || 0)} className={baseInputClass} />
                            </div>
                            <div className="col-span-2">
                                <input type="number" placeholder="Price" value={item.unitPrice} onChange={e => updateItem(item.id, 'unitPrice', parseFloat(e.target.value) || 0)} className={baseInputClass} />
                            </div>
                            <div className="col-span-2">
                                <input type="number" placeholder="VAT" value={item.vatRate} onChange={e => updateItem(item.id, 'vatRate', parseFloat(e.target.value) || 0)} className={baseInputClass} />
                            </div>
                            <div className="col-span-1 text-right">
                                <button onClick={() => deleteItem(item.id)} className="text-slate-400 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="pt-6 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3">
                    <button onClick={() => setMode('list')} className="px-6 py-3 text-slate-600 dark:text-slate-400 font-bold">Cancel</button>
                    <button onClick={handleSave} className="px-8 py-3 bg-indigo-600 text-white rounded-xl font-bold shadow-lg hover:bg-indigo-700 flex items-center gap-2">
                        <Save className="w-4 h-4" /> Save Quote
                    </button>
                </div>
            </div>
        </div>
    );
};

export default QuoteManager;
