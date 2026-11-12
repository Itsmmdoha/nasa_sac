"use client";

import { FarmerForm } from "@/components/FarmerForm";
import { Page } from "@/components/Page";
import { useLang } from "@/lib/i18n";

export default function HomePage() {
  const { t } = useLang();
  return (
    <Page
      compact={false}
      hero={
        <>
          <span className="pill">
            <span className="dot" aria-hidden />
            {t.hero.pilot}
          </span>
          <h1>{t.hero.title}</h1>
          <p className="lead">{t.hero.lead}</p>
        </>
      }
    >
      <div className="grid-home">
        <section className="card" aria-labelledby="form-title">
          <div className="card-title">
            <h2 id="form-title">{t.form.title}</h2>
          </div>
          <FarmerForm />
        </section>
        <aside className="aside-sticky">
          <div className="card">
            <ol className="steps">
              {t.hero.steps.map((s) => (
                <li key={s.title}>
                  <div>
                    <strong>{s.title}</strong>
                    <span>{s.body}</span>
                  </div>
                </li>
              ))}
            </ol>
          </div>
          <p className="small muted">{t.about.caveat}</p>
        </aside>
      </div>
    </Page>
  );
}
