import React, { useRef, useState } from 'react';
import { useAppStore } from '../store/useAppStore';
import { Camera, ChevronLeft, Upload, Loader2, CheckCircle, AlertCircle, FileText } from 'lucide-react';
import { extractExpenseFromImage } from '../services/geminiService';
import { useDataStore } from '../store/useDataStore';
import { Expense } from '../types';

const MobileScanner: React.FC = () => {
    const { setView } = useAppStore();
    const { saveExpense } = useDataStore();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [scanResult, setScanResult] = useState<Partial<Expense> | null>(null);
    const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsProcessing(true);
        setStatus('idle');
        setScanResult(null);

        try {
            const reader = new FileReader();
            reader.onloadend = async () => {
                const base64String = reader.result as string;
                const result = await extractExpenseFromImage(base64String);

                if (result) {
                    setScanResult(result);
                    setStatus('success');
                } else {
                    setStatus('error');
                }
                setIsProcessing(false);
            };
            reader.readAsDataURL(file);
        } catch (error) {
            console.error('Scan failed:', error);
            setStatus('error');
            setIsProcessing(false);
        }
    };

    const handleSave = async () => {
        if (!scanResult) return;

        await saveExpense({
            ...scanResult,
            id: crypto.randomUUID(), // In real app, firestore handles this
            date: scanResult.date || new Date().toISOString().split('T')[0],
            amount: scanResult.amount || 0,
            category: scanResult.category || 'cat_other',
            description: scanResult.description || 'Scanned Receipt',
            taxDeductible: scanResult.taxDeductible ?? true,
            vatRate: scanResult.vatRate || 20
        } as Expense);

        setView('expenses');
    };

    return (
        <div className="min-h-screen bg-slate-950 text-white flex flex-col p-6 animate-fade-in relative overflow-hidden">
            {/* Background decoration */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
                <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-indigo-500/10 rounded-full blur-[100px]" />
                <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-500/10 rounded-full blur-[100px]" />
            </div>

            <div className="relative z-10 flex items-center justify-between mb-8">
                <button
                    onClick={() => setView('dashboard')}
                    className="p-3 bg-white/10 backdrop-blur-md rounded-full hover:bg-white/20 transition-colors"
                >
                    <ChevronLeft className="w-6 h-6" />
                </button>
                <h1 className="text-xl font-bold">Quick Scan</h1>
                <div className="w-12" /> {/* Spacer */}
            </div>

            <div className="flex-1 flex flex-col items-center justify-center gap-8 relative z-10">
                {isProcessing ? (
                    <div className="text-center space-y-4">
                        <div className="relative w-32 h-32 mx-auto">
                            <div className="absolute inset-0 border-4 border-indigo-500/30 rounded-full animate-pulse" />
                            <div className="absolute inset-0 flex items-center justify-center">
                                <Loader2 className="w-12 h-12 text-indigo-400 animate-spin" />
                            </div>
                        </div>
                        <p className="text-xl font-medium text-indigo-200">Analyzing Receipt...</p>
                        <p className="text-sm text-indigo-400/60">Extracting vendor, amount, and date</p>
                    </div>
                ) : status === 'success' && scanResult ? (
                    <div className="w-full max-w-sm bg-slate-900/50 backdrop-blur-md border border-slate-800 p-6 rounded-3xl space-y-6 animate-fade-in-up">
                        <div className="flex items-center gap-4 text-emerald-400 mb-2">
                            <CheckCircle className="w-8 h-8" />
                            <span className="font-bold text-lg">Scan Successful</span>
                        </div>

                        <div className="space-y-4">
                            <div className="bg-slate-800/50 p-4 rounded-xl space-y-1">
                                <label className="text-xs text-slate-500 uppercase font-bold">Total Amount</label>
                                <div className="text-3xl font-black text-white">€{scanResult.amount?.toFixed(2)}</div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-slate-800/50 p-3 rounded-xl space-y-1">
                                    <label className="text-xs text-slate-500 uppercase font-bold">Vendor</label>
                                    <div className="font-semibold truncate">{scanResult.vendor || 'Unknown'}</div>
                                </div>
                                <div className="bg-slate-800/50 p-3 rounded-xl space-y-1">
                                    <label className="text-xs text-slate-500 uppercase font-bold">Date</label>
                                    <div className="font-semibold">{scanResult.date}</div>
                                </div>
                            </div>

                            <div className="bg-slate-800/50 p-3 rounded-xl space-y-1">
                                <label className="text-xs text-slate-500 uppercase font-bold">Category</label>
                                <div className="font-semibold">{scanResult.category}</div>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3 pt-2">
                            <button
                                onClick={() => setStatus('idle')}
                                className="py-4 rounded-xl bg-slate-800 font-bold hover:bg-slate-700 transition-colors"
                            >
                                Scan Again
                            </button>
                            <button
                                onClick={handleSave}
                                className="py-4 rounded-xl bg-indigo-600 font-bold hover:bg-indigo-500 shadow-lg shadow-indigo-900/40 transition-colors"
                            >
                                Save Expense
                            </button>
                        </div>
                    </div>
                ) : (
                    <>
                        <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                            <div className="absolute inset-0 bg-indigo-500 rounded-full blur-2xl opacity-20 group-hover:opacity-40 transition-opacity animate-pulse-slow" />
                            <div className="w-48 h-48 bg-gradient-to-br from-indigo-600 to-blue-600 rounded-full flex items-center justify-center shadow-2xl relative z-10 group-hover:scale-105 transition-transform duration-300">
                                <Camera className="w-20 h-20 text-white drop-shadow-md" />
                            </div>
                        </div>

                        <div className="text-center space-y-2">
                            <h2 className="text-2xl font-bold">Tap to Scan</h2>
                            <p className="text-slate-400">Capture a receipt to auto-fill details</p>
                        </div>
                    </>
                )}
            </div>

            <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={handleFileSelect}
            />
        </div>
    );
};

export default MobileScanner;
