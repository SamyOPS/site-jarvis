import { NextResponse } from "next/server";

import { ApiError, unwrap, withActor } from "@/lib/api-handler";
import {
  ACCOUNT_ROLES,
  PROFILE_LIMITS,
  type AccountProfile,
} from "@/domain/account-settings";
import { avatarPublicUrl } from "@/lib/avatars";

export const runtime = "nodejs";

const SESSION = { missingSession: "Session manquante." };

const PROFILE_COLUMNS = "id,email,full_name,phone,role,avatar_url";
/** Meme selection, sans la photo : voir `readProfile`. */
const PROFILE_COLUMNS_WITHOUT_AVATAR = "id,email,full_name,phone,role";

/**
 * La colonne `avatar_url` est OPTIONNELLE.
 *
 * Elle arrive avec la migration des parametres du compte. Tant que celle-ci n'est pas
 * appliquee, la demander ferait echouer toute la page de parametres pour une
 * fonctionnalite accessoire. On retombe donc sur une selection sans photo — meme parti
 * que la table de preferences, elle aussi optionnelle.
 */
function isAvatarColumnMissing(message: string | null | undefined) {
  return (message ?? "").toLowerCase().includes("avatar_url");
}

async function readProfile(
  adminClient: Parameters<typeof avatarPublicUrl>[0],
  userId: string,
): Promise<ProfileRow> {
  const first = await adminClient
    .from("profiles")
    .select(PROFILE_COLUMNS)
    .eq("id", userId)
    .single();

  if (!first.error) return first.data as ProfileRow;
  if (!isAvatarColumnMissing(first.error.message)) {
    throw new ApiError(first.error.message, 400);
  }

  const fallback = unwrap(
    await adminClient
      .from("profiles")
      .select(PROFILE_COLUMNS_WITHOUT_AVATAR)
      .eq("id", userId)
      .single(),
  ) as Omit<ProfileRow, "avatar_url">;

  return { ...fallback, avatar_url: null };
}

type ProfileRow = {
  id: string;
  email: string;
  full_name: string | null;
  phone: string | null;
  role: string | null;
  avatar_url: string | null;
};

function toAccountProfile(row: ProfileRow, avatarUrl: string | null): AccountProfile {
  return {
    id: row.id,
    email: row.email,
    fullName: row.full_name,
    phone: row.phone,
    role: row.role,
    avatarPath: row.avatar_url,
    avatarUrl,
  };
}

/**
 * Profil de l'utilisateur courant, et sa derniere connexion.
 *
 * La date vient du jeton d'authentification (`last_sign_in_at`), pas d'une table : c'est
 * Supabase qui la tient, et la recopier ailleurs creerait deux verites.
 */
export const GET = withActor([...ACCOUNT_ROLES], async ({ adminClient, profile, user }) => {
  const row = await readProfile(adminClient, profile.id);

  return NextResponse.json({
    profile: toAccountProfile(row, avatarPublicUrl(adminClient, row.avatar_url)),
    lastSignInAt: user.last_sign_in_at ?? null,
  });
}, SESSION);

/**
 * Met a jour les champs que l'utilisateur possede.
 *
 * `role` et `professional_status` n'y figurent PAS : ils sont verrouilles par un
 * declencheur en base, et les accepter ici donnerait l'illusion qu'ils sont modifiables.
 * L'adresse e-mail non plus — elle appartient a l'authentification et se change depuis le
 * navigateur, avec le message de confirmation que Supabase envoie a la nouvelle adresse.
 */
export const PATCH = withActor([...ACCOUNT_ROLES], async ({ adminClient, profile, request }) => {
  const body = (await request.json().catch(() => null)) as {
    fullName?: unknown;
    phone?: unknown;
  } | null;

  const update: { full_name?: string | null; phone?: string | null } = {};

  if (body?.fullName !== undefined) {
    if (typeof body.fullName !== "string") throw new ApiError("Nom invalide.", 400);
    const fullName = body.fullName.trim();
    if (!fullName) throw new ApiError("Le nom ne peut pas être vide.", 400);
    if (fullName.length > PROFILE_LIMITS.fullName) {
      throw new ApiError(`Nom trop long (${PROFILE_LIMITS.fullName} caractères maximum).`, 400);
    }
    update.full_name = fullName;
  }

  if (body?.phone !== undefined) {
    if (body.phone !== null && typeof body.phone !== "string") {
      throw new ApiError("Téléphone invalide.", 400);
    }
    const phone = (body.phone ?? "").trim();
    if (phone.length > PROFILE_LIMITS.phone) {
      throw new ApiError(`Téléphone trop long (${PROFILE_LIMITS.phone} caractères maximum).`, 400);
    }
    // Chaine vide = effacement : la colonne accepte NULL, et un champ vide en base se
    // relit mal partout ailleurs.
    update.phone = phone || null;
  }

  if (!Object.keys(update).length) {
    throw new ApiError("Aucune modification.", 400);
  }

  unwrap(await adminClient.from("profiles").update(update).eq("id", profile.id));
  const row = await readProfile(adminClient, profile.id);

  return NextResponse.json({
    profile: toAccountProfile(row, avatarPublicUrl(adminClient, row.avatar_url)),
  });
}, SESSION);
