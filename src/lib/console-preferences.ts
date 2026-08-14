/**
 * Petit store externe pour les preferences d'affichage de la console.
 *
 * Passe par useSyncExternalStore plutot que par un useEffect + setState :
 * on evite le warning react-hooks/set-state-in-effect et on garde un
 * snapshot serveur explicite (donc pas de mismatch d'hydratation).
 */

type Listener = () => void;

export type BooleanPreferenceStore = {
  subscribe: (listener: Listener) => () => void;
  getSnapshot: () => boolean;
  getServerSnapshot: () => boolean;
  set: (value: boolean) => void;
  toggle: () => void;
};

function createBooleanPreference(
  storageKey: string,
  fallback: boolean,
): BooleanPreferenceStore {
  let listeners: Listener[] = [];
  let cache: boolean | null = null;

  const read = () => {
    if (cache !== null) return cache;
    try {
      const stored = window.localStorage.getItem(storageKey);
      cache = stored === null ? fallback : stored === "1";
    } catch {
      cache = fallback;
    }
    return cache;
  };

  const emit = () => {
    for (const listener of listeners) listener();
  };

  return {
    subscribe(listener) {
      listeners.push(listener);
      return () => {
        listeners = listeners.filter((entry) => entry !== listener);
      };
    },
    getSnapshot: read,
    getServerSnapshot: () => fallback,
    set(value) {
      if (cache === value) return;
      cache = value;
      try {
        window.localStorage.setItem(storageKey, value ? "1" : "0");
      } catch {
        // Stockage indisponible : la preference vaut pour la session.
      }
      emit();
    },
    toggle() {
      this.set(!read());
    },
  };
}

/** Sidebar repliee en 64px (icones seules). */
export const sidebarCollapsedPreference = createBooleanPreference(
  "jarvis-console-sidebar-collapsed",
  false,
);
