"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { ChevronLeft, ChevronRight, MoreVertical } from "lucide-react";

import type { DocumentListItem } from "@/domain/documents";
import { Button } from "@/components/ui/button";
import { ColumnVisibilityMenu } from "@/components/dashboard/document-list/column-visibility-menu";
import {
  columnDefinitions,
  type ColumnKey,
} from "@/features/dashboard/document-list/columns";
import { getFileIcon } from "@/features/dashboard/document-list/file-icon";
import {
  formatActionDetails,
  formatCreatedDate,
  formatFileSize,
  getHiddenColumnValues,
  getStatusBadgeClass,
} from "@/features/dashboard/document-list/formatters";
import { useColumnPreferences } from "@/features/dashboard/document-list/use-column-preferences";

/**
 * Tailles de page proposees. La plus petite sert aussi de seuil d'apparition de la barre
 * de pagination : en dessous, la liste tient d'un seul tenant.
 */
const PAGE_SIZE_OPTIONS = [25, 50, 100] as const;

type DashboardDocumentListProps<T extends DocumentListItem> = {
  items: T[];
  renderActions?: (item: T, closeMenu: () => void) => ReactNode;
  renderActionCell?: (item: T) => ReactNode;
  storageKey?: string;
  storageScope?: string | null;
  preferencesAuthToken?: string | null;
  createdAtLabel?: string;
  columnControlPlacement?: "stacked" | "inline";
  /** Contenu place a gauche de la barre d'outils : filtres, fil d'Ariane de dossiers... */
  toolbar?: ReactNode;
  /** Nom de l'element compte a droite de la barre d'outils. */
  countLabelSingular?: string;
  countLabelPlural?: string;
  /**
   * Nombre de lignes par page. Doit figurer dans `PAGE_SIZE_OPTIONS`, faute de quoi le
   * choix affiche ne correspondrait a aucune option du menu.
   */
  defaultPageSize?: 25 | 50 | 100;
  onItemDoubleClick?: (item: T) => void;
  isItemDoubleClickable?: (item: T) => boolean;
  getDraggableId?: (item: T) => string | null;
  onDragItemStart?: (item: T, draggedId: string) => void;
  onDragItemEnd?: () => void;
  canDropOnItem?: (targetItem: T, draggedId: string) => boolean;
  onItemDrop?: (targetItem: T, draggedId: string) => void | Promise<void>;
};

