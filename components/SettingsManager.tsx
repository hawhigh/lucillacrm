
import React, { useState } from 'react';
import { Supplier, InvoiceSettings, InvoiceFontSize, InvoiceFontFamily, InvoiceLayoutPreset } from '../types';
import { Save, Building2, CreditCard, CheckCircle2, Type, Image as ImageIcon, Upload, PenTool, User, LogOut, KeyRound, Monitor, Briefcase, Phone, Cpu, Plus, Trash2, Pencil } from 'lucide-react';
import SignaturePad from './SignaturePad';
import { useAuthStore } from '../store/useAuthStore';
import { useDataStore } from '../store/useDataStore';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../services/firebase';
import { Database } from 'lucide-react';

interface Props {
    supplier: Supplier;
    onSaveSupplier: (supplier: Supplier) => void;
    settings: InvoiceSettings;
    onSaveSettings: (settings: InvoiceSettings) => void;
}

type SettingsTab = 'company' | 'appearance' | 'account';

const SettingsManager: React.FC<Props> = ({ supplier, onSaveSupplier, settings, onSaveSettings }) => {
    const { user, role, logout } = useAuthStore();
    const { saveCustomer, saveInvoice } = useDataStore();
    const [activeTab, setActiveTab] = useState<SettingsTab | 'integrations'>('company');
    const [newAccount, setNewAccount] = useState({ label: '', bankName: '', iban: '', swift: '' });
    const [editingAccountId, setEditingAccountId] = useState<string | null>(null);
    const [editingAccountData, setEditingAccountData] = useState({ label: '', bankName: '', iban: '', swift: '' });

    const handleGenerateTestData = async () => {
        if (!confirm("Generate 5 random customers and 5 invoices? This acts as a seed for your account.")) return;

        const cities = ['Bratislava', 'Košice', 'Nitra', 'Žilina', 'Trnava'];
        const companies = ['TechSol', 'GreenLeaf', 'SwiftLog', 'BrightWeb', 'LegalEase'];

        const newCustomers: any[] = [];

        // Customers
        for (let i = 0; i < 5; i++) {
            const name = companies[i] + ' ' + (Math.random() > 0.5 ? 's.r.o.' : 'Ltd.');
            const id = crypto.randomUUID();
            const cust = {
                id,
                name,
                addressLine1: 'Sample St. ' + Math.floor(Math.random() * 100),
                city: cities[i],
                zip: '000 00',
                country: 'Slovakia',
                ico: Math.floor(Math.random() * 100000000).toString(),
                dic: '2022' + Math.floor(Math.random() * 1000000),
                icDph: 'SK2022' + Math.floor(Math.random() * 1000000),
                email: `info@${name.split(' ')[0].toLowerCase()}.test`
            };
            await saveCustomer(cust);
            newCustomers.push(cust);
        }

        // Invoices
        for (let i = 0; i < 5; i++) {
            const cust = newCustomers[Math.floor(Math.random() * newCustomers.length)];
            const date = new Date();
            date.setDate(date.getDate() - Math.floor(Math.random() * 30));
            const dateStr = date.toISOString().split('T')[0];

            const inv = {
                id: crypto.randomUUID(),
                number: `TEST-${new Date().getFullYear()}-${String(i + 1).padStart(3, '0')}`,
                customer: cust,
                supplier: supplier, // Use current supplier settings
                issueDate: dateStr,
                dueDate: dateStr,
                deliveryDate: dateStr,
                status: Math.random() > 0.5 ? 'Paid' : 'Sent',
                items: [
                    { description: 'Test Service', quantity: 1, unitPrice: Math.floor(Math.random() * 500) + 50, vatRate: 20, unit: 'ks' }
                ],
                variableSymbol: Math.floor(Math.random() * 100000).toString()
            };
            // @ts-ignore
            await saveInvoice(inv);
        }

        alert("Test data generated successfully!");
    };
    const [formData, setFormData] = useState<Supplier>(supplier);
    const [settingsData, setSettingsData] = useState<InvoiceSettings>(settings);
    const [showSuccess, setShowSuccess] = useState(false);
    const [isDrawingSignature, setIsDrawingSignature] = useState(false);
    const [resetEmailSent, setResetEmailSent] = useState(false);

    const handleChange = (field: keyof Supplier, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleSettingsChange = (field: keyof InvoiceSettings, value: any) => {
        setSettingsData(prev => ({ ...prev, [field]: value }));
    };

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, field: 'logo' | 'signature' | 'signature2') => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setFormData(prev => ({ ...prev, [field]: reader.result as string }));
            };
            reader.readAsDataURL(file);
        }
    };

    const removeImage = (field: 'logo' | 'signature' | 'signature2') => {
        setFormData(prev => ({ ...prev, [field]: undefined }));
    };
    
    const handleAddAccount = () => {
        if (!newAccount.iban || !newAccount.bankName) {
            alert("Please fill in at least the Bank Name and IBAN.");
            return;
        }
        const account = { ...newAccount, id: crypto.randomUUID() };
        setFormData(prev => ({
            ...prev,
            bankAccounts: [...(prev.bankAccounts || []), account]
        }));
        setNewAccount({ label: '', bankName: '', iban: '', swift: '' });
    };

    const handleRemoveAccount = (id: string) => {
        setFormData(prev => ({
            ...prev,
            bankAccounts: prev.bankAccounts?.filter(acc => acc.id !== id) || []
        }));
    };

    const handleStartEdit = (acc: { id: string; label?: string; bankName: string; iban: string; swift: string }) => {
        setEditingAccountId(acc.id);
        setEditingAccountData({ label: acc.label || '', bankName: acc.bankName, iban: acc.iban, swift: acc.swift });
    };

    const handleSaveEdit = (id: string) => {
        if (!editingAccountData.bankName || !editingAccountData.iban) {
            alert('Bank Name and IBAN are required.');
            return;
        }
        setFormData(prev => ({
            ...prev,
            bankAccounts: (prev.bankAccounts || []).map(acc =>
                acc.id === id ? { ...acc, ...editingAccountData } : acc
            )
        }));
        setEditingAccountId(null);
    };

    const handleSubmit = () => {
        // IBAN Validation (Basic SEPA regex)
        const ibanRegex = /^([A-Z]{2}[0-9]{2}[A-Z0-9]{11,30})$/;
        const cleanIban = formData.iban.replace(/\s/g, '').toUpperCase();
        if (cleanIban && !ibanRegex.test(cleanIban)) {
            alert("Invalid IBAN format. Please enter a valid SEPA IBAN.");
            return;
        }

        onSaveSupplier(formData);
        onSaveSettings(settingsData);
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 3000);
    };

    const handlePasswordReset = async () => {
        if (user?.email) {
            try {
                await sendPasswordResetEmail(auth, user.email);
                setResetEmailSent(true);
                setTimeout(() => setResetEmailSent(false), 5000);
            } catch (error) {
                console.error("Error sending reset email", error);
                alert("Failed to send reset email. Please try again.");
            }
        }
    };

    const inputClass = "w-full bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2.5 shadow-sm focus:bg-white dark:focus:bg-slate-800 focus:border-brand focus:ring-2 focus:ring-brand-light outline-none transition-all placeholder-slate-400 dark:placeholder-slate-500";
    const labelClass = "block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5";
    const sectionClass = "bg-white dark:bg-slate-900 p-8 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 mb-8 transition-colors animate-fade-in";

    const SizeOption = ({ value, label }: { value: InvoiceFontSize, label: string }) => (
        <button
            onClick={() => handleSettingsChange('fontSize', value)}
            className={`flex-1 py-3 px-4 rounded-xl border font-medium transition-all ${settingsData.fontSize === value
                ? 'bg-brand text-white border-brand shadow-md ring-2 ring-brand-light ring-offset-1 dark:ring-offset-slate-900'
                : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'
                }`}
        >
            {label}
        </button>
    );

    const FontOption = ({ value, label }: { value: InvoiceFontFamily, label: string }) => (
        <button
            onClick={() => handleSettingsChange('fontFamily', value)}
            className={`flex-1 py-3 px-4 rounded-xl border font-medium transition-all ${settingsData.fontFamily === value
                ? 'bg-brand text-white border-brand shadow-md ring-2 ring-brand-light ring-offset-1 dark:ring-offset-slate-900'
                : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'
                } ${value === 'Outfit' ? 'font-outfit' : 'font-sans'}`}
        >
            {label}
        </button>
    );

    const LayoutOption = ({ value, label, desc }: { value: InvoiceLayoutPreset, label: string, desc: string }) => (
        <button
            onClick={() => handleSettingsChange('layoutPreset', value)}
            className={`flex-1 flex flex-col items-center py-4 px-3 rounded-xl border font-medium transition-all text-center ${settingsData.layoutPreset === value
                ? 'bg-brand text-white border-brand shadow-md ring-2 ring-brand-light ring-offset-1 dark:ring-offset-slate-900'
                : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'
                }`}
        >
            <span className="text-sm font-bold mb-1 uppercase tracking-wider">{label}</span>
            <span className={`text-[10px] ${settingsData.layoutPreset === value ? 'text-white/80' : 'text-slate-400'}`}>{desc}</span>
        </button>
    );

    return (
        <div className="max-w-5xl mx-auto pb-24">

            {/* Header Area */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-6">
                <div>
                    <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">Settings</h2>
                    <p className="text-slate-500 dark:text-slate-400 text-sm md:text-base mt-1">Manage company details, preferences, and your account.</p>
                </div>
                {activeTab !== 'account' && (
                    <button
                        onClick={handleSubmit}
                        className="hidden md:flex px-6 py-2.5 bg-indigo-600 text-white hover:bg-indigo-700 rounded-xl font-medium shadow-lg shadow-indigo-200 dark:shadow-indigo-900/40 hover:-translate-y-0.5 transition-all items-center gap-2"
                    >
                        <Save className="w-4 h-4" /> Save Changes
                    </button>
                )}
            </div>

            {/* Tabs */}
            <div className="flex mb-8 bg-slate-100 dark:bg-slate-900/50 p-1.5 rounded-2xl w-full md:w-fit border border-slate-200 dark:border-slate-800">
                <button
                    onClick={() => setActiveTab('company')}
                    className={`flex-1 md:flex-none px-6 py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all ${activeTab === 'company' ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                >
                    <Building2 className="w-4 h-4" /> Company
                </button>
                <button
                    onClick={() => setActiveTab('appearance')}
                    className={`flex-1 md:flex-none px-6 py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all ${activeTab === 'appearance' ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                >
                    <Monitor className="w-4 h-4" /> Appearance
                </button>
                <button
                    onClick={() => setActiveTab('account')}
                    className={`flex-1 md:flex-none px-6 py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all ${activeTab === 'account' ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                >
                    <User className="w-4 h-4" /> Account
                </button>
            </div>

            {showSuccess && (
                <div className="bg-emerald-50 dark:bg-emerald-900/20 text-emerald-800 dark:text-emerald-400 px-6 py-4 rounded-2xl mb-8 flex items-center gap-3 border border-emerald-200 dark:border-emerald-900/50 animate-fade-in shadow-sm">
                    <CheckCircle2 className="w-5 h-5" />
                    <span className="font-bold">Settings saved successfully!</span>
                </div>
            )}

            {/* COMPANY TAB */}
            {activeTab === 'company' && (
                <div className="space-y-8">
                    {/* Company Details */}
                    <div className={sectionClass}>
                        <div className="flex items-center gap-3 mb-8 border-b border-slate-100 dark:border-slate-800 pb-6">
                            <div className="p-2.5 bg-indigo-50 dark:bg-indigo-900/30 rounded-xl">
                                <Building2 className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                            </div>
                            <h3 className="text-xl font-bold text-slate-900 dark:text-white">Business Identity</h3>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="col-span-2">
                                <label className={labelClass}>Legal Entity Name</label>
                                <input
                                    value={formData.name}
                                    onChange={(e) => handleChange('name', e.target.value)}
                                    className={inputClass}
                                    placeholder="Your Company S.R.O."
                                />
                            </div>
                            <div className="col-span-2">
                                <label className={labelClass}>Street Address</label>
                                <input
                                    value={formData.addressLine1}
                                    onChange={(e) => handleChange('addressLine1', e.target.value)}
                                    className={inputClass}
                                    placeholder="Main Street 123"
                                />
                            </div>
                            <div className="col-span-2">
                                <label className={labelClass}>Additional Address Info</label>
                                <input
                                    value={formData.addressLine2 || ''}
                                    onChange={(e) => handleChange('addressLine2', e.target.value)}
                                    className={inputClass}
                                    placeholder="Suite 4B (Optional)"
                                />
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 col-span-2">
                                <div className="sm:col-span-1">
                                    <label className={labelClass}>City</label>
                                    <input
                                        value={formData.city}
                                        onChange={(e) => handleChange('city', e.target.value)}
                                        className={inputClass}
                                    />
                                </div>
                                <div className="sm:col-span-1">
                                    <label className={labelClass}>Postal Code</label>
                                    <input
                                        value={formData.zip}
                                        onChange={(e) => handleChange('zip', e.target.value)}
                                        className={inputClass}
                                    />
                                </div>
                                <div className="sm:col-span-1">
                                    <label className={labelClass}>Country</label>
                                    <input
                                        value={formData.country}
                                        onChange={(e) => handleChange('country', e.target.value)}
                                        className={inputClass}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Contact Channels */}
                    <div className={sectionClass}>
                        <div className="flex items-center gap-3 mb-8 border-b border-slate-100 dark:border-slate-800 pb-6">
                            <div className="p-2.5 bg-indigo-50 dark:bg-indigo-900/30 rounded-xl">
                                <Phone className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                            </div>
                            <h3 className="text-xl font-bold text-slate-900 dark:text-white">Contact Channels</h3>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className={labelClass}>Email Address</label>
                                <input
                                    value={formData.email || ''}
                                    onChange={(e) => handleChange('email', e.target.value)}
                                    className={inputClass}
                                    placeholder="invoices@company.com"
                                    type="email"
                                />
                            </div>
                            <div>
                                <label className={labelClass}>Phone Number</label>
                                <input
                                    value={formData.phone || ''}
                                    onChange={(e) => handleChange('phone', e.target.value)}
                                    className={inputClass}
                                    placeholder="+421 900 000 000"
                                    type="tel"
                                />
                            </div>
                            <div className="md:col-span-2">
                                <label className={labelClass}>Website URL</label>
                                <input
                                    value={formData.website || ''}
                                    onChange={(e) => handleChange('website', e.target.value)}
                                    className={inputClass}
                                    placeholder="https://www.company.com"
                                    type="url"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Registration IDs */}
                    <div className={sectionClass}>
                        <div className="flex items-center gap-3 mb-8 border-b border-slate-100 dark:border-slate-800 pb-6">
                            <div className="p-2.5 bg-indigo-50 dark:bg-indigo-900/30 rounded-xl">
                                <CheckCircle2 className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                            </div>
                            <h3 className="text-xl font-bold text-slate-900 dark:text-white">Registration Details</h3>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                            <div className="md:col-span-1">
                                <label className={labelClass}>ICO (Reg ID)</label>
                                <input
                                    value={formData.ico}
                                    onChange={(e) => handleChange('ico', e.target.value)}
                                    className={inputClass}
                                />
                            </div>
                            <div className="md:col-span-1">
                                <label className={labelClass}>DIC (Tax ID)</label>
                                <input
                                    value={formData.dic}
                                    onChange={(e) => handleChange('dic', e.target.value)}
                                    className={inputClass}
                                />
                            </div>
                            <div className="md:col-span-1">
                                <label className={labelClass}>IC DPH (VAT ID)</label>
                                <input
                                    value={formData.icDph}
                                    onChange={(e) => handleChange('icDph', e.target.value)}
                                    className={inputClass}
                                />
                            </div>
                            <div className="md:col-span-1">
                                <label className={labelClass}>AEMAK-AMM Number</label>
                                <input
                                    value={formData.aemakAmmNumber || ''}
                                    onChange={(e) => handleChange('aemakAmmNumber', e.target.value)}
                                    className={inputClass}
                                />
                            </div>
                            <div className="col-span-1 md:col-span-4">
                                <label className={labelClass}>Legal Registry Reference (OR)</label>
                                <input
                                    value={formData.businessRegisterInfo || ''}
                                    onChange={(e) => handleChange('businessRegisterInfo', e.target.value)}
                                    className={inputClass}
                                    placeholder="e.g. Registered in District Court, section Sro, file 1234/B"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Banking */}
                    <div className={sectionClass}>
                        <div className="flex items-center gap-3 mb-8 border-b border-slate-100 dark:border-slate-800 pb-6">
                            <div className="p-2.5 bg-indigo-50 dark:bg-indigo-900/30 rounded-xl">
                                <CreditCard className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                            </div>
                            <h3 className="text-xl font-bold text-slate-900 dark:text-white">Payment & Banking</h3>
                        </div>


                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="col-span-2">
                                <label className={labelClass}>Default Beneficiary Bank Name</label>
                                <input
                                    value={formData.bankName}
                                    onChange={(e) => handleChange('bankName', e.target.value)}
                                    className={inputClass}
                                />
                            </div>
                            <div>
                                <label className={labelClass}>Default IBAN</label>
                                <input
                                    value={formData.iban}
                                    onChange={(e) => handleChange('iban', e.target.value)}
                                    className={`${inputClass} font-mono text-sm`}
                                />
                            </div>
                            <div>
                                <label className={labelClass}>Default SWIFT / BIC</label>
                                <input
                                    value={formData.swift}
                                    onChange={(e) => handleChange('swift', e.target.value)}
                                    className={`${inputClass} font-mono text-sm`}
                                />
                            </div>
                        </div>

                        {/* Additional Accounts */}
                        <div className="mt-12 space-y-6">
                            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
                                <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">Additional Accounts</h4>
                                <span className="text-[10px] text-slate-400 font-bold px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded-lg">{(formData.bankAccounts || []).length} ACCOUNTS</span>
                            </div>

                            {/* List of accounts */}
                            <div className="grid grid-cols-1 gap-4">
                                {(formData.bankAccounts || []).map((acc) => (
                                    <div key={acc.id} className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                                        {editingAccountId === acc.id ? (
                                            /* Edit mode */
                                            <div className="p-5 bg-indigo-50 dark:bg-indigo-900/20 space-y-3">
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                    <div className="sm:col-span-2">
                                                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Account Label</label>
                                                        <input
                                                            value={editingAccountData.label}
                                                            onChange={(e) => setEditingAccountData(prev => ({ ...prev, label: e.target.value }))}
                                                            className={inputClass}
                                                            placeholder="e.g. EUR Main"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Bank Name</label>
                                                        <input
                                                            value={editingAccountData.bankName}
                                                            onChange={(e) => setEditingAccountData(prev => ({ ...prev, bankName: e.target.value }))}
                                                            className={inputClass}
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">SWIFT / BIC</label>
                                                        <input
                                                            value={editingAccountData.swift}
                                                            onChange={(e) => setEditingAccountData(prev => ({ ...prev, swift: e.target.value }))}
                                                            className={`${inputClass} font-mono`}
                                                        />
                                                    </div>
                                                    <div className="sm:col-span-2">
                                                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">IBAN</label>
                                                        <input
                                                            value={editingAccountData.iban}
                                                            onChange={(e) => setEditingAccountData(prev => ({ ...prev, iban: e.target.value }))}
                                                            className={`${inputClass} font-mono`}
                                                        />
                                                    </div>
                                                </div>
                                                <div className="flex gap-2 pt-1">
                                                    <button
                                                        onClick={() => handleSaveEdit(acc.id)}
                                                        className="flex-1 py-2 bg-indigo-600 text-white rounded-lg font-bold text-sm hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2"
                                                    >
                                                        <Save className="w-3.5 h-3.5" /> Save
                                                    </button>
                                                    <button
                                                        onClick={() => setEditingAccountId(null)}
                                                        className="px-4 py-2 bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-600 rounded-lg font-bold text-sm hover:bg-slate-50 transition-colors"
                                                    >
                                                        Cancel
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
                                            /* View mode */
                                            <div className="p-4 bg-slate-50 dark:bg-slate-800/50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-xs font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">{acc.label || 'Unnamed'}</span>
                                                        <span className="text-xs font-bold text-slate-900 dark:text-white">— {acc.bankName}</span>
                                                    </div>
                                                    <div className="text-xs font-mono text-slate-500 mt-1">{acc.iban}</div>
                                                    {acc.swift && <div className="text-[10px] font-mono text-slate-400 mt-0.5">SWIFT: {acc.swift}</div>}
                                                </div>
                                                <div className="flex items-center gap-2 ml-auto sm:ml-0">
                                                    <button
                                                        onClick={() => handleStartEdit(acc)}
                                                        className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-colors"
                                                        title="Edit"
                                                    >
                                                        <Pencil className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleRemoveAccount(acc.id)}
                                                        className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                                        title="Delete"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>

                            {/* Add New Form */}
                            <div className="p-6 bg-slate-100 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 mt-8">
                                <h5 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-4">Add Another Account</h5>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="sm:col-span-2">
                                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Account Label (e.g. EUR Main)</label>
                                        <input
                                            value={newAccount.label}
                                            onChange={(e) => setNewAccount(prev => ({ ...prev, label: e.target.value }))}
                                            className={inputClass}
                                            placeholder="Trading Account"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Bank Name</label>
                                        <input
                                            value={newAccount.bankName}
                                            onChange={(e) => setNewAccount(prev => ({ ...prev, bankName: e.target.value }))}
                                            className={inputClass}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">SWIFT</label>
                                        <input
                                            value={newAccount.swift}
                                            onChange={(e) => setNewAccount(prev => ({ ...prev, swift: e.target.value }))}
                                            className={inputClass}
                                        />
                                    </div>
                                    <div className="sm:col-span-2">
                                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">IBAN</label>
                                        <input
                                            value={newAccount.iban}
                                            onChange={(e) => setNewAccount(prev => ({ ...prev, iban: e.target.value }))}
                                            className={`${inputClass} font-mono`}
                                        />
                                    </div>
                                    <div className="sm:col-span-2 mt-2">
                                        <button
                                            onClick={handleAddAccount}
                                            className="w-full py-3 bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/30 rounded-xl font-bold hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-all flex items-center justify-center gap-2 shadow-sm"
                                        >
                                            <Plus className="w-4 h-4" /> Add This Account
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* INTEGRATIONS TAB */}
            {activeTab === 'integrations' && (
                <div className="space-y-8 animate-fade-in">
                    <div className={sectionClass}>
                        <div className="flex items-center gap-3 mb-8 border-b border-slate-100 dark:border-slate-800 pb-6">
                            <div className="p-2.5 bg-indigo-50 dark:bg-indigo-900/30 rounded-xl">
                                <Cpu className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                            </div>
                            <h3 className="text-xl font-bold text-slate-900 dark:text-white">API Integrations</h3>
                        </div>

                        <div className="grid grid-cols-1 gap-6">
                            <div>
                                <label className={labelClass}>Gemini API Key (AI Scanner)</label>
                                <div className="flex gap-4">
                                    <input
                                        type="password"
                                        defaultValue={localStorage.getItem('gemini_api_key') || ''}
                                        onChange={(e) => {
                                            if (e.target.value) {
                                                localStorage.setItem('gemini_api_key', e.target.value);
                                            } else {
                                                localStorage.removeItem('gemini_api_key');
                                            }
                                        }}
                                        className={inputClass}
                                        placeholder="AIza..."
                                    />
                                    <button onClick={() => window.location.reload()} className="px-4 py-3 bg-slate-100 dark:bg-slate-800 font-bold rounded-xl text-xs hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">Apply</button>
                                </div>
                                <p className="text-[10px] text-slate-400 mt-2">Required for receipt scanning features.</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* APPEARANCE TAB */}
            {activeTab === 'appearance' && (
                <div className="space-y-8">
                    {/* Branding & Images */}
                    <div className={sectionClass}>
                        <div className="flex items-center gap-3 mb-8 border-b border-slate-100 dark:border-slate-800 pb-6">
                            <div className="p-2.5 bg-indigo-50 dark:bg-indigo-900/30 rounded-xl">
                                <ImageIcon className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                            </div>
                            <h3 className="text-xl font-bold text-slate-900 dark:text-white">Branding Assets</h3>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
                            {/* Logo Upload */}
                            <div>
                                <label className={labelClass}>Default Logo</label>
                                <div className="mt-3">
                                    {formData.logo ? (
                                        <div className="relative w-full h-40 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-2xl flex items-center justify-center p-4 group overflow-hidden">
                                            <img src={formData.logo} alt="Logo Preview" className="max-h-full max-w-full object-contain transition-transform group-hover:scale-105" />
                                            <div className="absolute inset-0 bg-slate-900/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button onClick={() => removeImage('logo')} className="text-white bg-red-500 hover:bg-red-600 px-4 py-2 rounded-xl text-xs font-bold shadow-lg transition-transform hover:scale-110">Remove</button>
                                            </div>
                                        </div>
                                    ) : (
                                        <label className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-2xl cursor-pointer hover:bg-indigo-50/50 dark:hover:bg-indigo-900/10 hover:border-indigo-300 transition-all group">
                                            <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl mb-3 group-hover:scale-110 transition-transform">
                                                <Upload className="w-6 h-6 text-slate-400 group-hover:text-indigo-500" />
                                            </div>
                                            <span className="text-sm text-slate-500 font-bold">Upload Logo</span>
                                            <p className="text-[10px] text-slate-400 mt-1 uppercase tracking-wider">PNG, JPG up to 5MB</p>
                                            <input type="file" className="hidden" accept="image/*" onChange={(e) => handleImageUpload(e, 'logo')} />
                                        </label>
                                    )}
                                </div>
                            </div>

                            {/* Signature Upload */}
                            <div>
                                <label className={labelClass}>Signature</label>
                                <div className="mt-3 space-y-3">
                                    {formData.signature ? (
                                        <div className="relative w-full h-40 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-2xl flex items-center justify-center p-4 group overflow-hidden">
                                            <img src={formData.signature} alt="Signature Preview" className="max-h-full max-w-full object-contain transition-transform group-hover:scale-105" />
                                            <div className="absolute inset-0 bg-slate-900/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity gap-3">
                                                <button onClick={() => setIsDrawingSignature(true)} className="text-white bg-indigo-500 hover:bg-indigo-600 px-4 py-2 rounded-xl text-xs font-bold shadow-lg transition-transform hover:scale-110">Redraw</button>
                                                <button onClick={() => removeImage('signature')} className="text-white bg-red-500 hover:bg-red-600 px-4 py-2 rounded-xl text-xs font-bold shadow-lg transition-transform hover:scale-110">Remove</button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col gap-3">
                                            <label className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-2xl cursor-pointer hover:bg-brand-light hover:border-brand transition-all group">
                                                <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl mb-3 group-hover:scale-110 transition-transform">
                                                    <Upload className="w-6 h-6 text-slate-400 group-hover:text-brand" />
                                                </div>
                                                <span className="text-sm text-slate-500 font-bold">Upload Signature File</span>
                                                <p className="text-[10px] text-slate-400 mt-1 uppercase tracking-wider text-center px-4">PNG, JPG with transparent background</p>
                                                <input type="file" className="hidden" accept="image/*" onChange={(e) => handleImageUpload(e, 'signature')} />
                                            </label>
                                            <button
                                                onClick={() => setIsDrawingSignature(true)}
                                                className="w-full py-4 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-2xl text-slate-500 font-bold flex items-center justify-center gap-3 hover:bg-brand-light hover:border-brand hover:text-brand transition-all"
                                            >
                                                <PenTool className="w-5 h-5" /> Draw Signature
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Signature 2 (Stamp) Upload */}
                            <div>
                                <label className={labelClass}>Company Stamp (Optional)</label>
                                <div className="mt-3">
                                    {formData.signature2 ? (
                                        <div className="relative w-full h-40 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-2xl flex items-center justify-center p-4 group overflow-hidden">
                                            <img src={formData.signature2} alt="Stamp Preview" className="max-h-full max-w-full object-contain transition-transform group-hover:scale-105" />
                                            <div className="absolute inset-0 bg-slate-900/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button onClick={() => removeImage('signature2')} className="text-white bg-red-500 hover:bg-red-600 px-4 py-2 rounded-xl text-xs font-bold shadow-lg transition-transform hover:scale-110">Remove</button>
                                            </div>
                                        </div>
                                    ) : (
                                        <label className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-2xl cursor-pointer hover:bg-indigo-50/50 dark:hover:bg-indigo-900/10 hover:border-indigo-300 transition-all group">
                                            <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl mb-3 group-hover:scale-110 transition-transform">
                                                <Upload className="w-6 h-6 text-slate-400 group-hover:text-indigo-500" />
                                            </div>
                                            <span className="text-sm text-slate-500 font-bold">Upload Stamp</span>
                                            <p className="text-[10px] text-slate-400 mt-1 uppercase tracking-wider">PNG, JPG up to 5MB</p>
                                            <input type="file" className="hidden" accept="image/*" onChange={(e) => handleImageUpload(e, 'signature2')} />
                                        </label>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Invoice Appearance */}
                    <div className={sectionClass}>
                        <div className="flex items-center gap-3 mb-8 border-b border-slate-100 dark:border-slate-800 pb-6">
                            <div className="p-2.5 bg-brand-light rounded-xl">
                                <Type className="w-5 h-5 text-brand" />
                            </div>
                            <h3 className="text-xl font-bold text-slate-900 dark:text-white">Invoice Appearance</h3>
                        </div>

                        <div className="space-y-8">
                            <div className="grid grid-cols-1 gap-8">
                                <div>
                                    <label className={labelClass}>Invoice Letter Size</label>
                                    <div className="grid grid-cols-3 gap-3 md:gap-4 mt-3">
                                        <SizeOption value="small" label="Compact" />
                                        <SizeOption value="medium" label="Standard" />
                                        <SizeOption value="large" label="Extra" />
                                    </div>
                                </div>

                                <div>
                                    <label className={labelClass}>Font Typography</label>
                                    <div className="grid grid-cols-2 gap-3 md:gap-4 mt-3">
                                        <FontOption value="Inter" label="Inter (Clean)" />
                                        <FontOption value="Outfit" label="Outfit (Modern)" />
                                    </div>
                                </div>

                                <div>
                                    <label className={labelClass}>Invoice Layout Preset</label>
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4 mt-3">
                                        <LayoutOption value="modern" label="Modern" desc="Gradients & Depth" />
                                        <LayoutOption value="minimal" label="Minimal" desc="Clean & Light" />
                                        <LayoutOption value="classic" label="Classic" desc="Pro Corporate" />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div>
                                        <label className={labelClass}>Header Font Size: {settingsData.headerFontSize}px</label>
                                        <input
                                            type="range"
                                            min="18"
                                            max="64"
                                            value={settingsData.headerFontSize || 24}
                                            onChange={(e) => handleSettingsChange('headerFontSize', parseInt(e.target.value))}
                                            className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer mt-4 accent-indigo-600"
                                        />
                                        <div className="flex justify-between mt-2 text-[10px] text-slate-400 font-bold">
                                            <span>18PX</span>
                                            <span>64PX</span>
                                        </div>
                                    </div>

                                    <div>
                                        <label className={labelClass}>Logo Size: {settingsData.logoSize}px</label>
                                        <input
                                            type="range"
                                            min="30"
                                            max="300"
                                            value={settingsData.logoSize || 80}
                                            onChange={(e) => handleSettingsChange('logoSize', parseInt(e.target.value))}
                                            className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer mt-4 accent-indigo-600"
                                        />
                                        <div className="flex justify-between mt-2 text-[10px] text-slate-400 font-bold">
                                            <span>50PX</span>
                                            <span>300PX</span>
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <label className={labelClass}>Brand Accent Color</label>
                                    <div className="flex gap-4 mt-3">
                                        <div className="relative">
                                            <input
                                                type="color"
                                                value={settingsData.primaryColor || '#4f46e5'}
                                                onChange={(e) => handleSettingsChange('primaryColor', e.target.value)}
                                                className="h-12 w-12 rounded-xl cursor-pointer border-none p-0 overflow-hidden bg-transparent"
                                            />
                                            <div className="absolute inset-0 rounded-xl pointer-events-none ring-1 ring-inset ring-black/10"></div>
                                        </div>
                                        <input
                                            value={settingsData.primaryColor || '#4f46e5'}
                                            onChange={(e) => handleSettingsChange('primaryColor', e.target.value)}
                                            className={`${inputClass} flex-1 font-mono text-sm`}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ACCOUNT TAB */}
            {activeTab === 'account' && (
                <div className="space-y-8 animate-fade-in">
                    <div className={sectionClass}>
                        <div className="flex items-center gap-3 mb-8 border-b border-slate-100 dark:border-slate-800 pb-6">
                            <div className="p-2.5 bg-indigo-50 dark:bg-indigo-900/30 rounded-xl">
                                <Briefcase className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                            </div>
                            <h3 className="text-xl font-bold text-slate-900 dark:text-white">Account Information</h3>
                        </div>

                        <div className="space-y-6">
                            <div>
                                <label className={labelClass}>Email Address</label>
                                <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-medium flex items-center gap-3">
                                    <MailIcon />
                                    {user?.email}
                                </div>
                                <p className="text-xs text-slate-500 mt-2">To change your email address, please contact support.</p>
                            </div>

                            <div>
                                <label className={labelClass}>Account Role</label>
                                <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-medium flex items-center gap-3 uppercase tracking-wide">
                                    <User className="w-4 h-4 text-slate-500" />
                                    {role || 'User'}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className={sectionClass}>
                        <div className="flex items-center gap-3 mb-8 border-b border-slate-100 dark:border-slate-800 pb-6">
                            <div className="p-2.5 bg-indigo-50 dark:bg-indigo-900/30 rounded-xl">
                                <KeyRound className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                            </div>
                            <h3 className="text-xl font-bold text-slate-900 dark:text-white">Security</h3>
                        </div>

                        <div className="flex flex-col gap-4">
                            <button
                                onClick={handlePasswordReset}
                                disabled={resetEmailSent}
                                className="w-full py-4 px-6 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-indigo-50 dark:hover:bg-indigo-900/10 hover:border-indigo-200 dark:hover:border-indigo-800 rounded-xl text-left flex items-center justify-between group transition-all"
                            >
                                <div>
                                    <h4 className="font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">Change Password</h4>
                                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                                        {resetEmailSent ? "Reset email sent! Check your inbox." : "Receive an email to reset your password."}
                                    </p>
                                </div>
                                <div className="p-2 bg-white dark:bg-slate-900 rounded-lg text-slate-400 group-hover:text-indigo-500 transition-colors">
                                    <KeyRound className="w-5 h-5" />
                                </div>
                            </button>

                            <button
                                onClick={() => logout()}
                                className="w-full py-4 px-6 bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30 hover:bg-red-100 dark:hover:bg-red-900/20 rounded-xl text-left flex items-center justify-between group transition-all"
                            >
                                <div>
                                    <h4 className="font-bold text-red-700 dark:text-red-400">Sign Out</h4>
                                    <p className="text-sm text-red-600/70 dark:text-red-400/70 mt-1">Log out of your account on this device.</p>
                                </div>
                                <div className="p-2 bg-white dark:bg-slate-900 rounded-lg text-red-400 group-hover:text-red-600 transition-colors">
                                    <LogOut className="w-5 h-5" />
                                </div>
                            </button>
                        </div>
                    </div>

                    <div className={sectionClass}>
                        <div className="flex items-center gap-3 mb-8 border-b border-slate-100 dark:border-slate-800 pb-6">
                            <div className="p-2.5 bg-indigo-50 dark:bg-indigo-900/30 rounded-xl">
                                <Database className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                            </div>
                            <h3 className="text-xl font-bold text-slate-900 dark:text-white">Developer Zone</h3>
                        </div>

                        <div className="p-6 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700">
                            <h4 className="font-bold text-slate-900 dark:text-white mb-2">Populate Test Data</h4>
                            <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
                                Generate 5 customers and 5 invoices to test the application logic.
                                Useful if you are logging in with a new account.
                            </p>
                            <button
                                onClick={handleGenerateTestData}
                                className="px-6 py-3 bg-white dark:bg-slate-700 text-slate-900 dark:text-white font-bold rounded-xl border border-slate-200 dark:border-slate-600 shadow-sm hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors flex items-center gap-2"
                            >
                                <Database className="w-4 h-4" /> Generate Seed Data
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {isDrawingSignature && (
                <SignaturePad
                    initialSignature={formData.signature}
                    onSave={(sig) => {
                        setFormData(prev => ({ ...prev, signature: sig }));
                        setIsDrawingSignature(false);
                    }}
                    onCancel={() => setIsDrawingSignature(false)}
                />
            )}

            {/* Sticky Mobile Save Button - Only for Settings Tabs */}
            {activeTab !== 'account' && (
                <div className="md:hidden fixed bottom-0 left-0 right-0 p-4 bg-white/80 dark:bg-slate-950/80 backdrop-blur-xl border-t border-slate-200 dark:border-slate-800 z-30">
                    <button
                        onClick={handleSubmit}
                        className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold shadow-xl shadow-indigo-500/30 active:scale-95 transition-all flex items-center justify-center gap-3"
                    >
                        <Save className="w-5 h-5" /> Save All Changes
                    </button>
                </div>
            )}
        </div>
    );
};

// Helper Icon
const MailIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-400">
        <rect width="20" height="16" x="2" y="4" rx="2" /><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
    </svg>
);

export default SettingsManager;