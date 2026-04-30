export type ColumnKey = "type" | "status" | "period" | "owner" | "createdAt" | "size";

export const columnDefinitions: Array<{
  key: ColumnKey;
  label: string;
  widthClass: string;
}> = [
  { key: "type", label: "Type", widthClass: "w-[160px]" },
  { key: "status", label: "Statut", widthClass: "w-[140px]" },
  { key: "period", label: "Période", widthClass: "w-[180px]" },
  { key: "owner", label: "Propriétaire", widthClass: "w-[220px]" },
  { key: "createdAt", label: "Date de création", widthClass: "w-[220px]" },
  { key: "size", label: "Taille du fichier", widthClass: "w-[150px]" },
];

export const defaultVisibleColumns: ColumnKey[] = ["owner", "createdAt", "size"];

export type DashboardDocumentListItem = {
  id: string;
  fileName: string;
  typeLabel: string;
  statusLabel?: string | null;
  periodLabel?: string | null;
  ownerName: string;
  createdAt: string | null;
  sizeBytes: number | null;
  subtitle?: string | null;
  details?: string | null;
  hideDetailsPanel?: boolean;
};
