"use client";

import Image from "next/image";
import { useLocale } from "@/components/LocaleProvider";
import { Nav } from "@/components/Nav";
import { Card } from "@/components/ui/card";

export default function AboutPage() {
  const { t } = useLocale();

  return (
    <main className="min-h-screen bg-[var(--surface-page)]">
      <Nav />
      <div className="mx-auto max-w-3xl space-y-4 px-4 py-6">
        <h2 className="text-xl font-semibold text-[#14532d]">{t.about.title}</h2>
        <Card className="space-y-3 text-sm leading-relaxed text-[#333]">
          <p>{t.about.lead}</p>
          <p>{t.about.scores}</p>
        </Card>
        <Image
          src="/pipeline.svg"
          alt={t.about.pipelineAlt}
          width={600}
          height={400}
          className="w-full rounded-xl border border-stone-200 bg-white"
        />
        <Card className="text-sm">
          <p className="font-medium text-[#14532d]">{t.about.sourcesTitle}</p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-[#333]">
            <li>{t.about.sourcePower}</li>
            <li>{t.about.sourceAppeears}</li>
            <li>{t.about.sourceSrdi}</li>
            <li>{t.about.sourceBarc}</li>
          </ul>
        </Card>
      </div>
    </main>
  );
}
