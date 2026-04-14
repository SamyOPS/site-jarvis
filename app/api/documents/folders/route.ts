import { NextResponse } from "next/server";

import { canManageOwner, getAuthorizedDocumentsContext } from "@/app/api/documents/_shared";

type CreateFolderPayload = {
  ownerUserId?: unknown;
  name?: unknown;
  parentId?: unknown;
};

export async function GET(request: Request) {
  try {
    const context = await getAuthorizedDocumentsContext(request);
    if (context instanceof NextResponse) return context;

    const url = new URL(request.url);
    const ownerUserId = (url.searchParams.get("ownerUserId") ?? "").trim();
    const parentIdParam = url.searchParams.get("parentId");
    const all = url.searchParams.get("all") === "1";
    const parentId =
      parentIdParam && parentIdParam !== "null" && parentIdParam !== ""
        ? parentIdParam
        : null;

    if (!ownerUserId) {
      return NextResponse.json({ error: "ownerUserId est requis." }, { status: 400 });
    }

    const allowed = await canManageOwner(context, ownerUserId);
    if (!allowed) {
      return NextResponse.json({ error: "Acces refuse." }, { status: 403 });
    }

    let query = context.adminClient
      .from("document_folders")
      .select("id,owner_user_id,name,parent_id,created_at,updated_at")
      .eq("owner_user_id", ownerUserId)
      .is("deleted_at", null)
      .order("name", { ascending: true });

    if (!all) {
      query = parentId ? query.eq("parent_id", parentId) : query.is("parent_id", null);
    }

    const { data, error } = await query;
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ items: data ?? [] });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erreur serveur." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const context = await getAuthorizedDocumentsContext(request);
    if (context instanceof NextResponse) return context;

    const payload = (await request.json().catch(() => null)) as CreateFolderPayload | null;
    const ownerUserId = String(payload?.ownerUserId ?? "").trim();
    const name = String(payload?.name ?? "").trim();
    const parentIdRaw = String(payload?.parentId ?? "").trim();
    const parentId = parentIdRaw ? parentIdRaw : null;

    if (!ownerUserId || !name) {
      return NextResponse.json(
        { error: "ownerUserId et name sont requis." },
        { status: 400 },
      );
    }

    const allowed = await canManageOwner(context, ownerUserId);
    if (!allowed) {
      return NextResponse.json({ error: "Acces refuse." }, { status: 403 });
    }

    const { data, error } = await context.adminClient
      .from("document_folders")
      .insert({
        owner_user_id: ownerUserId,
        name,
        parent_id: parentId,
        created_by: context.actorId,
        updated_by: context.actorId,
      })
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
