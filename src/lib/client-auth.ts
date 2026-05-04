import type { SupabaseClient } from "@supabase/supabase-js";

function clearSupabaseClientStorage() {
  if (typeof window === "undefined") return;

  const clearStorage = (storage: Storage) => {
    const keysToRemove: string[] = [];
    for (let index = 0; index < storage.length; index += 1) {
      const key = storage.key(index);
      if (!key) continue;
      if (key.startsWith("sb-") && key.includes("-auth-token")) {
        keysToRemove.push(key);
      }
    }
    for (const key of keysToRemove) {
      storage.removeItem(key);
    }
  };

  clearStorage(window.localStorage);
  clearStorage(window.sessionStorage);
}

function isRefreshTokenMissingError(message: string | undefined) {
  const normalized = (message ?? "").toLowerCase();
  return (
    normalized.includes("invalid refresh token") ||
    normalized.includes("refresh token not found")
  );
}

export async function forceClientSignOut(client: SupabaseClient) {
  const globalResult = await client.auth.signOut({ scope: "global" });
  if (globalResult.error && !isRefreshTokenMissingError(globalResult.error.message)) {
    throw globalResult.error;
  }
  const localResult = await client.auth.signOut({ scope: "local" });
  if (localResult.error && !isRefreshTokenMissingError(localResult.error.message)) {
    throw localResult.error;
  }
  clearSupabaseClientStorage();
}

export async function safeGetClientSession(client: SupabaseClient) {
  const { data, error } = await client.auth.getSession();
  if (error && isRefreshTokenMissingError(error.message)) {
    await client.auth.signOut({ scope: "local" });
    clearSupabaseClientStorage();
    return { session: null, error: null };
  }
  return { session: data.session, error };
}
