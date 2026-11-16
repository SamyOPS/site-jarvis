import { Fragment } from "react";

/**
 * Texte révélé MOT PAR MOT : chaque mot monte depuis sa ligne, derrière un masque, en
 * cascade. Pour les textes longs de la vitrine (discours, questions de la FAQ).
 *
 * Mot par mot et non plus lettre par lettre : la FAQ comptait ~250 lettres animées, qui
 * démarraient toutes leur transition dans la même image, à l'entrée de la section. Le
 * recalcul de style qui s'ensuivait — 27 à 84 ms mesurés sur un portable Intel UHD 620 —
 * figeait le défilement. Par mot, il y a cinq fois moins d'éléments à animer, et la vague
 * reste lisible. Les textes COURTS (menu, mot-symbole du pied de page, titres des zooms)
 * gardent leur révélation lettre par lettre.
 *
 * `start` : nombre de mots déjà passés avant ce bloc, pour une cascade continue sur
 * plusieurs paragraphes. Délai d'un mot : `base + (start + rang) * step` ms.
 */
export function RevealWords({
  text,
  shown,
  start,
  base,
  step,
  className,
}: {
  text: string;
  shown: boolean;
  start: number;
  base: number;
  step: number;
  className?: string;
}) {
  const words = text.split(" ");
  return (
    <span aria-label={text} className={className}>
      {words.map((word, index) => (
        <Fragment key={index}>
          <span aria-hidden className="reveal-mask-text">
            <span
              className={`inline-block transition-transform duration-450 ease-out ${
                shown ? "translate-y-0" : "translate-y-[135%]"
              }`}
              style={{ transitionDelay: shown ? `${base + (start + index) * step}ms` : "0ms" }}
            >
              {word}
            </span>
          </span>
          {index < words.length - 1 ? " " : null}
        </Fragment>
      ))}
    </span>
  );
}

/** Nombre de mots animés par `RevealWords` (pour enchaîner plusieurs blocs). */
export const revealWordCount = (text: string) => text.split(" ").length;
