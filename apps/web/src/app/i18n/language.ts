import { useSyncExternalStore } from 'react';
import vi from './vi.json';
import en from './en.json';

export const languages = {
  vi: { label: 'Tiếng Việt', flag: '🇻🇳', messages: vi },
  en: { label: 'English', flag: '🇬🇧', messages: en },
};

export type Language = keyof typeof languages;
const storageKey = 'tingting-language';
const listeners = new Set<() => void>();
let language: Language = readLanguage();

export function useLanguage() {
  return useSyncExternalStore(subscribe, () => language, () => 'vi' as Language);
}

export function setLanguage(value: Language) {
  language = value;
  document.documentElement.lang = value;
  try {
    localStorage.setItem(storageKey, value);
  } catch {
    // The preference still applies to the current page when storage is unavailable.
  }
  listeners.forEach((listener) => listener());
}

export function t(key: string): string {
  const messages: Record<string, string> = languages[language].messages;
  const fallback: Record<string, string> = languages.vi.messages;
  return messages[key] ?? fallback[key] ?? key;
}

function readLanguage(): Language {
  try {
    const saved = localStorage.getItem(storageKey);
    return saved && Object.hasOwn(languages, saved) ? (saved as Language) : 'vi';
  } catch {
    return 'vi';
  }
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

if (typeof document !== 'undefined') document.documentElement.lang = language;
