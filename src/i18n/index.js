import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from '../locales/en/translation.json';

/**
 * App copy is maintained in English in this bundle. For other languages, use the
 * browser translation control in the header (no per-locale JSON in this build).
 */
const STORAGE_KEY = 'agritrack-lang';

export const LANGS = ['en'];

function setDocumentLang() {
  if (typeof document === 'undefined') return;
  document.documentElement.lang = 'en';
}

i18n.use(initReactI18next).init({
  resources: { en: { translation: en } },
  lng: 'en',
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
});

/* Migrate: clear old manual locale if present so we do not try to load removed bundles. */
try {
  const s = localStorage.getItem(STORAGE_KEY);
  if (s && s !== 'en') {
    localStorage.removeItem(STORAGE_KEY);
  }
} catch {
  /* ignore */
}

try {
  setDocumentLang();
} catch {
  /* ignore */
}

i18n.on('languageChanged', () => {
  setDocumentLang();
});

/**
 * @deprecated i18n stays English; use the header language / browser translation for other languages.
 */
export function setAppLanguage(lng) {
  if (lng === 'en') {
    void i18n.changeLanguage('en');
  }
  try {
    if (lng === 'en') {
      localStorage.setItem(STORAGE_KEY, 'en');
    }
  } catch {
    /* ignore */
  }
}

export default i18n;
