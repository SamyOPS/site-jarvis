import type { Metadata } from "next";
import { Chakra_Petch, Inter, Inter_Tight, Geist_Mono } from "next/font/google";
import "./globals.css";
import { LaunchGate } from "@/components/launch-gate";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const interDisplay = Inter_Tight({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const chakraPetch = Chakra_Petch({
  variable: "--font-chakra-petch",
  subsets: ["latin"],
  weight: ["600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Jarvis Connect",
  description: "Description de Jarvis",
   icons: {
    icon: '/favicon.ico?v=2',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <body
        className={`${inter.variable} ${interDisplay.variable} ${geistMono.variable} ${chakraPetch.variable} antialiased`}
      >
        <LaunchGate>{children}</LaunchGate>
      </body>
    </html>
  );
}
