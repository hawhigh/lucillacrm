
import React, { useState, useEffect } from 'react';
import { X, Mail, ExternalLink, Copy, Check } from 'lucide-react';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    to: string;
    subject: string;
    initialBody: string;
    onSend?: (body: string) => Promise<void>;
    isSending?: boolean;
}

const EmailComposeModal: React.FC<Props> = ({ isOpen, onClose, to, subject, initialBody, onSend, isSending }) => {
    const [body, setBody] = useState(initialBody);
    const [copySuccess, setCopySuccess] = useState(false);

    useEffect(() => {
        setBody(initialBody);
    }, [initialBody]);

    if (!isOpen) return null;

    const handleSend = async () => {
        if (onSend) {
            await onSend(body);
        } else {
            const mailtoLink = `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
            window.location.href = mailtoLink;
        }
        onClose();
    };

    const copyToClipboard = async () => {
        try {
            await navigator.clipboard.writeText(body);
            setCopySuccess(true);
            setTimeout(() => setCopySuccess(false), 2000);
        } catch (err) {
            console.error('Failed to copy', err);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[90vh]">

                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-indigo-50 dark:bg-indigo-900/30 rounded-xl text-indigo-600 dark:text-indigo-400">
                            <Mail className="w-6 h-6" />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-slate-900 dark:text-white">Compose Email</h3>
                            <p className="text-sm text-slate-500 dark:text-slate-400">Review message before sending</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-4 overflow-y-auto flex-1">
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">To</label>
                        <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl text-slate-900 dark:text-white font-medium border border-slate-200 dark:border-slate-800">
                            {to}
                        </div>
                    </div>

                    <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Subject</label>
                        <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl text-slate-900 dark:text-white font-medium border border-slate-200 dark:border-slate-800">
                            {subject}
                        </div>
                    </div>

                    <div className="space-y-1 flex-1 flex flex-col">
                        <div className="flex justify-between items-center">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Message Body</label>
                            <button
                                onClick={copyToClipboard}
                                className="flex items-center gap-1.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 transition-colors"
                            >
                                {copySuccess ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                                {copySuccess ? 'Copied' : 'Copy Text'}
                            </button>
                        </div>
                        <textarea
                            value={body}
                            onChange={(e) => setBody(e.target.value)}
                            className="w-full flex-1 min-h-[200px] p-4 bg-white dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none resize-none leading-relaxed"
                        />
                    </div>
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3 bg-slate-50/50 dark:bg-slate-900/50 rounded-b-2xl">
                    <button
                        onClick={onClose}
                        className="px-5 py-2.5 text-slate-600 dark:text-slate-300 font-bold hover:bg-slate-200/50 dark:hover:bg-slate-800 rounded-xl transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSend}
                        disabled={isSending}
                        className="px-6 py-2.5 bg-indigo-600 text-white font-bold rounded-xl shadow-lg shadow-indigo-200 dark:shadow-indigo-900/40 hover:bg-indigo-700 hover:-translate-y-0.5 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isSending ? (
                            <>Sending...</>
                        ) : (
                            <>
                                {onSend ? 'Send Email' : 'Open Mail Client'}
                                <ExternalLink className="w-4 h-4" />
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default EmailComposeModal;
