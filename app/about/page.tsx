import Image from "next/image";
import { Nav } from "@/components/Nav";
import { Card } from "@/components/ui/card";
import en from "@/i18n/en.json";

export default function AboutPage() {
  return (
    <main className="min-h-screen bg-[#f5f5f4]">
      <Nav />
      <div className="mx-auto max-w-lg space-y-4 px-4 py-6">
        <h2 className="text-lg font-semibold">{en.about.title}</h2>
        <Card className="space-y-2 text-sm text-[#333]">
          <p>
            Field Shift combines NASA POWER climate, SMAP soil moisture, MODIS greenness, and SRDI
            soil surveys to score crop rotations in code, then uses a Groq-hosted model to rank and
            explain the top options.
          </p>
          <p>Numbers always come from the scorer; the model does not invent scores.</p>
        </Card>
        <Image
          src="/pipeline.svg"
          alt="Pipeline diagram"
          width={600}
          height={400}
          className="w-full rounded-lg border border-stone-200 bg-white"
        />
        <Card className="text-sm">
          <p className="font-medium">Data sources</p>
          <ul className="mt-2 list-disc pl-5 text-[#333]">
            <li>NASA POWER — rainfall, temperature, soil wetness</li>
            <li>NASA AppEEARS — SMAP L4 moisture, MODIS NDVI</li>
            <li>SRDI via BARC Crop Zoning — soil samples, land units, FRS doses</li>
            <li>BARC suitability — crop zoning from SRDI land data</li>
          </ul>
        </Card>
      </div>
    </main>
  );
}
