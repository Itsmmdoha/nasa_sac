"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLocale, type Locale } from "@/components/LocaleProvider";

const LINKS = [
  { href: "/", key: "home" },
  { href: "/results", key: "results" },
  { href: "/data", key: "data" },
  { href: "/about", key: "about" },
] as const;

export function Nav() {
  const { t, lang, setLang } = useLocale();
  const pathname = usePathname();

  return (
    <header className="border-b border-stone-200 bg-white">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Link href="/" className="text-title">
            <h1 className="text-xl font-semibold tracking-tight">{t.appTitle}</h1>
          </Link>
          <p className="text-sm text-body">{t.tagline}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <nav className="flex flex-wrap gap-1">
            {LINKS.map((link) => {
              const active = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`inline-flex min-h-11 items-center rounded-lg px-3 text-sm font-medium ${
                    active
                      ? "bg-[#14532d] text-white"
                      : "text-[#14532d] hover:bg-stone-100"
                  }`}
                >
                  {t.nav[link.key]}
                </Link>
              );
            })}
          </nav>
          <div
            className="inline-flex rounded-lg border border-stone-300 p-0.5"
            role="group"
            aria-label={t.lang.switch}
          >
            <LangButton current={lang} value="en" label={t.lang.en} onSelect={setLang} />
            <LangButton current={lang} value="bn" label={t.lang.bn} onSelect={setLang} />
          </div>
        </div>
      </div>
    </header>
  );
}

function LangButton({
  current,
  value,
  label,
  onSelect,
}: {
  current: Locale;
  value: Locale;
  label: string;
  onSelect: (lang: Locale) => void;
}) {
  const selected = current === value;
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={() => onSelect(value)}
      className={`min-h-10 rounded-md px-3 text-sm font-medium ${
        selected ? "bg-[#14532d] text-white" : "text-[#333] hover:bg-stone-100"
      }`}
    >
      {label}
    </button>
  );
}
