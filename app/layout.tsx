import type { Metadata } from "next";
import { Inter, Inter_Tight, Geist_Mono } from "next/font/google";
import "./globals.css";

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

export const metadata: Metadata = {
  title: "Jarvis Connect",
  description: "Description de Jarvis",
  icons: {
    icon: "/favicon.jpeg",
    shortcut: "/favicon.jpeg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <head>
        <link rel="icon" href="/favicon.jpeg" type="image/jpeg" />
      </head>
      <body
        className={`${inter.variable} ${interDisplay.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
