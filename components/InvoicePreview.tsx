import React, { useMemo, useState, useEffect, useRef } from 'react';
import { Hexagon } from 'lucide-react';
import { Invoice, InvoiceSettings } from '../types';
import { translations, Language } from '../services/translations';
import { useAppStore } from '../store/useAppStore';

interface InvoicePreviewProps {
    invoice: Invoice;
    settings: InvoiceSettings;
    isDraft?: boolean;
}

const InvoicePreview: React.FC<InvoicePreviewProps> = ({ invoice, settings, isDraft }) => {
    console.log('Rendering InvoicePreview v16');
    const { language, setLanguage } = useAppStore();
    // Determine language strictly from store/prop to fix "English mutation" issue
    const currentLang = (language || 'en').toLowerCase() as Language;
    const t = translations[currentLang] || translations['en'];

    // Branding Setup remains for UI purely
    const fontClass = 'font-sans';
    const layout = settings.layoutPreset || 'modern';

    // Dynamic Size Configuration
    const s = useMemo(() => {
        const map = {
            small: {
                h1: 'text-2xl',
                h2: 'text-xl',
                h3: 'text-[10px]',
                base: 'text-xs',
                lg: 'text-sm',
                xl: 'text-lg',
                sm: 'text-[10px]',
                xs: 'text-[9px]',
                tracking: 'tracking-tight'
            },
            medium: {
                h1: 'text-4xl',
                h2: 'text-xl',
                h3: 'text-xs',
                base: 'text-sm',
                lg: 'text-base',
                xl: 'text-2xl',
                sm: 'text-xs',
                xs: 'text-[10px]',
                tracking: 'tracking-tight'
            },
            large: {
                h1: 'text-5xl',
                h2: 'text-2xl',
                h3: 'text-sm',
                base: 'text-base',
                lg: 'text-lg',
                xl: 'text-3xl',
                sm: 'text-sm',
                xs: 'text-xs',
                tracking: 'tracking-tighter'
            }
        };
        return map[settings.fontSize || 'medium'];
    }, [settings.fontSize]);

    // Calculate Totals
    const totals = useMemo(() => {
        let subtotal = 0;
        let totalVat = 0;

        invoice.items.forEach(item => {
            const discount = item.discount || 0;
            const discountedPrice = item.unitPrice * (1 - discount / 100);
            const lineTotal = item.quantity * discountedPrice;
            subtotal += lineTotal;
            totalVat += lineTotal * (item.vatRate / 100);
        });

        return {
            subtotal,
            totalVat,
            totalDue: subtotal + totalVat
        };
    }, [invoice.items]);

    // Generate SEPA QR String (EPC069-12)
    const qrString = useMemo(() => {
        const iban = invoice.supplier.iban.replace(/\s/g, '');
        const bic = invoice.supplier.swift?.replace(/\s/g, '') || '';
        const name = invoice.supplier.name.substring(0, 70);
        const amount = totals.totalDue.toFixed(2);
        const vs = invoice.variableSymbol ? `VS:${invoice.variableSymbol}` : '';
        const msg = `INV ${invoice.number}`;
        const remittance = [msg, vs].filter(Boolean).join(' ');

        // EPC069-12 Standard
        // Service Tag
        // Version
        // Character Set (1=UTF-8)
        // Identification
        // BIC
        // Name
        // IBAN
        // Amount
        // Purpose Code
        // Structured Remittance
        // Unstructured Remittance
        // Beneficiary Info
        return [
            'BCD',
            '002',
            '1',
            'SCT',
            bic,
            name,
            iban,
            `EUR${amount}`,
            '',
            '',
            '',          // Index 10: Structured Remittance (Empty)
            remittance   // Index 11: Unstructured Remittance
        ].join('\n');
    }, [invoice, totals]);

    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(qrString)}`;

    const formatCurrency = (val: number) => {
        const locale = currentLang === 'en' ? 'en-IE' : currentLang === 'de' ? 'de-DE' : 'sk-SK';
        return new Intl.NumberFormat(locale, { style: 'currency', currency: 'EUR' }).format(val);
    };

    const formatDate = (dateStr: string) => {
        if (!dateStr) return '';

        // Handle YYYY-MM-DD manually to avoid timezone shifts
        if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
            const [year, month, day] = dateStr.split('-');
            if (currentLang === 'sk') {
                return `${day}.${month}.${year}`;
            }
            if (currentLang === 'de') {
                return `${day}.${month}.${year}`;
            }
            // EN (GB style)
            return `${day}/${month}/${year}`;
        }

        // Fallback for other formats (timestamps)
        const date = new Date(dateStr);
        if (isNaN(date.getTime())) return dateStr;

        if (currentLang === 'sk') {
            const day = date.getDate().toString().padStart(2, '0');
            const month = (date.getMonth() + 1).toString().padStart(2, '0');
            const year = date.getFullYear();
            return `${day}/${month}/${year}`;
        }
        const locale = currentLang === 'en' ? 'en-GB' : 'de-DE';
        return date.toLocaleDateString(locale);
    };

    const [containerWidth, setContainerWidth] = useState(window.innerWidth);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleResize = () => {
            if (containerRef.current) {
                setContainerWidth(containerRef.current.offsetWidth);
            }
        };

        window.addEventListener('resize', handleResize);
        handleResize(); // Initial call

        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Standard A4 width in pixels at 96 DPI is ~794px (210mm)
    // We add some buffer for padding
    const INVOICE_WIDTH_PX = 800;
    const scale = Math.min(1, (containerWidth - 32) / INVOICE_WIDTH_PX); // 32px for padding

    return (
        <div className={`bg-white dark:bg-slate-950 min-h-screen ${fontClass}`}>
            {/* Language Switcher */}
            <div className="flex justify-end mb-4 no-print px-4 pt-4 sticky top-0 bg-white/50 dark:bg-slate-950/50 backdrop-blur-md z-20">
                <div className="inline-flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg border border-slate-200 dark:border-slate-700">
                    {(['sk', 'en', 'de'] as const).map((l) => (
                        <button
                            key={l}
                            onClick={() => setLanguage(l)}
                            className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all uppercase ${currentLang === l
                                ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm ring-1 ring-slate-200 dark:ring-slate-600'
                                : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
                                }`}
                        >
                            {l}
                        </button>
                    ))}
                </div>
            </div>

            {/* Actual Invoice Paper - Fixed A4 Dimensions with Scaling Wrapper */}
            <div className="overflow-x-hidden pb-12 px-4 print:p-0 flex justify-center w-full" ref={containerRef}>
                <div style={{
                    transform: `scale(${scale})`,
                    transformOrigin: 'top center',
                    width: '210mm',
                    height: 'auto', // Allow height to grow
                    transition: 'transform 0.1s ease-out'
                }}>
                    <div
                        id="invoice-content"
                        className="bg-white relative text-black leading-normal flex flex-col print:shadow-none shadow-2xl"
                        style={{
                            width: '210mm',
                            minHeight: '297mm',
                            padding: '15mm 15mm 15mm 15mm',
                            fontFamily: "Arial, Helvetica, sans-serif",
                            color: '#374151',
                            overflow: 'visible'
                        }}
                    >
                        {/* 1. Top Header: Logo & Invoice # */}
                        <div className="flex justify-between items-end mb-4 border-b-2 border-black pb-4">
                            <div>
                                {invoice.supplier.logo ? (
                                    <img src={invoice.supplier.logo} alt="Logo" className="h-32 w-auto object-contain" />
                                ) : (
                                    <div className="h-20 w-20 bg-brand-400 flex items-center justify-center text-black">
                                        <Hexagon className="w-10 h-10" />
                                    </div>
                                )}
                            </div>
                            <div className="text-right">
                                <h1 className="text-[24px] font-bold text-slate-900 tracking-tight mb-1" style={{ color: '#0f172a', fontSize: '24px', lineHeight: '1.2' }}>{t.headerTitle}</h1>
                            </div>
                        </div>

                        {/* 2. Addresses & Global Info Grid */}
                        <div className="grid grid-cols-3 gap-4 mb-6 text-xs leading-snug text-slate-700">
                            {/* Supplier */}
                            <div style={{ pageBreakInside: 'avoid' }}>
                                <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1 border-b border-black pb-1">{t.supplierTitle}</h3>
                                <div className="font-bold text-sm text-slate-800 mb-0.5" style={{ color: '#1e293b' }}>{invoice.supplier.name}</div>
                                <div className="text-slate-700 space-y-0.5">
                                    <p>{invoice.supplier.addressLine1}</p>
                                    <p>{invoice.supplier.addressLine2}</p>
                                    <p>{invoice.supplier.zip} {invoice.supplier.city}, {invoice.supplier.country}</p>
                                </div>
                                <div className="mt-2 text-slate-700">
                                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px', color: '#374151' }}>
                                        <tbody>
                                            <tr>
                                                <td style={{ width: '160px', color: '#374151', fontWeight: 'bold', verticalAlign: 'top', whiteSpace: 'nowrap', paddingBottom: '3px' }}>{t.ico}:</td>
                                                <td style={{ color: '#374151', verticalAlign: 'top', paddingLeft: '8px' }}>{invoice.supplier.ico}</td>
                                            </tr>
                                            <tr>
                                                <td style={{ width: '160px', color: '#374151', fontWeight: 'bold', verticalAlign: 'top', whiteSpace: 'nowrap', paddingBottom: '3px' }}>{t.dic}:</td>
                                                <td style={{ color: '#374151', verticalAlign: 'top', paddingLeft: '8px' }}>{invoice.supplier.dic}</td>
                                            </tr>
                                            <tr>
                                                <td style={{ width: '160px', color: '#374151', fontWeight: 'bold', verticalAlign: 'top', whiteSpace: 'nowrap', paddingBottom: '3px' }}>{t.icDph}:</td>
                                                <td style={{ color: '#374151', verticalAlign: 'top', paddingLeft: '8px' }}>{invoice.supplier.icDph}</td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* Customer */}
                            <div style={{ pageBreakInside: 'avoid' }}>
                                <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1 border-b border-black pb-1">{t.customerTitle}</h3>
                                <div className="font-bold text-sm text-slate-800 mb-0.5" style={{ color: '#1e293b' }}>{invoice.customer.name}</div>
                                <div className="text-slate-700 space-y-0.5">
                                    <p>{invoice.customer.addressLine1}</p>
                                    <p>{invoice.customer.city}, {invoice.customer.zip}</p>
                                    <p>{invoice.customer.country}</p>
                                </div>
                                <div className="mt-2 text-slate-700">
                                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px', color: '#374151' }}>
                                        <tbody>
                                            <tr>
                                                <td style={{ width: '160px', color: '#374151', fontWeight: 'bold', verticalAlign: 'top', whiteSpace: 'nowrap', paddingBottom: '3px' }}>{t.ico}:</td>
                                                <td style={{ color: '#374151', verticalAlign: 'top', paddingLeft: '8px' }}>{invoice.customer.ico || '-'}</td>
                                            </tr>
                                            <tr>
                                                <td style={{ width: '160px', color: '#374151', fontWeight: 'bold', verticalAlign: 'top', whiteSpace: 'nowrap', paddingBottom: '3px' }}>{t.dic}:</td>
                                                <td style={{ color: '#374151', verticalAlign: 'top', paddingLeft: '8px' }}>{invoice.customer.dic || '-'}</td>
                                            </tr>
                                            <tr>
                                                <td style={{ width: '160px', color: '#374151', fontWeight: 'bold', verticalAlign: 'top', whiteSpace: 'nowrap', paddingBottom: '3px' }}>{t.icDph}:</td>
                                                <td style={{ color: '#374151', verticalAlign: 'top', paddingLeft: '8px' }}>{invoice.customer.icDph || '-'}</td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* Ship To & Dates */}
                            <div className="space-y-3" style={{ pageBreakInside: 'avoid' }}>
                                {/* Ship To Section */}
                                <div>
                                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 border-b border-slate-100 pb-1">{t.shipToTitle}</h3>
                                    {(invoice.shippingAddress || invoice.customer) ? (
                                        <div className="text-slate-500 space-y-0.5 text-xs">
                                            <p className="font-bold text-slate-800">
                                                {invoice.shippingAddress ? invoice.customer.name : invoice.customer.name}
                                            </p>
                                            <p>{invoice.shippingAddress?.addressLine1 || invoice.customer.addressLine1}</p>
                                            <p>{invoice.shippingAddress?.city || invoice.customer.city} {invoice.shippingAddress?.zip || invoice.customer.zip}</p>
                                            <p>{invoice.shippingAddress?.country || invoice.customer.country}</p>
                                        </div>
                                    ) : (
                                        <p className="text-slate-400 italic text-xs">Same as billing address</p>
                                    )}
                                </div>

                                <div className="space-y-0.5">
                                    <div className="flex justify-between items-baseline border-b border-slate-100 pb-0.5">
                                        <span className="text-slate-400 uppercase tracking-wider text-[10px] font-bold">{t.invoiceNumberShort}</span>
                                        <span className="font-mono font-bold text-slate-800">{invoice.number}</span>
                                    </div>
                                    {invoice.referenceNumber && (
                                        <div className="flex justify-between items-baseline border-b border-slate-100 pb-0.5">
                                            <span className="text-slate-400 uppercase tracking-wider text-[10px] font-bold">Ref</span>
                                            <span className="font-mono font-medium text-slate-800">{invoice.referenceNumber}</span>
                                        </div>
                                    )}
                                    <div className="flex justify-between items-baseline border-b border-slate-100 pb-0.5">
                                        <span className="text-slate-400 uppercase tracking-wider text-[10px] font-bold">{t.issueDate}</span>
                                        <span className="font-mono font-medium text-slate-800">{formatDate(invoice.issueDate)}</span>
                                    </div>
                                    <div className="flex justify-between items-baseline border-b border-slate-100 pb-0.5">
                                        <span className="text-slate-400 uppercase tracking-wider text-[10px] font-bold">{t.dueDate}</span>
                                        <span className="font-mono font-bold text-slate-800">{formatDate(invoice.dueDate)}</span>
                                    </div>
                                    <div className="flex justify-between items-baseline border-b border-slate-100 pb-0.5">
                                        <span className="text-slate-400 uppercase tracking-wider text-[10px] font-bold">{t.deliveryDate}</span>
                                        <span className="font-mono font-medium text-slate-800">{formatDate(invoice.deliveryDate)}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Introductory Text */}
                        {invoice.introText && (
                            <div className="mb-6 text-xs text-slate-600 leading-relaxed whitespace-pre-wrap italic border-l-2 border-slate-200 pl-4 py-1 page-break-inside-avoid">
                                {invoice.introText}
                            </div>
                        )}

                        {/* 3. Items Table */}
                        <div className="mb-4 flex-1">
                            {/* Table Header */}
                            <div className="grid grid-cols-[30px_1fr_60px_50px_90px_60px_100px] gap-3 px-3 py-2 bg-[#E6DEC6] text-[#5C4D32] rounded-t-lg text-[10px] font-black uppercase tracking-widest items-center print:bg-[#E6DEC6] print:text-[#5C4D32] print-color-adjust-exact">
                                <span>#</span>
                                <span>{t.tableDesc}</span>
                                <span className="text-right">{t.tableQty}</span>
                                <span className="text-center">{t.tableUnit}</span>
                                <span className="text-right">{t.tablePrice}</span>
                                <span className="text-right">{t.tableVat || 'VAT'}</span>
                                <span className="text-right">{t.tableTotal}</span>
                            </div>
                            {/* Table Body */}
                            <div className="border-x border-slate-100">
                                {invoice.items.map((item, i) => (
                                    <div key={i} className={`grid grid-cols-[30px_1fr_60px_50px_90px_60px_100px] gap-3 px-3 py-2 text-xs border-b border-slate-100 items-center break-inside-avoid ${i % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'}`}>
                                        <span className="text-slate-400 font-mono">{String(i + 1).padStart(2, '0')}</span>
                                        <div className="font-semibold text-slate-800 pr-2">{item.description}</div>
                                        <div className="text-right font-medium">{item.quantity}</div>
                                        <div className="text-center text-slate-500">{item.unit}</div>
                                        <div className="text-right font-medium">{formatCurrency(item.unitPrice).replace('€', '').trim()}</div>
                                        <div className="text-right font-medium text-slate-500">{item.vatRate}%</div>
                                        <div className="text-right font-bold text-slate-900">{formatCurrency(item.quantity * item.unitPrice).replace('€', '').trim()}</div>
                                    </div>
                                ))}
                            </div>
                            {/* Summary Section */}
                            <div className="flex justify-end pt-4 break-inside-avoid">
                                <div className="w-64 space-y-2">
                                    <div className="flex justify-between text-xs text-slate-500">
                                        <span>{t.tableSubtotal}</span>
                                        <span className="font-bold">{formatCurrency(totals.subtotal)}</span>
                                    </div>
                                    <div className="flex justify-between text-xs text-slate-500 pb-2 border-b border-slate-100">
                                        <span>{t.tableVat}</span>
                                        <span className="font-bold">{formatCurrency(totals.totalVat)}</span>
                                    </div>
                                    <div className="flex justify-between items-center bg-[#E6DEC6] text-[#5C4D32] p-3 rounded-lg shadow-lg shadow-amber-100 print:bg-[#E6DEC6] print:text-[#5C4D32] print-color-adjust-exact">
                                        <span className="text-[10px] font-black uppercase tracking-widest opacity-80">{t.totalDue}</span>
                                        <span className="text-sm font-black" style={{ fontSize: '14px' }}>{formatCurrency(totals.totalDue)}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* 4. Footer: Bank & Payment */}
                        <div className="mt-auto grid grid-cols-2 gap-12 pt-6 border-t-2 border-slate-100" style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
                            {/* Bank Details */}
                            <div className="space-y-4">
                                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-1">{t.paymentTitle}</h3>
                                <div className="grid grid-cols-[80px_1fr] gap-x-2 gap-y-1.5 text-xs">
                                    <span className="text-slate-400 font-medium">{t.bank}:</span>
                                    <span className="font-bold text-slate-800">{invoice.supplier.bankName}</span>

                                    <span className="text-slate-400 font-medium">{t.accountNumber}:</span>
                                    <span className="font-bold text-slate-800">{invoice.supplier.iban ? invoice.supplier.iban.replace(/\s/g, '').substring(14) : '-'}</span>

                                    <span className="text-slate-400 font-medium">{t.bankCode}:</span>
                                    <span className="font-bold text-slate-800">{invoice.supplier.iban ? invoice.supplier.iban.replace(/\s/g, '').substring(4, 8) : '-'}</span>

                                    <span className="text-slate-400 font-medium">{t.iban}:</span>
                                    <span className="font-bold text-slate-800 tracking-tight">{invoice.supplier.iban}</span>

                                    <span className="text-slate-400 font-medium">{t.swift}:</span>
                                    <span className="font-bold text-slate-800">{invoice.supplier.swift}</span>

                                    <span className="text-slate-400 font-medium mt-2">{t.paymentMethod}:</span>
                                    <span className="mt-2 font-bold text-[#C5A059]">{invoice.paymentMethod || 'Bank Transfer'}</span>
                                </div>

                                {/* Terms */}
                                <div className="mt-6 p-4 bg-amber-50 rounded-xl border border-amber-100 italic text-[11px] text-[#8C7648] leading-relaxed">
                                    <p>Thank you for your business. Please make the payment by the due date mentioned above.</p>
                                </div>
                            </div>

                            {/* Right Footer: QR & Signature */}
                            <div className="flex flex-col items-center justify-between">
                                <div className="flex items-start gap-6 bg-white p-4 rounded-2xl border border-slate-100 shadow-sm w-full">
                                    <img src={qrCodeUrl} alt="SEPA QR" className="w-24 h-24 p-2 bg-white border border-slate-50 rounded-lg" />
                                    <div className="pt-2">
                                        <p className="text-[10px] font-black text-slate-800 uppercase tracking-widest mb-1">{t.scanPay}</p>
                                        <p className="text-[9px] text-slate-400 uppercase leading-tight font-medium">Fast & Secure payment via Mobile Banking App (SEPA QR)</p>
                                    </div>
                                </div>

                                <div className="mt-8 text-center space-y-4 w-full">
                                    <div className="relative h-24 w-full flex items-center justify-center border-b border-slate-100">
                                        {invoice.supplier.signature && (
                                            <img src={invoice.supplier.signature} alt="Signature" className="max-h-full max-w-full object-contain mix-blend-multiply" />
                                        )}
                                        {invoice.supplier.signature2 && (
                                            <img src={invoice.supplier.signature2} alt="Signature Stamp" className="absolute max-h-[140%] max-w-full object-contain mix-blend-multiply opacity-90 -top-4" />
                                        )}
                                    </div>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t.signature}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div >
            </div>
        </div>
    );
};

export default InvoicePreview;