import { NextResponse } from "next/server";

import { canManageOwner, getAuthorizedDocumentsContext } from "@/app/api/documents/_shared";

type RouteContext = {
  params: Promise<{ id: string }>;
};

type UpdateFolderPayload = {
  name?: unknown;
};

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
