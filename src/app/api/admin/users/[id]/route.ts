import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";

import { ApiError, withActor } from "@/lib/api-handler";

type RouteContext = {
  params: Promise<{ id: string }>;
};

/** Roles assignables depuis la page admin. Liste fermee, validee cote serveur. */
const ASSIGNABLE_ROLES = ["candidate", "professional", "salarie", "rh", "admin"] as const;
type AssignableRole = (typeof ASSIGNABLE_ROLES)[number];

function isAssignableRole(value: unknown): value is AssignableRole {
  return ASSIGNABLE_ROLES.includes(value as AssignableRole);
}

/**
 * Statuts de verification assignables. C'est le verrou qui separe un compte auto-declare d'un
 * compte reel : `getAuthorizedActor` exige `verified` pour toute route metier. Il etait
 * modifie directement depuis la page admin avec la cle anon.
 */
const ASSIGNABLE_PROFESSIONAL_STATUSES = ["none", "pending", "verified", "rejected"] as const;
type AssignableProfessionalStatus = (typeof ASSIGNABLE_PROFESSIONAL_STATUSES)[number];

function isAssignableProfessionalStatus(
  value: unknown,
): value is AssignableProfessionalStatus {
  return ASSIGNABLE_PROFESSIONAL_STATUSES.includes(value as AssignableProfessionalStatus);
}

const ADMIN_SESSION = { missingSession: "Session admin manquante." };

export const PATCH = withActor<RouteContext>(
  ["admin"],
  async (authorized, context) => {
    const { request } = authorized;

    const { id } = await context.params;
    const targetUserId = String(id ?? "").trim();
    if (!targetUserId) {
      throw new ApiError("Utilisateur cible invalide.", 400);
    }

    const body = (await request.json().catch(() => null)) as {
      role?: unknown;
      professionalStatus?: unknown;
    } | null;

    const hasRole = body?.role !== undefined;
    const hasProfessionalStatus = body?.professionalStatus !== undefined;

    if (!hasRole && !hasProfessionalStatus) {
      throw new ApiError("Aucune modification demandee.", 400);
    }
    if (hasRole && !isAssignableRole(body?.role)) {
      throw new ApiError("Type de compte invalide.", 400);
    }
    if (hasProfessionalStatus && !isAssignableProfessionalStatus(body?.professionalStatus)) {
      throw new ApiError("Statut de compte invalide.", 400);
    }
    const nextRole = hasRole ? (body?.role as AssignableRole) : null;
    const nextProfessionalStatus = hasProfessionalStatus
      ? (body?.professionalStatus as AssignableProfessionalStatus)
      : null;

    // Changer son propre role reviendrait a se retirer l'acces a cette page en un clic,
    // sans moyen de revenir en arriere depuis l'interface. Le statut de verification est
    // soumis a la meme regle : se passer en "rejected" fermerait aussi la porte.
    if (targetUserId === authorized.user.id) {
      throw new ApiError("Tu ne peux pas modifier ton propre compte.", 400);
    }

    const { data: targetProfile, error: targetError } = await authorized.adminClient
      .from("profiles")
      .select("id,role,email,professional_status")
      .eq("id", targetUserId)
      .maybeSingle();

    if (targetError) {
      throw new ApiError(targetError.message, 400);
    }
    if (!targetProfile) {
      throw new ApiError("Profil introuvable.", 404);
    }

    const roleChanges = nextRole !== null && targetProfile.role !== nextRole;
    const statusChanges =
      nextProfessionalStatus !== null &&
      targetProfile.professional_status !== nextProfessionalStatus;
    if (!roleChanges && !statusChanges) {
      return NextResponse.json({ success: true, profile: targetProfile });
    }

    // Retrograder le dernier administrateur fermerait le back-office a tout le monde,
    // sans recours depuis l'application.
    if (roleChanges && targetProfile.role === "admin") {
      const { count, error: countError } = await authorized.adminClient
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .eq("role", "admin");

      if (countError) {
        throw new ApiError(countError.message, 400);
      }
      if ((count ?? 0) <= 1) {
        throw new ApiError("Impossible de retirer le dernier compte administrateur.", 400);
      }
    }

    // Les affectations RH sont volontairement conservees : elles restent sans effet tant
    // que le role n'est pas "rh", et redonner le role restitue le perimetre a l'identique.
    const { data: updatedProfile, error: updateError } = await authorized.adminClient
      .from("profiles")
      .update({
        ...(roleChanges ? { role: nextRole } : {}),
        ...(statusChanges ? { professional_status: nextProfessionalStatus } : {}),
      })
      .eq("id", targetUserId)
      .select("id,email,full_name,role,professional_status,company_name")
      .single();

    if (updateError || !updatedProfile) {
      throw new ApiError(updateError?.message ?? "Mise a jour du type de compte impossible.", 400);
    }

    return NextResponse.json({ success: true, profile: updatedProfile });
  },
  ADMIN_SESSION,
);

/** Erreur PostgREST « relation inexistante » : la table est optionnelle selon l'environnement. */
function isMissingRelationError(error: { code?: string; message?: string } | null) {
  if (!error) return false;
  return error.code === "42P01" || /does not exist/i.test(error.message ?? "");
}

/**
 * Supprime les donnees personnelles rattachees a un compte avant sa suppression.
 *
 * La route se contentait de supprimer le compte auth puis le profil : les documents, leurs
 * fichiers et l'historique restaient indefiniment. Sur une application RH, c'est le droit a
 * l'effacement qui n'etait pas honore.
 *
 * Les fichiers partent avant les lignes qui les designent, faute de quoi un echec du storage
 * laisse des fichiers que plus rien ne reference.
 */
