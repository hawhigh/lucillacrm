import React, { useState, useEffect } from 'react';
import { Invoice, Customer, Supplier, InvoiceSettings, Expense } from './types';
import Dashboard from './components/Dashboard';
import InvoiceForm from './components/InvoiceForm';
import InvoicePreview from './components/InvoicePreview';
import CustomerManager from './components/CustomerManager';
import ExpenseManager from './components/ExpenseManager';
import SettingsManager from './components/SettingsManager';
import UserManager from './components/UserManager';
import Login from './components/Login';
import DataDump from './components/DataDump';
import Layout from './components/Layout';
import EmailComposeModal from './components/EmailComposeModal';
import FunctionsOverview from './components/FunctionsOverview';
import EmailAutomationManager from './components/EmailAutomationManager';
import QuoteManager from './components/QuoteManager';
import ProductManager from './components/ProductManager';
import { RecurringManager } from './components/RecurringManager';
import DigitalCard from './components/DigitalCard';
import MobileScanner from './components/MobileScanner';
import { useAppStore } from './store/useAppStore';
import { useAuthStore } from './store/useAuthStore';
import { useDataStore } from './store/useDataStore';
import { ArrowLeft, Trash2, Stamp, Printer, Download, Mail, FileCode, FileJson } from 'lucide-react';
import { doc, setDoc, onSnapshot } from 'firebase/firestore';
import { db, functions } from './services/firebase';
import { httpsCallable } from 'firebase/functions';
import { generateISDOC, generatePohodaXML } from './services/exportService';

const DEFAULT_SUPPLIER_DATA: Supplier = {
  name: "LUCILLA LIMITED",
  addressLine1: "Avlonos 1, MARIA HOUSE, Floor 2",
  addressLine2: "Flat/Office 4, 1075 Nicosia",
  city: "Nicosia",
  zip: "1075",
  country: "Cyprus",
  ico: "",
  dic: "",
  icDph: "",
  bankName: "EUROBANK CYPRUS LTD",
  iban: "CY88018000010000200100441723",
  swift: "ERBKCY2NXXX",
  businessRegisterInfo: "Reg. office: Avlonos 1, MARIA HOUSE, Floor 2",
  email: "office@lucillacrm.com",
  phone: "+357 99224641",
  logo: "/lucilla-logo-white.png",
  signature: "/signature.jpg",
  signature2: "/signature-stamp.png",
  bankAccounts: []
};

const DEFAULT_SETTINGS: InvoiceSettings = {
  fontSize: 'medium',
  fontFamily: 'Inter',
  layoutPreset: 'minimal',
  logoSize: 60,
  headerFontSize: 24,
  primaryColor: '#C5A059'
};

