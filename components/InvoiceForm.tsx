import React, { useState, useEffect } from 'react';
import { Invoice, Customer, LineItem, Product, Supplier } from '../types';
import { Plus, Trash2, Wand2, Loader2, ChevronDown, Save, AlertCircle, Clock, RotateCcw, X, GripVertical, Calendar, CreditCard } from 'lucide-react';
import { generateInvoiceFromPrompt } from '../services/geminiService';
import { COUNTRY_OPTIONS } from '../constants';

import { useAppStore } from '../store/useAppStore';

interface InvoiceFormProps {
    initialInvoice: Invoice;
    products: Product[];
    customers: Customer[];
    onSave: (invoice: Invoice) => Promise<void>;
    onCancel: () => void;
}

const UNIT_OPTIONS = [
    { value: 'ks', label: 'ks (pcs)' },
    { value: 'h', label: 'hod (hours)' },
    { value: 'm', label: 'm (meters)' },
    { value: 'm2', label: 'm²' },
    { value: 'kg', label: 'kg' },
    { value: 'km', label: 'km' },
    { value: 'bal', label: 'bal (pkg)' },
    { value: 'mes', label: 'mes (mo)' },
    { value: 'set', label: 'set' },
    { value: 'den', label: 'den (day)' },
];

const PAYMENT_METHODS = [
    'Bank Transfer',
    'Cash',
    'Credit Card',
    'PayPal',
    'Direct Debit'
];

const AUTOSAVE_KEY = 'garsia_invoice_autosave_draft';

