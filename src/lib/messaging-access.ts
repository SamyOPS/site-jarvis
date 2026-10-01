import type { SupabaseClient } from "@supabase/supabase-js";

import { ApiError } from "@/lib/api-handler";
import {
  displayContactName,
  type MessageItem,
  type MessagingContact,
} from "@/domain/messaging";
import { avatarPublicUrl } from "@/lib/avatars";

/**
 * Qui a le droit d'ecrire a qui.
 *
 * Tout compte de la console peut ecrire a tout RH et a tout salarie verifie, a deux comme
 * en groupe. Les affectations RH ne limitent plus la messagerie : elles continuent de
 * regir les documents et les CRA, pas les echanges.
 *
 * Ne sont PAS joignables :
 *   - les admins : ils n'apparaissent dans aucun annuaire et l'on ne peut ni leur ouvrir
 *     une discussion ni les ajouter a un groupe. Eux peuvent toujours ecrire ;
 *   - les comptes non verifies : leur ecrire reviendrait a deposer un message que
 *     personne ne lira.
 *
 * Le controle porte sur l'OUVERTURE d'une conversation. Une fois le fil ouvert,
 * participer suffit pour lire et ecrire.
 */

type Actor = { id: string; role: string | null };

type ProfileRow = {
  id: string;
  full_name: string | null;
  email: string;
  role: string | null;
  professional_status: string | null;
  avatar_url: string | null;
};

const CONTACT_COLUMNS = "id,full_name,email,role,professional_status,avatar_url";

/**
 * L'URL de la photo est reconstituee ICI, cote serveur.
 *
 * La base ne stocke qu'un chemin, et une balise <img> ne sait pas porter d'en-tete
 * d'autorisation : le navigateur a besoin d'une URL complete, deja resolue.
 */
function toContact(
  adminClient: SupabaseClient,
  row: ProfileRow,
): MessagingContact {
  return {
    id: row.id,
    name: displayContactName(row),
    email: row.email,
    role: row.role,
    avatarUrl: avatarPublicUrl(adminClient, row.avatar_url),
  };
}

/** Roles que l'on peut joindre. Les admins n'en font pas partie (voir plus haut). */
const REACHABLE_ROLES = ["rh", "salarie"];

/**
 * Joignable : RH ou salarie, et verifie. Un compte non verifie n'a pas acces a sa console
 * (voir `getAuthorizedActor`).
 */
function isReachable(row: ProfileRow) {
  return REACHABLE_ROLES.includes(row.role ?? "") && row.professional_status === "verified";
}

/**
 * Annuaire de l'utilisateur courant : tous ceux a qui il peut ecrire, c'est-a-dire toute
 * la console. Le meme pour les discussions a deux et pour les groupes.
 *
 * Rendu trie par nom. C'est la MEME source de verite que `assertCanStartConversation` —
 * ce qui n'apparait pas dans cette liste est refuse par le controle, et inversement.
 */
export async function listMessagingContacts(
  adminClient: SupabaseClient,
  actor: Actor,
): Promise<MessagingContact[]> {
  const { data, error } = await adminClient
    .from("profiles")
    .select(CONTACT_COLUMNS)
    .in("role", REACHABLE_ROLES)
    .neq("id", actor.id);
  if (error) throw new ApiError(error.message, 400);

  return ((data ?? []) as ProfileRow[])
    .filter(isReachable)
    .map((row) => toContact(adminClient, row))
    .sort((left, right) => left.name.localeCompare(right.name, "fr"));
}

/**
 * Verifie que l'acteur peut OUVRIR une conversation avec la cible, et rend le profil de
 * celle-ci.
 *
 * Le profil est rendu plutot que simplement valide : l'appelant en a besoin juste apres
 * pour composer la reponse, et le relire serait un aller-retour de plus.
 */
export async function assertCanStartConversation(
  adminClient: SupabaseClient,
  actor: Actor,
  targetId: string,
): Promise<MessagingContact> {
  if (!targetId || targetId === actor.id) {
    throw new ApiError("Destinataire invalide.", 400);
  }

  const { data, error } = await adminClient
    .from("profiles")
    .select(CONTACT_COLUMNS)
    .eq("id", targetId)
    .maybeSingle();
  if (error) throw new ApiError(error.message, 400);

  const target = data as ProfileRow | null;
  // Meme message qu'un refus : distinguer « ce compte n'existe pas » de « vous n'y avez
  // pas droit » permettrait de sonder l'annuaire un identifiant a la fois.
  if (!target || !isReachable(target)) {
    throw new ApiError("Destinataire non autorise.", 403);
  }
  return toContact(adminClient, target);
}

/**
 * Verifie que l'acteur participe a la conversation.
 *
 * C'est le controle qui s'applique a l'ENVOI et a la LECTURE, la ou
 * `assertCanStartConversation` ne regit que l'ouverture.
 */
export async function assertConversationParticipant(
  adminClient: SupabaseClient,
  actorId: string,
  conversationId: string,
) {
  const { data, error } = await adminClient
    .from("conversation_participants")
    .select("conversation_id,cleared_at")
    .eq("conversation_id", conversationId)
    .eq("profile_id", actorId)
    .maybeSingle();
  if (error) throw new ApiError(error.message, 400);
  if (!data) throw new ApiError("Conversation introuvable.", 404);
  // Date sous laquelle l'appelant a supprime le fil pour lui (null s'il ne l'a pas fait).
  return { clearedAt: (data.cleared_at as string | null) ?? null };
}

export const MESSAGE_COLUMNS = "id,conversation_id,sender_id,body,created_at,game_id,kind,meta";

export type MessageRow = {
  id: string;
  conversation_id: string;
  sender_id: string | null;
  body: string;
  created_at: string;
  game_id: string | null;
  kind: MessageItem["kind"];
  meta: MessageItem["meta"];
};

export function toMessageItem(row: MessageRow): MessageItem {
  return {
    id: row.id,
    conversationId: row.conversation_id,
    senderId: row.sender_id,
    body: row.body,
    createdAt: row.created_at,
    gameId: row.game_id ?? null,
    kind: row.kind ?? "message",
    meta: row.meta ?? null,
  };
}
