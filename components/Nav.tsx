"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLang } from "@/lib/i18n";

export function Nav() {
  const path = usePathname();
  const { t, toggle, lang } = useLang();
  const links = [
    { href: "/", label: t.nav.home },
    { href: "/results", label: t.nav.results },
    { href: "/data", label: t.nav.data },
    { href: "/about", label: t.nav.about },
  ];

  return (
    <div className="topbar">
      <Link href="/" className="brand" aria-label={t.appTitle}>
        <span className="brand-mark" aria-hidden>
          <svg viewBox="0 0 32 32" width="28" height="28">
            <circle cx="16" cy="16" r="15" fill="#2f6b3a" />
            <path d="M16 25V13" stroke="#f6e2b8" strokeWidth="2.2" strokeLinecap="round" />
            <path d="M16 15c-4 0-6-3-6-6 4 0 6 2 6 6Z" fill="#f2d04b" />
            <path d="M16 18c4 0 6-3 6-6-4 0-6 2-6 6Z" fill="#e6b325" />
          </svg>
        </span>
        <span className="brand-name">{t.appTitle}</span>
      </Link>
      <nav className="nav-links" aria-label="Main">
        {links.map((link) => {
          const current = link.href === "/" ? path === "/" : path.startsWith(link.href);
          return (
            <Link key={link.href} href={link.href} aria-current={current ? "page" : undefined}>
              {link.label}
            </Link>
          );
        })}
      </nav>
      <button
        type="button"
        className="lang-toggle"
        onClick={toggle}
        aria-label={t.langToggleLabel}
        lang={lang === "en" ? "bn" : "en"}
        data-testid="lang-toggle"
      >
        {t.langToggle}
      </button>
    </div>
  );
}
