/*
 * Logos clients (public/Image/logo_client), affiches dans la bande defilante du hero.
 *
 * L'encre est dans les FICHIERS, pas dans la CSS : les logos monochromes sont enregistres
 * en noir sur fond transparent ; HP, Stihl et Uniqlo gardent leurs couleurs. Un logo
 * ajoute se depose donc deja a l'encre voulue.
 *
 * Le suffixe `-noir` n'est pas decoratif : il donne aux fichiers noircis une URL neuve.
 * Sous l'ancien nom, les variantes blanches restaient servies par le cache de Next et par
 * celui des navigateurs (4 h). Un fichier dont l'aspect change doit changer de nom.
 *
 * `w` / `h` : dimensions INTRINSEQUES du fichier (bornees a 600x240), pour que
 * `next/image` tienne le bon rapport et serve une variante a la taille utile. Un logo
 * remplace se redimensionne avant d'etre depose, et ses `w` / `h` suivent.
 *
 * `big` : logo dont le texte serait illisible a la hauteur commune, un cran plus grand.
 */
export type ClientLogo = {
  src: string;
  alt: string;
  w: number;
  h: number;
  big?: boolean;
};

export const CLIENT_LOGOS: ClientLogo[] = [
  { src: "/Image/logo_client/3M-noir.png", alt: "3M", w: 257, h: 135 },
  // Slogan « La prevention, c'est la sante » retire : illisible a cette taille. `big` :
  // le mot « PREVOYANCE » sous le dessin serait sinon trop petit.
  { src: "/Image/logo_client/b2v-noir.png", alt: "B2V Prévoyance", w: 296, h: 224, big: true },
  { src: "/Image/logo_client/barriere-noir.png", alt: "Barrière", w: 331, h: 240 },
  { src: "/Image/logo_client/bnp-paribas-noir.png", alt: "BNP Paribas", w: 600, h: 239 },
  { src: "/Image/logo_client/groupe-bpce-noir.png", alt: "BPCE", w: 600, h: 100 },
  { src: "/Image/logo_client/burberry-noir.png", alt: "Burberry", w: 1182, h: 284 },
  { src: "/Image/logo_client/cgi-noir.png", alt: "CGI", w: 300, h: 140 },
  { src: "/Image/logo_client/bureau_veritas-noir.png", alt: "Bureau Veritas", w: 193, h: 240 },
  { src: "/Image/logo_client/engie-noir.png", alt: "Engie", w: 600, h: 213 },
  { src: "/Image/logo_client/ethypharm-noir.png", alt: "Ethypharm", w: 520, h: 102 },
  { src: "/Image/logo_client/foncia-noir.png", alt: "Foncia", w: 1171, h: 456 },
  { src: "/Image/logo_client/hp.png", alt: "HP", w: 240, h: 240 },
  { src: "/Image/logo_client/inli-noir.png", alt: "In'li", w: 507, h: 240 },
  { src: "/Image/logo_client/les_mousquetaires-noir.png", alt: "Les Mousquetaires", w: 526, h: 387 },
  { src: "/Image/logo_client/riccobono-noir.png", alt: "Riccobono", w: 300, h: 91 },
  { src: "/Image/logo_client/lvmh-noir.png", alt: "LVMH", w: 600, h: 140 },
  { src: "/Image/logo_client/sisley-noir.png", alt: "Sisley", w: 600, h: 176 },
  { src: "/Image/logo_client/sncf-noir.png", alt: "SNCF", w: 150, h: 150 },
  { src: "/Image/logo_client/stihl.png", alt: "Stihl", w: 746, h: 161 },
  { src: "/Image/logo_client/tpicap-noir.png", alt: "TP ICAP", w: 604, h: 174 },
  { src: "/Image/logo_client/uniqlo.png", alt: "Uniqlo", w: 241, h: 240 },
  { src: "/Image/logo_client/apprentis-auteuil-noir.png", alt: "Apprentis d'Auteuil", w: 240, h: 240, big: true },
  { src: "/Image/logo_client/jacquemus-noir.png", alt: "Jacquemus", w: 320, h: 320, big: true },
];
