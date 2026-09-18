import type { Metadata, Viewport } from "next";
import { Inter, Instrument_Serif, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { WorksProvider } from "@/lib/works-store";
import { SiteNav } from "@/components/site-nav";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const display = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  variable: "--font-display",
  display: "swap",
});
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono", display: "swap" });

export const metadata: Metadata = {
  title: "Extinction — Population by Pixel",
  description:
    "Bir görsel ve kalan birey sayısı verin; tam o sayıda pikselden oluşan bir portre, galeri ve sunum üretilsin.",
};

export const viewport: Viewport = {
  themeColor: "#12100f",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr" suppressHydrationWarning>
      <body className={`${inter.variable} ${display.variable} ${mono.variable} antialiased`}>
        <WorksProvider>
          <SiteNav />
          {children}
        </WorksProvider>
      </body>
    </html>
  );
}
