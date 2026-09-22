import { NextResponse } from "next/server";

import { withActor } from "@/lib/api-handler";
import { MESSAGING_ROLES } from "@/domain/messaging";
import { listMessagingContacts } from "@/lib/messaging-access";

export const runtime = "nodejs";

/** Annuaire de l'utilisateur : ceux a qui il peut ouvrir une conversation. */
export const GET = withActor(
  [...MESSAGING_ROLES],
  async ({ adminClient, profile }) => {
    const items = await listMessagingContacts(adminClient, profile);
    return NextResponse.json({ items });
  },
  { missingSession: "Session manquante." },
);
