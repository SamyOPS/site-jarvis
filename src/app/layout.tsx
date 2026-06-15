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
  title: {
    default: "Jarvis Connect | Partenaire IT & digital",
    template: "%s | Jarvis Connect",
  },
  description:
    "Support IT, developpement applicatif, securite, reseaux et transformation digitale pour PME, ETI et grandes organisations.",
  icons: {
    icon: "/favicon.ico?v=2",
  },
  openGraph: {
    title: "Jarvis Connect | Partenaire IT & digital",
    description:
      "Des equipes IT seniors pour accelerer vos projets support, developpement, securite et transformation digitale.",
    siteName: "Jarvis Connect",
    locale: "fr_FR",
    type: "website",
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