const App = () => {
  const { view, setView, isDarkMode, t, language } = useAppStore();
  const { user, role, loading: authLoading, initialize: initAuth } = useAuthStore();
  const {
    invoices, customers, expenses,
    initializeData, cleanup: cleanupData,
    saveInvoice, deleteInvoice,
    saveCustomer, deleteCustomer,
    saveExpense, deleteExpense,
    saveProduct, deleteProduct,
    products
  } = useDataStore();

  const [supplier, setSupplier] = useState<Supplier>(DEFAULT_SUPPLIER_DATA);
  const [settings, setSettings] = useState<InvoiceSettings>(DEFAULT_SETTINGS);
  const [activeInvoice, setActiveInvoice] = useState<Invoice | null>(null);
  const [forceDraftMode, setForceDraftMode] = useState(false);

  // Email Modal State
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [emailData, setEmailData] = useState({ to: '', subject: '', body: '' });

  useEffect(() => {
    const unsub = initAuth();
    return () => unsub();
  }, []);

  useEffect(() => {
    if (user) {
      initializeData(user.uid, role);
    } else {
      cleanupData();
      setView('dashboard');
    }
  }, [user]);

  useEffect(() => {
    document.documentElement.classList.remove('dark');
  }, [isDarkMode]);

  // Fetch Supplier & Settings from Firestore
  useEffect(() => {
    if (!user) return;
    const unsub = onSnapshot(doc(db, 'users', user.uid), (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        if (data.supplier) setSupplier(prev => ({ ...prev, ...data.supplier }));
        if (data.settings) setSettings(prev => ({ ...prev, ...data.settings }));
      }
    });
    return () => unsub();
  }, [user]);

  useEffect(() => {
    document.documentElement.style.setProperty('--primary-color', settings.primaryColor);
    const hex = settings.primaryColor;
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    document.documentElement.style.setProperty('--primary-color-rgb', `${r}, ${g}, ${b}`);
  }, [settings.primaryColor]);

  useEffect(() => {
    const handleAfterPrint = () => setForceDraftMode(false);
    window.addEventListener('afterprint', handleAfterPrint);
    return () => window.removeEventListener('afterprint', handleAfterPrint);
  }, []);

  // Force update logo to white version if it matches old versions (fixes HMR state persistence)
  // Also force update primary color to Gold if it matches old Silver
  useEffect(() => {
    if (supplier.logo === '/lucilla-logo-transparent.png' || supplier.logo === '/lucilla-logo.png') {
      setSupplier(prev => ({ ...prev, logo: '/lucilla-logo-white.png' }));
    }

    if (settings.primaryColor === '#B8BFC6') {
      setSettings(prev => ({ ...prev, primaryColor: '#C5A059' }));
    }
  }, [supplier.logo, settings.primaryColor]);

  const startNewInvoice = () => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    const datePrefix = `${yyyy}${mm}${dd}`;

    const dailyInvoices = invoices.filter(inv => inv.number.startsWith(datePrefix));
    let nextSeq = 1;
    if (dailyInvoices.length > 0) {
      const sequences = dailyInvoices.map(inv => {
        const suffix = inv.number.slice(8);
        return parseInt(suffix, 10);
      }).filter(n => !isNaN(n));
      if (sequences.length > 0) {
        nextSeq = Math.max(...sequences) + 1;
      }
    }
    const newNumber = `${datePrefix}${String(nextSeq).padStart(2, '0')}`;

    setActiveInvoice({
      id: Math.random().toString(36).substr(2, 9),
      number: newNumber,
      supplier: supplier,
      customer: { id: '', name: '', addressLine1: '', city: '', zip: '', country: '', ico: '', dic: '', icDph: '', email: '' },
      issueDate: new Date().toISOString().split('T')[0],
      deliveryDate: new Date().toISOString().split('T')[0],
      dueDate: new Date(Date.now() + 12096e5).toISOString().split('T')[0],
      paymentMethod: 'Bank Transfer',
      variableSymbol: newNumber, // Often VS matches invoice number
      constantSymbol: '0308',
      specificSymbol: '',
      items: [],
      notes: 'Invoice is due within 14 days.',
      status: 'Draft'
    });
    setView('create');
  };

  const handleSaveInvoice = async (inv: Invoice) => {
    await saveInvoice(inv);
    setActiveInvoice(inv);
    setView('preview');
  };

  const handlePrintDraft = () => {
    setForceDraftMode(true);
    setTimeout(() => {
      window.print();
      setTimeout(() => setForceDraftMode(false), 500);
    }, 100);
  };

  const handleDownloadPdf = async () => {
    const element = document.getElementById('invoice-content');
    if (!element) return;
    const opt = {
      margin: 0,
      filename: `${activeInvoice?.number || 'invoice'}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 3, useCORS: true, logging: false, letterRendering: true, scrollY: 0, scrollX: 0 },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait', compress: true }
    };
    // @ts-ignore
    if (window.html2pdf) {
      // Small delay to ensure styles are settled
      await new Promise(resolve => setTimeout(resolve, 100));
      // @ts-ignore
      window.html2pdf().set(opt).from(element).save();
    }
    else alert("PDF library loading...");
  };

  const handleSendEmail = () => {
    if (!activeInvoice) return;
    const { customer, number, supplier, dueDate } = activeInvoice;
    const totalDue = activeInvoice.items.reduce((acc, item) => {
      const discountedPrice = item.unitPrice * (1 - (item.discount || 0) / 100);
      return acc + (item.quantity * discountedPrice * (1 + item.vatRate / 100));
    }, 0);

    let subject = '';
    let body = '';
    const formattedTotal = totalDue.toFixed(2);

    if (language === 'sk') {
      subject = `Faktúra ${number} - ${supplier.name}`;
      body = `Vážený/á ${customer.name},\n\nv prílohe zasielame faktúru ${number} s nasledujúcim prehľadom:\n\nCelková suma: ${formattedTotal} EUR\nDátum splatnosti: ${dueDate}\n\nĎakujeme.\n\nS pozdravom,\n${supplier.name}`;
    } else {
      subject = `Invoice ${number} - ${supplier.name}`;
      body = `Dear ${customer.name},\n\nPlease find the invoice ${number} summarized below:\n\nTotal Amount: ${formattedTotal} EUR\nDue Date: ${dueDate}\n\nThank you.\n\nSincerely,\n${supplier.name}`;
    }

    setEmailData({
      to: customer.email,
      subject: subject,
      body: body
    });
    setIsEmailModalOpen(true);
  };

  const handleExport = (type: 'xml' | 'isdoc') => {
    if (!activeInvoice) return;
    let content = '';
    let filename = '';

    if (type === 'xml') {
      content = generatePohodaXML([activeInvoice]);
      filename = `export_${activeInvoice.number}.xml`;
    } else {
      content = generateISDOC(activeInvoice);
      filename = `isdoc_${activeInvoice.number}.isdoc`;
    }

    const blob = new Blob([content], { type: 'application/xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleConfirmSendEmail = async (body: string) => {
    setIsSendingEmail(true);
    try {
      const element = document.getElementById('invoice-content');
      if (!element) throw new Error("Invoice content not found");

      const opt = {
        margin: 0,
        filename: `${activeInvoice?.number || 'invoice'}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, logging: false, letterRendering: true, scrollY: 0, windowWidth: 800 },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait', compress: true }
      };

      let pdfDataUri = '';
      // @ts-ignore
      if (window.html2pdf) {
        // Force a small delay to ensure rendering is complete
        await new Promise(resolve => setTimeout(resolve, 500));
        // @ts-ignore
        pdfDataUri = await window.html2pdf().set(opt).from(element).output('datauristring');
        // @ts-ignore
        window.html2pdf().set(opt).from(element).save();
      } else {
        alert("PDF library loading...");
        return;
      }

      // Direct Fallback: Download PDF & Open Mail Client (Reliable on Spark Plan)

      // 1. Download PDF
      const link = document.createElement('a');
      link.href = pdfDataUri;
      link.download = `${activeInvoice?.number}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // 2. Open Mailto with a slight delay
      setTimeout(() => {
        const mailtoLink = `mailto:${emailData.to}?subject=${encodeURIComponent(emailData.subject)}&body=${encodeURIComponent(body)}`;
        window.location.href = mailtoLink;

        // 3. User Instruction
        alert("Invoice PDF has been downloaded to your computer.\n\nYour email client will now open.\n\nPlease drag and drop the downloaded PDF into the email to attach it.");
      }, 500);

      setIsEmailModalOpen(false);
    } catch (e: any) {
      console.error(e);
      alert(`Failed to prepare email: ${e.message}`);
    } finally {
      setIsSendingEmail(false);
    }
  };

  if (authLoading) return <div className="h-screen flex items-center justify-center font-black text-brand animate-pulse text-2xl">LUCILLA.</div>;
  if (!user) return <Login onLogin={() => { }} />;

  return (
    <Layout supplier={supplier} startNewInvoice={startNewInvoice}>
      {view === 'dashboard' && <Dashboard invoices={invoices} expenses={expenses} customerCount={customers.length} isDarkMode={isDarkMode} />}

      {view === 'customers' && (
        <CustomerManager customers={customers} onSave={saveCustomer} onDelete={deleteCustomer} />
      )}

      {view === 'expenses' && (
        <ExpenseManager expenses={expenses} onSave={saveExpense} onDelete={deleteExpense} />
      )}

      {view === 'settings' && (
        <SettingsManager
          supplier={supplier}
          onSaveSupplier={async (updated) => {
            setSupplier(updated);
            if (user) await setDoc(doc(db, 'users', user.uid), { supplier: updated }, { merge: true });
          }}
          settings={settings}
          onSaveSettings={async (updated) => {
            setSettings(updated);
            if (user) await setDoc(doc(db, 'users', user.uid), { settings: updated }, { merge: true });
          }}
        />
      )}

      {view === 'users' && role === 'admin' && (
        <UserManager />
      )}
      {view === 'overview' && (
        <FunctionsOverview />
      )}

      {view === 'automation' && (
        <EmailAutomationManager invoices={invoices} />
      )}

      {view === 'scanner' && (
        <MobileScanner />
      )}

      {view === 'quotes' && (
        <QuoteManager supplier={supplier} products={products} />
      )}

      {view === 'products' && (
        <ProductManager products={products} onSave={saveProduct} onDelete={deleteProduct} />
      )}

      {view === 'recurring' && (
        <RecurringManager />
      )}

      {view === 'digitalCard' && (
        <DigitalCard supplier={supplier} />
      )}

      {view === 'dataDump' && (
        <DataDump />
      )}

      {view === 'list' && (
        <div className="space-y-4">
          {/* Mobile Card View */}
          <div className="md:hidden space-y-4">
            {invoices.map(inv => {
              const total = inv.items.reduce((acc, item) => {
                const discountedPrice = item.unitPrice * (1 - (item.discount || 0) / 100);
                return acc + (item.quantity * discountedPrice * (1 + item.vatRate / 100));
              }, 0);
              return (
                <div
                  key={inv.id}
                  onClick={() => { setActiveInvoice(inv); setView('preview'); }}
                  className="bg-white dark:bg-slate-900/50 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm active:scale-98 transition-all"
                >
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1">#{inv.number}</span>
                      <h3 className="font-bold text-slate-900 dark:text-white text-lg">{inv.customer.name}</h3>
                    </div>
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide
                      ${inv.status === 'Sent' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' : ''}
                      ${inv.status === 'Paid' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' : ''}
                      ${inv.status === 'Draft' ? 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400' : ''}
                      ${inv.status === 'Overdue' ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300' : ''}
                    `}>
                      {t(inv.status.toLowerCase() as any)}
                    </span>
                  </div>

                  <div className="flex justify-between items-end">
                    <div className="text-slate-500 dark:text-slate-400 text-xs font-medium">
                      {inv.issueDate}
                    </div>
                    <div className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                      {new Intl.NumberFormat('sk-SK', { style: 'currency', currency: 'EUR' }).format(total)}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Desktop Table View */}
          <div className="hidden md:block bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden transition-colors">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm min-w-[800px]">
                <thead className="bg-gray-50/50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 uppercase tracking-wider text-xs font-bold">
                  <tr>
                    <th className="px-8 py-6">{t('invoices')} #</th>
                    <th className="px-8 py-6">{t('customers')}</th>
                    <th className="px-8 py-6">Date</th>
                    <th className="px-8 py-6 text-right">Amount</th>
                    <th className="px-8 py-6 text-center">Status</th>
                    <th className="px-8 py-6"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {invoices.map(inv => {
                    const total = inv.items.reduce((acc, item) => {
                      const discountedPrice = item.unitPrice * (1 - (item.discount || 0) / 100);
                      return acc + (item.quantity * discountedPrice * (1 + item.vatRate / 100));
                    }, 0);
                    return (
                      <tr key={inv.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors group cursor-pointer" onClick={() => { setActiveInvoice(inv); setView('preview'); }}>
                        <td className="px-8 py-6 font-bold text-brand">{inv.number}</td>
                        <td className="px-8 py-6 text-slate-700 dark:text-slate-300 font-semibold">{inv.customer.name}</td>
                        <td className="px-8 py-6 text-slate-500 dark:text-slate-400">{inv.issueDate}</td>
                        <td className="px-8 py-6 text-slate-900 dark:text-white font-black text-right text-base">
                          {new Intl.NumberFormat('sk-SK', { style: 'currency', currency: 'EUR' }).format(total)}
                        </td>
                        <td className="px-8 py-6 text-center">
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide
                            ${inv.status === 'Sent' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' : ''}
                            ${inv.status === 'Paid' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : ''}
                            ${inv.status === 'Draft' ? 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400' : ''}
                            ${inv.status === 'Overdue' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' : ''}
                          `}>
                            {t(inv.status.toLowerCase() as any)}
                          </span>
                        </td>
                        <td className="px-8 py-6 text-right text-slate-300 group-hover:text-slate-900 dark:group-hover:text-white transition-colors">
                          {role !== 'accountant' && (
                            <Trash2 className="w-4 h-4 ml-auto hover:text-red-500" onClick={(e) => { e.stopPropagation(); deleteInvoice(inv.id); }} />
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {view === 'create' && activeInvoice && (
        <InvoiceForm initialInvoice={activeInvoice} customers={customers} products={products} onSave={handleSaveInvoice} onCancel={() => setView('list')} />
      )}

      {view === 'preview' && activeInvoice && (
        <div className="space-y-8 max-w-6xl mx-auto">
          <div className="flex flex-col xl:flex-row justify-between items-center no-print bg-white dark:bg-slate-900 p-4 md:p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm gap-6">
            <button onClick={() => setView('list')} className="text-slate-500 hover:text-brand flex items-center gap-2 text-sm font-bold transition-colors">
              <ArrowLeft className="w-5 h-5" /> {t('backToList')}
            </button>
            <div className="flex gap-3 w-full xl:w-auto">
              {role !== 'accountant' && (
                <button onClick={() => setView('create')} className="px-4 py-3 text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors">{t('edit')}</button>
              )}

              {/* Export Options */}
              <div className="flex items-center gap-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
                <button onClick={() => handleExport('xml')} className="px-3 py-3 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors flex items-center gap-2 border-r border-slate-200 dark:border-slate-700" title="Pohoda XML">
                  <FileCode className="w-4 h-4" /> XML
                </button>
                <button onClick={() => handleExport('isdoc')} className="px-3 py-3 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors flex items-center gap-2" title="ISDOC">
                  <FileJson className="w-4 h-4" /> ISDOC
                </button>
              </div>

              <button onClick={handleDownloadPdf} className="px-4 py-3 text-sm font-bold bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-xl flex items-center gap-2 shadow-sm"><Download className="w-4 h-4" /> PDF</button>
              <button onClick={handleSendEmail} className="px-4 py-3 text-sm font-bold bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-xl flex items-center gap-2 shadow-sm"><Mail className="w-4 h-4" /> {t('sendEmail')}</button>
            </div>
          </div>
          <div className="flex justify-center py-8 bg-slate-100 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-800 shadow-inner">
            <div className="transform scale-100 origin-top shadow-2xl rounded-sm overflow-hidden bg-white">
              <InvoicePreview invoice={activeInvoice} settings={settings} isDraft={forceDraftMode} />
            </div>
          </div>
        </div>
      )}

      {/* Email Modal */}
      <EmailComposeModal
        isOpen={isEmailModalOpen}
        onClose={() => setIsEmailModalOpen(false)}
        to={emailData.to}
        subject={emailData.subject}
        initialBody={emailData.body}
        onSend={handleConfirmSendEmail}
        isSending={isSendingEmail}
      />
    </Layout>
  );
};

export default App;