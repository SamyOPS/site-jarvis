import { NextResponse } from "next/server";

import { canManageOwner, getAuthorizedDocumentsContext } from "@/app/api/documents/_shared";

type RouteContext = {
  params: Promise<{ id: string }>;
};

type UpdateFolderPayload = {
  name?: unknown;
};

type FolderNode = {
  id: string;
  parent_id: string | null;
};

function collectSubtreeFolderIds(folderId: string, folders: FolderNode[]) {
  const childrenByParent = new Map<string, string[]>();
  for (const folder of folders) {
    const parentId = folder.parent_id ?? "__root__";
    const children = childrenByParent.get(parentId) ?? [];
    children.push(folder.id);
    childrenByParent.set(parentId, children);
  }

  const visited = new Set<string>();
  const queue = [folderId];
  while (queue.length) {
    const current = queue.shift();
    if (!current || visited.has(current)) continue;
    visited.add(current);
    const children = childrenByParent.get(current) ?? [];
    for (const childId of children) {
      queue.push(childId);
    }
  }

  return Array.from(visited);
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const auth = await getAuthorizedDocumentsContext(request);
    if (auth instanceof NextResponse) return auth;

    const { id } = await context.params;
    const folderId = String(id ?? "").trim();
    const payload = (await request.json().catch(() => null)) as UpdateFolderPayload | null;
    const name = String(payload?.name ?? "").trim();

    if (!folderId || !name) {
      return NextResponse.json({ error: "id et name sont requis." }, { status: 400 });
    }

    const { data: folder, error: folderError } = await auth.adminClient
      .from("document_folders")
      .select("id,owner_user_id")
      .eq("id", folderId)
      .is("deleted_at", null)
      .single();
    if (folderError || !folder) {
      return NextResponse.json(
        { error: folderError?.message ?? "Dossier introuvable." },
        { status: 404 },
      );
    }

    const allowed = await canManageOwner(auth, folder.owner_user_id);
    if (!allowed) {
      return NextResponse.json({ error: "Acces refuse." }, { status: 403 });
    }

    const { data, error } = await auth.adminClient
      .from("document_folders")
      .update({
        name,
        updated_by: auth.actorId,
      })
      .eq("id", folderId)
      .select("id,owner_user_id,name,parent_id,created_at,updated_at")
      .single();
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ item: data });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erreur serveur." },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  try {
    const auth = await getAuthorizedDocumentsContext(request);
    if (auth instanceof NextResponse) return auth;

    const { id } = await context.params;
    const folderId = String(id ?? "").trim();
    if (!folderId) {
      return NextResponse.json({ error: "id requis." }, { status: 400 });
    }

    const { data: folder, error: folderError } = await auth.adminClient
      .from("document_folders")
      .select("id,owner_user_id")
      .eq("id", folderId)
      .single();
    if (folderError || !folder) {
      return NextResponse.json(
        { error: folderError?.message ?? "Dossier introuvable." },
        { status: 404 },
      );
    }

    const allowed = await canManageOwner(auth, folder.owner_user_id);
    if (!allowed) {
      return NextResponse.json({ error: "Acces refuse." }, { status: 403 });
    }

    const { data: ownerFolders, error: ownerFoldersError } = await auth.adminClient
      .from("document_folders")
      .select("id,parent_id")
      .eq("owner_user_id", folder.owner_user_id);
    if (ownerFoldersError) {
      return NextResponse.json({ error: ownerFoldersError.message }, { status: 400 });
    }

    const subtreeFolderIds = collectSubtreeFolderIds(folderId, (ownerFolders ?? []) as FolderNode[]);
    if (subtreeFolderIds.length) {
      const now = new Date().toISOString();
      const { error: moveForeignDocsError } = await auth.adminClient
        .from("employee_documents")
        .update({ folder_id: null, updated_at: now })
        .in("folder_id", subtreeFolderIds)
        .neq("employee_id", folder.owner_user_id)
        .is("deleted_at", null);
      if (moveForeignDocsError) {
        return NextResponse.json({ error: moveForeignDocsError.message }, { status: 400 });
      }
    }

    const { data, error } = await auth.adminClient.rpc("soft_delete_document_folder", {
      p_actor_user_id: auth.actorId,
      p_folder_id: folderId,
    });
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ affected: data ?? 0 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erreur serveur." },
      { status: 500 },
    );
  }
}
