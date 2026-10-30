'use client';

import React from 'react';
import { Globe } from 'lucide-react';
import { useOrbit } from '@/context/OrbitContext';
import { Locale, SHORT_LOCALE_LABELS } from '@/lib/i18n';

const LOCALES: Locale[] = ['fr', 'it', 'en'];

export function LanguageSwitcher({ compact = false }: { compact?: boolean }) {
  const { locale, setLocale } = useOrbit();

  return (
    <div
      className="inline-flex items-center gap-1 rounded-[6px] border border-[#E2E8F0] bg-[#F8FAFC] p-0.5"
      role="group"
      aria-label="Language selector"
    >
      {!compact && <Globe className="ml-1.5 mr-0.5 h-3.5 w-3.5 text-[#64748B]" />}
      {LOCALES.map((loc) => {
        const active = locale === loc;
        return (
          <button
            key={loc}
            type="button"
            onClick={() => setLocale(loc)}
            data-testid={`lang-btn-${loc}`}
            className={`rounded-[4px] px-2 py-1 text-[11px] font-semibold tracking-wider transition-colors ${
              active
                ? 'bg-[#0F172A] text-white shadow-xs'
                : 'text-[#475569] hover:bg-[#E2E8F0]/60 hover:text-[#0F172A]'
            }`}
          >
            {SHORT_LOCALE_LABELS[loc]}
          </button>
        );
      })}
    </div>
  );
}
