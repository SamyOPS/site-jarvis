"use client";

import { useId, useState } from "react";

export type MonthlyPoint = {
  /** Cle stable, format AAAA-MM. */
  key: string;
  /** Libelle court de l'axe : « mars », « avr. »… */
  label: string;
  value: number;
};

/**
 * Volume mensuel, en barres.
 *
 * Une seule serie : pas de legende, le titre de la carte nomme la mesure. Une seule
 * echelle, jamais deux axes. Les marques sont fines, ancrees au pied du repere, avec un
 * intervalle constant entre elles.
 *
 * La couleur ne porte aucune information ici — il n'y a rien a distinguer. Elle reste donc
 * neutre, et c'est la HAUTEUR seule qui encode la grandeur. Les libelles gardent les jetons
 * de texte, jamais la couleur de la serie.
 *
 * Le survol est natif : un `<title>` SVG par barre suffit a cette densite et fonctionne au
 * clavier comme au lecteur d'ecran, sans calque flottant a positionner.
 */
export function ConsoleMonthlyBars({
  points,
  valueLabel,
}: {
  points: MonthlyPoint[];
  /** Nom de la mesure, employe dans l'infobulle et le tableau equivalent. */
  valueLabel: string;
}) {
  const tableId = useId();
  // `useId` rend des identifiants du type « :r0: ». Les deux-points sont valides dans un
  // attribut id, mais PAS dans une reference `url(#…)` : un identifiant CSS ne peut pas
  // commencer par un deux-points. On les retire pour le degrade uniquement.
  const gradientId = `bars-${useId().replace(/:/g, "")}`;
  const [hovered, setHovered] = useState<string | null>(null);

  const max = Math.max(1, ...points.map((point) => point.value));
  // Geometrie en pourcentage : le SVG s'etire, les proportions tiennent.
  const slot = 100 / Math.max(1, points.length);
  const barWidth = slot * 0.44;

  return (
    <div>
      <div className="relative h-48 w-full">
        <svg
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          className="h-full w-full"
          role="img"
          aria-describedby={tableId}
          aria-label={`${valueLabel} par mois, ${points.length} derniers mois`}
        >
          {/*
            Degrade vertical : dense en tete de barre, presque efface au pied. C'est la
            maquette. Il n'encode RIEN — une seule serie, rien a distinguer ; seule la
            hauteur porte la grandeur. Le degrade est un parti graphique, pas une donnee.

            `gradientUnits="userSpaceOnUse"` fige le degrade sur la hauteur du repere et non
            sur la boite de chaque barre : sans cela, une barre courte et une barre haute
            auraient le meme degrade comprime, et l'aplat ne serait plus continu d'une barre
            a l'autre.
          */}
          <defs>
            <linearGradient
              id={gradientId}
              gradientUnits="userSpaceOnUse"
              x1="0"
              y1="0"
              x2="0"
              y2="100"
            >
              <stop offset="0%" stopColor="currentColor" stopOpacity="0.75" />
              <stop offset="100%" stopColor="currentColor" stopOpacity="0.04" />
            </linearGradient>
          </defs>
          {points.map((point, index) => {
            // Hauteur minimale visible pour une valeur non nulle : une barre a 1 sur 120
            // serait invisible et se lirait comme un zero.
            const ratio = point.value === 0 ? 0 : Math.max(0.02, point.value / max);
            const height = ratio * 92;
            const x = index * slot + (slot - barWidth) / 2;

            return (
              <rect
                key={point.key}
                x={x}
                y={100 - height}
                width={barWidth}
                height={height}
                rx="1"
                fill={`url(#${gradientId})`}
                className={
                  hovered === point.key ? "text-app-text" : "text-app-text-secondary"
                }
                onMouseEnter={() => setHovered(point.key)}
                onMouseLeave={() => setHovered(null)}
              >
                <title>{`${point.label} : ${point.value} ${valueLabel}`}</title>
              </rect>
            );
          })}
        </svg>
      </div>

      {/* Axe des mois, hors SVG pour que la typo ne soit pas etiree. */}
      <div className="mt-2 flex">
        {points.map((point) => (
          <span
            key={point.key}
            className="flex-1 text-center text-app-xs text-app-text-muted"
          >
            {point.label}
          </span>
        ))}
      </div>

      {/*
        Equivalent tabulaire : un graphique ne doit jamais etre le seul acces a la donnee.
        Masque visuellement, lu par les technologies d'assistance via aria-describedby.
      */}
      <table id={tableId} className="sr-only">
        <caption>{`${valueLabel} par mois`}</caption>
        <thead>
          <tr>
            <th scope="col">Mois</th>
            <th scope="col">{valueLabel}</th>
          </tr>
        </thead>
        <tbody>
          {points.map((point) => (
            <tr key={point.key}>
              <th scope="row">{point.label}</th>
              <td>{point.value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
