import { NextResponse } from "next/server";

import {
  getAccessTokenFromRequest,
  getAuthorizedActor,
  isAuthorizedActorError,
} from "@/lib/server-supabase";

type AuthorizedContext = {
  adminClient: any;
  actorId: string;
  actorRole: string | null;
};

export async function getAuthorizedDocumentsContext(request: Request) {
  const accessToken = getAccessTokenFromRequest(request);
  if (!accessToken) {
    return NextResponse.json({ error: "Session manquante." }, { status: 401 });
  }

  const authorized = await getAuthorizedActor(accessToken, ["salarie", "rh", "admin"]);
  if (isAuthorizedActorError(authorized)) {
    return NextResponse.json({ error: authorized.error }, { status: authorized.status });
  }

  const context: AuthorizedContext = {
    adminClient: authorized.adminClient,
    actorId: authorized.user.id,
    actorRole: authorized.profile.role,
  };
  return context;
}

export async function canManageOwner(
  context: AuthorizedContext,
  ownerUserId: string,
) {
  if (!ownerUserId) return false;
  if (context.actorRole === "admin") return true;
  if (context.actorId === ownerUserId) return true;
  if (context.actorRole !== "rh") return false;

  const { data, error } = await context.adminClient
    .from("rh_employee_assignments")
    .select("employee_id")
    .eq("rh_id", context.actorId)
    .eq("employee_id", ownerUserId)
    .maybeSingle();

  const assignmentsTableMissing =
    !!error && /rh_employee_assignments/i.test(error.message ?? "");
  if (assignmentsTableMissing) {
    return false;
  }
  if (error) {
    throw new Error(error.message);
  }
  return Boolean(data?.employee_id);
}
