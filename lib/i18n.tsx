"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import en from "@/i18n/en.json";
import bn from "@/i18n/bn.json";

export type Lang = "en" | "bn";
export type Dict = typeof en;

const DICTS: Record<Lang, Dict> = { en, bn: bn as Dict };
const KEY = "fieldshift_lang";
const DIGITS = "০১২৩৪৫৬৭৮৯";

type Ctx = {
  lang: Lang;
  t: Dict;
  setLang: (l: Lang) => void;
  toggle: () => void;
  /** Replace {name} tokens and localise digits. */
  f: (template: string, vars?: Record<string, string | number>) => string;
  num: (n: number | string | null | undefined, digits?: number) => string;
};

const LangContext = createContext<Ctx | null>(null);

export function LangProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>("en");

  useEffect(() => {
    const saved = localStorage.getItem(KEY);
    if (saved === "bn" || saved === "en") setLangState(saved);
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dataset.lang = lang;
  }, [lang]);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    localStorage.setItem(KEY, l);
  }, []);

  const value = useMemo<Ctx>(() => {
    const num: Ctx["num"] = (n, digits) => {
      if (n == null || n === "") return "—";
      const s = typeof n === "number" && digits != null ? n.toFixed(digits) : String(n);
      return lang === "bn" ? s.replace(/[0-9]/g, (d) => DIGITS[Number(d)]!) : s;
    };
    return {
      lang,
      t: DICTS[lang],
      setLang,
      toggle: () => setLang(lang === "en" ? "bn" : "en"),
      num,
      f: (template, vars = {}) =>
        template.replace(/\{(\w+)\}/g, (_, k) => {
          const v = vars[k];
          return typeof v === "number" ? num(v) : String(v ?? "");
        }),
    };
  }, [lang, setLang]);

  return <LangContext.Provider value={value}>{children}</LangContext.Provider>;
}

export function useLang(): Ctx {
  const ctx = useContext(LangContext);
  if (!ctx) throw new Error("useLang must be used inside LangProvider");
  return ctx;
}

export const UPAZILA_BN: Record<string, string> = { Godagari: "গোদাগাড়ী", Tanore: "তানোর" };

export function cropLabel(t: Dict, id: string): string {
  return (t.crops as Record<string, string>)[id] ?? id.replace(/_/g, " ");
}

export const CROP_ICON: Record<string, string> = {
  boro: "/crops/rice.webp",
  t_aman: "/crops/rice.webp",
  rice: "/crops/rice.webp",
  wheat: "/crops/wheat.webp",
  maize: "/crops/maize.webp",
  mustard: "/crops/mustard.webp",
  lentil: "/crops/lentil.webp",
  chickpea: "/crops/chickpea.webp",
  mungbean: "/crops/mungbean.webp",
  pulse: "/crops/chickpea.webp",
  potato: "/crops/potato.webp",
  fallow: "/crops/fallow.webp",
  other: "/crops/seedling.webp",
};
