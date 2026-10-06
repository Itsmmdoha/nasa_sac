import Link from "next/link";
import en from "@/i18n/en.json";

export function Nav() {
  return (
    <header className="border-b border-stone-200 bg-white">
      <div className="mx-auto flex max-w-lg flex-col gap-2 px-4 py-3">
        <div>
          <h1 className="text-lg font-semibold text-[#14532d]">{en.appTitle}</h1>
          <p className="text-sm text-[#333]">{en.tagline}</p>
        </div>
        <nav className="flex flex-wrap gap-3 text-sm">
          <Link href="/" className="text-[#14532d] underline-offset-2 hover:underline">
            {en.nav.home}
          </Link>
          <Link href="/results" className="text-[#14532d] underline-offset-2 hover:underline">
            {en.nav.results}
          </Link>
          <Link href="/data" className="text-[#14532d] underline-offset-2 hover:underline">
            {en.nav.data}
          </Link>
          <Link href="/about" className="text-[#14532d] underline-offset-2 hover:underline">
            {en.nav.about}
          </Link>
        </nav>
      </div>
    </header>
  );
}
