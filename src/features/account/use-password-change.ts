"use client";

import { useCallback, useMemo, useState } from "react";

import { PASSWORD_MIN_LENGTH, evaluatePassword } from "@/domain/account-settings";
import { browserSupabase } from "@/lib/supabase-browser";

/**
 * Changement de mot de passe, avec verification du mot de passe actuel.
 *
 * POURQUOI RE-AUTHENTIFIER : `auth.updateUser` accepte un nouveau mot de passe sans jamais
 * demander l'ancien. Un poste laisse ouvert suffisait donc a verrouiller le compte de son
 * proprietaire. On rejoue une connexion avec le mot de passe saisi avant d'appliquer le
 * changement — c'est ce qui transforme « qui tient la session » en « qui connait le mot de
 * passe ».
 *
 * Remplace `features/dashboard/use-password-update`, qui n'avait pas cette garde.
 */

export type PasswordChangeForm = {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
};

const EMPTY_FORM: PasswordChangeForm = {
  currentPassword: "",
  newPassword: "",
  confirmPassword: "",
};

export function usePasswordChange(email: string | null | undefined) {
  const [form, setForm] = useState<PasswordChangeForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ tone: "success" | "error"; text: string } | null>(
    null,
  );

  const strength = useMemo(() => evaluatePassword(form.newPassword), [form.newPassword]);

  const submit = useCallback(async () => {
    if (!browserSupabase) return false;
    if (!email) {
      setMessage({ tone: "error", text: "Adresse e-mail du compte inconnue." });
      return false;
    }

    if (!form.currentPassword) {
      setMessage({ tone: "error", text: "Saisissez votre mot de passe actuel." });
      return false;
    }
    if (form.newPassword.length < PASSWORD_MIN_LENGTH) {
      setMessage({
        tone: "error",
        text: `Le nouveau mot de passe doit contenir au moins ${PASSWORD_MIN_LENGTH} caractères.`,
      });
      return false;
    }
    if (form.newPassword !== form.confirmPassword) {
      setMessage({ tone: "error", text: "La confirmation ne correspond pas." });
      return false;
    }
    if (form.newPassword === form.currentPassword) {
      setMessage({ tone: "error", text: "Le nouveau mot de passe est identique à l'ancien." });
      return false;
    }

    setSaving(true);
    setMessage(null);

    // Verification du mot de passe actuel. En cas d'echec, rien n'est modifie.
    const { error: signInError } = await browserSupabase.auth.signInWithPassword({
      email,
      password: form.currentPassword,
    });
    if (signInError) {
      setSaving(false);
      setMessage({ tone: "error", text: "Mot de passe actuel incorrect." });
      return false;
    }

    const { error } = await browserSupabase.auth.updateUser({ password: form.newPassword });
    setSaving(false);

    if (error) {
      setMessage({ tone: "error", text: error.message });
      return false;
    }

    setForm(EMPTY_FORM);
    setMessage({ tone: "success", text: "Mot de passe mis à jour." });
    return true;
  }, [email, form]);

  return { form, setForm, saving, message, setMessage, strength, submit };
}
