import { NextResponse } from "next/server";

import { ApiError, withActor } from "@/lib/api-handler";
import { assertRhAccess } from "@/lib/rh-access";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

/** Statuts depuis lesquels une demande peut encore etre annulee. */
const CANCELLABLE = ["pending", "uploaded", "rejected", "expired"];

/**
 * Annulation d'une demande documentaire.
 *
 * Passe par le serveur parce que `document_requests` n'a qu'une policy de lecture : un
 * `update` depuis le navigateur ne touche aucune ligne et ne renvoie pourtant aucune
 * erreur, si bien que l'ecran annoncait l'annulation sans qu'elle soit enregistree.
 */
export const POST = withActor<RouteContext>(
  ["rh", "admin"],
  async ({ adminClient, profile: actorProfile }, context) => {
    const { id } = await context.params;
    const requestId = String(id ?? "").trim();
    if (!requestId) {
      throw new ApiError("Demande introuvable.", 400);
    }

    const { data: existing, error: loadError } = await adminClient
      .from("document_requests")
      .select("id,employee_id,document_type_id,status")
      .eq("id", requestId)
      .maybeSingle();

    if (loadError) throw new ApiError(loadError.message, 400);
    if (!existing) throw new ApiError("Demande introuvable.", 404);

    await assertRhAccess(
      adminClient,
      { id: actorProfile.id, role: actorProfile.role },
      existing.employee_id,
      existing.document_type_id,
    );

    if (!CANCELLABLE.includes(existing.status)) {
      throw new ApiError("Cette demande ne peut plus etre annulee.", 409);
    }

    // Le filtre sur le statut couvre le cas ou le collaborateur repond entre la lecture
    // et l'ecriture : sa reponse l'emporte, l'annulation echoue proprement.
    const { data: updated, error: updateError } = await adminClient
      .from("document_requests")
      .update({ status: "cancelled", updated_at: new Date().toISOString() })
      .eq("id", requestId)
      .in("status", CANCELLABLE)
      .select("id");

    if (updateError) throw new ApiError(updateError.message, 400);
    if (!updated?.length) {
      throw new ApiError("Cette demande ne peut plus etre annulee.", 409);
    }

    return NextResponse.json({ success: true });
  },
  { missingSession: "Session RH manquante." },
);
