import type { Metadata } from "next";
import { Chakra_Petch, Inter, Inter_Tight, Geist_Mono } from "next/font/google";
import "./globals.css";
import { CONSOLE_BOOTSTRAP_SCRIPT } from "@/lib/console-theme";
import { PAGE_REVEAL_BOOTSTRAP_SCRIPT } from "@/lib/page-reveal";

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
    default: "Jarvis Connect | Offres d'emploi & espace client",
    template: "%s | Jarvis Connect",
  },
  description:
    "Les offres d'emploi de Jarvis Connect et l'acces a la console RH, salarie et administration.",
  icons: {
    icon: "/favicon.ico?v=2",
  },
  openGraph: {
    title: "Jarvis Connect | Offres d'emploi & espace client",
    description:
      "Consultez les offres d'emploi ouvertes chez Jarvis Connect et connectez-vous a votre espace.",
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

      Le script d'amorce ci-dessous pose `data-theme` et, sur les routes de la vitrine,
      `data-site` sur <html> avant l'hydratation, pour eviter un flash de theme. Le HTML
      rendu par le serveur ne porte donc pas ces attributs alors que le DOM client les a
      deja : React signale un ecart d'hydratation.

      L'attribut n'ignore qu'UN SEUL niveau — les attributs de <html> — et rien de son
      contenu. C'est le motif documente par React pour les scripts de theme.
    */
    /*
      `data-scroll-behavior="smooth"` : le site declare `scroll-behavior: smooth` sur
      <html> (globals.css). Sans cet attribut, Next neutralise le defilement doux pendant
      ses changements de route pour eviter qu'un saut de page ne s'anime — et le signale
      dans la console. L'attribut lui dit que ce reglage est deliberé et doit etre respecté.
    */
    <html lang="fr" data-scroll-behavior="smooth" suppressHydrationWarning>
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
          Pose trois marques, chacune sur son perimetre : `data-theme` sur <html>
          partout ; `data-app="console"` sur <body> sur les routes de la console ;
          `data-site="vitrine"` sur <html> sur celles de la vitrine.

          S'execute avant la peinture, et c'est tout l'interet : sans lui, un utilisateur
          ayant choisi le theme sombre le perdrait a chaque rechargement — la bascule
          ecrivant bien dans localStorage, mais plus personne ne l'y lisant au demarrage —
          et la vitrine afficherait la barre de defilement native le temps d'une image.

          Sans effet sur les offres d'emploi : elles ne relevent d'aucun des deux scopes,
          et leurs jetons ne dependent pas de `data-theme`.
        */}
        <script dangerouslySetInnerHTML={{ __html: CONSOLE_BOOTSTRAP_SCRIPT }} />
        {/*
          Repose le voile noir sur la page d'arrivee quand on vient de quitter la
          vitrine, puis le dissipe. Ici aussi avant la peinture : une revelation
          qui commencerait apres coup montrerait d'abord la page, et le fondu
          ressemblerait a un clignotement.
        */}
        <script
          dangerouslySetInnerHTML={{ __html: PAGE_REVEAL_BOOTSTRAP_SCRIPT }}
        />
        {children}
      </body>
    </html>
  );
}
