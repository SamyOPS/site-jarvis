import { CircleAlert, CircleCheck, CircleX, Clock } from "lucide-react";

/**
 * Pastille de statut, adossee a la palette de statuts de la console.
 *
 * La correspondance n'est pas decorative : elle suit les definitions ecrites dans
 * `console.css`.
 *   - `missing` (orange)  : demande ouverte, AUCUN document depose ;
 *   - `pending` (ambre)   : document depose, pas encore controle ;
 *   - `rejected` (rouge)  : refuse, ou echu sans avoir jamais ete satisfait ;
 *   - `validated` (vert)  : controle et accepte.
 *
 * Ces quatre couleurs sont RESERVEES aux statuts. Elles ne servent jamais a colorer une
 * serie, un graphique ou un accent decoratif : leur valeur vient justement de ne signifier
 * qu'une chose.
 *
 * Chaque pastille porte une ICONE ET UN LIBELLE, jamais la couleur seule — un tiers des
 * hommes distingue mal le rouge du vert, et l'information doit passer sans elle.
 */
const STATUS_STYLES = {
  missing: {
    label: "En attente",
    icon: CircleAlert,
    className: "border-missing-line bg-missing-soft text-missing",
  },
  pending: {
    label: "Déposé",
    icon: Clock,
    className: "border-pending-line bg-pending-soft text-pending",
  },
  rejected: {
    label: "Rejeté",
    icon: CircleX,
    className: "border-rejected-line bg-rejected-soft text-rejected",
  },
  expired: {
    label: "Expiré",
    icon: CircleX,
    className: "border-rejected-line bg-rejected-soft text-rejected",
  },
  validated: {
    label: "Validé",
    icon: CircleCheck,
    className: "border-validated-line bg-validated-soft text-validated",
  },
} as const;

type KnownStatus = keyof typeof STATUS_STYLES;

function isKnownStatus(value: string): value is KnownStatus {
  return value in STATUS_STYLES;
}

export function ConsoleStatusBadge({ status }: { status: string }) {
  // Statut inconnu : on affiche sa valeur brute en neutre plutot que de la ranger
  // arbitrairement dans une couleur qui lui donnerait un sens qu'elle n'a pas.
  if (!isKnownStatus(status)) {
    return (
      <span className="inline-flex shrink-0 items-center gap-1 rounded-app-control border border-app-line px-2 py-1 text-app-xs text-app-text-secondary">
        {status}
      </span>
    );
  }

  const { label, icon: Icon, className } = STATUS_STYLES[status];

  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1 rounded-app-control border px-2 py-1 text-app-xs font-medium ${className}`}
    >
      <Icon aria-hidden="true" className="h-3 w-3" />
      {label}
    </span>
  );
}
