
import React from 'react';
import {
    LayoutDashboard,
    FileText,
    Users,
    Receipt,
    Settings,
    ShieldCheck,
    Globe,
    Sparkles,
    Mail,
    FileDown,
    Search
} from 'lucide-react';

const FunctionsOverview: React.FC = () => {
    const features = [
        {
            icon: <LayoutDashboard className="w-8 h-8 text-indigo-500" />,
            title: "Smart Dashboard",
            description: "Real-time financial overview with AI-powered insights. Track revenue, expenses, and net profit at a glance.",
            bg: "bg-indigo-50 dark:bg-indigo-900/20"
        },
        {
            icon: <FileText className="w-8 h-8 text-blue-500" />,
            title: "Invoice Management",
            description: "Create, edit, and manage invoices with ease. Supports multi-currency, VAT calculations, and custom statuses.",
            bg: "bg-blue-50 dark:bg-blue-900/20"
        },
        {
            icon: <Users className="w-8 h-8 text-emerald-500" />,
            title: "Customer CRM",
            description: "Manage client database. Use Smart Import to fetch company details automatically from public registers by name or ICO.",
            bg: "bg-emerald-50 dark:bg-emerald-900/20"
        },
        {
            icon: <Receipt className="w-8 h-8 text-orange-500" />,
            title: "Expense Tracking",
            description: "Log and categorize business expenses. Monitor tax-deductible items and VAT reclaim opportunities.",
            bg: "bg-orange-50 dark:bg-orange-900/20"
        },
        {
            icon: <Globe className="w-8 h-8 text-purple-500" />,
            title: "Global Search & View",
            description: "Admins can view data across the entire organization. Advanced filtering and sorting capabilities.",
            bg: "bg-purple-50 dark:bg-purple-900/20"
        },
        {
            icon: <Sparkles className="w-8 h-8 text-amber-500" />,
            title: "AI Integration",
            description: "Leverage Google Gemini for financial analysis, data extraction from receipts, and automated insights.",
            bg: "bg-amber-50 dark:bg-amber-900/20"
        },
        {
            icon: <Mail className="w-8 h-8 text-sky-500" />,
            title: "Direct Emailing",
            description: "Send invoices directly to clients with a built-in composer. Review messages before sending via your email client.",
            bg: "bg-sky-50 dark:bg-sky-900/20"
        },
        {
            icon: <FileDown className="w-8 h-8 text-red-500" />,
            title: "PDF Generation",
            description: "Generate professional, branded PDF invoices instantly. Customizable layout and branding settings.",
            bg: "bg-red-50 dark:bg-red-900/20"
        },
        {
            icon: <ShieldCheck className="w-8 h-8 text-slate-500" />,
            title: "Secure & Private",
            description: "Role-Based Access Control (RBAC) ensures data security. Admin and User roles with isolated data views.",
            bg: "bg-slate-50 dark:bg-slate-900/20"
        }
    ];

    return (
        <div className="max-w-7xl mx-auto pb-20 animate-fade-in">
            <div className="mb-12 text-center">
                <h1 className="text-4xl font-black text-slate-900 dark:text-white mb-4 tracking-tight">
                    Functions Overview
                </h1>
                <p className="text-lg text-slate-500 dark:text-slate-400 max-w-2xl mx-auto">
                    Explore the powerful features designed to streamline your business operations and financial management.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {features.map((feature, index) => (
                    <div
                        key={index}
                        className="bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group"
                    >
                        <div className={`w-16 h-16 rounded-2xl ${feature.bg} flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300`}>
                            {feature.icon}
                        </div>
                        <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-3">
                            {feature.title}
                        </h3>
                        <p className="text-slate-500 dark:text-slate-400 leading-relaxed">
                            {feature.description}
                        </p>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default FunctionsOverview;
