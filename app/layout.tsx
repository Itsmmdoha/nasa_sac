import type { Metadata, Viewport } from "next";
import { Fraunces, Hind_Siliguri } from "next/font/google";
import { LangProvider } from "@/lib/i18n";
import "./globals.css";

const display = Fraunces({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-display",
  display: "swap",
});

const body = Hind_Siliguri({
  subsets: ["latin", "bengali"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-body",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Field Shift — Barind crop rotation advisor",
  description:
    "NASA Space Apps 2026: crop rotation decision support for Godagari and Tanore, Rajshahi",
};

export const viewport: Viewport = { themeColor: "#f6e2b8" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning className={`${display.variable} ${body.variable}`}>
      <body suppressHydrationWarning>
        <LangProvider>{children}</LangProvider>
      </body>
    </html>
  );
}
