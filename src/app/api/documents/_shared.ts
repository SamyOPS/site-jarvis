import { NextResponse } from "next/server";

import { canRhAccessEmployee, RH_ASSIGNMENTS_UNAVAILABLE } from "@/lib/rh-access";
import {
  getAccessTokenFromRequest,
  getAuthorizedActor,
  isAuthorizedActorError,
} from "@/lib/server-supabase";

type AuthorizedContext = {
  adminClient: any;
  actorId: string;
  actorRole: string | null;
};

/** Longueur maximale d'un nom de dossier : les routes n'imposaient aucune borne. */
export const MAX_FOLDER_NAME_LENGTH = 120;

export async function getAuthorizedDocumentsContext(request: Request) {
  const accessToken = getAccessTokenFromRequest(request);
  if (!accessToken) {
    return NextResponse.json({ error: "Session manquante." }, { status: 401 });
  }

  const authorized = await getAuthorizedActor(accessToken, ["salarie", "rh", "admin"]);
  if (isAuthorizedActorError(authorized)) {
    return NextResponse.json({ error: authorized.error }, { status: authorized.status });
  }

  const context: AuthorizedContext = {
    adminClient: authorized.adminClient,
    actorId: authorized.user.id,
    actorRole: authorized.profile.role,
  };
  return context;
}

/**
 * L'acteur peut-il agir sur les documents et dossiers de `ownerUserId` ?
 *
 * Delegue a `canRhAccessEmployee`, qui est la seule implementation du controle
 * d'affectation. La copie qui vivait ici ne selectionnait pas `allowed_document_type_ids`
 * et ignorait donc la restriction par type : elle et sa jumelle avaient deja diverge.
 *
 * `documentTypeId` reste optionnel car les appelants historiques sont des operations sur
 * des DOSSIERS, qui ne portent aucun type. Le passer quand il existe est ce qui evite de
 * recreer le trou : un RH restreint a certains types pour un collaborateur ne doit pas
 * pouvoir le contourner par ce chemin.
 */
export async function canManageOwner(
  context: AuthorizedContext,
  ownerUserId: string,
  documentTypeId?: string,
) {
  // Garde conservee avant la delegation : `canRhAccessEmployee` traite un identifiant vide
  // comme « pas de cible, donc autorise », ce qui serait ici une autorisation par defaut.
  if (!ownerUserId) return false;
  if (context.actorRole === "admin") return true;
  if (context.actorId === ownerUserId) return true;
  if (context.actorRole !== "rh") return false;

  const access = await canRhAccessEmployee(
    context.adminClient,
    context.actorId,
    ownerUserId,
    documentTypeId,
  );
  if (access.allowed) return true;

  // Table absente : refus silencieux, comme avant. Toute autre erreur SQL remonte en 500
  // plutot que de se deguiser en « acces refuse ».
  if (access.error && access.error !== RH_ASSIGNMENTS_UNAVAILABLE) {
    throw new Error(access.error);
  }
  return false;
}

export type FolderNode = { id: string; parent_id: string | null };

/**
 * Identifiants d'un dossier et de toute sa descendance.
 *
 * Deux parcours concurrents coexistaient : un BFS dans la route de modification, un DFS
 * trie par profondeur dans la purge. L'ecart n'etait pas gratuit — la purge supprime les
 * dossiers par lots, et supprimer un parent avant ses enfants viole la contrainte
 * `parent_id`. D'ou `deepestFirst`, qui rend cet ordre explicite au lieu de le cacher dans
 * le choix d'une pile plutot que d'une file.
 */
export function collectSubtreeFolderIds(
  rootId: string,
  folders: FolderNode[],
  options?: { deepestFirst?: boolean },
) {
  const childrenByParent = new Map<string, string[]>();
  for (const folder of folders) {
    const parentId = folder.parent_id ?? "__root__";
    const children = childrenByParent.get(parentId) ?? [];
    children.push(folder.id);
    childrenByParent.set(parentId, children);
  }

  const depthById = new Map<string, number>();
  const stack: Array<{ id: string; depth: number }> = [{ id: rootId, depth: 0 }];
  while (stack.length) {
    const current = stack.pop();
    if (!current || depthById.has(current.id)) continue;
    depthById.set(current.id, current.depth);
    for (const childId of childrenByParent.get(current.id) ?? []) {
      stack.push({ id: childId, depth: current.depth + 1 });
    }
  }

  const entries = Array.from(depthById.entries());
  if (options?.deepestFirst) {
    entries.sort((left, right) => right[1] - left[1]);
  }
  return entries.map(([id]) => id);
}
