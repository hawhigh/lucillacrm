import React, { useState, useMemo } from 'react';
import { Customer } from '../types';
import { Plus, Edit2, Trash2, X, Save, Search, Building2, Mail, ChevronDown, ArrowUpDown, Sparkles, Upload, ScanLine, Loader2, FileText, Clipboard } from 'lucide-react';
import { COUNTRY_OPTIONS } from '../constants';
import { useAppStore } from '../store/useAppStore';
import { motion, AnimatePresence } from 'framer-motion';
import { fetchCompanyData } from '../services/slovakDataService';

interface Props {
    customers: Customer[];
    onSave: (customer: Customer) => void;
    onDelete: (id: string) => void;
}

type SortField = 'name' | 'email' | 'city' | 'ico';
type SortOrder = 'asc' | 'desc';

const CustomerManager: React.FC<Props> = ({ customers, onSave, onDelete }) => {
    const { t } = useAppStore();
    const [isEditing, setIsEditing] = useState(false);
    const [currentCustomer, setCurrentCustomer] = useState<Customer | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [sortField, setSortField] = useState<SortField>('name');
    const [sortOrder, setSortOrder] = useState<SortOrder>('asc');

    const handleEdit = (customer: Customer) => {
        setCurrentCustomer(customer);
        setIsEditing(true);
    };

    const handleAdd = () => {
        setCurrentCustomer({
            id: Math.random().toString(36).substr(2, 9),
            name: '',
            addressLine1: '',
            addressLine2: '',
            city: '',
            zip: '',
            country: 'Slovakia',
            ico: '',
            dic: '',
            icDph: '',
            email: '',
            registrationNumber: ''
        });
        setIsEditing(true);
    };

    const [isSaving, setIsSaving] = useState(false);
    const handleSave = async () => {
        if (!currentCustomer) return;
        if (!currentCustomer.name) {
            alert(t('companyName') + " is required");
            return;
        }

        setIsSaving(true);
        try {
            await onSave(currentCustomer);
            setIsEditing(false);
            setCurrentCustomer(null);
        } catch (err) {
            console.error("Failed to save customer:", err);
            alert("Failed to save customer to database. Check your connection.");
        } finally {
            setIsSaving(false);
        }
    };

    const toggleSort = (field: SortField) => {
        if (sortField === field) {
            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortOrder('asc');
        }
    };

    const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file && currentCustomer) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setCurrentCustomer({ ...currentCustomer, logo: reader.result as string });
            };
            reader.readAsDataURL(file);
        }
    };

    const handleScanImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !currentCustomer) return;

        const reader = new FileReader();
        reader.onloadend = async () => {
            const base64 = reader.result as string;
            const btn = document.getElementById('scan-btn-label');
            const originalHtml = btn?.innerHTML;
            if (btn) btn.innerHTML = '<div class="flex items-center gap-2"><div class="w-4 h-4 border-2 border-brand border-t-transparent rounded-full animate-spin"></div> Analyzing Document...</div>';

            try {
                const { extractCustomerFromImage } = await import('../services/geminiService');
                const result = await extractCustomerFromImage(base64);
                if (result) {
                    setCurrentCustomer(prev => prev ? ({ ...prev, ...result }) : null);
                    // No alert needed if successful, user sees fields populating
                } else {
                    alert("Could not extract details automatically. Please fill manually.");
                }
            } catch (err) {
                console.error("Scan failed:", err);
                alert("Scan failed. Ensure you have a working internet connection and valid API key.");
            } finally {
                if (btn && originalHtml) btn.innerHTML = originalHtml;
                e.target.value = ''; // Reset
            }
        };
        reader.readAsDataURL(file);
    };

    const [importTab, setImportTab] = useState<'file' | 'text'>('file');
    const [importText, setImportText] = useState('');
    const [isAnalyzingText, setIsAnalyzingText] = useState(false);

    const handleTextImport = async () => {
        if (!importText.trim()) return;
        setIsAnalyzingText(true);
        try {
            const { extractCustomerFromText } = await import('../services/geminiService');
            const result = await extractCustomerFromText(importText);
            if (result) {
                setCurrentCustomer(prev => prev ? ({ ...prev, ...result }) : null);
                alert("Text analyzed successfully!");
                setImportText('');
            } else {
                alert("Could not extract details from text.");
            }
        } catch (err) {
            console.error(err);
            alert("Analysis failed.");
        } finally {
            setIsAnalyzingText(false);
        }
    };

    const filteredAndSortedCustomers = useMemo(() => {
        return customers
            .filter(c =>
                c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                c.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                c.ico.includes(searchTerm)
            )
            .sort((a, b) => {
                const aVal = (a[sortField] || '').toLowerCase();
                const bVal = (b[sortField] || '').toLowerCase();
                return sortOrder === 'asc'
                    ? aVal.localeCompare(bVal)
                    : bVal.localeCompare(aVal);
            });
    }, [customers, searchTerm, sortField, sortOrder]);

    const inputClass = "w-full bg-white dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2.5 shadow-sm focus:border-brand focus:ring-2 focus:ring-brand-light dark:focus:ring-brand-light/50 outline-none transition-all placeholder-slate-400 dark:placeholder-slate-500 text-sm";
    const labelClass = "block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5";

    if (isEditing && currentCustomer) {
        return (
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 md:p-10 max-w-4xl mx-auto my-4 md:my-8 transition-colors"
            >
                <div className="flex justify-between items-center mb-8 border-b border-slate-100 dark:border-slate-800 pb-6">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-brand/10 rounded-2xl">
                            <Building2 className="w-6 h-6 text-brand" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                                {customers.find(c => c.id === currentCustomer.id) ? t('editCustomer') : t('addCustomer')}
                            </h2>
                            <p className="text-slate-500 dark:text-slate-400 text-sm">{t('customerInformation')}</p>
                        </div>
                    </div>
                    <button onClick={() => setIsEditing(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors p-2 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <div className="mb-10 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-gradient-to-br from-brand/5 via-indigo-500/5 to-purple-500/5 p-6 rounded-2xl border border-brand/10 shadow-inner">
                        <label className="block text-xs font-bold text-brand uppercase tracking-wide mb-3 flex items-center gap-2">
                            <Sparkles className="w-4 h-4" /> {t('smartImport')}
                        </label>
                        <div className="flex gap-3">
                            <input
                                placeholder="Type Company Name or ICO..."
                                className="flex-1 bg-white dark:bg-slate-800 border-none rounded-xl px-4 py-3 text-sm shadow-sm ring-1 ring-slate-100 dark:ring-slate-700 focus:ring-2 focus:ring-brand transition-all"
                                onKeyDown={async (e) => {
                                    if (e.key === 'Enter') {
                                        const val = e.currentTarget.value;
                                        if (!val) return;
                                        e.currentTarget.disabled = true;
                                        const prevPlaceholder = e.currentTarget.placeholder;
                                        e.currentTarget.placeholder = "Searching...";
                                        try {
                                            const { scrapeFinstat } = await import('../services/geminiService');
                                            const result = await scrapeFinstat(val);
                                            if (result) {
                                                if (result.error === "QUOTA_EXCEEDED") {
                                                    alert("Limit reached.");
                                                } else {
                                                    setCurrentCustomer(prev => prev ? ({ ...prev, ...result }) : null);
                                                }
                                            } else {
                                                alert("Not found.");
                                            }
                                        } catch (err) {
                                            console.error(err);
                                        } finally {
                                            e.currentTarget.disabled = false;
                                            e.currentTarget.placeholder = prevPlaceholder;
                                            e.currentTarget.focus();
                                            e.currentTarget.value = '';
                                        }
                                    }
                                }}
                            />
                        </div>
                    </div>

                    <div className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 flex flex-col items-start min-h-[200px]">
                        <div className="flex items-center gap-4 mb-4 text-xs font-bold uppercase tracking-wide w-full border-b border-slate-200 dark:border-slate-700 pb-2">
                            <button
                                onClick={() => setImportTab('file')}
                                className={`flex items-center gap-2 pb-2 -mb-2.5 border-b-2 transition-all ${importTab === 'file' ? 'text-brand border-brand' : 'text-slate-400 border-transparent hover:text-slate-600'}`}
                            >
                                <ScanLine className="w-4 h-4" /> {t('scanFile')}
                            </button>
                            <button
                                onClick={() => setImportTab('text')}
                                className={`flex items-center gap-2 pb-2 -mb-2.5 border-b-2 transition-all ${importTab === 'text' ? 'text-brand border-brand' : 'text-slate-400 border-transparent hover:text-slate-600'}`}
                            >
                                <FileText className="w-4 h-4" /> {t('importText')}
                            </button>
                        </div>

                        {importTab === 'file' ? (
                            <label id="scan-btn-label" className="cursor-pointer w-full flex-1 bg-white dark:bg-slate-800 border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-brand hover:text-brand text-slate-400 dark:text-slate-500 rounded-xl p-4 flex flex-col items-center justify-center gap-2 font-bold transition-all text-sm group">
                                <Upload className="w-8 h-8 opacity-50 group-hover:-translate-y-1 transition-transform" />
                                <span className="text-center">Drop Invoice/Card or Click to Upload</span>
                                <input type="file" className="hidden" accept="image/*,.pdf" onChange={handleScanImage} />
                            </label>
                        ) : (
                            <div className="w-full flex flex-col gap-2 flex-1">
                                <textarea
                                    value={importText}
                                    onChange={(e) => setImportText(e.target.value)}
                                    placeholder="Paste email signature, invoice text, or any company details here..."
                                    className="w-full h-full min-h-[100px] p-3 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-brand outline-none resize-none"
                                />
                                <button
                                    onClick={handleTextImport}
                                    disabled={!importText || isAnalyzingText}
                                    className="w-full py-2 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                >
                                    {isAnalyzingText ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                                    {t('analyzeFill')}
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
                    <div className="col-span-2 md:col-span-1">
                        <label className={labelClass}>{t('companyName')} *</label>
                        <input
                            value={currentCustomer.name}
                            onChange={e => setCurrentCustomer({ ...currentCustomer, name: e.target.value })}
                            className={inputClass}
                        />
                    </div>
                    <div className="col-span-2 md:col-span-1">
                        <label className={labelClass}>{t('email')}</label>
                        <input
                            value={currentCustomer.email}
                            onChange={e => setCurrentCustomer({ ...currentCustomer, email: e.target.value })}
                            className={inputClass}
                        />
                    </div>

                    <div className="col-span-2">
                        <label className={labelClass}>{t('companyLogo')}</label>
                        <div className="flex items-center gap-4 mt-2">
                            {currentCustomer.logo && (
                                <img src={currentCustomer.logo} alt="Logo" className="w-16 h-16 rounded-xl object-contain bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-1" />
                            )}
                            <label className="cursor-pointer bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-brand text-slate-600 dark:text-slate-300 px-4 py-2 rounded-xl text-sm font-bold shadow-sm transition-all flex items-center gap-2">
                                <Upload className="w-4 h-4" />
                                {currentCustomer.logo ? t('changeLogo') : t('uploadLogo')}
                                <input type="file" className="hidden" accept="image/*" onChange={handleLogoUpload} />
                            </label>
                            {currentCustomer.logo && (
                                <button onClick={() => setCurrentCustomer({ ...currentCustomer, logo: undefined })} className="text-red-500 hover:text-red-600 text-sm font-bold px-2">{t('remove')}</button>
                            )}
                        </div>
                    </div>

                    <div className="col-span-2">
                        <label className={labelClass}>{t('address')}</label>
                        <input
                            value={currentCustomer.addressLine1}
                            onChange={e => setCurrentCustomer({ ...currentCustomer, addressLine1: e.target.value })}
                            className={inputClass}
                        />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 col-span-2">
                        <div>
                            <label className={labelClass}>{t('city')}</label>
                            <input
                                value={currentCustomer.city}
                                onChange={e => setCurrentCustomer({ ...currentCustomer, city: e.target.value })}
                                className={inputClass}
                            />
                        </div>
                        <div>
                            <label className={labelClass}>{t('zip')}</label>
                            <input
                                value={currentCustomer.zip}
                                onChange={e => setCurrentCustomer({ ...currentCustomer, zip: e.target.value })}
                                className={inputClass}
                            />
                        </div>
                        <div>
                            <label className={labelClass}>{t('country')}</label>
                            <div className="relative">
                                <select
                                    value={currentCustomer.country}
                                    onChange={e => setCurrentCustomer({ ...currentCustomer, country: e.target.value })}
                                    className={`${inputClass} appearance-none cursor-pointer pr-10`}
                                >
                                    {COUNTRY_OPTIONS.map(country => (
                                        <option key={country} value={country}>{country}</option>
                                    ))}
                                </select>
                                <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                            </div>
                        </div>
                    </div>

                    <div className="col-span-2 bg-slate-50 dark:bg-slate-800/50 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 transition-colors">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-wider">{t('shipToTitle') || 'Shipping Address'}</h3>
                            <label className="flex items-center gap-2 cursor-pointer">
                                <span className="text-xs font-bold text-slate-500">{currentCustomer.shippingAddress ? 'Enable' : 'Same as Billing'}</span>
                                <input
                                    type="checkbox"
                                    checked={!!currentCustomer.shippingAddress}
                                    onChange={(e) => {
                                        if (e.target.checked) {
                                            setCurrentCustomer({
                                                ...currentCustomer,
                                                shippingAddress: {
                                                    addressLine1: currentCustomer.addressLine1 || '',
                                                    addressLine2: currentCustomer.addressLine2 || '',
                                                    city: currentCustomer.city || '',
                                                    zip: currentCustomer.zip || '',
                                                    country: currentCustomer.country || 'Slovakia'
                                                }
                                            });
                                        } else {
                                            const { shippingAddress, ...rest } = currentCustomer;
                                            setCurrentCustomer(rest);
                                        }
                                    }}
                                    className="accent-brand"
                                />
                            </label>
                        </div>

                        {currentCustomer.shippingAddress && (
                            <div className="space-y-4">
                                <div>
                                    <label className={labelClass}>{t('address')}</label>
                                    <input
                                        value={currentCustomer.shippingAddress.addressLine1}
                                        onChange={e => setCurrentCustomer({
                                            ...currentCustomer,
                                            shippingAddress: { ...currentCustomer.shippingAddress!, addressLine1: e.target.value }
                                        })}
                                        className={inputClass}
                                    />
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                                    <div>
                                        <label className={labelClass}>{t('city')}</label>
                                        <input
                                            value={currentCustomer.shippingAddress.city}
                                            onChange={e => setCurrentCustomer({
                                                ...currentCustomer,
                                                shippingAddress: { ...currentCustomer.shippingAddress!, city: e.target.value }
                                            })}
                                            className={inputClass}
                                        />
                                    </div>
                                    <div>
                                        <label className={labelClass}>{t('zip')}</label>
                                        <input
                                            value={currentCustomer.shippingAddress.zip}
                                            onChange={e => setCurrentCustomer({
                                                ...currentCustomer,
                                                shippingAddress: { ...currentCustomer.shippingAddress!, zip: e.target.value }
                                            })}
                                            className={inputClass}
                                        />
                                    </div>
                                    <div>
                                        <label className={labelClass}>{t('country')}</label>
                                        <div className="relative">
                                            <select
                                                value={currentCustomer.shippingAddress.country}
                                                onChange={e => setCurrentCustomer({
                                                    ...currentCustomer,
                                                    shippingAddress: { ...currentCustomer.shippingAddress!, country: e.target.value }
                                                })}
                                                className={`${inputClass} appearance-none cursor-pointer pr-10`}
                                            >
                                                {COUNTRY_OPTIONS.map(country => (
                                                    <option key={country} value={country}>{country}</option>
                                                ))}
                                            </select>
                                            <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="col-span-2 bg-slate-50 dark:bg-slate-800/50 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 transition-colors">
                        <h3 className="text-sm font-bold text-slate-800 dark:text-white mb-6 uppercase tracking-wider">{t('businessRegistration')}</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                            <div>
                                <div className="flex gap-2">
                                    <input
                                        value={currentCustomer.ico}
                                        onChange={e => setCurrentCustomer({ ...currentCustomer, ico: e.target.value })}
                                        className={inputClass}
                                        placeholder="8-digit ICO"
                                    />
                                    <button
                                        onClick={async () => {
                                            if (!currentCustomer.ico) return;
                                            const btn = document.getElementById('rpo-btn');
                                            if (btn) btn.innerText = "...";
                                            try {
                                                const result = await fetchCompanyData(currentCustomer.ico);
                                                if (result) {
                                                    setCurrentCustomer({
                                                        ...currentCustomer,
                                                        name: result.name || currentCustomer.name,
                                                        addressLine1: result.street ? `${result.street} ${result.reg_number || ''}${result.building_number ? '/' + result.building_number : ''}` : currentCustomer.addressLine1,
                                                        city: result.city || currentCustomer.city,
                                                        zip: result.postal_code || currentCustomer.zip,
                                                        dic: result.tin || currentCustomer.dic,
                                                        icDph: result.v_tin || currentCustomer.icDph
                                                    });
                                                } else {
                                                    alert("No machine-readable data found in RPO for this ICO. (Demo: try 57278784)");
                                                }
                                            } finally {
                                                if (btn) btn.innerText = "Lookup";
                                            }
                                        }}
                                        id="rpo-btn"
                                        className="px-3 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-lg text-xs font-bold transition-colors shrink-0"
                                    >
                                        Lookup
                                    </button>
                                </div>
                            </div>
                            <div>
                                <label className={labelClass}>{t('dic')}</label>
                                <input
                                    value={currentCustomer.dic}
                                    onChange={e => setCurrentCustomer({ ...currentCustomer, dic: e.target.value })}
                                    className={inputClass}
                                />
                            </div>
                            <div>
                                <label className={labelClass}>{t('icDph')}</label>
                                <input
                                    value={currentCustomer.icDph}
                                    onChange={e => setCurrentCustomer({ ...currentCustomer, icDph: e.target.value })}
                                    className={inputClass}
                                />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex justify-end gap-3 mt-10 pt-8 border-t border-slate-100 dark:border-slate-800">
                    <button
                        onClick={() => setIsEditing(false)}
                        className="px-8 py-3 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl font-bold transition-all"
                    >
                        {t('cancel')}
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="px-10 py-3 bg-brand text-white hover:brightness-110 rounded-xl font-bold shadow-xl shadow-brand/20 transition-all flex items-center gap-2 disabled:opacity-50"
                    >
                        {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />} {t('save')}
                    </button>
                </div>
            </motion.div>
        );
    }

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex flex-col md:flex-row justify-between items-center bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm gap-4 transition-colors">
                <div className="relative w-full md:w-96 group">
                    <Search className="w-4 h-4 absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400 group-focus-within:text-brand transition-colors" />
                    <input
                        type="text"
                        placeholder={t('searchCustomers')}
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="pl-12 pr-4 py-3 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-brand w-full bg-slate-50 dark:bg-slate-800 dark:text-white focus:bg-white transition-all shadow-inner"
                    />
                </div>
                <button
                    onClick={handleAdd}
                    className="w-full md:w-auto bg-brand hover:brightness-110 text-white px-6 py-3 rounded-2xl text-sm font-bold flex items-center justify-center gap-2 shadow-xl shadow-brand/20 transition-all"
                >
                    <Plus className="w-5 h-5" /> {t('addCustomer')}
                </button>
            </div>

            <div className="space-y-4">
                {/* Mobile Card View */}
                <div className="md:hidden space-y-4">
                    {filteredAndSortedCustomers.map(customer => (
                        <motion.div
                            layout
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0 }}
                            key={customer.id}
                            className="bg-white dark:bg-slate-900/50 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col gap-4"
                        >
                            <div className="flex items-start justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-brand/10 text-brand flex items-center justify-center font-black text-sm shrink-0 overflow-hidden">
                                        {customer.logo ? (
                                            <img src={customer.logo} alt={customer.name} className="w-full h-full object-cover" />
                                        ) : (
                                            customer.name.charAt(0)
                                        )}
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-slate-900 dark:text-white text-lg leading-tight">{customer.name}</h3>
                                        {customer.email && (
                                            <p className="text-sm text-brand font-medium truncate max-w-[200px]">{customer.email}</p>
                                        )}
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={() => handleEdit(customer)} className="p-2 text-brand hover:bg-brand/10 rounded-lg transition-colors">
                                        <Edit2 className="w-5 h-5" />
                                    </button>
                                    <button onClick={() => onDelete(customer.id)} className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors">
                                        <Trash2 className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-2 text-sm">
                                <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">{t('city')}</span>
                                    <span className="font-bold text-slate-700 dark:text-slate-300">{customer.city || '-'}</span>
                                </div>
                                <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">{t('ico')}</span>
                                    <span className="font-mono font-bold text-slate-600 dark:text-slate-400">{customer.ico || '-'}</span>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>

                {/* Desktop Table View */}
                <div className="hidden md:block bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden transition-colors">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm min-w-[700px]">
                            <thead className="bg-slate-50/50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 text-xs font-bold uppercase text-slate-500 dark:text-slate-400 tracking-wider">
                                <tr>
                                    <th className="px-8 py-5 cursor-pointer hover:text-brand transition-colors" onClick={() => toggleSort('name')}>
                                        <div className="flex items-center gap-2">{t('companyName')} <ArrowUpDown className="w-3 h-3" /></div>
                                    </th>
                                    <th className="px-8 py-5 cursor-pointer hover:text-brand transition-colors" onClick={() => toggleSort('email')}>
                                        <div className="flex items-center gap-2">{t('email')} <ArrowUpDown className="w-3 h-3" /></div>
                                    </th>
                                    <th className="px-8 py-5 cursor-pointer hover:text-brand transition-colors" onClick={() => toggleSort('city')}>
                                        <div className="flex items-center gap-2">{t('city')} <ArrowUpDown className="w-3 h-3" /></div>
                                    </th>
                                    <th className="px-8 py-5 cursor-pointer hover:text-brand transition-colors" onClick={() => toggleSort('ico')}>
                                        <div className="flex items-center gap-2">{t('ico')} <ArrowUpDown className="w-3 h-3" /></div>
                                    </th>
                                    <th className="px-8 py-5 text-right"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                <AnimatePresence mode="popLayout">
                                    {filteredAndSortedCustomers.map((customer, index) => (
                                        <motion.tr
                                            layout
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            exit={{ opacity: 0 }}
                                            key={customer.id}
                                            className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors group"
                                        >
                                            <td className="px-8 py-5">
                                                <div className="font-bold text-slate-900 dark:text-white flex items-center gap-3">
                                                    <div className="w-9 h-9 rounded-xl bg-brand/10 text-brand flex items-center justify-center font-black text-xs shrink-0 overflow-hidden">
                                                        {customer.logo ? (
                                                            <img src={customer.logo} alt={customer.name} className="w-full h-full object-cover" />
                                                        ) : (
                                                            customer.name.charAt(0)
                                                        )}
                                                    </div>
                                                    {customer.name}
                                                </div>
                                            </td>
                                            <td className="px-8 py-5 text-slate-600 dark:text-slate-400">
                                                {customer.email ? (
                                                    <a href={`mailto:${customer.email}`} className="flex items-center gap-2 hover:text-brand transition-colors">
                                                        <Mail className="w-4 h-4 text-slate-400" />
                                                        <span className="font-medium">{customer.email}</span>
                                                    </a>
                                                ) : (
                                                    <span className="text-slate-300 italic">-</span>
                                                )}
                                            </td>
                                            <td className="px-8 py-5 text-slate-600 dark:text-slate-400 font-bold">
                                                {customer.city}
                                            </td>
                                            <td className="px-8 py-5">
                                                <span className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-mono text-xs px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700">
                                                    {customer.ico || '-'}
                                                </span>
                                            </td>
                                            <td className="px-8 py-5 text-right">
                                                <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button onClick={() => handleEdit(customer)} className="p-2.5 text-brand hover:bg-brand/10 rounded-xl transition-colors">
                                                        <Edit2 className="w-4 h-4" />
                                                    </button>
                                                    <button onClick={() => onDelete(customer.id)} className="p-2.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-xl transition-colors">
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </motion.tr>
                                    ))}
                                </AnimatePresence>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {filteredAndSortedCustomers.length === 0 && (
                <div className="bg-white dark:bg-slate-900 rounded-3xl p-20 text-center border border-slate-200 dark:border-slate-800 shadow-sm transition-colors">
                    <Building2 className="w-16 h-16 text-slate-200 dark:text-slate-800 mx-auto mb-4" />
                    <p className="text-slate-400 dark:text-slate-600 font-bold">{t('noCustomers')}</p>
                </div>
            )}
        </div>
    );
};

export default CustomerManager;

