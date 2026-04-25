import React, { useEffect, useState } from 'react';
import { Invoice, Expense } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, AreaChart, Area } from 'recharts';
import { analyzeInvoices } from '../services/geminiService';
import { TrendingUp, Sparkles, PieChart, ArrowDownRight, ArrowUpRight, Scale, AlertCircle } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { motion } from 'framer-motion';
import { useAuthStore } from '../store/useAuthStore';
import { useDataStore } from '../store/useDataStore';
import { Users } from 'lucide-react';

interface DashboardProps {
  invoices: Invoice[];
  expenses: Expense[];
  customerCount: number;
}

const Dashboard: React.FC<DashboardProps> = ({ invoices, expenses, customerCount }) => {
  const { t, isDarkMode } = useAppStore();
  const { role } = useAuthStore();
  const { allUsers, selectedUserId } = useDataStore();
  const [insight, setInsight] = useState<string>('');
  const [loadingInsight, setLoadingInsight] = useState(false);

  const selectedUserEmail = allUsers.find(u => u.uid === selectedUserId)?.email;

  useEffect(() => {
    if (invoices.length > 0 && !insight) {
      setLoadingInsight(true);
      const simpleData = invoices.map(i => ({
        date: i.issueDate,
        total: i.items.reduce((acc, item) => acc + (item.quantity * item.unitPrice), 0)
      }));

      analyzeInvoices(simpleData).then(text => {
        setInsight(text);
        setLoadingInsight(false);
      });
    }
  }, [invoices, insight]);

  const totalRevenue = invoices.reduce((acc, inv) => {
    return acc + inv.items.reduce((s, i) => s + (i.quantity * i.unitPrice), 0);
  }, 0);

  const totalExpenses = expenses.reduce((acc, exp) => acc + exp.amount, 0);
  const netProfit = totalRevenue - totalExpenses;

  const revenueVat = invoices.reduce((acc, inv) => {
    return acc + inv.items.reduce((s, i) => s + (i.quantity * i.unitPrice * (i.vatRate / 100)), 0);
  }, 0);

  const expenseVat = expenses.filter(e => e.taxDeductible).reduce((acc, exp) => {
    return acc + (exp.amount - (exp.amount / (1 + exp.vatRate / 100)));
  }, 0);

  const vatLiability = revenueVat - expenseVat;

  const chartData = invoices.reduce((acc: any[], inv) => {
    const month = inv.issueDate.substring(0, 7);
    const amount = inv.items.reduce((s, i) => s + (i.quantity * i.unitPrice), 0);
    const existing = acc.find(d => d.name === month);
    if (existing) {
      existing.revenue = (existing.revenue || 0) + amount;
    } else {
      acc.push({ name: month, revenue: amount, expenses: 0 });
    }
    return acc;
  }, []);

  expenses.forEach(exp => {
    const month = exp.date.substring(0, 7);
    const existing = chartData.find(d => d.name === month);
    if (existing) {
      existing.expenses = (existing.expenses || 0) + exp.amount;
    } else {
      chartData.push({ name: month, revenue: 0, expenses: exp.amount });
    }
  });

  chartData.sort((a, b) => a.name.localeCompare(b.name));

  // --- Cash Flow Data Preparation ---
  const today = new Date();
  const next30Days = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);

  const cashFlowData = invoices
    .filter(inv => inv.status === 'Sent' || inv.status === 'Overdue')
    .filter(inv => {
      const d = new Date(inv.dueDate);
      return d >= today && d <= next30Days;
    })
    .reduce((acc: any[], inv) => {
      const date = inv.dueDate.substring(5); // MM-DD
      const amount = inv.items.reduce((s, i) => s + (i.quantity * i.unitPrice * (1 + i.vatRate / 100)), 0);
      const existing = acc.find(d => d.date === date);
      if (existing) existing.amount += amount;
      else acc.push({ date, amount });
      return acc;
    }, [])
    .sort((a, b) => a.date.localeCompare(b.date));

  // If empty, add some placeholders for empty state visualization or just show empty
  if (cashFlowData.length === 0 && invoices.length > 0) {
    // no immediate cash flow
  }

  // --- Top Customers Data Preparation ---
  const topCustomers = invoices.reduce((acc: any[], inv) => {
    const total = inv.items.reduce((s, i) => s + (i.quantity * i.unitPrice), 0);
    const existing = acc.find(c => c.name === inv.customer.name);
    if (existing) existing.value += total;
    else acc.push({ name: inv.customer.name, value: total, count: 1 });
    return acc;
  }, [])
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);


  const StatCard = ({ title, value, icon: Icon, colorFrom, colorTo, shadowColor, index }: any) => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      className="relative overflow-hidden bg-white dark:bg-slate-900 p-6 md:p-8 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800 hover:shadow-2xl hover:-translate-y-2 transition-all duration-300 group min-h-[180px] md:min-h-[220px] flex flex-col justify-between z-0"
    >
      <div className={`absolute top-0 right-0 w-32 md:w-48 h-32 md:h-48 bg-gradient-to-br ${colorFrom} ${colorTo} opacity-5 blur-3xl rounded-full transform translate-x-10 -translate-y-10 group-hover:scale-150 transition-transform duration-700`}></div>

      <div className="relative z-10">
        <div className={`w-12 h-12 md:w-16 md:h-16 rounded-2xl bg-gradient-to-br ${colorFrom} ${colorTo} flex items-center justify-center shadow-lg ${shadowColor} mb-4 md:mb-6 group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300`}>
          <Icon className="w-6 h-6 md:w-8 md:h-8 text-white" />
        </div>
        <div>
          <p className="text-xs md:text-sm font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1 md:mb-2">{title}</p>
          <h3 className="text-2xl md:text-4xl font-black text-slate-900 dark:text-white tracking-tight truncate">
            {value}
          </h3>
        </div>
      </div>

      <Icon className="absolute -bottom-6 -right-6 md:-bottom-8 md:-right-8 w-32 h-32 md:w-48 md:h-48 text-slate-50 dark:text-slate-800/50 group-hover:text-slate-100 dark:group-hover:text-slate-800 transition-colors duration-300 transform -rotate-12 pointer-events-none z-0" />
    </motion.div>
  );

  return (
    <div className="space-y-6 md:space-y-10 animate-fade-in pb-12">
      {role === 'admin' && selectedUserId && (
        <div className="bg-indigo-600 text-white px-6 py-3 rounded-2xl flex items-center justify-between shadow-xl shadow-indigo-600/20">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-lg">
              <Users className="w-5 h-5" />
            </div>
            <p className="font-bold text-sm">
              Viewing data for: <span className="text-indigo-100">{selectedUserEmail}</span>
            </p>
          </div>
          <p className="text-[10px] font-black uppercase tracking-widest opacity-60">Admin Context Active</p>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 md:gap-8">
        <StatCard
          title={t('totalRevenue')}
          value={new Intl.NumberFormat('sk-SK', { style: 'currency', currency: 'EUR' }).format(totalRevenue)}
          icon={ArrowUpRight}
          colorFrom="from-brand"
          colorTo="to-brand"
          shadowColor="shadow-brand"
          index={0}
        />
        <StatCard
          title={t('totalExpenses')}
          value={new Intl.NumberFormat('sk-SK', { style: 'currency', currency: 'EUR' }).format(totalExpenses)}
          icon={ArrowDownRight}
          colorFrom="from-rose-500"
          colorTo="to-rose-600"
          shadowColor="shadow-rose-500/20"
          index={1}
        />
        <StatCard
          title={t('netProfit')}
          value={new Intl.NumberFormat('sk-SK', { style: 'currency', currency: 'EUR' }).format(netProfit)}
          icon={TrendingUp}
          colorFrom="from-emerald-500"
          colorTo="to-teal-600"
          shadowColor="shadow-emerald-500/20"
          index={2}
        />
        <StatCard
          title={t('vatBalance')}
          value={new Intl.NumberFormat('sk-SK', { style: 'currency', currency: 'EUR' }).format(vatLiability)}
          icon={Scale}
          colorFrom="from-amber-400"
          colorTo="to-orange-500"
          shadowColor="shadow-amber-500/20"
          index={3}
        />
      </div>

      {/* Financial Health Status Bar */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm flex flex-col md:flex-row items-center justify-around gap-8 transition-colors"
      >
        <div className="flex flex-col items-center md:items-start">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Expected Inflow</span>
          <div className="flex items-center gap-2">
            <span className="text-xl font-black text-emerald-600 dark:text-emerald-400">
              {new Intl.NumberFormat('sk-SK', { style: 'currency', currency: 'EUR' }).format(
                invoices.filter(i => i.status === 'Sent' || i.status === 'Unpaid').reduce((acc, inv) => acc + inv.items.reduce((s, i) => s + (i.quantity * i.unitPrice * (1 + i.vatRate / 100)), 0), 0)
              )}
            </span>
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
          </div>
          <span className="text-[10px] text-slate-500 font-medium">Pending payments</span>
        </div>

        <div className="h-10 w-px bg-slate-100 dark:bg-slate-800 hidden md:block"></div>

        <div className="flex flex-col items-center md:items-start">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Overdue Risk</span>
          <div className="flex items-center gap-2">
            <span className="text-xl font-black text-rose-600 dark:text-rose-400">
              {new Intl.NumberFormat('sk-SK', { style: 'currency', currency: 'EUR' }).format(
                invoices.filter(i => i.status === 'Overdue').reduce((acc, inv) => acc + inv.items.reduce((s, i) => s + (i.quantity * i.unitPrice * (1 + i.vatRate / 100)), 0), 0)
              )}
            </span>
            {invoices.some(i => i.status === 'Overdue') && <AlertCircle className="w-4 h-4 text-rose-500 animate-bounce" />}
          </div>
          <span className="text-[10px] text-slate-500 font-medium">Critical attention needed</span>
        </div>

        <div className="h-10 w-px bg-slate-100 dark:bg-slate-800 hidden md:block"></div>

        <div className="flex flex-col items-center md:items-start">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">VAT Reservoir</span>
          <div className="flex items-center gap-2">
            <span className="text-xl font-black text-amber-600 dark:text-amber-400">
              {new Intl.NumberFormat('sk-SK', { style: 'currency', currency: 'EUR' }).format(vatLiability)}
            </span>
          </div>
          <span className="text-[10px] text-slate-500 font-medium font-mono">Estimated quarterly liability</span>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.4 }}
          className="lg:col-span-2 bg-white dark:bg-slate-900 p-5 md:p-10 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800 transition-colors"
        >
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 md:mb-10 gap-4">
            <div>
              <h3 className="text-xl md:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">{t('recentInvoices')}</h3>
              <p className="text-sm md:text-base text-slate-500 dark:text-slate-400 mt-1">{t('mainNavigation')}</p>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 transition-colors">
              <PieChart className="w-4 h-4 text-indigo-500 dark:text-indigo-400" />
              <span className="text-[10px] md:text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-widest whitespace-nowrap">Last 12 Months</span>
            </div>
          </div>
          <div className="h-60 sm:h-72 md:h-96 w-full -ml-4 pr-4 md:ml-0 md:pr-0">
            <ResponsiveContainer width="110%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDarkMode ? "#1e293b" : "#f1f5f9"} />
                <XAxis
                  dataKey="name"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: isDarkMode ? '#94a3b8' : '#64748b', fontSize: 10, fontWeight: 600 }}
                  dy={10}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: isDarkMode ? '#94a3b8' : '#64748b', fontSize: 10, fontWeight: 600 }}
                  tickFormatter={(value) => `€${value >= 1000 ? (value / 1000) + 'k' : value}`}
                />
                <Tooltip
                  cursor={{ fill: isDarkMode ? '#1e293b' : '#f8fafc', radius: 8 }}
                  contentStyle={{
                    borderRadius: '16px',
                    border: isDarkMode ? '1px solid #334155' : 'none',
                    boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
                    padding: '12px',
                    backgroundColor: isDarkMode ? 'rgba(15, 23, 42, 0.95)' : 'rgba(255, 255, 255, 0.98)',
                  }}
                  labelStyle={{ color: isDarkMode ? '#94a3b8' : '#64748b', marginBottom: '4px', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.05em' }}
                />
                <Legend iconType="circle" />
                <Bar name={t('invoices')} dataKey="revenue" fill="url(#colorRevenue)" radius={[6, 6, 0, 0]} barSize={20} />
                <Bar name={t('expenses')} dataKey="expenses" fill="url(#colorExpenses)" radius={[6, 6, 0, 0]} barSize={20} />
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--primary-color)" stopOpacity={1} />
                    <stop offset="100%" stopColor="var(--primary-color)" stopOpacity={0.8} />
                  </linearGradient>
                  <linearGradient id="colorExpenses" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#f43f5e" stopOpacity={1} />
                    <stop offset="100%" stopColor="#fb7185" stopOpacity={0.8} />
                  </linearGradient>
                </defs>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-white dark:bg-slate-900 p-5 md:p-10 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800 transition-colors"
        >
          <h3 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight mb-6">{t('topCustomers')}</h3>
          <div className="space-y-6">
            {topCustomers.map((c, i) => (
              <div key={i} className="relative">
                <div className="flex justify-between items-center mb-2 z-10 relative">
                  <span className="font-bold text-slate-700 dark:text-slate-200 text-sm truncate max-w-[150px]">{c.name}</span>
                  <span className="font-bold text-slate-900 dark:text-white text-sm">
                    {new Intl.NumberFormat('sk-SK', { style: 'currency', currency: 'EUR', minimumFractionDigits: 0 }).format(c.value)}
                  </span>
                </div>
                <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full"
                    style={{ width: `${(c.value / topCustomers[0].value) * 100}%` }}
                  ></div>
                </div>
              </div>
            ))}
            {topCustomers.length === 0 && (
              <p className="text-slate-400 text-sm text-center italic py-10">No customer data yet.</p>
            )}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.55 }}
          className="lg:col-span-3 bg-white dark:bg-slate-900 p-5 md:p-10 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800 transition-colors"
        >
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="text-xl md:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Cash Flow Forecast</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Projected incoming payments (Next 30 Days)</p>
            </div>
            <div className="hidden sm:block px-3 py-1 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded-lg text-xs font-bold uppercase tracking-wider">
              Based on Due Dates
            </div>
          </div>

          <div className="h-64 w-full">
            {cashFlowData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={cashFlowData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorCash" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDarkMode ? "#1e293b" : "#f1f5f9"} />
                  <XAxis
                    dataKey="date"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: isDarkMode ? '#94a3b8' : '#64748b', fontSize: 10, fontWeight: 600 }}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: isDarkMode ? '#94a3b8' : '#64748b', fontSize: 10, fontWeight: 600 }}
                    tickFormatter={(value) => `€${value}`}
                  />
                  <Tooltip
                    contentStyle={{
                      borderRadius: '12px',
                      border: 'none',
                      boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                      backgroundColor: isDarkMode ? 'rgba(15, 23, 42, 0.95)' : 'rgba(255, 255, 255, 0.95)',
                      color: isDarkMode ? '#fff' : '#0f172a'
                    }}
                  />
                  <Area type="monotone" dataKey="amount" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorCash)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 border-2 border-dashed border-slate-100 dark:border-slate-800 rounded-2xl">
                <TrendingUp className="w-8 h-8 mb-2 opacity-50" />
                <p className="font-medium">No pending invoices due in the next 30 days.</p>
                <p className="text-sm opacity-70">Create and send an invoice to see projections.</p>
              </div>
            )}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.6 }}
          className="relative overflow-hidden bg-slate-900 px-5 py-8 md:p-10 rounded-3xl text-white shadow-2xl flex flex-col justify-between min-h-[350px] md:min-h-[450px]"
        >
          <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(255,255,255,0.15) 1px, transparent 0)', backgroundSize: '16px 16px' }}></div>
          <div className="absolute top-0 right-0 w-48 md:w-64 h-48 md:h-64 bg-indigo-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
          <div className="absolute -bottom-8 -left-8 w-48 md:w-64 h-48 md:h-64 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>

          <div className="relative z-10 flex flex-col h-full">
            <div className="flex items-center gap-3 md:gap-4 mb-6 md:mb-8">
              <div className="p-2.5 bg-white/10 rounded-xl backdrop-blur-md border border-white/10 shadow-lg">
                <Sparkles className="w-5 h-5 text-indigo-300" />
              </div>
              <div>
                <h3 className="font-bold text-base md:text-xl tracking-tight">AI Financial Analyst</h3>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse"></span>
                  <p className="text-indigo-200/60 text-[10px] md:text-xs font-bold uppercase tracking-wider">Online</p>
                </div>
              </div>
            </div>

            <div className="flex-1 bg-white/5 rounded-2xl p-4 md:p-6 backdrop-blur-sm border border-white/10 mb-6 flex flex-col justify-center">
              <p className="text-indigo-50 text-sm md:text-base leading-relaxed font-medium transition-all">
                {loadingInsight ? (
                  <span className="flex items-center gap-3 italic text-indigo-300/80">
                    <span className="flex space-x-1 shrink-0">
                      <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce"></span>
                      <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                      <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                    </span>
                    Extracting intelligence...
                  </span>
                ) : (
                  insight || "Your financial data is ready for analysis. Generate your first invoice to unlock predictive insights regarding your cash flow and top performing clients."
                )}
              </p>
            </div>

            <button className="w-full py-3.5 md:py-4 bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white rounded-2xl font-bold text-sm transition-all shadow-xl shadow-indigo-950/50 border border-indigo-400/30 flex items-center justify-center gap-2 group">
              View Intelligence Report
              <TrendingUp className="w-4 h-4 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Dashboard;