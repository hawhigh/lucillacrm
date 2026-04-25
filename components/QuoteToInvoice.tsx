import React from 'react';
import { Quote, Invoice } from '../types';
import { FileText, ArrowRight } from 'lucide-react';

interface Props {
    quote: Quote;
    onConvert: (invoice: Invoice) => void;
}

const QuoteToInvoice: React.FC<Props> = ({ quote, onConvert }) => {
    const handleConvert = () => {
        if (!confirm('Are you sure you want to convert this quote to an invoice?')) return;

        // Conversion Logic
        const newInvoice: Invoice = {
            id: crypto.randomUUID(),
            number: quote.number.replace('Q', 'INV'), // Simple ID strategy
            relatedQuoteId: quote.id,
            supplier: quote.supplier,
            customer: quote.customer,
            issueDate: new Date().toISOString().split('T')[0],
            dueDate: new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0], // +14 days
            deliveryDate: new Date().toISOString().split('T')[0],
            paymentMethod: 'Bank Transfer', // Default
            items: quote.items,
            notes: quote.notes,
            status: 'Draft',
            variableSymbol: '', // Should be generated
            constantSymbol: '0308',
            specificSymbol: ''
        };

        onConvert(newInvoice);
    };

    return (
        <div className="p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl border border-indigo-100 dark:border-indigo-800 flex items-center justify-between">
            <div>
                <h4 className="font-bold text-indigo-900 dark:text-indigo-200 flex items-center gap-2">
                    <FileText className="w-4 h-4" /> Quote Conversion
                </h4>
                <p className="text-sm text-indigo-700 dark:text-indigo-300 mt-1">
                    Convert <strong>{quote.number}</strong> into a legal invoice.
                </p>
            </div>
            <button
                onClick={handleConvert}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-lg flex items-center gap-2 transition-all shadow-md"
            >
                Convert to Invoice <ArrowRight className="w-4 h-4" />
            </button>
        </div>
    );
};

export default QuoteToInvoice;
