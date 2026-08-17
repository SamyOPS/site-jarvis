import { NextResponse } from "next/server";

import { ApiError, withActor } from "@/lib/api-handler";

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
    const assignmentsRes = await adminClient
      .from("rh_employee_assignments")
      .select("employee_id")
      .eq("rh_id", profile.id);

    const assignmentsTableMissing =
      !!assignmentsRes.error &&
      /rh_employee_assignments/i.test(assignmentsRes.error.message ?? "");
    if (assignmentsTableMissing) {
      throw new ApiError("Controle des affectations RH indisponible.", 503);
    }
    if (assignmentsRes.error) {
      throw new ApiError(assignmentsRes.error.message, 400);
    }

    const allowedEmployeeIds = Array.from(
      new Set((assignmentsRes.data ?? []).map((row) => row.employee_id).filter(Boolean)),
    );

    if (!allowedEmployeeIds.length) {
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
      .filter((user) => allowedSet.has(user.id))
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
