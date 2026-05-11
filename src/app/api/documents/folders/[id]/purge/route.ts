import { NextResponse } from "next/server";

import { canManageOwner, getAuthorizedDocumentsContext } from "@/app/api/documents/_shared";

type RouteContext = {
  params: Promise<{ id: string }>;
};

type FolderNode = {
  id: string;
  parent_id: string | null;
};

function chunkArray<T>(items: T[], size: number) {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}

function collectSubtree(folderId: string, folders: FolderNode[]) {
  const childrenByParent = new Map<string, string[]>();
  for (const folder of folders) {
    const parentId = folder.parent_id ?? "__root__";
    const list = childrenByParent.get(parentId) ?? [];
    list.push(folder.id);
    childrenByParent.set(parentId, list);
  }

  const depths = new Map<string, number>();
  const stack: Array<{ id: string; depth: number }> = [{ id: folderId, depth: 0 }];
  while (stack.length) {
    const current = stack.pop();
    if (!current) continue;
    if (depths.has(current.id)) continue;
    depths.set(current.id, current.depth);
    const children = childrenByParent.get(current.id) ?? [];
    for (const childId of children) {
      stack.push({ id: childId, depth: current.depth + 1 });
    }
  }

  return Array.from(depths.entries())
    .sort((left, right) => right[1] - left[1])
    .map(([id]) => id);
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
      .select("id,owner_user_id,deleted_at")
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
    if (!folder.deleted_at) {
      return NextResponse.json(
        { error: "Le dossier doit etre dans la corbeille avant suppression definitive." },
        { status: 400 },
      );
    }

    const { data: allFolders, error: allFoldersError } = await auth.adminClient
      .from("document_folders")
      .select("id,parent_id")
      .eq("owner_user_id", folder.owner_user_id);
    if (allFoldersError) {
      return NextResponse.json({ error: allFoldersError.message }, { status: 400 });
    }

    const subtreeFolderIds = collectSubtree(folderId, (allFolders ?? []) as FolderNode[]);
    if (!subtreeFolderIds.length) {
      return NextResponse.json({ error: "Sous-arbre dossier introuvable." }, { status: 400 });
    }

    const { data: docs, error: docsError } = await auth.adminClient
      .from("employee_documents")
      .select("id,storage_bucket,storage_path")
      .in("folder_id", subtreeFolderIds);
    if (docsError) {
      return NextResponse.json({ error: docsError.message }, { status: 400 });
    }

    const documentIds = (docs ?? []).map((row: { id: string }) => row.id);
    if (documentIds.length) {
      for (const idsChunk of chunkArray(documentIds, 500)) {
        const { error: eventsDeleteError } = await auth.adminClient
          .from("document_events")
          .delete()
          .in("document_id", idsChunk);
        if (eventsDeleteError) {
          return NextResponse.json({ error: eventsDeleteError.message }, { status: 400 });
        }
      }

      // Casser le lien cra_records.employee_document_id avant de hard-delete les documents.
      const nowIso = new Date().toISOString();
      for (const idsChunk of chunkArray(documentIds, 500)) {
        const { error: craUnlinkError } = await auth.adminClient
          .from("cra_records")
          .update({ status: "draft", employee_document_id: null, updated_at: nowIso })
          .in("employee_document_id", idsChunk);
        if (craUnlinkError) {
          return NextResponse.json({ error: craUnlinkError.message }, { status: 400 });
        }
      }

      for (const idsChunk of chunkArray(documentIds, 500)) {
        const { error: documentsDeleteError } = await auth.adminClient
          .from("employee_documents")
          .delete()
          .in("id", idsChunk);
        if (documentsDeleteError) {
          return NextResponse.json({ error: documentsDeleteError.message }, { status: 400 });
        }
      }
    }

    for (const folderIdsChunk of chunkArray(subtreeFolderIds, 500)) {
      const { error: foldersDeleteError } = await auth.adminClient
        .from("document_folders")
        .delete()
        .in("id", folderIdsChunk);
      if (foldersDeleteError) {
        return NextResponse.json({ error: foldersDeleteError.message }, { status: 400 });
      }
    }

    const storagePathsByBucket = new Map<string, string[]>();
    for (const row of docs ?? []) {
      const bucket = String((row as { storage_bucket?: string | null }).storage_bucket ?? "employee-documents");
      const path = String((row as { storage_path?: string | null }).storage_path ?? "");
      if (!path) continue;
      const list = storagePathsByBucket.get(bucket) ?? [];
      list.push(path);
      storagePathsByBucket.set(bucket, list);
    }

    for (const [bucket, paths] of storagePathsByBucket.entries()) {
      for (const pathChunk of chunkArray(paths, 100)) {
        await auth.adminClient.storage.from(bucket).remove(pathChunk);
      }
    }

    return NextResponse.json({
      success: true,
      deletedFolders: subtreeFolderIds.length,
      deletedDocuments: documentIds.length,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erreur serveur." },
      { status: 500 },
    );
  }
}

