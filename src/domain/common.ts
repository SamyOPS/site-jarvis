/**
 * Types metier partages. Regle : ce dossier ne doit importer AUCUN module du projet
 * (ni @/lib, ni @/features, ni @/components, ni @/app). TypeScript natif uniquement.
 */

/**
 * Etat d'une action asynchrone declenchee depuis l'interface : au repos, en erreur,
 * ou terminee avec succes. Le message accompagne les deux etats terminaux.
 */
export type AsyncStatus =
  | { type: "idle" }
  | { type: "error"; message: string }
  | { type: "success"; message: string };

/** Unite de temps d'une prestation : la journee ou l'heure. */
export type TimeUnit = "day" | "hour";
