import { NextResponse } from "next/server";

import { ApiError, withActor } from "@/lib/api-handler";
import {
  ACCOUNT_PREFERENCE_KEYS,
  ACCOUNT_ROLES,
  parseAppearance,
  parseNotifications,
  type AccountPreferenceSection,
} from "@/domain/account-settings";

export const runtime = "nodejs";

const SESSION = { missingSession: "Session manquante." };
const TABLE_NAME = "user_dashboard_preferences";

/**
 * Preferences du compte.
 *
 * Elles partagent la table `user_dashboard_preferences` avec les colonnes de listes, sous
 * des cles prefixees `account.`. Une route separee de `/api/dashboard/preferences` plutot
 * qu'une extension de celle-ci : cette derniere valide une forme unique — un tableau de
 * colonnes — et lui faire porter trois formes differentes l'aurait transformee en
 * aiguillage, avec le risque de relacher la validation des colonnes au passage.
 */

/**
 * L'absence de la table n'est pas une erreur : l'appelant retombe sur les valeurs par
 * defaut. Meme parti que la route des colonnes, pour la meme raison — la table est
 * optionnelle dans les environnements de developpement.
 */
function isTableMissing(message: string | null | undefined) {
  return (message ?? "").toLowerCase().includes(TABLE_NAME);
}

const PARSERS = {
  appearance: parseAppearance,
  notifications: parseNotifications,
} as const;

function isSection(value: unknown): value is AccountPreferenceSection {
  return value === "appearance" || value === "notifications";
}

export const GET = withActor([...ACCOUNT_ROLES], async ({ adminClient, profile }) => {
  const { data, error } = await adminClient
    .from(TABLE_NAME)
    .select("preference_key,value")
    .eq("user_id", profile.id)
    .in("preference_key", Object.values(ACCOUNT_PREFERENCE_KEYS));

  if (error && !isTableMissing(error.message)) {
    throw new ApiError(error.message, 400);
  }

  const byKey = new Map<string, unknown>(
    ((data ?? []) as { preference_key: string; value: unknown }[]).map((row) => [
      row.preference_key,
      row.value,
    ]),
  );

  // Les parseurs comblent tout ce qui manque : une ligne absente donne donc les valeurs
  // par defaut, exactement comme une ligne partielle.
  return NextResponse.json({
    appearance: parseAppearance(byKey.get(ACCOUNT_PREFERENCE_KEYS.appearance)),
    notifications: parseNotifications(byKey.get(ACCOUNT_PREFERENCE_KEYS.notifications)),
    stored: byKey.size > 0,
  });
}, SESSION);

export const PUT = withActor([...ACCOUNT_ROLES], async ({ adminClient, profile, request }) => {
  const body = (await request.json().catch(() => null)) as
    | { section?: unknown; value?: unknown }
    | null;

  if (!isSection(body?.section)) {
    throw new ApiError("Section de préférences inconnue.", 400);
  }

  const section = body.section;
  // La valeur est NORMALISEE avant ecriture, jamais stockee telle quelle : ce qui entre
  // en base a donc toujours la forme que la lecture suppose.
  const value = PARSERS[section](body.value);

  const { error } = await adminClient.from(TABLE_NAME).upsert(
    {
      user_id: profile.id,
      preference_key: ACCOUNT_PREFERENCE_KEYS[section],
      value,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,preference_key" },
  );

  if (error && isTableMissing(error.message)) {
    return NextResponse.json({ saved: false, backend: "missing_table", value });
  }
  if (error) {
    throw new ApiError(error.message, 400);
  }

  return NextResponse.json({ saved: true, value });
}, SESSION);
