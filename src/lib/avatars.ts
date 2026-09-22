import type { SupabaseClient } from "@supabase/supabase-js";

/** Bucket des photos de profil. Public : voir le commentaire de la migration. */
export const AVATAR_BUCKET = "avatars";

/** Formats acceptes. Liste fermee : un SVG peut porter du script. */
export const AVATAR_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

/** Taille maximale d'un envoi, en octets. */
export const AVATAR_MAX_BYTES = 2 * 1024 * 1024;

const EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export function avatarExtension(mimeType: string) {
  return EXTENSIONS[mimeType] ?? "jpg";
}

/**
 * URL publique d'une photo, reconstituee a la lecture.
 *
 * La base ne stocke que le chemin : une URL complete figerait le domaine du projet
 * Supabase et deviendrait fausse au premier changement d'environnement.
 */
export function avatarPublicUrl(client: SupabaseClient, path: string | null | undefined) {
  if (!path) return null;
  return client.storage.from(AVATAR_BUCKET).getPublicUrl(path).data.publicUrl;
}
