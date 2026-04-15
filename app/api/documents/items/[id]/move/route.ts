import { NextResponse } from "next/server";

import { canManageOwner, getAuthorizedDocumentsContext } from "@/app/api/documents/_shared";

type RouteContext = {
  params: Promise<{ id: string }>;
};

type MoveItemPayload = {
  ownerUserId?: unknown;
  folderId?: unknown;
};

export async function POST(request: Request, context: RouteContext) {
  try {
    const auth = await getAuthorizedDocumentsContext(request);
    if (auth instanceof NextResponse) return auth;

    const { id } = await context.params;
    const documentId = String(id ?? "").trim();
    const payload = (await request.json().catch(() => null)) as MoveItemPayload | null;
    const ownerUserId = String(payload?.ownerUserId ?? "").trim();
    const folderIdRaw = String(payload?.folderId ?? "").trim();
    const folderId = folderIdRaw ? folderIdRaw : null;

    if (!documentId || !ownerUserId) {
      return NextResponse.json(
        { error: "id et ownerUserId sont requis." },
        { status: 400 },
      );
    }

    const allowed = await canManageOwner(auth, ownerUserId);
    if (!allowed) {
      return NextResponse.json({ error: "Acces refuse." }, { status: 403 });
    }

    if (folderId) {
      const { data: folder, error: folderError } = await auth.adminClient
        .from("document_folders")
        .select("id,owner_user_id")
        .eq("id", folderId)
        .is("deleted_at", null)
        .single();
      if (folderError || !folder || folder.owner_user_id !== ownerUserId) {
        return NextResponse.json({ error: "Dossier cible invalide." }, { status: 400 });
      }
    }

    const { data: employeeDocument, error: employeeDocumentError } = await auth.adminClient
      .from("employee_documents")
      .select("id,employee_id,uploader_role,uploaded_by,deleted_at")
      .eq("id", documentId)
      .maybeSingle();

    if (employeeDocumentError) {
      return NextResponse.json({ error: employeeDocumentError.message }, { status: 400 });
    }

    if (employeeDocument) {
      if (employeeDocument.deleted_at) {
        return NextResponse.json({ error: "Document place dans la corbeille." }, { status: 400 });
      }

      const ownsDocument = employeeDocument.employee_id === ownerUserId;
      const isRhOwnDocumentMove =
        employeeDocument.uploader_role === "rh" &&
        employeeDocument.uploaded_by === auth.actorId &&
        ownerUserId === auth.actorId;

      if (!ownsDocument && !isRhOwnDocumentMove && auth.actorRole !== "admin") {
        return NextResponse.json({ error: "Acces refuse." }, { status: 403 });
      }

      const employeeUpdate = await auth.adminClient
        .from("employee_documents")
        .update({ folder_id: folderId })
        .eq("id", documentId)
        .select("id,folder_id")
        .maybeSingle();

      if (employeeUpdate.error) {
        return NextResponse.json({ error: employeeUpdate.error.message }, { status: 400 });
      }
      if (!employeeUpdate.data) {
        return NextResponse.json({ error: "Document introuvable." }, { status: 404 });
      }

      return NextResponse.json({ item: employeeUpdate.data, source: "employee_documents" });
    }

    const userUpdate = await auth.adminClient
      .from("user_documents")
      .update({ folder_id: folderId })
      .eq("id", documentId)
      .eq("owner_user_id", ownerUserId)
      .select("id,folder_id")
      .maybeSingle();

    if (userUpdate.error) {
      return NextResponse.json(
        {
          error: userUpdate.error.message ?? "Mouvement du document impossible.",
        },
        { status: 400 },
      );
    }
    if (!userUpdate.data) {
      return NextResponse.json({ error: "Document introuvable." }, { status: 404 });
    }

    return NextResponse.json({ item: userUpdate.data, source: "user_documents" });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erreur serveur." },
      { status: 500 },
    );
  }
}
