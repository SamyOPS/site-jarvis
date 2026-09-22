import type { SupabaseClient } from "@supabase/supabase-js";

import {
  ACCOUNT_PREFERENCE_KEYS,
  DEFAULT_NOTIFICATIONS,
  parseNotifications,
  type NotificationKind,
  type NotificationSettings,
} from "@/domain/account-settings";

/**
 * Preferences de notification par e-mail, vues depuis les routes qui envoient.
 *
 * REGLE EN CAS DE DOUTE : on envoie. Table absente, requete en echec, ligne jamais
 * ecrite — tous ces cas retombent sur « tout est actif », qui est le comportement
 * historique. Se taire par accident serait le pire des deux : un collaborateur ne verrait
 * pas qu'on lui reclame un document, et rien dans l'interface ne le lui dirait.
 */

const TABLE_NAME = "user_dashboard_preferences";

/** Preferences de plusieurs utilisateurs, en une requete. */
export async function notificationSettingsByUser(
  adminClient: SupabaseClient,
  userIds: string[],
): Promise<Map<string, NotificationSettings>> {
  const result = new Map<string, NotificationSettings>();
  const unique = Array.from(new Set(userIds.filter(Boolean)));
  for (const id of unique) result.set(id, DEFAULT_NOTIFICATIONS);
  if (!unique.length) return result;

  const { data, error } = await adminClient
    .from(TABLE_NAME)
    .select("user_id,value")
    .eq("preference_key", ACCOUNT_PREFERENCE_KEYS.notifications)
    .in("user_id", unique);

  // Echec silencieux : chacun garde le defaut, donc tout le monde est notifie.
  if (error || !data) return result;

  for (const row of data as { user_id: string; value: unknown }[]) {
    result.set(row.user_id, parseNotifications(row.value));
  }
  return result;
}

/** Cet utilisateur veut-il recevoir ce type d'e-mail ? */
export async function shouldNotify(
  adminClient: SupabaseClient,
  userId: string | null | undefined,
  kind: NotificationKind,
): Promise<boolean> {
  if (!userId) return false;
  const settings = await notificationSettingsByUser(adminClient, [userId]);
  return settings.get(userId)?.[kind] ?? true;
}

/** Restreint une liste de destinataires a ceux qui acceptent ce type d'e-mail. */
export async function filterByNotificationPreference(
  adminClient: SupabaseClient,
  userIds: string[],
  kind: NotificationKind,
): Promise<string[]> {
  const settings = await notificationSettingsByUser(adminClient, userIds);
  return userIds.filter((id) => settings.get(id)?.[kind] ?? true);
}