const INVOICE_STATUSES = [
    { value: 'Draft', label: 'Draft', color: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400' },
    { value: 'Complete', label: 'Complete', color: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' },
    { value: 'Paid', label: 'Paid', color: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400' },
    { value: 'Unpaid', label: 'Unpaid', color: 'bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400' },
];

const DateInput: React.FC<{
    label: string;
    value: string;
    onChange: (val: string) => void;
    language: string;
    className?: string;
    labelClass?: string;
}> = ({ label, value, onChange, language, className, labelClass }) => {
    const [textValue, setTextValue] = useState(value);

    // Sync text value with parent value when not editing (or initial load)
    useEffect(() => {
        if (language === 'sk') {
            if (value && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
                const [y, m, d] = value.split('-');
                setTextValue(`${d}/${m}/${y}`);
            } else if (!value) {
                setTextValue('');
            }
        }
    }, [value, language]);

    const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        setTextValue(val);

        // Try to parse DD/MM/YYYY
        // Allow flexible separator . or / or -
        const match = val.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/);
        if (match) {
            const d = match[1].padStart(2, '0');
            const m = match[2].padStart(2, '0');
            const y = match[3];
            onChange(`${y}-${m}-${d}`);
        } else if (val === '') {
            onChange('');
        }
    };

    if (language === 'sk') {
        return (
            <div>
                <label className={labelClass}>{label}</label>
                <div className="relative">
                    <input
                        type="text"
                        value={textValue}
                        onChange={handleTextChange}
                        placeholder="DD/MM/YYYY"
                        className={`${className} pr-10`}
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer">
                        <div className="relative">
                            <Calendar className="w-5 h-5 text-slate-400 hover:text-amber-500 transition-colors" />
                            <input
                                type="date"
                                value={value}
                                onChange={(e) => onChange(e.target.value)}
                                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                            />
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div>
            <label className={labelClass}>{label}</label>
            <input
                type="date"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className={className}
            />
        </div>
    );
};

const InvoiceForm: React.FC<InvoiceFormProps> = ({ initialInvoice, customers, products, onSave, onCancel }) => {
    const { t, language } = useAppStore();
    const [invoice, setInvoice] = useState<Invoice>(initialInvoice);
    const [prompt, setPrompt] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [lastAutoSave, setLastAutoSave] = useState<Date | null>(null);
    const [foundDraft, setFoundDraft] = useState<Invoice | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [saveError, setSaveError] = useState<string | null>(null);

    // Build unified bank account list from initialInvoice.supplier (stable — never changes on re-render)
    // Using initialInvoice ensures the list stays consistent when the user switches accounts
    const allBankAccounts: { id: string; bankName: string; iban: string; swift: string; label?: string }[] = [
        ...(initialInvoice.supplier.bankName ? [{
            id: '__default__',
            bankName: initialInvoice.supplier.bankName,
            iban: initialInvoice.supplier.iban || '',
            swift: initialInvoice.supplier.swift || '',
            label: `Default — ${initialInvoice.supplier.bankName}`
        }] : []),
        ...(initialInvoice.supplier.bankAccounts || []).map(
            a => ({ id: a.id, bankName: a.bankName, iban: a.iban, swift: a.swift, label: a.label })
        )
    ];
    // Track which account is currently selected based on live invoice state
    const selectedBankId = allBankAccounts.find(a => a.iban === invoice.supplier.iban)?.id || '';

    // Load Draft Logic
    useEffect(() => {
        const saved = localStorage.getItem(AUTOSAVE_KEY);
        if (saved) {
            try {
                const parsedDraft = JSON.parse(saved);
                if (parsedDraft && parsedDraft.items && Array.isArray(parsedDraft.items)) {
                    if (parsedDraft.id === initialInvoice.id || initialInvoice.status === 'Draft') {
                        setFoundDraft(parsedDraft);
                    }
                }
            } catch (e) {
                console.error("Failed to parse auto-saved draft", e);
            }
        }
    }, [initialInvoice.id, initialInvoice.status]);

    // Auto-Save Interval
    useEffect(() => {
        const intervalId = setInterval(() => {
            localStorage.setItem(AUTOSAVE_KEY, JSON.stringify(invoice));
            setLastAutoSave(new Date());
        }, 30000);

        return () => clearInterval(intervalId);
    }, [invoice]);

    const handleRestoreDraft = () => {
        if (foundDraft) {
            setInvoice(foundDraft);
            setFoundDraft(null);
            setLastAutoSave(new Date());
        }
    };

    const handleDiscardDraft = () => {
        localStorage.removeItem(AUTOSAVE_KEY);
        setFoundDraft(null);
    };

    const handleFinalSave = async () => {
        setIsSaving(true);
        setSaveError(null);
        try {
            await onSave(invoice);
            localStorage.removeItem(AUTOSAVE_KEY);
        } catch (error: any) {
            console.error("Save failed:", error);
            setSaveError(error.message || "Failed to save invoice. Please try again.");
            alert("Error saving invoice: " + (error.message || "Unknown error"));
        } finally {
            setIsSaving(false);
        }
    };

    const handleFinalCancel = () => {
        localStorage.removeItem(AUTOSAVE_KEY);
        onCancel();
    };

    const handleAiGenerate = async () => {
        if (!prompt) return;
        setIsGenerating(true);
        const generatedData = await generateInvoiceFromPrompt(prompt, invoice.supplier);
        setIsGenerating(false);

        if (generatedData) {
            setInvoice(prev => ({
                ...prev,
                ...generatedData,
                items: (generatedData.items as any[])?.map((item: any) => ({
                    ...item,
                    id: Math.random().toString(36).substr(2, 9),
                    unit: item.unit || 'ks',
                    discount: item.discount || 0
                })) || prev.items
            }));
        }
    };

    const updateField = (field: keyof Invoice, value: any) => {
        setInvoice({ ...invoice, [field]: value });
    };

    const handleNumberChange = (value: string) => {
        setInvoice(prev => {
            const digits = value.replace(/\D/g, '');
            const prevDigits = prev.number.replace(/\D/g, '');

            let newVs = prev.variableSymbol;
            if (!prev.variableSymbol || prev.variableSymbol === prevDigits) {
                newVs = digits;
            }

            return { ...prev, number: value, variableSymbol: newVs };
        });
    };

    const updateCustomer = (field: keyof Customer, value: any) => {
        setInvoice({
            ...invoice,
            customer: { ...invoice.customer, [field]: value }
        });
    };

    const updateSupplier = (field: keyof Supplier, value: any) => {
        setInvoice({
            ...invoice,
            supplier: { ...invoice.supplier, [field]: value }
        });
    };

    const selectProduct = (productId: string) => {
        const prod = products.find(p => p.id === productId);
        if (prod) {
            const newItem: LineItem = {
                id: Math.random().toString(36).substr(2, 9),
                description: prod.name,
                quantity: 1,
                unit: prod.unit,
                unitPrice: prod.unitPrice,
                vatRate: prod.vatRate,
                discount: 0
            };
            setInvoice({ ...invoice, items: [...invoice.items, newItem] });
        }
    };

    const addItem = () => {
        const newItem: LineItem = {
            id: Math.random().toString(36).substr(2, 9),
            description: '',
            quantity: 1,
            unit: 'ks',
            unitPrice: 0,
            vatRate: 20,
            discount: 0
        };
        setInvoice({ ...invoice, items: [...invoice.items, newItem] });
    };

    const updateItem = (id: string, field: keyof LineItem, value: any) => {
        const newItems = invoice.items.map(item =>
            item.id === id ? { ...item, [field]: value } : item
        );
        setInvoice({ ...invoice, items: newItems });
    };

    const deleteItem = (id: string) => {
        setInvoice({ ...invoice, items: invoice.items.filter(i => i.id !== id) });
    };

    const selectCustomer = (customerId: string) => {
        const cust = customers.find(c => c.id === customerId);
        if (cust) {
            const { shippingAddress, ...restInvoice } = invoice;
            setInvoice({
                ...restInvoice,
                customer: { ...cust },
                ...(cust.shippingAddress ? { shippingAddress: { ...cust.shippingAddress } } : {})
            });
        }
    };

    const baseInputClass = "w-full bg-white text-slate-900 border border-slate-200 rounded-lg shadow-sm focus:border-slate-400 focus:ring-1 focus:ring-slate-300 px-3 py-2.5 transition-all outline-none placeholder-slate-400 text-sm h-[42px]";
    const labelClass = "block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5";

    return (
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 overflow-hidden max-w-5xl mx-auto my-4 md:my-8 relative transition-colors">

            {/* Restore Draft Banner */}
            {foundDraft && (
                <div className="bg-amber-50 dark:bg-amber-900/20 border-b border-amber-100 dark:border-amber-800/50 p-4 flex flex-col md:flex-row items-center justify-between gap-4 animate-fade-in">
                    <div className="flex items-center gap-3">
                        <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-500" />
                        <div>
                            <p className="text-sm font-bold text-amber-800 dark:text-amber-400">Unsaved draft found</p>
                            <p className="text-xs text-amber-600 dark:text-amber-500/80">
                                We found an unsaved invoice ({foundDraft.number}) with {foundDraft.items.length} items.
                            </p>
                        </div>
                    </div>
                    <div className="flex gap-2 w-full md:w-auto">
                        <button
                            onClick={handleDiscardDraft}
                            className="flex-1 md:flex-none justify-center px-3 py-1.5 text-xs font-bold text-amber-700 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/30 rounded-lg flex items-center gap-1 transition-colors"
                        >
                            <X className="w-3 h-3" /> Discard
                        </button>
                        <button
                            onClick={handleRestoreDraft}
                            className="flex-1 md:flex-none justify-center px-4 py-1.5 text-xs font-bold bg-amber-600 text-white hover:bg-amber-700 rounded-lg flex items-center gap-1 shadow-sm transition-colors"
                        >
                            <RotateCcw className="w-3 h-3" /> Restore Draft
                        </button>
                    </div>
                </div>
            )}

            {/* AI Bar - Stacked on Mobile */}
            <div className="bg-slate-50 p-4 md:p-6 border-b border-slate-200 flex flex-col md:flex-row gap-4 items-center">
                <div className="flex items-center gap-3 text-slate-800 font-bold w-full md:w-auto">
                    <div className="p-2 bg-slate-900 text-white rounded-lg">
                        <Wand2 className="w-5 h-5" />
                    </div>
                    {t('assistant')}
                </div>
                <div className="flex-1 w-full relative">
                    <input
                        type="text"
                        placeholder="e.g., 'Bill ACME for 5 hours of consulting at 50eur'"
                        className="w-full bg-white text-slate-900 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400 shadow-sm placeholder-slate-400"
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleAiGenerate()}
                    />
                </div>
                <button
                    onClick={handleAiGenerate}
                    disabled={isGenerating || !prompt}
                    className="w-full md:w-auto bg-slate-900 text-white px-6 py-3 rounded-xl text-sm font-bold hover:bg-black disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg transition-all"
                >
                    {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : t('generate')}
                </button>
            </div>

            <div className="p-4 md:p-10 space-y-6 md:space-y-12">

                {/* 1. Invoice Metadata */}
                <section className="bg-amber-50/50 p-6 rounded-2xl border border-amber-100">
                    <h3 className="text-sm font-black text-amber-900 mb-6 flex items-center gap-3 tracking-widest uppercase">
                        <span className="w-8 h-[2px] bg-amber-600"></span>
                        {t('invoiceDetails')}
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                        <div className="md:col-span-2">
                            <label className={labelClass}>Invoice Number</label>
                            <input
                                type="text"
                                value={invoice.number}
                                onChange={e => handleNumberChange(e.target.value)}
                                className={`${baseInputClass} font-mono font-bold text-slate-900`}
                            />
                        </div>
                        <div>
                            <label className={labelClass}>{t('status')}</label>
                            <div className="relative">
                                <select
                                    value={invoice.status}
                                    onChange={e => updateField('status', e.target.value)}
                                    className={`${baseInputClass} appearance-none cursor-pointer pr-10 font-bold`}
                                >
                                    {INVOICE_STATUSES.map(s => (
                                        <option key={s.value} value={s.value}>{s.label}</option>
                                    ))}
                                </select>
                                <ChevronDown className="w-4 h-4 text-slate-500 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                            </div>
                        </div>
                        <div>
                            <label className={labelClass}>{t('recurring')}</label>
                            <div className="relative">
                                <select
                                    value={invoice.recurringFrequency || 'none'}
                                    onChange={e => updateField('recurringFrequency', e.target.value)}
                                    className={`${baseInputClass} appearance-none cursor-pointer pr-10`}
                                >
                                    <option value="none">None</option>
                                    <option value="monthly">Monthly</option>
                                    <option value="quarterly">Quarterly</option>
                                </select>
                                <ChevronDown className="w-4 h-4 text-slate-500 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mt-6">
                        <div>
                            <label className={labelClass}>{t('variableSymbol')}</label>
                            <input
                                value={invoice.variableSymbol}
                                onChange={e => updateField('variableSymbol', e.target.value)}
                                className={`${baseInputClass} font-mono`}
                                placeholder="Same as Invoice #"
                            />
                        </div>
                        <div>
                            <label className={labelClass}>{t('constantSymbol')}</label>
                            <input
                                value={invoice.constantSymbol}
                                onChange={e => updateField('constantSymbol', e.target.value)}
                                className={`${baseInputClass} font-mono`}
                                placeholder="0308"
                            />
                        </div>
                        <div>
                            <label className={labelClass}>{t('specificSymbol')}</label>
                            <input
                                value={invoice.specificSymbol}
                                onChange={e => updateField('specificSymbol', e.target.value)}
                                className={`${baseInputClass} font-mono`}
                            />
                        </div>
                        <div>
                            <label className={labelClass}>Reference Number</label>
                            <input
                                value={invoice.referenceNumber || ''}
                                onChange={e => updateField('referenceNumber', e.target.value)}
                                className={`${baseInputClass} font-mono`}
                                placeholder="REF-123"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 mt-6">
                        <DateInput
                            label={t('issueDate')}
                            value={invoice.issueDate}
                            onChange={(val) => updateField('issueDate', val)}
                            language={language}
                            className={baseInputClass}
                            labelClass={labelClass}
                        />
                        <DateInput
                            label={t('deliveryDate')}
                            value={invoice.deliveryDate}
                            onChange={(val) => updateField('deliveryDate', val)}
                            language={language}
                            className={baseInputClass}
                            labelClass={labelClass}
                        />
                        <DateInput
                            label={t('dueDate')}
                            value={invoice.dueDate}
                            onChange={(val) => updateField('dueDate', val)}
                            language={language}
                            className={baseInputClass}
                            labelClass={labelClass}
                        />
                        <div>
                            <label className={labelClass}>{t('paymentMethod')}</label>
                            <div className="relative">
                                <select
                                    value={invoice.paymentMethod || 'Bank Transfer'}
                                    onChange={e => updateField('paymentMethod', e.target.value)}
                                    className={`${baseInputClass} appearance-none cursor-pointer pr-10`}
                                >
                                    {PAYMENT_METHODS.map(method => (
                                        <option key={method} value={method}>{method}</option>
                                    ))}
                                </select>
                                <ChevronDown className="w-4 h-4 text-slate-500 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                            </div>
                        </div>
                    </div>
                </section>

                {/* 2. Addresses (Supplier & Customer) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-12">
                    {/* Supplier section */}
                    <section className="bg-amber-50/50 p-6 rounded-2xl border border-amber-100 h-full">
                        <h3 className="text-sm font-black text-amber-900 mb-6 flex items-center gap-3 tracking-widest uppercase">
                            <span className="w-8 h-[2px] bg-amber-600"></span>
                            {t('supplierInformation')}
                        </h3>
                        <div className="space-y-4">
                            <div>
                                <label className={labelClass}>{t('companyName')}</label>
                                <input
                                    value={invoice.supplier.name}
                                    onChange={e => updateSupplier('name', e.target.value)}
                                    className={baseInputClass}
                                />
                            </div>
                            <div>
                                <label className={labelClass}>{t('address')}</label>
                                <input
                                    value={invoice.supplier.addressLine1}
                                    onChange={e => updateSupplier('addressLine1', e.target.value)}
                                    className={baseInputClass}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <input
                                    placeholder="City"
                                    value={invoice.supplier.city}
                                    onChange={e => updateSupplier('city', e.target.value)}
                                    className={baseInputClass}
                                />
                                <input
                                    placeholder="ZIP"
                                    value={invoice.supplier.zip}
                                    onChange={e => updateSupplier('zip', e.target.value)}
                                    className={baseInputClass}
                                />
                            </div>
                            <div className="grid grid-cols-3 gap-4 border-t border-slate-100 pt-4">
                                <div>
                                    <label className={labelClass}>{t('ico')}</label>
                                    <input value={invoice.supplier.ico} onChange={e => updateSupplier('ico', e.target.value)} className={baseInputClass} />
                                </div>
                                <div>
                                    <label className={labelClass}>{t('dic')}</label>
                                    <input value={invoice.supplier.dic} onChange={e => updateSupplier('dic', e.target.value)} className={baseInputClass} />
                                </div>
                                <div>
                                    <label className={labelClass}>{t('icDph')}</label>
                                    <input value={invoice.supplier.icDph} onChange={e => updateSupplier('icDph', e.target.value)} className={baseInputClass} />
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* Customer section */}
                    <section className="bg-amber-50/50 p-6 rounded-2xl border border-amber-100 h-full">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-sm font-black text-amber-900 flex items-center gap-3 tracking-widest uppercase">
                                <span className="w-8 h-[2px] bg-amber-600"></span>
                                {t('customerInformation')}
                            </h3>
                            <button
                                onClick={() => {
                                    // Could show a dropdown or modal, but for now we have selectCustomer logic
                                }}
                                className="text-[10px] font-bold text-slate-400 uppercase tracking-widest hover:text-slate-900 transition-colors"
                            >
                                {t('loadSaved')}
                            </button>
                        </div>
                        <div className="space-y-4">
                            <div className="relative">
                                <select
                                    className="w-full appearance-none bg-slate-50 text-slate-600 border border-slate-200 rounded-lg px-3 h-[42px] text-xs font-bold mb-4 focus:bg-white transition-colors"
                                    onChange={(e) => selectCustomer(e.target.value)}
                                    defaultValue=""
                                >
                                    <option value="" disabled>{t('selectFromDatabase')}</option>
                                    {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className={labelClass}>{t('companyName')}</label>
                                <input
                                    value={invoice.customer.name}
                                    onChange={e => updateCustomer('name', e.target.value)}
                                    className={baseInputClass}
                                />
                            </div>
                            <div>
                                <label className={labelClass}>{t('address')}</label>
                                <input
                                    value={invoice.customer.addressLine1}
                                    onChange={e => updateCustomer('addressLine1', e.target.value)}
                                    className={baseInputClass}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <input
                                    placeholder="City"
                                    value={invoice.customer.city}
                                    onChange={e => updateCustomer('city', e.target.value)}
                                    className={baseInputClass}
                                />
                                <input
                                    placeholder="ZIP"
                                    value={invoice.customer.zip}
                                    onChange={e => updateCustomer('zip', e.target.value)}
                                    className={baseInputClass}
                                />
                            </div>
                            <div className="grid grid-cols-3 gap-4 border-t border-slate-100 pt-4">
                                <div>
                                    <label className={labelClass}>{t('ico')}</label>
                                    <input value={invoice.customer.ico} onChange={e => updateCustomer('ico', e.target.value)} className={baseInputClass} />
                                </div>
                                <div>
                                    <label className={labelClass}>{t('dic')}</label>
                                    <input value={invoice.customer.dic} onChange={e => updateCustomer('dic', e.target.value)} className={baseInputClass} />
                                </div>
                                <div>
                                    <label className={labelClass}>{t('icDph')}</label>
                                    <input value={invoice.customer.icDph} onChange={e => updateCustomer('icDph', e.target.value)} className={baseInputClass} />
                                </div>
                            </div>
                        </div>
                    </section>
                </div>

                {/* 3. Bank & Payment details */}
                <section className="bg-amber-50/50 p-8 rounded-2xl border border-amber-100">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-sm font-black text-amber-900 flex items-center gap-3 tracking-widest uppercase">
                            <span className="w-8 h-[2px] bg-amber-600"></span>
                            {t('bankDetails')}
                        </h3>
                        {allBankAccounts.length > 1 && (
                            <div className="relative group">
                                <select
                                    value={selectedBankId}
                                    onChange={(e) => {
                                        const acc = allBankAccounts.find(a => a.id === e.target.value);
                                        if (acc) {
                                            setInvoice(prev => ({
                                                ...prev,
                                                supplier: {
                                                    ...prev.supplier,
                                                    bankName: acc.bankName,
                                                    iban: acc.iban,
                                                    swift: acc.swift
                                                }
                                            }));
                                        }
                                    }}
                                    className="appearance-none bg-white/50 backdrop-blur-sm text-amber-900 border border-amber-200 rounded-xl pl-4 pr-10 py-2 text-[10px] font-black uppercase tracking-widest hover:bg-amber-100 hover:border-amber-300 transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-amber-200/50 shadow-sm"
                                >
                                    {allBankAccounts.map(acc => (
                                        <option key={acc.id} value={acc.id}>{acc.label || acc.bankName}</option>
                                    ))}
                                </select>
                                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                                    <CreditCard className="w-3.5 h-3.5 text-amber-600" />
                                </div>
                            </div>
                        )}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div>
                            <label className={labelClass}>{t('bankName')}</label>
                            <input value={invoice.supplier.bankName} onChange={e => updateSupplier('bankName', e.target.value)} className={baseInputClass} />
                        </div>
                        <div>
                            <label className={labelClass}>{t('iban')}</label>
                            <input value={invoice.supplier.iban} onChange={e => updateSupplier('iban', e.target.value)} className={`${baseInputClass} font-mono`} />
                        </div>
                        <div>
                            <label className={labelClass}>{t('swift')}</label>
                            <input value={invoice.supplier.swift} onChange={e => updateSupplier('swift', e.target.value)} className={`${baseInputClass} font-mono`} />
                        </div>
                    </div>
                </section>


                <hr className="border-slate-100 dark:border-slate-800" />

                {/* 4. Line Items */}
                <section>
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                        <h3 className="text-sm font-black text-slate-800 flex items-center gap-3 tracking-widest uppercase">
                            <span className="w-8 h-[2px] bg-slate-800"></span>
                            {t('items')}
                        </h3>
                        <div className="flex gap-2 w-full md:w-auto">
                            <select
                                className="flex-1 md:w-64 appearance-none bg-amber-50 text-amber-700 border border-amber-100 rounded-lg px-4 py-2 text-sm font-medium cursor-pointer"
                                onChange={(e) => selectProduct(e.target.value)}
                                defaultValue=""
                            >
                                <option value="" disabled>{t('pickLibrary')}</option>
                                {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                            </select>
                            <button onClick={addItem} className="text-white bg-slate-900 hover:bg-black px-4 py-2 rounded-lg text-sm font-bold transition-colors flex items-center gap-2">
                                <Plus className="w-4 h-4" /> {t('addItem')}
                            </button>
                        </div>
                    </div>

                    <div className="space-y-4">
                        {/* Desktop Header */}
                        <div className="hidden lg:grid grid-cols-[6fr_60px_80px_110px_90px_80px_40px] gap-4 px-4 py-3 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest items-center">
                            <div>{t('description')}</div>
                            <div className="text-center">{t('quantity')}</div>
                            <div className="text-center">{t('unit')}</div>
                            <div className="text-right">{t('price')}</div>
                            <div className="text-right">{t('vat')} %</div>
                            <div className="text-right">{t('discount')} %</div>
                            <div></div>
                        </div>

                        <div className="space-y-3">
                            {invoice.items.map((item) => (
                                <div key={item.id} className="relative group animate-fade-in">
                                    {/* Mobile View: Card Style */}
                                    <div className="lg:hidden p-4 bg-white border border-slate-200 rounded-xl shadow-sm space-y-3">
                                        <div className="flex justify-between items-start gap-4">
                                            <div className="flex-1">
                                                <label className={labelClass}>{t('description')}</label>
                                                <input
                                                    type="text"
                                                    value={item.description}
                                                    onChange={e => updateItem(item.id, 'description', e.target.value)}
                                                    className={baseInputClass}
                                                    placeholder="Item description"
                                                />
                                            </div>
                                            <button
                                                onClick={() => deleteItem(item.id)}
                                                className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                            >
                                                <Trash2 className="w-5 h-5" />
                                            </button>
                                        </div>

                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <label className={labelClass}>{t('quantity')}</label>
                                                <input
                                                    type="number"
                                                    value={item.quantity}
                                                    onChange={e => updateItem(item.id, 'quantity', parseFloat(e.target.value) || 0)}
                                                    className={baseInputClass}
                                                />
                                            </div>
                                            <div>
                                                <label className={labelClass}>{t('unit')}</label>
                                                <select
                                                    value={item.unit}
                                                    onChange={e => updateItem(item.id, 'unit', e.target.value)}
                                                    className={baseInputClass}
                                                >
                                                    {UNIT_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                                                </select>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <label className={labelClass}>{t('price')}</label>
                                                <input
                                                    type="number"
                                                    value={item.unitPrice}
                                                    onChange={e => updateItem(item.id, 'unitPrice', parseFloat(e.target.value) || 0)}
                                                    className={baseInputClass}
                                                />
                                            </div>
                                            <div>
                                                <label className={labelClass}>{t('vat')}</label>
                                                <input
                                                    type="number"
                                                    value={item.vatRate}
                                                    onChange={e => updateItem(item.id, 'vatRate', parseFloat(e.target.value) || 0)}
                                                    className={baseInputClass}
                                                />
                                            </div>
                                            <div>
                                                <label className={labelClass}>{t('discount')} %</label>
                                                <input
                                                    type="number"
                                                    value={item.discount || 0}
                                                    onChange={e => updateItem(item.id, 'discount', parseFloat(e.target.value) || 0)}
                                                    className={baseInputClass}
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Desktop View: Grid Row */}
                                    <div className="hidden lg:grid grid-cols-[6fr_60px_80px_110px_90px_80px_40px] gap-4 items-center px-2">
                                        <input
                                            type="text"
                                            value={item.description}
                                            onChange={e => updateItem(item.id, 'description', e.target.value)}
                                            className={baseInputClass}
                                            placeholder="Description"
                                        />
                                        <input
                                            type="number"
                                            value={item.quantity}
                                            onChange={e => updateItem(item.id, 'quantity', parseFloat(e.target.value) || 0)}
                                            className={`${baseInputClass} text-center font-mono`}
                                        />
                                        <select
                                            value={item.unit}
                                            onChange={e => updateItem(item.id, 'unit', e.target.value)}
                                            className={baseInputClass}
                                        >
                                            {UNIT_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                                        </select>
                                        <input
                                            type="number"
                                            value={item.unitPrice}
                                            onChange={e => updateItem(item.id, 'unitPrice', parseFloat(e.target.value) || 0)}
                                            className={`${baseInputClass} text-right font-mono`}
                                        />
                                        <div className="relative">
                                            <input
                                                type="number"
                                                value={item.vatRate}
                                                onChange={e => updateItem(item.id, 'vatRate', parseFloat(e.target.value) || 0)}
                                                className={`${baseInputClass} text-right pr-6 font-mono`}
                                            />
                                            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-300 text-[10px] font-bold">%</span>
                                        </div>
                                        <div className="relative">
                                            <input
                                                type="number"
                                                value={item.discount || 0}
                                                onChange={e => updateItem(item.id, 'discount', parseFloat(e.target.value) || 0)}
                                                className={`${baseInputClass} text-right pr-6 font-mono`}
                                            />
                                            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-300 text-[10px] font-bold">%</span>
                                        </div>
                                        <button
                                            onClick={() => deleteItem(item.id)}
                                            className="text-slate-300 hover:text-red-500 hover:bg-red-50 p-2 rounded-lg transition-colors flex justify-center"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {invoice.items.length === 0 && (
                            <div className="text-center py-12 bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl text-slate-400 text-sm italic">
                                No items added yet. Search products or add a custom row above.
                            </div>
                        )}
                    </div>
                </section>

                <hr className="border-slate-100" />

                <section>
                    <label className={labelClass}>{t('notes')}</label>
                    <textarea
                        rows={3}
                        value={invoice.notes}
                        onChange={e => updateField('notes', e.target.value)}
                        className={`${baseInputClass} h-auto min-h-[100px] py-4`}
                        placeholder="Payment terms, thank you note, etc."
                    />
                </section>

                <div className="flex flex-col-reverse md:flex-row justify-end gap-3 mt-8 pt-10 border-t-2 border-slate-900/5">
                    <button
                        onClick={handleFinalCancel}
                        className="w-full md:w-auto px-8 py-3 text-slate-400 hover:text-slate-900 font-black uppercase tracking-widest text-[10px] transition-all"
                    >
                        {t('cancel')}
                    </button>
                    <button
                        onClick={handleFinalSave}
                        disabled={isSaving}
                        className="w-full md:w-auto px-10 py-3 bg-slate-900 text-white hover:bg-black rounded-xl font-black uppercase tracking-widest text-[10px] shadow-xl shadow-slate-200 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        {isSaving ? t('saving') || 'Saving...' : t('save')}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default InvoiceForm;