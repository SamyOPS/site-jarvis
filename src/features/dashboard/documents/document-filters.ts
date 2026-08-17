"use client";

import { useCallback, useMemo, useState } from "react";

/** Valeur d'un filtre non renseigne. Commune a tous les selecteurs de l'explorateur. */
export const DOCUMENT_FILTER_ALL = "all";

/** Cle de regroupement des documents sans periode, cote options comme cote filtrage. */
export const DOCUMENT_PERIOD_NONE = "__none__";

export type DocumentFilterValues = {
  type: string;
  period: string;
  status: string;
  /** Absent cote salarie : il ne voit que ses propres documents. */
  creator?: string;
};

/** Colonne comparee au filtre « createur » : elle differe selon l'ecran. */
export type DocumentCreatorField = "uploadedByName" | "employeeName";

type FilterableDocument = {
  typeLabel: string | null;
  periodMonth: string | null;
  status: string;
  uploadedByName?: string | null;
  employeeName?: string | null;
};

/**
 * Un document passe-t-il les filtres actifs ?
 *
 * Il existait deux copies de cette fonction, `matchesRhDocumentFilters` et
 * `matchesSalarieDocumentFilters`, dont les trois premieres clauses etaient identiques au
 * caractere pres. La seule difference reelle est le filtre par createur, que le salarie n'a
 * pas : il est donc optionnel ici, et une valeur absente se comporte exactement comme
 * l'ancienne version salarie, qui n'avait pas la clause du tout.
 */
export function matchesDocumentFilters(
  document: FilterableDocument,
  filters: DocumentFilterValues,
  options?: { creatorField?: DocumentCreatorField },
) {
  if (filters.type !== DOCUMENT_FILTER_ALL && document.typeLabel !== filters.type) return false;
  if (
    filters.period !== DOCUMENT_FILTER_ALL &&
    (document.periodMonth ?? DOCUMENT_PERIOD_NONE) !== filters.period
  ) {
    return false;
  }
  if (filters.status !== DOCUMENT_FILTER_ALL && document.status !== filters.status) return false;

  const creator = filters.creator;
  if (creator && creator !== DOCUMENT_FILTER_ALL) {
    const field = options?.creatorField ?? "uploadedByName";
    if (document[field] !== creator) return false;
  }
  return true;
}

/**
 * Les quatre etats d'un jeu de filtres, et leur application a une liste.
 *
 * Cette grappe etait recopiee trois fois : les filtres globaux du RH, ceux de la fiche
 * collaborateur, et ceux du salarie — a chaque fois quatre `useState("all")` suivis d'un
 * `useMemo` reconstruisant le meme objet. Le hook rend `apply` deja memoise, ce qui evite
 * de reciter les quatre dependances a chaque liste filtree.
 *
 * `creatorField` est fige a la construction : le passer en option de `apply` obligerait
 * l'appelant a stabiliser lui-meme l'objet d'options pour ne pas casser la memoisation.
 */
export function useDocumentFilters(creatorField?: DocumentCreatorField) {
  const [type, setType] = useState(DOCUMENT_FILTER_ALL);
  const [period, setPeriod] = useState(DOCUMENT_FILTER_ALL);
  const [status, setStatus] = useState(DOCUMENT_FILTER_ALL);
  const [creator, setCreator] = useState(DOCUMENT_FILTER_ALL);

  const values = useMemo<DocumentFilterValues>(
    () => ({ type, period, status, creator }),
    [creator, period, status, type],
  );

  const apply = useCallback(
    <T extends FilterableDocument>(documents: T[]) =>
      documents.filter((document) => matchesDocumentFilters(document, values, { creatorField })),
    [creatorField, values],
  );

  const reset = useCallback(() => {
    setType(DOCUMENT_FILTER_ALL);
    setPeriod(DOCUMENT_FILTER_ALL);
    setStatus(DOCUMENT_FILTER_ALL);
    setCreator(DOCUMENT_FILTER_ALL);
  }, []);

  /**
   * Objet memoise, et ce n'est pas cosmetique : les appelants ecrivent
   * `useMemo(() => filters.apply(rows), [filters, rows])`. Rendre un objet litteral neuf a
   * chaque rendu ferait recalculer ces memos systematiquement — le resultat resterait juste,
   * mais la memoisation ne servirait plus a rien et les listes filtrees changeraient
   * d'identite a chaque rendu, propageant le recalcul aux memos et aux enfants en aval.
   *
   * Les quatre `set*` de `useState` sont deja stables, `apply` et `reset` sont des
   * `useCallback` : seules `values` et `apply` bougent reellement.
   */
  return useMemo(
    () => ({
      values,
      type,
      period,
      status,
      creator,
      setType,
      setPeriod,
      setStatus,
      setCreator,
      apply,
      reset,
    }),
    [apply, creator, period, reset, status, type, values],
  );
}
