import { create } from 'zustand';
import { Language, translations, TranslationKey } from '../services/translations';

interface UIState {
    view: 'dashboard' | 'list' | 'create' | 'preview' | 'customers' | 'expenses' | 'settings' | 'users' | 'overview' | 'automation' | 'scanner' | 'quotes' | 'dataDump' | 'products' | 'recurring' | 'digitalCard';
    language: Language;
    isDarkMode: boolean;
    isMobileMenuOpen: boolean;
    setView: (view: UIState['view']) => void;
    setLanguage: (lang: Language) => void;
    toggleDarkMode: () => void;
    setMobileMenuOpen: (open: boolean) => void;
    t: (key: TranslationKey) => string;
}

export const useAppStore = create<UIState>((set, get) => ({
    view: 'dashboard',
    language: (localStorage.getItem('language') as Language) || 'en',
    isDarkMode: localStorage.getItem('theme') === 'dark' ||
        (!localStorage.getItem('theme') && window.matchMedia('(prefers-color-scheme: dark)').matches),
    isMobileMenuOpen: false,

    setView: (view) => set({ view, isMobileMenuOpen: false }),
    setLanguage: (language) => {
        localStorage.setItem('language', language);
        set({ language });
    },
    toggleDarkMode: () => {
        const newMode = !get().isDarkMode;
        localStorage.setItem('theme', newMode ? 'dark' : 'light');
        if (newMode) {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
        set({ isDarkMode: newMode });
    },
    setMobileMenuOpen: (open) => set({ isMobileMenuOpen: open }),

    t: (key) => {
        const { language } = get();
        return translations[language][key] || key;
    }
}));
