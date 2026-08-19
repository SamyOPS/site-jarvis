import { NextResponse } from "next/server";

import { ApiError, withActor } from "@/lib/api-handler";
import { recordAdminAction, revokeUserSessions } from "@/lib/admin-audit";

type RouteContext = {
  params: Promise<{ id: string }>;
};

/** Meme regle que la modification de son propre mot de passe (`use-password-update`). */
const MIN_PASSWORD_LENGTH = 8;

/**
 * Reinitialisation du mot de passe d'un compte par un administrateur.
 *
 * RESERVEE AU ROLE `admin` : `withActor` refuse tout autre role avant d'executer quoi que
 * ce soit. C'est le seul verrou qui compte — l'interface qui appelle cette route peut etre
 * contournee, pas celle-ci.
 *
 * Le mot de passe n'est jamais journalise, ni renvoye dans la reponse, ni stocke ailleurs
 * que dans Supabase Auth. La reponse ne confirme que l'identite du compte modifie.
 *
 * L'admin ne peut pas changer SON PROPRE mot de passe par ce chemin : il dispose du
 * formulaire de ses parametres, qui exige le mot de passe actuel. Passer par ici
 * contournerait cette verification.
 */
export const POST = withActor<RouteContext>(
  ["admin"],
  async (authorized, context) => {
    const { request, adminClient, user } = authorized;

    const { id } = await context.params;
    const targetUserId = String(id ?? "").trim();
    if (!targetUserId) {
      throw new ApiError("Utilisateur cible invalide.", 400);
    }

    if (targetUserId === user.id) {
      throw new ApiError(
        "Utilise le formulaire de tes parametres pour changer ton propre mot de passe.",
        400,
      );
    }

    const body = (await request.json().catch(() => null)) as { password?: unknown } | null;
    const password = typeof body?.password === "string" ? body.password : "";

    if (password.length < MIN_PASSWORD_LENGTH) {
      throw new ApiError(
        `Le mot de passe doit contenir au moins ${MIN_PASSWORD_LENGTH} caracteres.`,
        400,
      );
    }

    // Le compte doit exister comme PROFIL, pas seulement dans Supabase Auth : c'est la
    // table qui porte le role, et un identifiant hors de cette table n'a rien a faire ici.
    const { data: targetProfile, error: targetError } = await adminClient
      .from("profiles")
      .select("id,email,full_name,role")
      .eq("id", targetUserId)
      .maybeSingle();

    if (targetError) {
      throw new ApiError(targetError.message, 400);
    }
    if (!targetProfile) {
      throw new ApiError("Profil introuvable.", 404);
    }

    /*
     * Un administrateur ne peut pas reinitialiser le mot de passe d'un AUTRE
     * administrateur.
     *
     * Sans cette regle, un seul compte admin compromis permettait de prendre la main sur
     * tous les autres, puis d'en verrouiller les proprietaires legitimes. La reprise d'un
     * compte admin passe desormais par le fournisseur d'identite (« mot de passe oublie »)
     * ou par la console Supabase, hors de portee de l'application.
     */
    if (targetProfile.role === "admin") {
      throw new ApiError(
        "Le mot de passe d'un administrateur ne peut pas etre reinitialise depuis cette page. Utilise la procedure de mot de passe oublie.",
        403,
      );
    }

    const { error: updateError } = await adminClient.auth.admin.updateUserById(targetUserId, {
      password,
    });

    if (updateError) {
      // Message d'origine conserve : Supabase y precise la regle non respectee (longueur,
      // mot de passe compromis...). Il ne contient jamais le mot de passe soumis.
      throw new ApiError(updateError.message, 400);
    }

    /*
     * Revocation des sessions ouvertes.
     *
     * Changer le mot de passe ne deconnecte personne : une session deja etablie reste
     * valide jusqu'a expiration de son jeton. Sur un compte compromis, la reinitialisation
     * seule laisserait donc l'intrus en place.
     *
     * NON BLOQUANT : le mot de passe est deja change, echouer ici ferait croire a
     * l'administrateur que rien n'a eu lieu. On remonte plutot un avertissement explicite,
     * qui lui dit quoi faire.
     */
    const revocation = await revokeUserSessions(targetUserId);

    await recordAdminAction(adminClient, {
      actorId: user.id,
      actorEmail: authorized.profile.email,
      targetId: targetProfile.id,
      targetEmail: targetProfile.email,
      action: "password_reset",
      // Aucun secret : on note QUE le mot de passe a change, jamais lequel.
      details: { sessionsRevoked: !revocation.error },
    });

    return NextResponse.json({
      success: true,
      userId: targetProfile.id,
      email: targetProfile.email,
      sessionsRevoked: !revocation.error,
      warning: revocation.error
        ? "Mot de passe change, mais les sessions ouvertes n'ont pas pu etre revoquees : l'utilisateur peut rester connecte ailleurs."
        : null,
    });
  },
  { missingSession: "Session admin manquante." },
);
