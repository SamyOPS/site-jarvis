// Illustrations du site. Les composants ne référencent que ces constantes,
// jamais un chemin de fichier : une nouvelle photo se déclare ici, puis se
// branche là où elle doit servir.
//
// Il y a aujourd'hui plus d'emplacements que de visuels : `illustration(i)`
// fait tourner ceux dont on dispose. Ajouter une entrée au tableau suffit à
// enrichir automatiquement les mosaïques.

export const ILLUSTRATIONS = [
  // La première sert de « pleine page » à la mosaïque de sortie : elle doit
  // rester sombre, la section qui l'accueille est noire.
  { src: "/Image/carte_mere.jpg", alt: "Carte mère en gros plan" },
  { src: "/Image/processeur.jpg", alt: "Processeur sur une carte mère" },
  {
    src: "/Image/developpeur.jpg",
    alt: "Développeur devant son écran de code",
  },
  {
    src: "/Image/techniciens_support.jpg",
    alt: "Techniciens en open-space devant leurs écrans",
  },
  {
    src: "/Image/ordinateur.jpg",
    alt: "Mains sur le clavier d'un ordinateur portable",
  },
  {
    src: "/Image/paris-defense-hd.jpg",
    alt: "Quartier d'affaires de La Défense",
  },
  { src: "/Image/fond-bleu.jpg", alt: "Fond bleu" },
] as const;

export const [
  CARTE_MERE,
  PROCESSEUR,
  DEVELOPPEUR,
  TECHNICIENS,
  ORDINATEUR,
  DEFENSE,
  FOND_BLEU,
] = ILLUSTRATIONS;

export const illustration = (i: number) =>
  ILLUSTRATIONS[i % ILLUSTRATIONS.length];
