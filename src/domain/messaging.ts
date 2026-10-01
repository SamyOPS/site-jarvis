/**
 * Messagerie interne : types partages et regles qui ne dependent pas de la base.
 *
 * Le controle d'habilitation lui-meme vit dans `src/lib/messaging-access.ts` : il lit les
 * affectations RH, donc il a besoin d'un client Supabase et n'a rien a faire ici.
 */

import type { GameResultMeta } from "@/domain/games";

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

/** Groupe de discussion : nom, gestionnaire et membres (l'utilisateur courant exclu). */
export type ConversationGroup = {
  title: string;
  /** Seul a pouvoir renommer, ajouter et retirer. `null` si son compte a ete supprime. */
  createdBy: string | null;
  members: MessagingContact[];
};

/** Ligne de la liste des conversations. */
export type ConversationSummary = {
  id: string;
  /**
   * L'autre participant d'une discussion a deux. `null` si son compte a ete supprime, et
   * toujours `null` pour un groupe.
   */
  contact: MessagingContact | null;
  /** Renseigne pour un groupe, `null` pour une discussion a deux. */
  group: ConversationGroup | null;
  /** Auteur du dernier message : un groupe prefixe l'apercu de son nom. */
  lastMessageSenderId: string | null;
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
  /** Partie a laquelle ce message invite, s'il s'agit d'une invitation. */
  gameId: string | null;
  /** `game_result` : fin de partie postee par le serveur, sans auteur. */
  kind: MessageKind;
  /** Resultat et score, pour un message `game_result`. */
  meta: GameResultMeta | null;
  /** Vrai tant que le serveur n'a pas confirme l'envoi : le message est affiche d'avance. */
  pending?: boolean;
};

/**
 * `game_result` : fin de partie. `system` : evenement d'un groupe (creation, ajout,
 * retrait, depart, renommage). Ni l'un ni l'autre n'est un message a lire.
 */
export type MessageKind = "message" | "game_result" | "system";

/** Longueur maximale du nom d'un groupe. Bornee aussi en base. */
export const GROUP_TITLE_MAX_LENGTH = 80;
/** Membres au plus par groupe, createur compris. */
export const GROUP_MAX_MEMBERS = 50;

/**
 * Prefixe de l'apercu : « Vous : » pour son propre message ; dans un groupe, le prenom de
 * l'auteur, sans quoi l'on ne saurait pas qui parle. Rien pour un evenement sans auteur.
 */
export function previewPrefix(
  conversation: Pick<ConversationSummary, "group" | "lastMessageFromMe" | "lastMessageSenderId">,
) {
  if (conversation.lastMessageFromMe) return "Vous : ";
  if (!conversation.group || !conversation.lastMessageSenderId) return "";
  const author = conversation.group.members.find(
    (member) => member.id === conversation.lastMessageSenderId,
  );
  return author ? `${author.name.split(" ")[0]} : ` : "";
}

/** Nom affiche d'une conversation : celui du groupe, ou de l'interlocuteur. */
export function conversationTitle(conversation: Pick<ConversationSummary, "contact" | "group">) {
  return conversation.group?.title ?? conversation.contact?.name ?? "Compte supprimé";
}

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
  // Decoupe par point de code : slice() couperait un emoji en deux et afficherait « � ».
  const chars = Array.from(flat);
  return chars.length > maxLength ? `${chars.slice(0, maxLength - 1).join("")}…` : flat;
}
