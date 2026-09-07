import type { ReactNode } from "react";
import Link from "next/link";

export type ConsoleStat = {
  /** Phrase courante, sans deux-points final. */
  label: string;
  value: ReactNode;
  /** Precision facultative sous la valeur. Jamais une variation inventee. */
  hint?: string;
  /**
   * Destination du clic. OPTIONNELLE : une tuile sans page dediee reste inerte, sans
   * survol ni curseur qui promettraient une navigation inexistante.
   */
  href?: string;
};

/**
 * Rangee d'indicateurs : une CARTE PAR TUILE, separees par un petit vide.
 *
 * Premiere version : un cadre unique segmente par des filets internes. C'etait une mauvaise
 * lecture de la maquette — les tuiles y sont bien quatre cartes distinctes, chacune avec ses
 * quatre bords, espacees de quelques pixels. Ce sont l'ESPACE et le filet fin qui les
 * detachent, pas l'epaisseur du trait.
 *
 * PAS DE VARIATION du type « +3,1 % vs semaine derniere » : l'application ne conserve aucun
 * historique hebdomadaire, la calculer serait l'inventer. `hint` est l'emplacement prevu
 * pour le jour ou la donnee existera — avec fleche et libelle, jamais la couleur seule.
 */
export function ConsoleStatRow({ stats }: { stats: ConsoleStat[] }) {
  return (
    <dl className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat) => {
        const body = (
          <>
            <dt className="text-app-sm text-app-text-secondary">{stat.label}</dt>
            {/*
              Chiffres PROPORTIONNELS, pas tabulaires : `tabular-nums` donne a chaque chiffre
              la largeur d'un zero, ce qui fait respirer trop largement un nombre comme 121 a
              cette taille. Le tabulaire est reserve aux colonnes a aligner.
            */}
            <dd className="mt-3 text-app-xl font-semibold text-app-text">{stat.value}</dd>
            {stat.hint ? (
              <p className="mt-2 text-app-sm text-app-text-muted">{stat.hint}</p>
            ) : null}
          </>
        );

        const frame = "rounded-app-card border border-app-line bg-app-surface px-5 py-4";

        if (stat.href) {
          return (
            <Link
              key={stat.label}
              href={stat.href}
              className={`${frame} block transition-colors hover:bg-app-surface-hover focus-visible:outline-app`}
            >
              {body}
            </Link>
          );
        }

        return (
          <div key={stat.label} className={frame}>
            {body}
          </div>
        );
      })}
    </dl>
  );
}
