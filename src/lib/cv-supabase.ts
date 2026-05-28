import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let cachedClient: SupabaseClient | null = null;

export function getCvSupabaseClient(): SupabaseClient {
  if (cachedClient) return cachedClient;

  const url = process.env.SUPABASE_CV_URL;
  const serviceKey = process.env.SUPABASE_CV_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error("Variables SUPABASE_CV_URL / SUPABASE_CV_SERVICE_ROLE_KEY manquantes.");
  }

  cachedClient = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  return cachedClient;
}
