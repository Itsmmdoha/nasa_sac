import type { Metadata } from "next";
import { Noto_Sans_Bengali } from "next/font/google";
import { LocaleProvider } from "@/components/LocaleProvider";
import "./globals.css";

const noto = Noto_Sans_Bengali({
  subsets: ["bengali", "latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-noto",
});

export const metadata: Metadata = {
  title: "Field Shift — Barind crop rotation advisor",
  description:
    "NASA Space Apps 2026: crop rotation decision support for Godagari and Tanore, Rajshahi",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      {/* suppressHydrationWarning: browser extensions often inject attrs on body (e.g. cz-shortcut-listen). */}
      <body suppressHydrationWarning className={`${noto.variable} antialiased`}>
        <LocaleProvider>{children}</LocaleProvider>
      </body>
    </html>
  );
}
