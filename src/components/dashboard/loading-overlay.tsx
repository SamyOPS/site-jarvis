type DashboardLoadingOverlayProps = {
  message: string;
};

/**
 * Voile d'attente des pages administrateur et professionnel.
 *
 * Les espaces RH et salarie ne s'en servent plus : ils affichent un squelette a la place du
 * contenu (`ConsoleLoadingSkeleton`), ce qui vaut mieux qu'un voile. Ces deux pages-ci sont
 * une pile de cartes heterogenes sans forme previsible, d'ou le voile — mais debarrasse de
 * ses defauts : plus de rond qui tourne, plus de teinte noire, et les jetons de la console
 * a la place des couleurs codees en dur.
 *
 * La barre indeterminee reutilise `@keyframes loading`, deja declaree dans `globals.css`
 * et jusqu'ici inutilisee. Elle est purement decorative — c'est le texte, porte par
 * `role="status"`, qui informe.
 */
export function DashboardLoadingOverlay({ message }: DashboardLoadingOverlayProps) {
  return (
    <div
      role="status"
      aria-busy="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-app-canvas/75 backdrop-blur-sm"
    >
      <div className="w-64 rounded-app-card border border-app-line bg-app-surface px-5 py-4">
        <p className="text-app-sm text-app-text">{message}</p>

        {/*
          `motion-safe:` : sans animation, la barre reste un simple rail vide plutot qu'un
          reflet fige au milieu, qui se lirait comme une progression arretee.
        */}
        <span
          aria-hidden="true"
          className="relative mt-3 block h-1 overflow-hidden rounded-full bg-app-surface-hover"
        >
          <span className="absolute inset-y-0 left-0 w-1/2 -translate-x-[120%] rounded-full bg-app-text/40 motion-safe:animate-[loading_1.4s_ease-in-out_infinite]" />
        </span>
      </div>
    </div>
  );
}
