import React from 'react';
import { Supplier } from '../types';
import { useAppStore } from '../store/useAppStore';
import { motion } from 'framer-motion';
import { Share2, Download, Printer, Copy, Check, Globe, Mail, Phone, MapPin, Building2, QrCode } from 'lucide-react';

interface DigitalCardProps {
    supplier: Supplier;
}

const DigitalCard: React.FC<DigitalCardProps> = ({ supplier }) => {
    const { t } = useAppStore();
    const [copied, setCopied] = React.useState(false);

    // Generate vCard string
    const vCard = `BEGIN:VCARD
VERSION:3.0
FN:${supplier.name}
ORG:${supplier.name}
ADR:;;${supplier.addressLine1};${supplier.city};;${supplier.zip};${supplier.country}
EMAIL:${supplier.email || ''}
TEL:${supplier.phone || ''}
URL:${supplier.website || ''}
NOTE:ICO: ${supplier.ico}, DIC: ${supplier.dic}
END:VCARD`;

    // QR Code URL (using public API)
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(vCard)}`;

    const handleCopy = () => {
        navigator.clipboard.writeText(vCard);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="max-w-4xl mx-auto p-6 md:p-10">
            <div className="mb-10 text-center md:text-left">
                <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight uppercase">Digital Business Card</h1>
                <p className="text-slate-500 dark:text-slate-400 mt-2">Share your company profile instantly with clients and partners.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                {/* Visual Card */}
                <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="relative group"
                >
                    <div className="absolute inset-0 bg-indigo-600 rounded-[2rem] blur-2xl opacity-10 group-hover:opacity-20 transition-opacity"></div>
                    <div className="relative bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2rem] overflow-hidden shadow-2xl">
                        {/* Card Header/Branding */}
                        <div className="h-32 bg-indigo-600 relative overflow-hidden">
                            <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '16px 16px' }}></div>
                            <div className="absolute -bottom-12 -right-12 w-48 h-48 bg-white/10 rounded-full blur-3xl"></div>
                        </div>

                        <div className="p-8 pt-0 -mt-12 relative flex flex-col items-center md:items-start">
                            {supplier.logo ? (
                                <img src={supplier.logo} alt="Logo" className="w-24 h-24 rounded-2xl bg-white p-2 shadow-xl border border-slate-100 object-contain" />
                            ) : (

                                <div className="w-24 h-24 rounded-2xl bg-white p-2 shadow-xl border border-slate-100 flex items-center justify-center text-indigo-600">
                                    <Building2 className="w-12 h-12" />
                                </div>
                            )}

                            <div className="mt-6 text-center md:text-left">
                                <h2 className="text-2xl font-black text-slate-900 dark:text-white">{supplier.name}</h2>
                                <p className="text-indigo-600 dark:text-indigo-400 font-bold text-sm tracking-widest uppercase mt-1">Certified Business</p>
                            </div>

                            <div className="mt-8 space-y-4 w-full">
                                <div className="flex items-center gap-4 text-slate-600 dark:text-slate-300">
                                    <div className="p-2 bg-slate-50 dark:bg-slate-800 rounded-lg"><MapPin className="w-4 h-4" /></div>
                                    <span className="text-sm font-medium">{supplier.addressLine1}, {supplier.city}</span>
                                </div>
                                <div className="flex items-center gap-4 text-slate-600 dark:text-slate-300">
                                    <div className="p-2 bg-slate-50 dark:bg-slate-800 rounded-lg"><Building2 className="w-4 h-4" /></div>
                                    <span className="text-sm font-mono font-bold">ICO: {supplier.ico} | DIC: {supplier.dic}</span>
                                </div>
                                {supplier.email && (
                                    <div className="flex items-center gap-4 text-slate-600 dark:text-slate-300">
                                        <div className="p-2 bg-slate-50 dark:bg-slate-800 rounded-lg"><Mail className="w-4 h-4" /></div>
                                        <span className="text-sm font-medium">{supplier.email}</span>
                                    </div>
                                )}
                                {supplier.phone && (
                                    <div className="flex items-center gap-4 text-slate-600 dark:text-slate-300">
                                        <div className="p-2 bg-slate-50 dark:bg-slate-800 rounded-lg"><Phone className="w-4 h-4" /></div>
                                        <span className="text-sm font-medium">{supplier.phone}</span>
                                    </div>
                                )}
                                {supplier.website && (
                                    <div className="flex items-center gap-4 text-slate-600 dark:text-slate-300">
                                        <div className="p-2 bg-slate-50 dark:bg-slate-800 rounded-lg"><Globe className="w-4 h-4" /></div>
                                        <a href={supplier.website} target="_blank" rel="noopener noreferrer" className="text-sm font-medium hover:underline text-indigo-600 dark:text-indigo-400">{supplier.website.replace(/^https?:\/\//, '')}</a>
                                    </div>
                                )}
                            </div>

                            <div className="mt-10 pt-8 border-t border-slate-100 dark:border-slate-800 w-full flex justify-between items-center text-slate-400">
                                <span className="text-[10px] font-black uppercase tracking-[0.3em]">Garsia Smart Hub</span>
                                <div className="flex gap-2">
                                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                                    <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
                                    <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                                </div>
                            </div>
                        </div>
                    </div>
                </motion.div>

                {/* QR Section */}
                <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2 }}
                    className="flex flex-col justify-center items-center lg:items-start"
                >
                    <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] shadow-xl border border-slate-100 dark:border-slate-800 flex flex-col items-center">
                        <div className="mb-6 text-center">
                            <span className="inline-block px-3 py-1 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-full text-[10px] font-black uppercase tracking-widest mb-2">Scan to Save Contact</span>
                            <h3 className="text-xl font-bold text-slate-800 dark:text-white">Instant vCard QR</h3>
                        </div>

                        <div className="relative group cursor-pointer overflow-hidden p-4 bg-white rounded-3xl border border-slate-100 shadow-inner">
                            <img
                                src={qrUrl}
                                alt="Company QR Code"
                                className="w-48 h-48 md:w-64 md:h-64 object-contain transition-transform group-hover:scale-105"
                            />
                            <div className="absolute inset-0 bg-indigo-600/0 group-hover:bg-indigo-600/5 transition-colors flex items-center justify-center">
                                <QrCode className="w-12 h-12 text-indigo-600 opacity-0 group-hover:opacity-20 transition-opacity" />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3 mt-8 w-full">
                            <button
                                onClick={handleCopy}
                                className="flex items-center justify-center gap-2 px-4 py-3 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl font-bold text-xs transition-colors"
                            >
                                {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                                {copied ? 'Copied' : 'Copy vCard'}
                            </button>
                            <button className="flex items-center justify-center gap-2 px-4 py-3 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl font-bold text-xs transition-colors">
                                <Download className="w-4 h-4" />
                                Save Image
                            </button>
                        </div>
                    </div>

                    <div className="mt-10 space-y-4">
                        <div className="flex items-start gap-4">
                            <div className="w-10 h-10 rounded-full bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center shrink-0">
                                <Share2 className="w-5 h-5 text-emerald-600" />
                            </div>
                            <div>
                                <h4 className="font-bold text-slate-800 dark:text-white">Seamless Sharing</h4>
                                <p className="text-sm text-slate-500 dark:text-slate-400">Clients can scan this code to automatically add your company to their phone contacts.</p>
                            </div>
                        </div>
                    </div>
                </motion.div>
            </div >
        </div >
    );
};

export default DigitalCard;
