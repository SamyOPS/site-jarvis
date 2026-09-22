import type { SupabaseClient } from "@supabase/supabase-js";

import { ApiError } from "@/lib/api-handler";
import { displayContactName, type MessagingContact } from "@/domain/messaging";

/**
 * Qui a le droit d'ecrire a qui.
 *
 * La regle suit les affectations RH deja en place plutot que d'introduire un second
 * annuaire a administrer :
 *
 *   - un admin ouvre une conversation avec n'importe qui ;
 *   - un RH ouvre avec les collaborateurs qui lui sont affectes, et avec les autres RH ;
 *   - un consultant ouvre avec les RH qui le suivent.
 *
 * Le controle ne porte que sur l'OUVERTURE d'une conversation, jamais sur l'envoi d'un
 * message dans une conversation existante. Sans cette distinction, un admin pourrait
 * ecrire a un consultant qui n'aurait pas le droit de lui repondre — une conversation a
 * sens unique, ce qui n'est pas une conversation. Une fois le fil ouvert, participer
 * suffit.
 *
 * Consequence a assumer : si l'affectation d'un RH est retiree, les conversations deja
 * ouvertes restent lisibles et actives des deux cotes. Les fermer supposerait de decider
 * ce qu'il advient de l'historique, ce qui est une decision produit et non technique.
 */

type Actor = { id: string; role: string | null };

type ProfileRow = {
  id: string;
  full_name: string | null;
  email: string;
  role: string | null;
  professional_status: string | null;
};

const CONTACT_COLUMNS = "id,full_name,email,role,professional_status";

function toContact(row: ProfileRow): MessagingContact {
  return {
    id: row.id,
    name: displayContactName(row),
    email: row.email,
    role: row.role,
  };
}

/**
 * Un compte non verifie n'a pas acces a sa console (voir `getAuthorizedActor`) : lui
 * ecrire reviendrait a deposer un message que personne ne lira. Les admins echappent a
 * cette verification, comme partout ailleurs.
 */
function isReachable(row: ProfileRow) {
  return row.role === "admin" || row.professional_status === "verified";
}

/** Identifiants des collaborateurs affectes a un RH. */
async function assignedEmployeeIds(adminClient: SupabaseClient, rhId: string) {
  const { data, error } = await adminClient
    .from("rh_employee_assignments")
    .select("employee_id")
    .eq("rh_id", rhId);

  // Table absente : le controle est indisponible, on ne propose personne plutot que
  // d'ouvrir l'annuaire en grand. Meme parti que `listAssignedEmployeeIds`.
  if (error) return [];

  return Array.from(
    new Set(
      (data ?? [])
        .map((row: { employee_id: string | null }) => row.employee_id)
        .filter((value: string | null): value is string => Boolean(value)),
    ),
  );
}

/** Identifiants des RH auxquels un collaborateur est affecte. */
async function assignedRhIds(adminClient: SupabaseClient, employeeId: string) {
  const { data, error } = await adminClient
    .from("rh_employee_assignments")
    .select("rh_id")
    .eq("employee_id", employeeId);

  if (error) return [];

  return Array.from(
    new Set(
      (data ?? [])
        .map((row: { rh_id: string | null }) => row.rh_id)
        .filter((value: string | null): value is string => Boolean(value)),
    ),
  );
}

/**
 * Annuaire de l'utilisateur courant : tous ceux a qui il peut ouvrir une conversation.
 *
 * Rendu trie par nom. C'est la MEME source de verite que `assertCanStartConversation` —
 * ce qui n'apparait pas dans cette liste est refuse par le controle, et inversement.
 */
export async function listMessagingContacts(
  adminClient: SupabaseClient,
  actor: Actor,
): Promise<MessagingContact[]> {
  let rows: ProfileRow[] = [];

  if (actor.role === "admin") {
    const { data, error } = await adminClient
      .from("profiles")
      .select(CONTACT_COLUMNS)
      .in("role", ["rh", "salarie", "admin"])
      .neq("id", actor.id);
    if (error) throw new ApiError(error.message, 400);
    rows = (data ?? []) as ProfileRow[];
  } else if (actor.role === "rh") {
    const employeeIds = await assignedEmployeeIds(adminClient, actor.id);

    // Les autres RH, plus les collaborateurs affectes. Deux requetes plutot qu'un `or`
    // PostgREST : la condition melange un filtre sur le role et un filtre sur une liste
    // d'identifiants, et la forme `or=(...)` deviendrait illisible pour la relire.
    const { data: peers, error: peersError } = await adminClient
      .from("profiles")
      .select(CONTACT_COLUMNS)
      .eq("role", "rh")
      .neq("id", actor.id);
    if (peersError) throw new ApiError(peersError.message, 400);

    let employees: ProfileRow[] = [];
    if (employeeIds.length) {
      const { data, error } = await adminClient
        .from("profiles")
        .select(CONTACT_COLUMNS)
        .in("id", employeeIds);
      if (error) throw new ApiError(error.message, 400);
      employees = (data ?? []) as ProfileRow[];
    }

    rows = [...((peers ?? []) as ProfileRow[]), ...employees];
  } else if (actor.role === "salarie") {
    const rhIds = await assignedRhIds(adminClient, actor.id);
    if (rhIds.length) {
      const { data, error } = await adminClient
        .from("profiles")
        .select(CONTACT_COLUMNS)
        .in("id", rhIds);
      if (error) throw new ApiError(error.message, 400);
      rows = (data ?? []) as ProfileRow[];
    }
  }

  const seen = new Set<string>();
  return rows
    .filter((row) => {
      if (row.id === actor.id || seen.has(row.id) || !isReachable(row)) return false;
      seen.add(row.id);
      return true;
    })
    .map(toContact)
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
  const denied = new ApiError("Destinataire non autorise.", 403);
  if (!target || !isReachable(target)) throw denied;

  if (actor.role === "admin") return toContact(target);

  if (actor.role === "rh") {
    if (target.role === "rh") return toContact(target);
    if (target.role === "salarie") {
      const employeeIds = await assignedEmployeeIds(adminClient, actor.id);
      if (employeeIds.includes(target.id)) return toContact(target);
    }
    throw denied;
  }

  if (actor.role === "salarie") {
    if (target.role === "rh") {
      const rhIds = await assignedRhIds(adminClient, actor.id);
      if (rhIds.includes(target.id)) return toContact(target);
    }
    throw denied;
  }

  throw denied;
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
    .select("conversation_id")
    .eq("conversation_id", conversationId)
    .eq("profile_id", actorId)
    .maybeSingle();
  if (error) throw new ApiError(error.message, 400);
  if (!data) throw new ApiError("Conversation introuvable.", 404);
}
