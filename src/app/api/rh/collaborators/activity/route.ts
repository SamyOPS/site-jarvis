import { NextResponse } from "next/server";

import { ApiError, withActor } from "@/lib/api-handler";
import { RH_ASSIGNMENTS_UNAVAILABLE } from "@/lib/rh-access";

type ActivityRow = {
  userId: string;
  lastSignInAt: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  emailConfirmedAt: string | null;
};

export const GET = withActor(
  ["rh", "admin"],
  async ({ adminClient, profile }) => {
    // Un admin n'a aucune affectation : filtrer sur `rh_id = <admin>` ne remontait rien et
    // la route lui repondait `items: []`. Partout ailleurs (assertRhAccess, canManageOwner,
    // listAssignedEmployeeIds, billing-profiles) un admin est traite comme non restreint ;
    // cette route et `collaborators/visibility` etaient les deux seules exceptions.
    // Sans effet visible aujourd'hui : l'UI RH refuse les admins (rh-workspace.tsx).
    const isUnrestricted = profile.role === "admin";

    const assignmentsRes = await adminClient
      .from("rh_employee_assignments")
      .select("employee_id")
      .eq("rh_id", profile.id);

    const assignmentsTableMissing =
      !!assignmentsRes.error &&
      /rh_employee_assignments/i.test(assignmentsRes.error.message ?? "");
    if (assignmentsTableMissing && !isUnrestricted) {
      throw new ApiError(RH_ASSIGNMENTS_UNAVAILABLE, 503);
    }
    if (assignmentsRes.error && !isUnrestricted) {
      throw new ApiError(assignmentsRes.error.message, 400);
    }

    const allowedEmployeeIds = Array.from(
      new Set((assignmentsRes.data ?? []).map((row) => row.employee_id).filter(Boolean)),
    );

    if (!isUnrestricted && !allowedEmployeeIds.length) {
      return NextResponse.json({ items: [] });
    }

    const { data, error } = await adminClient.auth.admin.listUsers({
      page: 1,
      perPage: 1000,
    });
    if (error) {
      throw new ApiError(error.message, 400);
    }

    const allowedSet = new Set(allowedEmployeeIds);
    const rows: ActivityRow[] = (data.users ?? [])
      .filter((user) => isUnrestricted || allowedSet.has(user.id))
      .map((user) => ({
        userId: user.id,
        lastSignInAt: user.last_sign_in_at ?? null,
        createdAt: user.created_at ?? null,
        updatedAt: user.updated_at ?? null,
        emailConfirmedAt: user.email_confirmed_at ?? null,
      }));

    return NextResponse.json({ items: rows });
  },
  { missingSession: "Session RH manquante." },
);