async function purgeUserData(adminClient: SupabaseClient, userId: string) {
  const { data: documents, error: documentsError } = await adminClient
    .from("employee_documents")
    .select("id,storage_bucket,storage_path")
    .eq("employee_id", userId);
  if (documentsError && !isMissingRelationError(documentsError)) {
    throw new Error(`Lecture des documents impossible : ${documentsError.message}`);
  }

  const documentRows = (documents ?? []) as Array<{
    id: string;
    storage_bucket: string | null;
    storage_path: string | null;
  }>;

  const pathsByBucket = new Map<string, string[]>();
  for (const row of documentRows) {
    if (!row.storage_path) continue;
    const bucket = row.storage_bucket || "employee-documents";
    pathsByBucket.set(bucket, [...(pathsByBucket.get(bucket) ?? []), row.storage_path]);
  }
  for (const [bucket, paths] of pathsByBucket.entries()) {
    for (let index = 0; index < paths.length; index += 100) {
      const { error: storageError } = await adminClient.storage
        .from(bucket)
        .remove(paths.slice(index, index + 100));
      if (storageError) {
        throw new Error(`Suppression des fichiers impossible : ${storageError.message}`);
      }
    }
  }

  const documentIds = documentRows.map((row) => row.id);
  const { data: craRecords } = await adminClient
    .from("cra_records")
    .select("id")
    .eq("employee_id", userId);
  const craIds = ((craRecords ?? []) as Array<{ id: string }>).map((row) => row.id);

  // Ordre impose par les references : evenements et entrees avant leurs parents.
  const steps: Array<{ label: string; run: () => PromiseLike<{ error: unknown }> }> = [
    ...(documentIds.length
      ? [
          {
            label: "document_events",
            run: () => adminClient.from("document_events").delete().in("document_id", documentIds),
          },
        ]
      : []),
    {
      label: "document_events (acteur)",
      run: () => adminClient.from("document_events").delete().eq("actor_id", userId),
    },
    ...(craIds.length
      ? [
          {
            label: "cra_entries",
            run: () => adminClient.from("cra_entries").delete().in("cra_id", craIds),
          },
        ]
      : []),
    {
      label: "cra_records",
      run: () => adminClient.from("cra_records").delete().eq("employee_id", userId),
    },
    {
      label: "employee_documents",
      run: () => adminClient.from("employee_documents").delete().eq("employee_id", userId),
    },
    {
      label: "document_requests",
      run: () => adminClient.from("document_requests").delete().eq("employee_id", userId),
    },
    {
      label: "document_folders",
      run: () => adminClient.from("document_folders").delete().eq("owner_user_id", userId),
    },
    {
      label: "employee_billing_profiles",
      run: () => adminClient.from("employee_billing_profiles").delete().eq("employee_id", userId),
    },
    {
      // Apres cra_records : les lignes de CRA referencent les missions. La cascade depuis
      // `profiles` couvrirait le cas nominal, mais cette etape reste necessaire si la
      // cle etrangere n'a pas pu etre posee (schema non versionne).
      label: "employee_missions",
      run: () => adminClient.from("employee_missions").delete().eq("employee_id", userId),
    },
    {
      label: "rh_employee_assignments (collaborateur)",
      run: () => adminClient.from("rh_employee_assignments").delete().eq("employee_id", userId),
    },
    {
      label: "rh_employee_assignments (RH)",
      run: () => adminClient.from("rh_employee_assignments").delete().eq("rh_id", userId),
    },
    {
      label: "profile_cvs",
      run: () => adminClient.from("profile_cvs").delete().eq("user_id", userId),
    },
  ];

  for (const step of steps) {
    const { error } = (await step.run()) as { error: { code?: string; message?: string } | null };
    if (error && !isMissingRelationError(error)) {
      throw new Error(`Suppression ${step.label} impossible : ${error.message}`);
    }
  }

  return { deletedDocuments: documentIds.length };
}

export const DELETE = withActor<RouteContext>(
  ["admin"],
  async (authorized, context) => {

    const { id } = await context.params;
    const targetUserId = String(id ?? "").trim();
    if (!targetUserId) {
      throw new ApiError("Utilisateur cible invalide.", 400);
    }
    if (targetUserId === authorized.user.id) {
      throw new ApiError("Tu ne peux pas supprimer ton propre compte admin.", 400);
    }

    // Le compte auth est supprime en dernier. Dans l'ordre inverse, un echec en cours de
    // route laissait un compte auth deja detruit et des donnees orphelines, sans aucun moyen
    // de relancer l'operation depuis l'interface. Ici, tout echec laisse le compte intact et
    // l'admin peut simplement reessayer.
    let purgeSummary: { deletedDocuments: number };
    try {
      purgeSummary = await purgeUserData(authorized.adminClient, targetUserId);
    } catch (purgeError) {
      throw new ApiError(
        purgeError instanceof Error
          ? purgeError.message
          : "Suppression des donnees du compte impossible.",
        400,
      );
    }

    const { error: deleteProfileError } = await authorized.adminClient
      .from("profiles")
      .delete()
      .eq("id", targetUserId);
    if (deleteProfileError) {
      throw new ApiError(deleteProfileError.message, 400);
    }

    const { error: deleteAuthError } = await authorized.adminClient.auth.admin.deleteUser(
      targetUserId,
    );
    if (deleteAuthError) {
      throw new ApiError(`Donnees supprimees, mais compte auth non supprime : ${deleteAuthError.message}`, 400);
    }

    return NextResponse.json({ success: true, ...purgeSummary });
  },
  ADMIN_SESSION,
);
