"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import bn from "@/i18n/bn.json";
import en from "@/i18n/en.json";

export const LANG_STORAGE_KEY = "fieldshift_lang";

export type Locale = "en" | "bn";
export type Messages = typeof en;

const dictionaries: Record<Locale, Messages> = {
  en,
  bn: bn as Messages,
};

type LocaleContextValue = {
  lang: Locale;
  setLang: (lang: Locale) => void;
  t: Messages;
};

const LocaleContext = createContext<LocaleContextValue | null>(null);

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLang] = useState<Locale>("en");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(LANG_STORAGE_KEY);
    if (stored === "bn" || stored === "en") setLang(stored);
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    localStorage.setItem(LANG_STORAGE_KEY, lang);
    document.documentElement.lang = lang;
  }, [lang, ready]);

  const value = useMemo(
    () => ({ lang, setLang, t: dictionaries[lang] }),
    [lang]
  );

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale() {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error("useLocale must be used within LocaleProvider");
  return ctx;
}
