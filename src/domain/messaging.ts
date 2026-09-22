/**
 * Messagerie interne : types partages et regles qui ne dependent pas de la base.
 *
 * Le controle d'habilitation lui-meme vit dans `src/lib/messaging-access.ts` : il lit les
 * affectations RH, donc il a besoin d'un client Supabase et n'a rien a faire ici.
 */

/** Roles ayant acces a la messagerie. Les autres n'ont pas de console. */
export const MESSAGING_ROLES = ["rh", "salarie", "admin"] as const;

export type MessagingRole = (typeof MESSAGING_ROLES)[number];

export function isMessagingRole(value: string | null | undefined): value is MessagingRole {
  return MESSAGING_ROLES.includes((value ?? "") as MessagingRole);
}

/** Libelle affiche a cote d'un interlocuteur. */
export const MESSAGING_ROLE_LABELS: Record<MessagingRole, string> = {
  rh: "RH",
  salarie: "Consultant",
  admin: "Administration",
};

export function messagingRoleLabel(role: string | null | undefined) {
  return isMessagingRole(role) ? MESSAGING_ROLE_LABELS[role] : "Utilisateur";
}

/**
 * Cle de binome d'une conversation a deux.
 *
 * Triee pour que (A, B) et (B, A) donnent la MEME cle : c'est ce qui permet a l'unicite
 * en base de faire echouer la creation d'un doublon plutot que de la laisser passer.
 */
export function buildPairKey(firstProfileId: string, secondProfileId: string) {
  return [firstProfileId, secondProfileId].sort().join(":");
}

/** Personne a qui l'utilisateur courant a le droit d'ecrire. */
export type MessagingContact = {
  id: string;
  name: string;
  email: string;
  role: string | null;
  /** URL publique de la photo de profil, ou `null` : la pastille montre les initiales. */
  avatarUrl: string | null;
};

/** Ligne de la liste des conversations. */
export type ConversationSummary = {
  id: string;
  /** L'autre participant. `null` si son compte a ete supprime. */
  contact: MessagingContact | null;
  lastMessageAt: string;
  lastMessagePreview: string | null;
  /** Vrai si le dernier message vient de l'utilisateur courant. */
  lastMessageFromMe: boolean;
  unreadCount: number;
};

/** Message d'un fil. */
export type MessageItem = {
  id: string;
  conversationId: string;
  senderId: string | null;
  body: string;
  createdAt: string;
};

/** Nom affichable d'un profil, avec repli sur l'e-mail puis sur un libelle neutre. */
export function displayContactName(
  profile: { full_name?: string | null; email?: string | null } | null | undefined,
) {
  return profile?.full_name?.trim() || profile?.email?.trim() || "Utilisateur";
}

/**
 * Longueur maximale d'un message.
 *
 * Bornee cote client ET cote serveur : la limite du client est un confort d'edition, elle
 * ne protege de rien. Valeur large — on tronque un roman, pas un paragraphe.
 */
export const MESSAGE_MAX_LENGTH = 4000;

/** Extrait d'un message pour la liste des conversations. */
export function messagePreview(body: string, maxLength = 90) {
  const flat = body.replace(/\s+/g, " ").trim();
  return flat.length > maxLength ? `${flat.slice(0, maxLength - 1)}…` : flat;
}
