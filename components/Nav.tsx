"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import en from "@/i18n/en.json";

const LINKS = [
  { href: "/", label: en.nav.home },
  { href: "/results", label: en.nav.results },
  { href: "/data", label: en.nav.data },
  { href: "/about", label: en.nav.about },
] as const;

export function Nav({ place = "Barind" }: { place?: string }) {
  const path = usePathname();

  return (
    <header className="hero">
      <img className="hero-photo" src="/field/plot-backdrop.jpg" alt="" />
      <div className="hero-shade" />
      <div className="hero-bar">
        <Link href="/" className="brand">
          {en.appTitle}
        </Link>
        <nav className="nav-links" aria-label="Pages">
          {LINKS.map((link) => {
            const current = link.href === "/" ? path === "/" : path.startsWith(link.href);
            return (
              <Link key={link.href} href={link.href} aria-current={current ? "page" : undefined}>
                {link.label}
              </Link>
            );
          })}
        </nav>
      </div>
      <div className="hero-copy">
        <p className="kicker">{en.tagline}</p>
        <h1>{place}</h1>
      </div>
    </header>
  );
}
