import type { Metadata } from "next";
import { Chakra_Petch, Inter, Inter_Tight, Geist_Mono } from "next/font/google";
import "./globals.css";
import { LaunchGate } from "@/components/launch-gate";
import { CONSOLE_BOOTSTRAP_SCRIPT } from "@/lib/console-theme";

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
    /*
      `suppressHydrationWarning` est REQUIS ici, et strictement ici.

      Le script d'amorce ci-dessous pose `data-theme` sur <html> avant l'hydratation, pour
      eviter un flash de theme. Le HTML rendu par le serveur ne porte donc pas cet attribut
      alors que le DOM client l'a deja : React signale un ecart d'hydratation.

      L'attribut n'ignore qu'UN SEUL niveau — les attributs de <html> — et rien de son
      contenu. C'est le motif documente par React pour les scripts de theme.
    */
    <html lang="fr" suppressHydrationWarning>
      {/*
        Meme raison sur <body> : le script y pose `data-app="console"` sur les routes de la
        console. Sans cela l'ecart d'hydratation reapparaitrait des l'ouverture d'une page
        du tableau de bord, la ou l'erreur signalee ne concernait que <html> sur l'accueil.
      */}
      <body
        suppressHydrationWarning
        className={`${inter.variable} ${interDisplay.variable} ${geistMono.variable} ${chakraPetch.variable} antialiased`}
      >
        {/*
          Pose `data-theme` sur <html> et, sur les routes de la console, `data-app` sur
          <body>. S'execute avant la peinture : sans lui, un utilisateur ayant choisi le
          theme sombre le perdrait a chaque rechargement, la bascule ecrivant bien dans
          localStorage mais plus personne ne l'y lisant au demarrage.

          Sans effet sur le site vitrine : ses tokens ne dependent pas de `data-theme`, et
          `data-app` n'est pose que sur les prefixes de la console.
        */}
        <script dangerouslySetInnerHTML={{ __html: CONSOLE_BOOTSTRAP_SCRIPT }} />
        <LaunchGate>{children}</LaunchGate>
      </body>
    </html>
  );
}
