import type { Metadata } from "next";

import PageTransition from "@/components/vitrine/page-transition";
import { VitrineScope } from "@/components/vitrine/vitrine-scope";
import { VITRINE_FONT_VARS } from "@/features/vitrine/fonts";

export const metadata: Metadata = {
  /*
    `absolute` court-circuite le gabarit « %s | Jarvis Connect » du layout
    racine : le titre de la vitrine nomme deja la marque, et le gabarit la
    repetait — « Jarvis Connect — Support informatique & infogerance | Jarvis
    Connect ».
  */
  title: {
    absolute: "Jarvis Connect — Support informatique & infogérance",
  },
  description:
    "Jarvis Connect, ESN spécialisée dans le support informatique : assistance réactive, infogérance et expertise technique pour vos équipes.",
};

export default function VitrineLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  /*
    `flex min-h-dvh flex-col` tient lieu du `min-h-full flex flex-col` que le
    projet d'origine posait sur <body> : le conteneur de `PageTransition` est en
    `flex-1` et doit pouvoir s'etirer. Le poser ici plutot que sur <body> evite
    d'imposer une colonne flex aux offres et a la console, qui composent leur
    hauteur autrement.
  */
  return (
    <div className={`${VITRINE_FONT_VARS} flex min-h-dvh flex-col`}>
      <VitrineScope />
      <PageTransition>{children}</PageTransition>
    </div>
  );
}
