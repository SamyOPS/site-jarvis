"use client";

import { useCallback, useState } from "react";

import { browserSupabase } from "@/lib/supabase-browser";

export type PasswordForm = {
  newPassword: string;
  confirmPassword: string;
};

/**
 * Changement de mot de passe depuis l'ecran de parametres.
 *
 * Etait recopie a l'identique dans les espaces RH et salarie — les deux implementations
 * ne differaient par aucun caractere. Le hook porte aussi les trois etats associes, qui
 * n'existaient que pour lui.
 */
export function usePasswordUpdate() {
  const [passwordMessage, setPasswordMessage] = useState<string | null>(null);
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordForm, setPasswordForm] = useState<PasswordForm>({
    newPassword: "",
    confirmPassword: "",
  });

  const handlePasswordUpdate = useCallback(async () => {
    if (!browserSupabase) return;

    if (passwordForm.newPassword.length < 8) {
      setPasswordMessage("Le nouveau mot de passe doit contenir au moins 8 caracteres.");
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordMessage("La confirmation du mot de passe ne correspond pas.");
      return;
    }

    setPasswordSaving(true);
    setPasswordMessage(null);

    const { error: passwordError } = await browserSupabase.auth.updateUser({
      password: passwordForm.newPassword,
    });

    if (passwordError) {
      setPasswordMessage(passwordError.message);
      setPasswordSaving(false);
      return;
    }

    setPasswordForm({ newPassword: "", confirmPassword: "" });
    setPasswordMessage("Mot de passe mis a jour.");
    setPasswordSaving(false);
  }, [passwordForm]);

  return {
    passwordForm,
    setPasswordForm,
    passwordMessage,
    passwordSaving,
    handlePasswordUpdate,
  };
}
