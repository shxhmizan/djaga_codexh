import { useCallback } from 'react';
import { useApp } from '../context/AppContext';
import translations from '../i18n/translations';

/**
 * Hook to get translated strings based on current language.
 * Usage: const { t, lang } = useTranslation();
 *        t('home.title') → returns EN or BM string
 */
export function useTranslation() {
  const { language } = useApp();

  const t = useCallback((key) => {
    const entry = translations[key];
    if (!entry) return key; // fallback: return the key itself
    return entry.en || key;
  }, [language]);

  return { t, lang: language };
}
