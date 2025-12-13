
import { Translation } from "../types";
import { TEXTS as DEFAULT_TEXTS, DEFAULT_GOOGLE_SHEET_URL } from "../constants";

const SETTINGS_KEY = 'app_settings_texts_v1';
const USERS_KEY = 'app_users_v1';
const ASSETS_KEY = 'app_assets_v1';
const CONTACTS_KEY = 'app_contacts_v1';
const SHEET_URL_KEY = 'app_google_sheet_url_v1';

// List of keys that are allowed to be modified via the UI
export const EDITABLE_KEYS = [
    // General
    'appTitle',
    
    // Login Screen
    'loginTitle',
    'username',
    'password',
    'loginButton',
    
    // Navigation Menu
    'dashboard',
    'directory',
    'map',
    'declaration',
    'assistant',
    'users',
    'settings'
];

export const getAppTexts = (): Translation => {
    const stored = localStorage.getItem(SETTINGS_KEY);
    if (stored) {
        // Merge stored texts with defaults to ensure new keys (if added in updates) exist
        return { ...DEFAULT_TEXTS, ...JSON.parse(stored) };
    }
    return DEFAULT_TEXTS;
};

export const saveAppTexts = (texts: Translation) => {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(texts));
};

export const resetAppTexts = () => {
    localStorage.removeItem(SETTINGS_KEY);
    return DEFAULT_TEXTS;
};

// --- GOOGLE SHEETS SETTINGS ---
export const getGoogleSheetUrl = (): string => {
    // 1. Check Local Storage (Admin override for testing)
    const local = localStorage.getItem(SHEET_URL_KEY);
    if (local && local.trim() !== '') {
        return local;
    }

    // 2. Check Environment Variable (Best practice for deployment)
    // In Vite, defined env vars are replaced at build time
    // @ts-ignore
    if (typeof process !== 'undefined' && process.env.SHEET_URL) {
        // @ts-ignore
        return process.env.SHEET_URL;
    }

    // 3. Check Hardcoded Constant (Easiest for quick fixes)
    return DEFAULT_GOOGLE_SHEET_URL || '';
};

export const saveGoogleSheetUrl = (url: string) => {
    localStorage.setItem(SHEET_URL_KEY, url.trim());
};

// --- BACKUP SYSTEM ---

export const createFullBackup = () => {
    const backup = {
        timestamp: new Date().toISOString(),
        version: '1.0',
        data: {
            users: localStorage.getItem(USERS_KEY),
            texts: localStorage.getItem(SETTINGS_KEY),
            assets: localStorage.getItem(ASSETS_KEY),
            contacts: localStorage.getItem(CONTACTS_KEY),
            sheetUrl: localStorage.getItem(SHEET_URL_KEY)
        }
    };
    
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `patrimoine_backup_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};

export const restoreFullBackup = (file: File): Promise<boolean> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const content = e.target?.result as string;
                const parsed = JSON.parse(content);

                if (!parsed.data) throw new Error("Invalid backup format");

                if (parsed.data.users) localStorage.setItem(USERS_KEY, parsed.data.users);
                if (parsed.data.texts) localStorage.setItem(SETTINGS_KEY, parsed.data.texts);
                if (parsed.data.assets) localStorage.setItem(ASSETS_KEY, parsed.data.assets);
                if (parsed.data.contacts) localStorage.setItem(CONTACTS_KEY, parsed.data.contacts);
                if (parsed.data.sheetUrl) localStorage.setItem(SHEET_URL_KEY, parsed.data.sheetUrl);

                resolve(true);
            } catch (err) {
                console.error(err);
                reject(err);
            }
        };
        reader.readAsText(file);
    });
};
