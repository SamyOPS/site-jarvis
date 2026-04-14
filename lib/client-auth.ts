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

export async function forceClientSignOut(client: SupabaseClient) {
  await client.auth.signOut({ scope: "global" });
  await client.auth.signOut({ scope: "local" });
  clearSupabaseClientStorage();
}

