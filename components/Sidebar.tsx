import React from 'react';
import { useAppStore } from '../store/useAppStore';
import { LayoutDashboard, FileText, FileCode, Users, Receipt, Settings, Moon, Sun, Hexagon, LogOut, X, HelpCircle, Mail, Package, RefreshCw, QrCode } from 'lucide-react';
import { Supplier } from '../types';
import { signOut } from 'firebase/auth';
import { auth } from '../services/firebase';
import { useAuthStore } from '../store/useAuthStore';
import { useDataStore } from '../store/useDataStore';
import { AnimatePresence, motion } from 'framer-motion';

interface SidebarProps {
    supplier: Supplier;
}

const Sidebar: React.FC<SidebarProps> = ({ supplier }) => {
    const { view, setView, isDarkMode, toggleDarkMode, isMobileMenuOpen, setMobileMenuOpen, t } = useAppStore();
    const { logout, role } = useAuthStore();
    const { allUsers, selectedUserId, setSelectedUserId } = useDataStore();

    const handleLogout = async () => {
        try {
            await logout();
        } catch (error) {
            console.error("Error signing out: ", error);
        }
    };

    const NavItem = ({ id, label, icon: Icon }: { id: any, label: string, icon: any }) => (
        <button
            onClick={() => setView(id as any)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 ${view === id
                ? 'bg-slate-100 text-indigo-600 dark:bg-slate-800 dark:text-white font-semibold'
                : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/50 dark:hover:text-white'
                }`}
        >
            <Icon className={`w-5 h-5 ${view === id ? 'text-indigo-600 dark:text-white' : 'text-slate-400 group-hover:text-slate-600 dark:text-slate-500'}`} />
            {label}
        </button>
    );

    return (
        <>
            {/* Enhanced Backdrop */}
            {isMobileMenuOpen && (
                <div
                    className="fixed inset-0 bg-slate-900/60 z-40 md:hidden backdrop-blur-[2px] transition-opacity duration-300 animate-in fade-in"
                    onClick={() => setMobileMenuOpen(false)}
                ></div>
            )}

            <aside className={`
                fixed md:static inset-y-0 left-0 z-50 w-72 bg-slate-950 flex flex-col border-r border-slate-900 transition-all duration-300 ease-in-out shadow-2xl md:shadow-none
                ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
            `}>
                <div className="p-8 pb-4 hidden md:flex flex-col">
                    <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-3">

                        <span className="font-display font-bold tracking-widest text-white uppercase">Lucilla</span>
                    </h1>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] mt-2 border-l-2 border-brand-400 pl-2">Accounting Hub</p>
                </div>

                <div className="flex-1 overflow-y-auto px-4 py-8 space-y-1">
                    <p className="px-4 text-[10px] font-bold text-slate-600 uppercase tracking-[0.2em] mb-3">{t('mainNavigation')}</p>
                    <NavItem id="dashboard" label={t('dashboard')} icon={LayoutDashboard} />
                    <NavItem id="list" label={t('invoices')} icon={FileText} />
                    <NavItem id="customers" label={t('customers')} icon={Users} />
                    <NavItem id="expenses" label={t('expenses')} icon={Receipt} />
                    <NavItem id="products" label="Products" icon={Package} />
                    <NavItem id="digitalCard" label="Digital Card" icon={QrCode} />
                    <NavItem id="dataDump" label={t('dataDump') ?? 'Data Dump'} icon={FileCode} />

                    <p className="px-4 text-[10px] font-bold text-slate-600 uppercase tracking-[0.2em] mb-3 mt-8">{t('system')}</p>
                    <NavItem id="settings" label={t('settings')} icon={Settings} />
                    {role === 'admin' && (
                        <NavItem id="users" label={t('users')} icon={Users} />
                    )}
                    <NavItem id="overview" label="Functions" icon={HelpCircle} />
                    <NavItem id="recurring" label={t('recurringInvoices')} icon={RefreshCw} />

                    {role === 'admin' && allUsers.length > 0 && (
                        <div className="mt-8 px-4">
                            <p className="text-[10px] font-bold text-slate-600 uppercase tracking-[0.2em] mb-3">{t('switchUser')}</p>
                            <select
                                value={selectedUserId || ''}
                                onChange={(e) => setSelectedUserId(e.target.value || null)}
                                className="w-full bg-slate-900 border border-slate-800 rounded-none px-3 py-2 text-xs font-bold text-slate-300 focus:ring-1 focus:ring-brand-400 transition-all outline-none"
                            >
                                <option value="">🌍 {t('viewAllUsers')}</option>
                                {allUsers.map(u => (
                                    <option key={u.uid} value={u.uid}>
                                        👤 {u.email.split('@')[0]} ({u.role})
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}
                </div>

                <div className="p-4 border-t border-slate-900">


                    <button
                        onClick={handleLogout}
                        className="w-full mt-4 flex items-center justify-between px-4 py-3 text-red-400 hover:bg-red-900/20 rounded-none transition-all group border border-transparent hover:border-red-900/30"
                    >
                        <div className="flex items-center gap-3">
                            <LogOut className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
                            <span className="text-sm font-bold">{t('logout')}</span>
                        </div>
                    </button>
                </div>
            </aside>
        </>
    );
};

export default Sidebar;
