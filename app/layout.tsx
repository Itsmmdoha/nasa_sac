import type { Metadata } from "next";
import { Be_Vietnam_Pro } from "next/font/google";
import "./globals.css";

const beVietnam = Be_Vietnam_Pro({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-be-vietnam",
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
      <body suppressHydrationWarning className={`${beVietnam.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}
