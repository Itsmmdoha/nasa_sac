"use client";

import { Nav } from "@/components/Nav";
import { FieldScene, type SceneState } from "@/components/FieldScene";
import { useLang } from "@/lib/i18n";

export function Page({
  children,
  hero,
  scene,
  compact = true,
}: {
  children: React.ReactNode;
  hero?: React.ReactNode;
  scene?: SceneState;
  compact?: boolean;
}) {
  const { t } = useLang();
  return (
    <div className="app">
      <a className="skip" href="#main">
        Skip to content
      </a>
      <header className={compact ? "masthead compact" : "masthead"}>
        <FieldScene state={scene} />
        <Nav />
        {hero ? <div className="masthead-copy">{hero}</div> : null}
      </header>
      <main id="main" className="main">
        {children}
      </main>
      <footer className="footer">{t.footer}</footer>
    </div>
  );
}
