"use client";

/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { useLang } from "@/lib/i18n";

export function EmptyState({ body }: { body?: string }) {
  const { t } = useLang();
  return (
    <div className="card empty">
      <img src="/crops/fallow.webp" alt="" />
      <h2>{t.results.emptyTitle}</h2>
      <p>{body ?? t.results.emptyBody}</p>
      <Link href="/" className="btn btn-primary">
        {t.results.emptyCta}
      </Link>
    </div>
  );
}
