import type { Metadata, Viewport } from "next";
import { Jua, Gaegu } from "next/font/google";
import "./globals.css";
import ServiceWorkerRegister from "@/components/ServiceWorkerRegister";

const jua = Jua({ subsets: ["latin"], weight: "400", variable: "--font-jua" });
const gaegu = Gaegu({ subsets: ["latin"], weight: ["400", "700"], variable: "--font-gaegu" });

export const metadata: Metadata = {
  title: "DOA",
  description: "귀여운 메이드 챗봇 DOA",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "DOA",
  },
  icons: {
    icon: "/icons/icon-192.png",
    apple: "/icons/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#fadce8",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" className={`${jua.variable} ${gaegu.variable}`}>
      <body>
        <ServiceWorkerRegister />
        {children}
      </body>
    </html>
  );
}