export function DashboardDocumentList<T extends DocumentListItem>({
  items,
  renderActions,
  renderActionCell,
  storageKey,
  storageScope,
  preferencesAuthToken,
  createdAtLabel = "Date de creation",
  columnControlPlacement = "stacked",
  toolbar,
  countLabelSingular = "document",
  countLabelPlural = "documents",
  defaultPageSize = 25,
  onItemDoubleClick,
  isItemDoubleClickable,
  getDraggableId,
  onDragItemStart,
  onDragItemEnd,
  canDropOnItem,
  onItemDrop,
}: DashboardDocumentListProps<T>) {
  /**
   * Menu d'actions ouvert : identifiant de la ligne, et position a l'ecran du bouton.
   *
   * La position est relevee a l'ouverture parce que le menu est rendu en `fixed` : c'est ce
   * qui lui permet de PASSER PAR-DESSUS la liste au lieu d'etre rogne par le conteneur a
   * defilement horizontal du tableau. Un menu en `absolute` y serait coupe.
   */
  const [actionMenu, setActionMenu] = useState<{
    id: string;
    top: number;
    right: number;
  } | null>(null);
  const actionMenuId = actionMenu?.id ?? null;
  const closeActionMenu = useCallback(() => setActionMenu(null), []);
  const [dragOverItemId, setDragOverItemId] = useState<string | null>(null);
  const [draggedItemId, setDraggedItemId] = useState<string | null>(null);

  const { visibleColumns, setVisibleColumns, columnsInitialized } = useColumnPreferences({
    storageKey,
    storageScope,
    preferencesAuthToken,
  });

  const [pageSize, setPageSize] = useState<number>(defaultPageSize);
  const [requestedPage, setRequestedPage] = useState(1);

  /*
    Retour a la premiere page quand la liste change de taille — typiquement un filtre qui
    vient d'etre pose. Rester en page 3 apres un filtrage montrerait des lignes qui n'ont
    plus rien a voir avec ce que l'on vient de demander.

    L'ajustement se fait PENDANT le rendu, pas dans un effet : c'est le motif que React
    prescrit pour deriver un etat d'une prop qui bouge. Un effet aurait laisse passer un
    rendu intermediaire sur la mauvaise page, visible a l'ecran.
  */
  const [lastItemCount, setLastItemCount] = useState(items.length);
  if (lastItemCount !== items.length) {
    setLastItemCount(items.length);
    setRequestedPage(1);
  }

  const pageCount = Math.max(1, Math.ceil(items.length / pageSize));
  /*
    La page est BORNEE au rendu. Passer de 100 a 25 lignes par page, ou filtrer une liste
    de dix pages jusqu'a deux, laisserait sinon `requestedPage` pointer au-dela de la fin
    et la page s'afficherait vide.
  */
  const page = Math.min(requestedPage, pageCount);
  const firstIndex = (page - 1) * pageSize;
  const pageItems = useMemo(
    () => items.slice(firstIndex, firstIndex + pageSize),
    [firstIndex, items, pageSize],
  );

  const goToPage = useCallback(
    (next: number) => {
      setRequestedPage(next);
      // Le menu d'actions est positionne en `fixed` au moment du clic : le laisser ouvert
      // apres un changement de page le collerait a une ligne qui n'est plus la.
      closeActionMenu();
    },
    [closeActionMenu],
  );

  useEffect(() => {
    if (!actionMenuId) return;

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeActionMenu();
      }
    };

    /*
      Le menu est en `fixed` : sa position est figee a l'ouverture. Un defilement ou un
      redimensionnement le laisserait derriere, decolle de son bouton. On le ferme plutot
      que de le recalculer en continu — c'est le comportement habituel d'un menu contextuel.
      `capture` attrape aussi le defilement des conteneurs internes, qui ne remonte pas.
    */
    window.addEventListener("keydown", handleEscape);
    window.addEventListener("scroll", closeActionMenu, true);
    window.addEventListener("resize", closeActionMenu);
    return () => {
      window.removeEventListener("keydown", handleEscape);
      window.removeEventListener("scroll", closeActionMenu, true);
      window.removeEventListener("resize", closeActionMenu);
    };
  }, [actionMenuId, closeActionMenu]);

  const activeItem = useMemo(
    () => (actionMenuId ? (items.find((item) => item.id === actionMenuId) ?? null) : null),
    [actionMenuId, items],
  );

  const activeColumns = useMemo(
    () =>
      columnDefinitions
        .filter((definition) => visibleColumns.includes(definition.key))
        .map((definition) =>
          definition.key === "createdAt"
            ? { ...definition, label: createdAtLabel }
            : definition,
        ),
    [createdAtLabel, visibleColumns],
  );

  const toggleColumn = (columnKey: ColumnKey) => {
    setVisibleColumns((currentColumns) => {
      if (currentColumns.includes(columnKey)) {
        const nextColumns = currentColumns.filter((value) => value !== columnKey);
        return nextColumns.length ? nextColumns : currentColumns;
      }

      return [...currentColumns, columnKey];
    });
  };

  const frame = "relative rounded-app-card border border-app-line bg-app-surface";

  if (!columnsInitialized) {
    // Meme cadre pendant le chargement des preferences de colonnes : sans lui, la carte
    // apparaissait apres coup et la page sautait.
    return <div className={`${frame} h-12`} />;
  }

  return (
    <div className={frame}>
      {/*
        Barre d'outils, dans le cadre et separee par un filet — meme forme que la liste des
        collaborateurs : controles a gauche, decompte a droite.
      */}
      <div className="flex flex-wrap items-center gap-3 border-b border-app-line p-4">
        <div className="min-w-0 flex-1">{toolbar}</div>
        <ColumnVisibilityMenu
          visibleColumns={visibleColumns}
          onToggle={toggleColumn}
          placement={columnControlPlacement}
        />
        <span className="shrink-0 text-app-sm text-app-text-muted">
          {items.length} {items.length > 1 ? countLabelPlural : countLabelSingular}
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full table-fixed text-app-sm">
          <thead className="border-b border-app-line text-left text-app-xs font-medium text-app-text-muted">
            <tr>
              <th className="px-3 py-3 font-medium sm:px-4">Nom</th>
              {activeColumns.map((column) => (
                <th
                  key={column.key}
                  className={`${column.widthClass} hidden px-4 py-3 font-medium sm:table-cell`}
                >
                  {column.label}
                </th>
              ))}
              <th className="w-auto px-3 py-3 font-medium text-right sm:w-[200px] sm:px-4">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-app-line">
            {pageItems.map((item) => (
              <tr
                key={item.id}
                className={`transition-colors hover:bg-app-surface-hover ${dragOverItemId === item.id ? "bg-app-surface-hover/70" : ""} ${(isItemDoubleClickable ? isItemDoubleClickable(item) : false) ? "cursor-pointer" : ""}`}
                  draggable={Boolean(getDraggableId?.(item))}
                  onDoubleClick={() => {
                    if (!onItemDoubleClick) return;
                    const enabled = isItemDoubleClickable ? isItemDoubleClickable(item) : true;
                    if (!enabled) return;
                    onItemDoubleClick(item);
                  }}
                  onDragStart={(event) => {
                    const draggedId = getDraggableId?.(item);
                    if (!draggedId) return;
                    setDraggedItemId(draggedId);
                    event.dataTransfer.setData("text/x-dashboard-item-id", draggedId);
                    event.dataTransfer.setData("text/plain", draggedId);
                    event.dataTransfer.effectAllowed = "move";
                    onDragItemStart?.(item, draggedId);
                  }}
                  onDragEnd={() => {
                    setDragOverItemId(null);
                    setDraggedItemId(null);
                    onDragItemEnd?.();
                  }}
                  onDragOver={(event) => {
                    if (!onItemDrop) return;
                    const draggedId =
                      draggedItemId ?? event.dataTransfer.getData("text/x-dashboard-item-id");
                    if (!draggedId) return;
                    const allowed = canDropOnItem ? canDropOnItem(item, draggedId) : true;
                    if (!allowed) return;
                    event.preventDefault();
                    event.dataTransfer.dropEffect = "move";
                    if (dragOverItemId !== item.id) {
                      setDragOverItemId(item.id);
                    }
                  }}
                  onDragLeave={() => {
                    if (dragOverItemId === item.id) {
                      setDragOverItemId(null);
                    }
                  }}
                  onDrop={(event) => {
                    if (!onItemDrop) return;
                    const draggedId =
                      draggedItemId ?? event.dataTransfer.getData("text/x-dashboard-item-id");
                    setDragOverItemId(null);
                    setDraggedItemId(null);
                    if (!draggedId) return;
                    const allowed = canDropOnItem ? canDropOnItem(item, draggedId) : true;
                    if (!allowed) return;
                    event.preventDefault();
                    void onItemDrop(item, draggedId);
                  }}
                >
                  <td className="px-3 py-3 align-middle sm:px-4">
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 shrink-0">{getFileIcon(item.fileName, item.typeLabel)}</div>
                      <div className="min-w-0">
                        <p className="truncate font-medium text-app-text" title={item.fileName}>
                          {item.fileName}
                        </p>
                        {(() => {
                          const hiddenColumnValues = getHiddenColumnValues(item, visibleColumns);
                          const subtitleParts = [
                            ...hiddenColumnValues,
                            ...(item.subtitle ? [item.subtitle] : []),
                          ];
                          const subtitle = subtitleParts.filter(Boolean).join(" • ");

                          if (!subtitle) {
                            return null;
                          }

                          return (
                            <p className="mt-1 truncate text-app-xs text-app-text-muted" title={subtitle}>
                              {subtitle}
                            </p>
                          );
                        })()}
                      </div>
                    </div>
                  </td>

                  {visibleColumns.includes("type") ? (
                    <td className="hidden px-4 py-3 align-middle sm:table-cell">
                      <span className="inline-flex rounded-app-control border border-app-line px-2 py-1 text-app-xs font-medium text-app-text-secondary">
                        {item.typeLabel}
                      </span>
                    </td>
                  ) : null}

                  {visibleColumns.includes("status") ? (
                    <td className="hidden px-4 py-3 align-middle sm:table-cell">
                      {item.statusLabel ? (
                        <span
                          className={`inline-flex rounded-app-control border px-2 py-1 text-app-xs font-medium ${getStatusBadgeClass(item.statusLabel)}`}
                        >
                          {item.statusLabel}
                        </span>
                      ) : (
                        <span className="text-app-text-secondary">-</span>
                      )}
                    </td>
                  ) : null}

                  {visibleColumns.includes("period") ? (
                    <td className="hidden px-4 py-3 align-middle text-app-text-secondary sm:table-cell">
                      {item.periodLabel ?? "-"}
                    </td>
                  ) : null}

                  {visibleColumns.includes("owner") ? (
                    <td className="hidden px-4 py-3 align-middle sm:table-cell">
                      <span className="truncate text-app-text-secondary">{item.ownerName}</span>
                    </td>
                  ) : null}

                  {visibleColumns.includes("createdAt") ? (
                    <td className="hidden px-4 py-3 align-middle text-app-text-secondary sm:table-cell">
                      {formatCreatedDate(item.createdAt)}
                    </td>
                  ) : null}

                  {visibleColumns.includes("size") ? (
                    <td className="hidden px-4 py-3 align-middle text-app-text-secondary sm:table-cell">
                      {formatFileSize(item.sizeBytes)}
                    </td>
                  ) : null}

                  <td className="px-3 py-3 align-middle sm:px-4">
                    <div className="flex justify-end">
                      {renderActionCell ? (
                        renderActionCell(item)
                      ) : (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-app-text-secondary hover:text-app-text"
                          aria-haspopup="menu"
                          aria-expanded={actionMenuId === item.id}
                          onClick={(event) => {
                            if (actionMenuId === item.id) {
                              closeActionMenu();
                              return;
                            }
                            // Position relevee au clic : le menu s'affiche en `fixed`, sous
                            // le bouton et aligne a droite sur lui.
                            const rect = event.currentTarget.getBoundingClientRect();
                            setActionMenu({
                              id: item.id,
                              top: rect.bottom + 4,
                              right: window.innerWidth - rect.right,
                            });
                          }}
                          aria-label={`Ouvrir les actions pour ${item.fileName}`}
                        >
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/*
        Barre de pagination, dans le cadre et separee par un filet — symetrique de la barre
        d'outils du haut.

        Elle n'apparait qu'au-dela de la plus petite taille de page : sous ce seuil il n'y a
        ni page a tourner, ni raison d'offrir un choix de taille. Le seuil est la plus
        PETITE option et non `pageSize` : choisir 100 pour trente lignes ne doit pas faire
        disparaitre le menu qui vient de servir.
      */}
      {items.length > PAGE_SIZE_OPTIONS[0] ? (
        <nav
          aria-label="Pagination des documents"
          className="flex flex-wrap items-center gap-3 border-t border-app-line p-4 text-app-sm"
        >
          <label className="flex items-center gap-2 text-app-text-secondary">
            Par page
            <select
              value={pageSize}
              onChange={(event) => {
                setPageSize(Number(event.target.value));
                // Le premier element visible change de place : on repart du debut plutot
                // que d'atterrir au milieu de nulle part.
                goToPage(1);
              }}
              className="h-8 rounded-app-control border border-app-line bg-app-field px-2 text-app-sm text-app-text focus-visible:outline-app"
            >
              {PAGE_SIZE_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>

          {/*
            `aria-live` : tourner une page ne deplace pas le focus, un lecteur d'ecran
            n'aurait donc rien annonce. La plage remplace le decompte pour dire OU l'on est.
          */}
          <span aria-live="polite" className="text-app-text-muted">
            {`${firstIndex + 1}–${Math.min(firstIndex + pageSize, items.length)} sur ${items.length}`}
          </span>

          <div className="ml-auto flex items-center gap-1">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => goToPage(page - 1)}
              disabled={page <= 1}
              aria-label="Page precedente"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="px-2 text-app-text-secondary">
              {`Page ${page} sur ${pageCount}`}
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => goToPage(page + 1)}
              disabled={page >= pageCount}
              aria-label="Page suivante"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </nav>
      ) : null}

      {/*
        Menu d'actions, rendu UNE SEULE FOIS hors du tableau et positionne en `fixed`.

        Le placer dans la cellule le ferait rogner par le conteneur a defilement horizontal ;
        `fixed` l'en affranchit et lui permet de passer par-dessus la liste. Il n'est pas
        duplique par ligne : une seule instance suffit, celle de la ligne ouverte.
      */}
      {activeItem ? (
        <>
          {/*
            Capteur de clic exterieur. Transparent, sous le menu : un clic ailleurs ferme,
            sans bloquer le defilement ni masquer quoi que ce soit.
          */}
          <div
            aria-hidden="true"
            className="fixed inset-0 z-40"
            onClick={closeActionMenu}
          />
          <div
            role="menu"
            aria-label={`Actions pour ${activeItem.fileName}`}
            style={{ top: actionMenu?.top, right: actionMenu?.right }}
            className="fixed z-50 w-72 rounded-app-card border border-app-line bg-app-raised p-2 shadow-app-raised"
          >
            <div className="flex flex-col items-stretch gap-1">
              {renderActions ? renderActions(activeItem, closeActionMenu) : null}
            </div>

            {/*
              Le commentaire RH figurait dans la ligne depliee. Il est conserve ici plutot
              que perdu : c'est souvent la raison d'un refus, et l'action a mener en depend.
            */}
            {!activeItem.hideDetailsPanel && formatActionDetails(activeItem.details) ? (
              <div className="mt-2 border-t border-app-line pt-2">
                <p className="text-app-xs font-medium uppercase tracking-wide text-app-text-muted">
                  Commentaire RH
                </p>
                <p className="mt-1 max-h-40 overflow-y-auto whitespace-pre-wrap text-app-sm text-app-text-secondary">
                  {formatActionDetails(activeItem.details)}
                </p>
              </div>
            ) : null}
          </div>
        </>
      ) : null}
    </div>
  );
}
