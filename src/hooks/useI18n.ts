import { useCallback } from 'react';
import { useLanguage } from '@/context/LanguageContext';
import { getTranslation } from '@/lib/i18n';

export function useI18n() {
  const { language, direction, setLanguage, toggleLanguage } = useLanguage();

  const t = useCallback(
    (key: string) => getTranslation(language, key),
    [language]
  );

  return {
    t,
    language,
    direction,
    setLanguage,
    toggleLanguage,
  };
}
