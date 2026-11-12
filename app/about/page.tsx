"use client";

import Link from "next/link";
import { Page } from "@/components/Page";
import { useLang } from "@/lib/i18n";

export default function AboutPage() {
  const { t } = useLang();
  const a = t.about;
  const steps = [
    [a.s1t, a.s1],
    [a.s2t, a.s2],
    [a.s3t, a.s3],
    [a.s4t, a.s4],
    [a.s5t, a.s5],
  ];
  return (
    <Page>
      <div className="card page-head">
        <h1 style={{ fontSize: "clamp(1.8rem,3vw,2.4rem)" }}>{a.title}</h1>
        <p className="lead">{a.lead}</p>
      </div>
      <div className="grid-home" style={{ marginTop: 0 }}>
        <section className="card">
          <ol className="about-steps">
            {steps.map(([title, body]) => (
              <li key={title}>
                <div>
                  <h3>{title}</h3>
                  <p>{body}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>
        <aside className="aside-sticky">
          <section className="card stack">
            <h3>{a.sourcesTitle}</h3>
            <ul className="small" style={{ margin: 0, paddingLeft: 18, display: "flex", flexDirection: "column", gap: 6 }}>
              {a.sources.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ul>
          </section>
          <p className="note">{a.caveat}</p>
          <Link href="/" className="btn btn-primary">{t.nav.home}</Link>
        </aside>
      </div>
    </Page>
  );
}
