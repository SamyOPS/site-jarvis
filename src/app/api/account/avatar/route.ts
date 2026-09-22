import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";

import { ApiError, unwrap, withActor } from "@/lib/api-handler";
import { ACCOUNT_ROLES } from "@/domain/account-settings";
import {
  AVATAR_BUCKET,
  AVATAR_MAX_BYTES,
  AVATAR_MIME_TYPES,
  avatarExtension,
  avatarPublicUrl,
} from "@/lib/avatars";

export const runtime = "nodejs";

const SESSION = { missingSession: "Session manquante." };

/** Chemin actuel de la photo, pour pouvoir retirer l'ancien fichier. */
async function currentAvatarPath(
  adminClient: Parameters<typeof avatarPublicUrl>[0],
  userId: string,
) {
  const row = unwrap(
    await adminClient.from("profiles").select("avatar_url").eq("id", userId).single(),
  ) as { avatar_url: string | null };
  return row.avatar_url;
}

/**
 * Envoi d'une photo de profil.
 *
 * Le fichier porte un nom TIRE AU SORT, pas le nom d'origine : deux utilisateurs
 * televersant « photo.jpg » ne doivent pas se marcher dessus, et un nom de fichier venu du
 * poste client n'a pas a se retrouver dans une URL publique. Le dossier reste
 * l'identifiant de l'utilisateur, ce sur quoi s'appuient les regles du bucket.
 */
export const POST = withActor([...ACCOUNT_ROLES], async ({ adminClient, profile, request }) => {
  const form = await request.formData().catch(() => null);
  const file = form?.get("file");

  if (!(file instanceof File)) {
    throw new ApiError("Fichier manquant.", 400);
  }
  if (!AVATAR_MIME_TYPES.includes(file.type as (typeof AVATAR_MIME_TYPES)[number])) {
    throw new ApiError("Format non accepté. Utilisez un JPEG, un PNG ou un WebP.", 400);
  }
  if (file.size > AVATAR_MAX_BYTES) {
    throw new ApiError(
      `Fichier trop lourd (${Math.round(AVATAR_MAX_BYTES / 1024 / 1024)} Mo maximum).`,
      400,
    );
  }

  const previousPath = await currentAvatarPath(adminClient, profile.id);
  const path = `${profile.id}/${randomUUID()}.${avatarExtension(file.type)}`;

  const upload = await adminClient.storage
    .from(AVATAR_BUCKET)
    .upload(path, file, { contentType: file.type, upsert: false });
  if (upload.error) {
    throw new ApiError(upload.error.message, 400);
  }

  const { error: updateError } = await adminClient
    .from("profiles")
    .update({ avatar_url: path })
    .eq("id", profile.id);

  if (updateError) {
    // Le fichier est en place mais le profil ne le designe pas : le laisser ferait un
    // orphelin invisible et definitif dans le bucket.
    await adminClient.storage.from(AVATAR_BUCKET).remove([path]);
    throw new ApiError(updateError.message, 400);
  }

  /*
    L'ancienne photo est retiree APRES la mise a jour du profil. Dans l'autre ordre, un
    echec d'ecriture laisserait le profil pointer vers un fichier qui n'existe plus.
    L'echec de cette suppression, lui, est sans consequence visible : on n'interrompt pas.
  */
  if (previousPath && previousPath !== path) {
    await adminClient.storage.from(AVATAR_BUCKET).remove([previousPath]);
  }

  return NextResponse.json({
    avatarPath: path,
    avatarUrl: avatarPublicUrl(adminClient, path),
  });
}, SESSION);

/** Retire la photo et revient aux initiales. */
export const DELETE = withActor([...ACCOUNT_ROLES], async ({ adminClient, profile }) => {
  const previousPath = await currentAvatarPath(adminClient, profile.id);

  unwrap(
    await adminClient.from("profiles").update({ avatar_url: null }).eq("id", profile.id),
  );

  if (previousPath) {
    await adminClient.storage.from(AVATAR_BUCKET).remove([previousPath]);
  }

  return NextResponse.json({ avatarPath: null, avatarUrl: null });
}, SESSION);
