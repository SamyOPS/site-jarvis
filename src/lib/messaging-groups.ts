import type { SupabaseClient } from "@supabase/supabase-js";

import { ApiError, unwrap } from "@/lib/api-handler";
import { listMessagingContacts } from "@/lib/messaging-access";
import {
  GROUP_MAX_MEMBERS,
  GROUP_TITLE_MAX_LENGTH,
  type MessagingContact,
} from "@/domain/messaging";

/**
 * Groupes de discussion, cote serveur.
 *
 * QUI PEUT ETRE AJOUTE. Tout compte de l'annuaire de la messagerie
 * (`listMessagingContacts`), c'est-a-dire toute la console.
 *
 * QUI GERE. Le createur (`created_by`) renomme, ajoute et retire. Chacun peut partir.
 */

type Actor = { id: string; role: string | null };

export type GroupRow = {
  id: string;
  title: string;
  created_by: string | null;
  memberIds: string[];
};

/** Nom de groupe nettoye, ou erreur 400. */
export function normalizeGroupTitle(value: unknown) {
  const title = typeof value === "string" ? value.trim().replace(/\s+/g, " ") : "";
  if (!title) throw new ApiError("Donnez un nom au groupe.", 400);
  if (title.length > GROUP_TITLE_MAX_LENGTH) {
    throw new ApiError(`Nom trop long (${GROUP_TITLE_MAX_LENGTH} caractères maximum).`, 400);
  }
  return title;
}

/** Liste d'identifiants dedoublonnee, ou erreur 400 si ce n'en est pas une. */
export function normalizeIds(value: unknown): string[] {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value) || !value.every((id) => typeof id === "string" && id.trim())) {
    throw new ApiError("Liste de membres invalide.", 400);
  }
  return Array.from(new Set(value.map((id: string) => id.trim())));
}

/**
 * Verifie que l'acteur peut ajouter chacun de ces profils, et rend leurs fiches.
 *
 * Un seul refus pour tout identifiant hors annuaire, sans dire lequel : distinguer
 * « inexistant » de « non autorise » permettrait de sonder l'annuaire.
 */
export async function assertCanAddMembers(
  adminClient: SupabaseClient,
  actor: Actor,
  ids: string[],
): Promise<MessagingContact[]> {
  if (!ids.length) return [];
  const directory = new Map(
    (await listMessagingContacts(adminClient, actor)).map((contact) => [contact.id, contact]),
  );
  const contacts = ids.map((id) => directory.get(id));
  if (contacts.some((contact) => !contact)) {
    throw new ApiError("Membre non autorisé.", 403);
  }
  return contacts as MessagingContact[];
}

/** Le groupe et ses membres, si l'acteur en fait partie. 404 sinon, comme partout. */
export async function loadGroupForActor(
  adminClient: SupabaseClient,
  actorId: string,
  conversationId: string,
): Promise<GroupRow> {
  const conversation = unwrap(
    await adminClient
      .from("conversations")
      .select("id,title,created_by,is_group")
      .eq("id", conversationId)
      .maybeSingle(),
  ) as { id: string; title: string | null; created_by: string | null; is_group: boolean } | null;

  const notFound = new ApiError("Groupe introuvable.", 404);
  if (!conversation?.is_group) throw notFound;

  const members = unwrap(
    await adminClient
      .from("conversation_participants")
      .select("profile_id")
      .eq("conversation_id", conversationId)
      .order("joined_at", { ascending: true }),
  ) as { profile_id: string }[] | null;

  const memberIds = (members ?? []).map((row) => row.profile_id);
  if (!memberIds.includes(actorId)) throw notFound;

  return {
    id: conversation.id,
    title: conversation.title ?? "Groupe",
    created_by: conversation.created_by,
    memberIds,
  };
}

/** Plafond de membres, createur compris. */
export function assertGroupSize(count: number) {
  if (count > GROUP_MAX_MEMBERS) {
    throw new ApiError(`Un groupe compte ${GROUP_MAX_MEMBERS} membres au plus.`, 400);
  }
}

/**
 * Evenement du groupe dans le fil : « Samy a ajoute Selin ».
 *
 * Sans auteur, et ne d'emblee marque comme notifie : ce n'est pas un message a lire, il
 * ne doit ni compter comme non lu ni declencher de rappel par e-mail.
 */
export async function postSystemMessage(
  adminClient: SupabaseClient,
  conversationId: string,
  body: string,
) {
  unwrap(
    await adminClient.from("messages").insert({
      conversation_id: conversationId,
      sender_id: null,
      body,
      kind: "system",
      email_notified_at: new Date().toISOString(),
    }),
  );
}

/** « Selin », « Selin et Alex », « Selin, Alex et Marc ». */
export function joinNames(names: string[]) {
  if (names.length <= 1) return names[0] ?? "";
  return `${names.slice(0, -1).join(", ")} et ${names[names.length - 1]}`;
}
