// DataDump.tsx
import React from 'react';
import { useDataStore } from '../store/useDataStore';
import { useAppStore } from '../store/useAppStore';

const DataDump: React.FC = () => {
    const { invoices, customers, expenses, quotes, products } = useDataStore();
    const { t } = useAppStore();

    const data = {
        invoices,
        customers,
        expenses,
        quotes,
        products,
    };

    return (
        <div className="p-4 md:p-8 space-y-6">
            <div className="flex justify-between items-center bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm transition-colors">
                <div>
                    <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">{t('dataDump')}</h2>
                    <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Live inspection of all synchronized collections</p>
                </div>
            </div>
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden transition-colors">
                <pre className="p-6 overflow-x-auto text-xs font-mono text-slate-700 dark:text-slate-300 bg-slate-50/50 dark:bg-slate-950/50">
                    {JSON.stringify(data, null, 2)}
                </pre>
            </div>
        </div>
    );
};

export default DataDump;
