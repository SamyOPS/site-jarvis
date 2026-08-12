import { NextResponse } from "next/server";

import { getAccessTokenFromRequest, getServerSupabaseClients } from "@/lib/server-supabase";

export const runtime = "nodejs";

/**
 * Roles qu'un visiteur peut demander en s'inscrivant. `admin` en est volontairement absent :
 * il ne s'obtient que depuis la page d'administration.
 *
 * Les comptes autres que « candidate » sont crees en `pending` : `getAuthorizedActor` exige
 * `professional_status === "verified"` pour toute route metier, donc un compte auto-declare
 * RH ou salarie n'a acces a rien tant qu'un administrateur ne l'a pas valide.
 */
const SELF_SERVICE_ROLES = ["candidate", "professional", "salarie", "rh"] as const;
type SelfServiceRole = (typeof SELF_SERVICE_ROLES)[number];

function isSelfServiceRole(value: unknown): value is SelfServiceRole {
  return SELF_SERVICE_ROLES.includes(value as SelfServiceRole);
}

type BootstrapPayload = {
  accountKind?: unknown;
  fullName?: unknown;
  companyName?: unknown;
};

function boundedText(value: unknown, maxLength: number) {
  const text = String(value ?? "").trim();
  if (!text) return null;
  return text.slice(0, maxLength);
}

/**
 * Cree la ligne `profiles` d'un compte fraichement inscrit.
 *
 * Cette creation se faisait depuis le navigateur, avec un `role` choisi dans le formulaire et
 * repris tel quel — un appel direct pouvait donc demander `role: "admin"`, et `admin` est le
 * seul role que `getAuthorizedActor` dispense de verification. Le rang est desormais decide
 * ici, a partir d'une liste fermee.
 *
 * `user_metadata` n'est jamais consulte : son contenu est modifiable par l'utilisateur
 * lui-meme via `auth.updateUser`, il ne peut donc pas servir a determiner un rang.
 *
 * Un profil existant n'est jamais re-privilegie : seuls les champs de contact encore vides
 * sont completes.
 */
export async function POST(request: Request) {
  try {
    const accessToken = getAccessTokenFromRequest(request);
    if (!accessToken) {
      return NextResponse.json({ error: "Session manquante." }, { status: 401 });
    }

    const { authClient, adminClient } = getServerSupabaseClients();
    const {
      data: { user },
      error: authError,
    } = await authClient.auth.getUser(accessToken);

    if (authError || !user) {
      return NextResponse.json({ error: "Utilisateur non authentifie." }, { status: 401 });
    }

    const payload = (await request.json().catch(() => null)) as BootstrapPayload | null;
    const requestedRole = isSelfServiceRole(payload?.accountKind)
      ? payload.accountKind
      : "candidate";
    const fullName = boundedText(payload?.fullName, 120);
    const companyName = boundedText(payload?.companyName, 120);

    const { data: existingProfile, error: existingError } = await adminClient
      .from("profiles")
      .select("id,email,role,professional_status,full_name,company_name")
      .eq("id", user.id)
      .maybeSingle();

    if (existingError) {
      return NextResponse.json({ error: existingError.message }, { status: 400 });
    }

    if (existingProfile) {
      // Le rang et le statut de verification restent ceux deja enregistres.
      const contactPatch: Record<string, string> = {};
      if (!existingProfile.full_name && fullName) contactPatch.full_name = fullName;
      if (!existingProfile.company_name && companyName) contactPatch.company_name = companyName;

      if (Object.keys(contactPatch).length) {
        const { error: patchError } = await adminClient
          .from("profiles")
          .update(contactPatch)
          .eq("id", user.id);
        if (patchError) {
          return NextResponse.json({ error: patchError.message }, { status: 400 });
        }
      }

      return NextResponse.json({
        profile: {
          id: existingProfile.id,
          role: existingProfile.role,
          professional_status: existingProfile.professional_status,
        },
        created: false,
      });
    }

    const professionalStatus = requestedRole === "candidate" ? "none" : "pending";
    const { data: insertedProfile, error: insertError } = await adminClient
      .from("profiles")
      .insert({
        id: user.id,
        email: user.email,
        full_name: fullName,
        company_name: companyName,
        role: requestedRole,
        professional_status: professionalStatus,
      })
      .select("id,role,professional_status")
      .single();

    if (insertError || !insertedProfile) {
      return NextResponse.json(
        { error: insertError?.message ?? "Creation du profil impossible." },
        { status: 400 },
      );
    }

    return NextResponse.json({ profile: insertedProfile, created: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erreur serveur." },
      { status: 500 },
    );
  }
}
