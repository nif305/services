'use client';

import { type AppLanguage } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { getTranslation } from '@/lib/i18n';

type LanguageOption = {
  value: AppLanguage;
  label: string;
  shortLabel: string;
};

const OPTIONS: LanguageOption[] = [
  { value: 'ar', label: 'العربية', shortLabel: 'ع' },
  { value: 'en', label: 'English', shortLabel: 'EN' },
];

export function LanguageToggle({ compact = false }: { compact?: boolean }) {
  const { language, setLanguage } = useLanguage();

  return (
    <div
      dir="ltr"
      className={
        compact
          ? 'inline-flex items-center gap-1 rounded-[16px] border border-[#dbe5e3] bg-white/90 p-1'
          : 'inline-flex items-center gap-1 rounded-[18px] border border-[#dbe5e3] bg-[#f7f9f9] p-1'
      }
      aria-label="Language selector"
    >
      {OPTIONS.map((option) => {
        const active = language === option.value;
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => setLanguage(option.value)}
            className={
              active
                ? 'min-h-[36px] rounded-[14px] bg-[#2A6364] px-3 text-[12px] font-bold text-white shadow-[0_12px_24px_-20px_rgba(42,99,100,0.75)]'
                : 'min-h-[36px] rounded-[14px] px-3 text-[12px] font-semibold text-[#3e5756] transition hover:bg-white'
            }
            title={option.label}
          >
            {compact ? option.shortLabel : getTranslation(language, option.value === 'ar' ? 'common.arabic' : 'common.english')}
          </button>
        );
      })}
    </div>
  );
}
