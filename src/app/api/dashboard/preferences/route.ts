import { NextResponse } from "next/server";

import {
  getAccessTokenFromRequest,
  getAuthorizedActor,
  isAuthorizedActorError,
} from "@/lib/server-supabase";

const TABLE_NAME = "user_dashboard_preferences";

function isPreferencesTableMissing(message: string | null | undefined) {
  const normalized = (message ?? "").toLowerCase();
  return normalized.includes(TABLE_NAME);
}

function normalizePreferenceKey(value: unknown) {
  if (typeof value !== "string") return null;
  const key = value.trim();
  if (!key) return null;
  if (key.length > 160) return null;
  return key;
}

function sanitizeVisibleColumns(value: unknown) {
  if (!value || typeof value !== "object") return null;
  const raw = (value as { visibleColumns?: unknown }).visibleColumns;
  if (!Array.isArray(raw)) return null;
  const allowed = new Set(["type", "status", "period", "owner", "createdAt", "size"]);
  const visibleColumns = raw.filter(
    (item): item is string => typeof item === "string" && allowed.has(item),
  );
  if (!visibleColumns.length) return null;
  return { visibleColumns };
}

export async function GET(request: Request) {
  try {
    const accessToken = getAccessTokenFromRequest(request);
    if (!accessToken) {
      return NextResponse.json({ error: "Session manquante." }, { status: 401 });
    }

    const authorized = await getAuthorizedActor(accessToken, ["salarie", "rh", "admin"]);
    if (isAuthorizedActorError(authorized)) {
      return NextResponse.json({ error: authorized.error }, { status: authorized.status });
    }

    const url = new URL(request.url);
    const key = normalizePreferenceKey(url.searchParams.get("key"));
    if (!key) {
      return NextResponse.json({ error: "Cle de preference invalide." }, { status: 400 });
    }

    const { adminClient, profile } = authorized;
    const { data, error } = await adminClient
      .from(TABLE_NAME)
      .select("value")
      .eq("user_id", profile.id)
      .eq("preference_key", key)
      .maybeSingle();

    if (error && isPreferencesTableMissing(error.message)) {
      return NextResponse.json({ value: null, backend: "missing_table" });
    }
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ value: sanitizeVisibleColumns(data?.value) });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erreur serveur." },
      { status: 500 },
    );
  }
}

export async function PUT(request: Request) {
  try {
    const accessToken = getAccessTokenFromRequest(request);
    if (!accessToken) {
      return NextResponse.json({ error: "Session manquante." }, { status: 401 });
    }

    const authorized = await getAuthorizedActor(accessToken, ["salarie", "rh", "admin"]);
    if (isAuthorizedActorError(authorized)) {
      return NextResponse.json({ error: authorized.error }, { status: authorized.status });
    }

    const payload = (await request.json().catch(() => null)) as
      | { key?: unknown; value?: unknown }
      | null;
    const key = normalizePreferenceKey(payload?.key);
    const value = sanitizeVisibleColumns(payload?.value);
    if (!key || !value) {
      return NextResponse.json({ error: "Payload de preference invalide." }, { status: 400 });
    }

    const { adminClient, profile } = authorized;
    const { error } = await adminClient.from(TABLE_NAME).upsert(
      {
        user_id: profile.id,
        preference_key: key,
        value,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,preference_key" },
    );

    if (error && isPreferencesTableMissing(error.message)) {
      return NextResponse.json({ saved: false, backend: "missing_table" });
    }
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ saved: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erreur serveur." },
      { status: 500 },
    );
  }
}
