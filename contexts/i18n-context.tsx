"use client";

import { createContext, useContext, useEffect, useMemo, useSyncExternalStore } from "react";
import { useSettings } from "@/hooks/use-payday";
import { createTranslator, detectDeviceLocale, getDateFnsLocale, type Translate } from "@/lib/i18n";
import type { Locale } from "@/types";

type I18nContextValue = {
  locale: Locale;
  t: Translate;
  dateLocale: ReturnType<typeof getDateFnsLocale>;
};

const I18nContext = createContext<I18nContextValue | null>(null);

function useDeviceLocale(): Locale {
  return useSyncExternalStore(
    () => () => {},
    () => detectDeviceLocale(),
    () => "vi"
  );
}

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const { data: settings } = useSettings();
  const deviceLocale = useDeviceLocale();
  const locale: Locale = settings?.locale ?? deviceLocale;

  const value = useMemo(() => {
    const t = createTranslator(locale);
    return { locale, t, dateLocale: getDateFnsLocale(locale) };
  }, [locale]);

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used within I18nProvider");
  return ctx;
}

export function useT() {
  return useI18n().t;
}
