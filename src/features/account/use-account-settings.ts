"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import {
  DEFAULT_APPEARANCE,
  DEFAULT_NOTIFICATIONS,
  parseAppearance,
  parseNotifications,
  type AccountProfile,
  type AppearanceSettings,
  type NotificationSettings,
} from "@/domain/account-settings";
import { appearanceStore } from "@/features/account/appearance-store";
import { createAuthorizedFetch, getFreshAccessToken } from "@/lib/dashboard-api";

/**
 * Etat de la page de parametres : profil, apparence, notifications.
 *
 * ENREGISTREMENT IMMEDIAT pour les interrupteurs — theme, repli, notifications : un
 * reglage a bascule qui attend un bouton « Enregistrer » se perd, parce que rien dans son
 * apparence ne dit qu'il n'est pas encore pris. Les champs de texte, eux, gardent leur
 * bouton : on ne veut pas ecrire a chaque frappe.
 *
 * L'apparence est appliquee AVANT d'etre envoyee au serveur. L'utilisateur voit le theme
 * changer au clic ; si l'enregistrement echoue, le message le dit et la valeur precedente
 * est remise.
 */

type Feedback = { tone: "success" | "error"; text: string } | null;

export function useAccountSettings() {
  const callApi = useMemo(() => createAuthorizedFetch("parametres"), []);

  const [profile, setProfile] = useState<AccountProfile | null>(null);
  const [lastSignInAt, setLastSignInAt] = useState<string | null>(null);
  const [appearance, setAppearanceState] = useState<AppearanceSettings>(DEFAULT_APPEARANCE);
  const [notifications, setNotificationsState] =
    useState<NotificationSettings>(DEFAULT_NOTIFICATIONS);

  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingAvatar, setSavingAvatar] = useState(false);
  const [feedback, setFeedback] = useState<Feedback>(null);

  const load = useCallback(async () => {
    try {
      const [profilePayload, preferencesPayload] = await Promise.all([
        callApi("/api/account/profile") as Promise<{
          profile?: AccountProfile;
          lastSignInAt?: string | null;
        } | null>,
        callApi("/api/account/preferences") as Promise<{
          appearance?: unknown;
          notifications?: unknown;
        } | null>,
      ]);

      if (profilePayload?.profile) setProfile(profilePayload.profile);
      setLastSignInAt(profilePayload?.lastSignInAt ?? null);

      const nextAppearance = parseAppearance(preferencesPayload?.appearance);
      setAppearanceState(nextAppearance);
      appearanceStore.replace(nextAppearance);
      setNotificationsState(parseNotifications(preferencesPayload?.notifications));
    } catch (error) {
      setFeedback({
        tone: "error",
        text: error instanceof Error ? error.message : "Chargement des paramètres impossible.",
      });
    } finally {
      setLoading(false);
    }
  }, [callApi]);

  useEffect(() => {
    void load();
  }, [load]);

  /* ----------------------------------------------------------------- Profil */

  const saveProfile = useCallback(
    async (values: { fullName: string; phone: string }) => {
      setSavingProfile(true);
      setFeedback(null);
      try {
        const payload = (await callApi("/api/account/profile", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(values),
        })) as { profile?: AccountProfile } | null;

        if (payload?.profile) setProfile(payload.profile);
        setFeedback({ tone: "success", text: "Profil enregistré." });
        return true;
      } catch (error) {
        setFeedback({
          tone: "error",
          text: error instanceof Error ? error.message : "Enregistrement impossible.",
        });
        return false;
      } finally {
        setSavingProfile(false);
      }
    },
    [callApi],
  );

  /**
   * Changement d'adresse e-mail.
   *
   * Passe par Supabase et non par une route : c'est l'authentification qui detient
   * l'adresse, et elle envoie un lien de confirmation. Tant que ce lien n'est pas suivi,
   * l'ancienne adresse reste la bonne — d'ou le message, qui le dit explicitement.
   */
  const changeEmail = useCallback(async (email: string) => {
    const { browserSupabase } = await import("@/lib/supabase-browser");
    if (!browserSupabase) return false;

    setFeedback(null);
    const { error } = await browserSupabase.auth.updateUser({ email: email.trim() });
    if (error) {
      setFeedback({ tone: "error", text: error.message });
      return false;
    }
    setFeedback({
      tone: "success",
      text: "Un lien de confirmation vient d'être envoyé à la nouvelle adresse. L'ancienne reste active tant qu'il n'est pas suivi.",
    });
    return true;
  }, []);

  /* ----------------------------------------------------------------- Photo */

  const uploadAvatar = useCallback(async (file: File) => {
    setSavingAvatar(true);
    setFeedback(null);
    try {
      // `FormData` ne passe pas par `createAuthorizedFetch`, qui impose un corps JSON.
      const token = await getFreshAccessToken();
      if (!token) throw new Error("Session manquante.");

      const body = new FormData();
      body.append("file", file);

      const response = await fetch("/api/account/avatar", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body,
      });
      const payload = (await response.json().catch(() => null)) as {
        avatarPath?: string | null;
        avatarUrl?: string | null;
        error?: string;
      } | null;

      if (!response.ok) throw new Error(payload?.error ?? "Envoi de la photo impossible.");

      setProfile((current) =>
        current
          ? {
              ...current,
              avatarPath: payload?.avatarPath ?? null,
              avatarUrl: payload?.avatarUrl ?? null,
            }
          : current,
      );
      setFeedback({ tone: "success", text: "Photo mise à jour." });
      return true;
    } catch (error) {
      setFeedback({
        tone: "error",
        text: error instanceof Error ? error.message : "Envoi de la photo impossible.",
      });
      return false;
    } finally {
      setSavingAvatar(false);
    }
  }, []);

  const removeAvatar = useCallback(async () => {
    setSavingAvatar(true);
    setFeedback(null);
    try {
      await callApi("/api/account/avatar", { method: "DELETE" });
      setProfile((current) =>
        current ? { ...current, avatarPath: null, avatarUrl: null } : current,
      );
      setFeedback({ tone: "success", text: "Photo retirée." });
    } catch (error) {
      setFeedback({
        tone: "error",
        text: error instanceof Error ? error.message : "Suppression impossible.",
      });
    } finally {
      setSavingAvatar(false);
    }
  }, [callApi]);

  /* ------------------------------------------------------------ Preferences */

  const persist = useCallback(
    async (section: "appearance" | "notifications", value: unknown) => {
      await callApi("/api/account/preferences", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ section, value }),
      });
    },
    [callApi],
  );

  const updateAppearance = useCallback(
    async (patch: Partial<AppearanceSettings>) => {
      const previous = appearance;
      const next = { ...appearance, ...patch };

      setAppearanceState(next);
      appearanceStore.replace(next);
      setFeedback(null);

      try {
        await persist("appearance", next);
      } catch (error) {
        setAppearanceState(previous);
        appearanceStore.replace(previous);
        setFeedback({
          tone: "error",
          text: error instanceof Error ? error.message : "Préférence non enregistrée.",
        });
      }
    },
    [appearance, persist],
  );

  const updateNotifications = useCallback(
    async (patch: Partial<NotificationSettings>) => {
      const previous = notifications;
      const next = { ...notifications, ...patch };

      setNotificationsState(next);
      setFeedback(null);

      try {
        await persist("notifications", next);
      } catch (error) {
        setNotificationsState(previous);
        setFeedback({
          tone: "error",
          text: error instanceof Error ? error.message : "Préférence non enregistrée.",
        });
      }
    },
    [notifications, persist],
  );

  return {
    profile,
    lastSignInAt,
    appearance,
    notifications,
    loading,
    savingProfile,
    savingAvatar,
    feedback,
    setFeedback,
    saveProfile,
    changeEmail,
    uploadAvatar,
    removeAvatar,
    updateAppearance,
    updateNotifications,
    reload: load,
  };
}
