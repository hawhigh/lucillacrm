
import React from 'react';
import { useAppStore } from '../store/useAppStore';
import { Plus, Menu, Sun, Moon, Hexagon } from 'lucide-react';
import Sidebar from './Sidebar';
import { Supplier } from '../types';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '../store/useAuthStore';

interface LayoutProps {
    children: React.ReactNode;
    supplier: Supplier;
    startNewInvoice: () => void;
}

const Layout: React.FC<LayoutProps> = ({ children, supplier, startNewInvoice }) => {
    const { view, isDarkMode, toggleDarkMode, isMobileMenuOpen, setMobileMenuOpen, t, language, setLanguage } = useAppStore();
    const { role } = useAuthStore();

    const getPageTitle = () => {
        switch (view) {
            case 'dashboard': return t('dashboard');
            case 'list': return t('invoices');
            case 'create': return t('createNew');
            case 'preview': return t('preview');
            case 'customers': return t('customers');
            case 'expenses': return t('expenses');
            case 'settings': return t('settings');
            default: return '';
        }
    };

    const getPageDescription = () => {
        return t(`desc_${view} ` as any);
    };

    return (
        <div className="min-h-screen flex bg-gray-50 dark:bg-slate-950 font-sans transition-colors duration-300">
            <Sidebar supplier={supplier} />

            {/* Mobile Header */}
            <div className="md:hidden fixed top-0 left-0 right-0 h-16 bg-white/90 backdrop-blur-xl z-30 flex items-center justify-between px-6 border-b border-slate-200">
                <div className="flex items-center gap-3">

                    <span className="font-display font-bold tracking-widest text-slate-900 uppercase">Lucilla</span>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setLanguage(language === 'en' ? 'sk' : 'en')}
                        className="text-xs font-bold px-2 py-1 bg-slate-100 border border-slate-200 rounded-none text-slate-600"
                    >
                        {language.toUpperCase()}
                    </button>
                    <button
                        onClick={() => setMobileMenuOpen(true)}
                        className="text-slate-800 p-2 hover:bg-slate-100 rounded-none transition-colors"
                    >
                        <Menu className="w-6 h-6" />
                    </button>
                </div>
            </div>

            <main className="flex-1 p-4 md:p-8 lg:p-12 overflow-auto pt-24 md:pt-10 w-full bg-gray-50 transition-colors duration-300">
                <header className="flex flex-col sm:flex-row justify-between sm:items-end mb-8 md:mb-12 no-print gap-6">
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        key={view}
                    >
                        <h2 className="text-3xl md:text-4xl font-display font-bold text-slate-900 tracking-widest leading-tight uppercase">
                            {getPageTitle()}
                        </h2>
                    </motion.div>

                    <div className="flex items-center gap-4">
                        {/* Desktop Language Toggle */}
                        <button
                            onClick={() => setLanguage(language === 'en' ? 'sk' : 'en')}
                            className="hidden md:flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 rounded-none text-sm font-bold text-slate-600 hover:border-brand-400 transition-all"
                        >
                            {language === 'en' ? '🇺🇸 EN' : '🇸🇰 SK'}
                        </button>

                        {view !== 'create' && view !== 'settings' && view !== 'preview' && (
                            role !== 'accountant' && (
                                <button
                                    onClick={startNewInvoice}
                                    className="hidden md:flex bg-brand-400 hover:bg-brand-500 text-black px-5 py-2.5 rounded-none text-sm font-bold items-center gap-2 shadow-lg shadow-brand-400/20 active:scale-95 transition-all uppercase tracking-wide"
                                >
                                    <Plus className="w-5 h-5" /> New Invoice
                                </button>
                            )
                        )}
                    </div>
                </header>

                <AnimatePresence mode="wait">
                    <motion.div
                        key={view}
                        initial={{ opacity: 0, x: 10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -10 }}
                        transition={{ duration: 0.2 }}
                    >
                        {children}
                    </motion.div>
                </AnimatePresence>
            </main>
        </div>
    );
};

export default Layout;
