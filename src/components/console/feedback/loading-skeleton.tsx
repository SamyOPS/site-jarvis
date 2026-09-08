/**
 * Bloc d'attente : la place qu'occupera un texte, avec un reflet qui la traverse.
 *
 * Le reflet est tire de `--app-text` a 7 % d'opacite, et non d'un gris fixe : en theme
 * clair il passe en sombre sur un bloc pale, en theme sombre en clair sur un bloc fonce.
 * Un `via-white/10` n'aurait ete visible que dans l'un des deux.
 *
 * `motion-safe:` limite l'animation a qui n'a pas demande moins de mouvement. Pour les
 * autres, le reflet reste hors cadre — le bloc est simplement plat, et c'est le libelle de
 * `ConsoleLoadingSkeleton` qui dit que quelque chose se charge.
 */
function Block({ className }: { className: string }) {
  return (
    <span
      aria-hidden="true"
      className={`relative block overflow-hidden rounded-app-control bg-app-surface-hover ${className}`}
    >
      <span className="absolute inset-0 -translate-x-[120%] bg-gradient-to-r from-transparent via-app-text/[0.07] to-transparent motion-safe:animate-[loading_1.6s_ease-in-out_infinite]" />
    </span>
  );
}

/** Une carte d'attente : son cadre est le VRAI cadre, seuls les textes sont remplaces. */
function CardFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-app-card border border-app-line bg-app-surface p-5">{children}</div>
  );
}

/**
 * Ecran d'attente du premier chargement.
 *
 * Remplace un voile sombre plein ecran avec un rond qui tourne. Trois raisons :
 *
 *   - le voile masquait la barre laterale et la barre superieure, donc toute navigation,
 *     alors qu'il n'y avait rien a proteger — aucune donnee n'est encore affichee ;
 *   - derriere lui, les sections rendaient leurs etats vides — « 0 document a valider »,
 *     « Aucune demande ouverte » — qui sautaient ensuite aux vraies valeurs ;
 *   - un squelette montre la FORME de ce qui arrive, ce qu'un rond qui tourne ne dit pas.
 *
 * Il n'apparait qu'au demarrage a froid : un cache present rafraichit en silence.
 */
export function ConsoleLoadingSkeleton({
  label,
  /**
   * Affiche la rangee de tuiles chiffrees. A desactiver hors tableau de bord : promettre
   * quatre tuiles a qui a ouvert la liste des documents serait annoncer une page qui ne
   * viendra pas.
   */
  showStats = true,
}: {
  label: string;
  showStats?: boolean;
}) {
  return (
    /*
      `role="status"` porte l'annonce, et `aria-busy` l'etat. Les blocs sont tous
      `aria-hidden` : sans cela un lecteur d'ecran parcourrait une quinzaine de boites
      vides. Le libelle est VISIBLE plutot que `sr-only` — il est la seule indication
      d'activite pour qui a desactive les animations.
    */
    <div role="status" aria-busy="true" className="space-y-2">
      <p className="text-app-xs text-app-text-muted">{label}</p>

      {showStats ? (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {[0, 1, 2, 3].map((tile) => (
            <div
              key={tile}
              className="rounded-app-card border border-app-line bg-app-surface px-5 py-4"
            >
              <Block className="h-4 w-28" />
              <Block className="mt-3 h-8 w-16" />
            </div>
          ))}
        </div>
      ) : null}

      {/* Une rangee de trois panneaux, puis un panneau large : la cadence du tableau de bord. */}
      <div className="grid grid-cols-1 gap-2 lg:grid-cols-3">
        {[0, 1, 2].map((panel) => (
          <CardFrame key={panel}>
            <Block className="h-4 w-32" />
            <Block className="mt-2 h-3 w-44" />
            <div className="mt-4 space-y-4">
              {[0, 1, 2, 3].map((row) => (
                <div key={row} className="space-y-2">
                  <Block className="h-3 w-3/4" />
                  <Block className="h-3 w-1/2" />
                </div>
              ))}
            </div>
          </CardFrame>
        ))}
      </div>

      <CardFrame>
        <Block className="h-4 w-40" />
        <div className="mt-4 space-y-3">
          {[0, 1, 2, 3, 4].map((row) => (
            <Block key={row} className="h-4 w-full" />
          ))}
        </div>
      </CardFrame>
    </div>
  );
}
