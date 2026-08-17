import { NextResponse } from "next/server";

import { ApiError, withActor } from "@/lib/api-handler";
import { RH_ASSIGNMENTS_UNAVAILABLE } from "@/lib/rh-access";

export const GET = withActor(
  ["rh", "admin"],
  async ({ adminClient, profile }) => {
    // Un admin n'est restreint par aucune affectation. Sans ce retour anticipe, la
    // requete ci-dessous filtre sur `rh_id = <admin>` et ne remonte rien : la route
    // repondait alors `restricted: true` avec une liste vide, et le tableau de bord RH
    // s'affichait entierement VIDE pour un admin — la closure `canAccessEmployee` du
    // navigateur rejetant tout le monde. `api/rh/billing-profiles` traitait deja le meme
    // admin comme non restreint : les deux routes se contredisaient.
    if (profile.role === "admin") {
      return NextResponse.json({
        restricted: false,
        employeeIds: [],
        documentTypeRestrictions: {},
      });
    }

    const { data, error } = await adminClient
      .from("rh_employee_assignments")
      .select("employee_id,allowed_document_type_ids")
      .eq("rh_id", profile.id);

    const assignmentsTableMissing =
      !!error && /rh_employee_assignments/i.test(error.message ?? "");
    if (assignmentsTableMissing) {
      throw new ApiError(RH_ASSIGNMENTS_UNAVAILABLE, 503);
    }
    if (error) {
      throw new ApiError(error.message, 400);
    }

    const employeeIds = Array.from(
      new Set((data ?? []).map((row) => row.employee_id).filter(Boolean)),
    );

    // employeeId -> allowed document type ids. Only includes employees with an
    // actual restriction; an empty / missing array means all types are allowed.
    const documentTypeRestrictions = (data ?? []).reduce<Record<string, string[]>>((acc, row) => {
      if (!row.employee_id) return acc;
      const allowed = Array.isArray(row.allowed_document_type_ids)
        ? row.allowed_document_type_ids.filter(Boolean)
        : [];
      if (allowed.length > 0) {
        acc[row.employee_id] = allowed;
      }
      return acc;
    }, {});

    return NextResponse.json({ restricted: true, employeeIds, documentTypeRestrictions });
  },
  { missingSession: "Session RH manquante." },
);
