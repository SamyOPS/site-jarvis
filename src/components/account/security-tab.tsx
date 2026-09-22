"use client";

import { useState } from "react";
import { LogOut, ShieldCheck } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  SettingsField,
  SettingsInput,
  SettingsSection,
} from "@/components/console/settings-fields";
import { PASSWORD_MIN_LENGTH } from "@/domain/account-settings";
import { usePasswordChange } from "@/features/account/use-password-change";
import { formatRelativeTime } from "@/features/messaging/format";

type SecurityTabProps = {
  email: string | null;
  lastSignInAt: string | null;
  onSignOutEverywhere: () => Promise<void>;
};

/** Jauge de robustesse. La couleur double toujours un libelle ecrit. */
function StrengthMeter({ score, label }: { score: number; label: string }) {
  if (!label) return null;

  const tones = [
    "bg-rejected",
    "bg-rejected",
    "bg-pending",
    "bg-validated",
    "bg-validated",
  ];

  return (
    <div className="flex items-center gap-2">
      <div className="flex h-1 flex-1 gap-1" aria-hidden="true">
        {[0, 1, 2, 3, 4].map((index) => (
          <span
            key={index}
            className={cn(
              "h-full flex-1 rounded-full",
              index <= score ? tones[score] : "bg-app-line",
            )}
          />
        ))}
      </div>
      <span className="shrink-0 text-app-xs text-app-text-secondary">{label}</span>
    </div>
  );
}

export function SecurityTab({ email, lastSignInAt, onSignOutEverywhere }: SecurityTabProps) {
  const { form, setForm, saving, message, strength, submit } = usePasswordChange(email);
  const [signingOut, setSigningOut] = useState(false);

  return (
    <div className="space-y-2">
      <SettingsSection
        title="Mot de passe"
        description="Votre mot de passe actuel est demandé : tenir la session ouverte ne suffit pas à le changer."
        actions={
          <Button type="button" size="sm" disabled={saving} onClick={() => void submit()}>
            {saving ? "Enregistrement..." : "Changer le mot de passe"}
          </Button>
        }
      >
        <div className="grid gap-4 md:max-w-md">
          <SettingsField label="Mot de passe actuel" htmlFor="current-password">
            <SettingsInput
              id="current-password"
              type="password"
              autoComplete="current-password"
              value={form.currentPassword}
              onChange={(event) =>
                setForm({ ...form, currentPassword: event.target.value })
              }
            />
          </SettingsField>

          <SettingsField
            label="Nouveau mot de passe"
            htmlFor="new-password"
            hint={
              strength.hints.length
                ? `Pour le renforcer : ${strength.hints.join(", ")}.`
                : `${PASSWORD_MIN_LENGTH} caractères minimum.`
            }
          >
            <SettingsInput
              id="new-password"
              type="password"
              autoComplete="new-password"
              value={form.newPassword}
              onChange={(event) => setForm({ ...form, newPassword: event.target.value })}
            />
            {form.newPassword && (
              <div className="pt-1">
                <StrengthMeter score={strength.score} label={strength.label} />
              </div>
            )}
          </SettingsField>

          <SettingsField
            label="Confirmation"
            htmlFor="confirm-password"
            error={
              form.confirmPassword && form.confirmPassword !== form.newPassword
                ? "La confirmation ne correspond pas."
                : null
            }
          >
            <SettingsInput
              id="confirm-password"
              type="password"
              autoComplete="new-password"
              value={form.confirmPassword}
              onChange={(event) =>
                setForm({ ...form, confirmPassword: event.target.value })
              }
            />
          </SettingsField>

          {message && (
            <p
              className={cn(
                "text-app-sm",
                message.tone === "error" ? "text-rejected" : "text-validated",
              )}
            >
              {message.text}
            </p>
          )}
        </div>
      </SettingsSection>

      <SettingsSection
        title="Activité du compte"
        description="Ce que l'application sait de vos connexions."
      >
        <div className="flex items-center gap-3">
          <ShieldCheck aria-hidden="true" className="h-5 w-5 shrink-0 text-app-text-muted" />
          <div className="min-w-0">
            <p className="text-app-sm text-app-text">
              {lastSignInAt
                ? `Dernière connexion ${formatRelativeTime(lastSignInAt)}`
                : "Aucune connexion enregistrée."}
            </p>
            {lastSignInAt && (
              <p className="text-app-xs text-app-text-muted">
                {new Date(lastSignInAt).toLocaleString("fr-FR")}
              </p>
            )}
          </div>
        </div>
        {/*
          Pas de liste d'appareils : Supabase n'expose pas les sessions ouvertes d'un
          compte. Afficher une liste devinee serait pire que de n'en afficher aucune.
        */}
      </SettingsSection>

      <SettingsSection
        title="Sessions"
        description="En cas de doute sur un poste partagé ou perdu."
        actions={
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={signingOut}
            onClick={async () => {
              if (
                !window.confirm(
                  "Fermer la session sur tous les appareils ? Vous serez également déconnecté ici.",
                )
              ) {
                return;
              }
              setSigningOut(true);
              await onSignOutEverywhere();
            }}
            className="text-rejected hover:text-rejected"
          >
            <LogOut className="mr-2 h-4 w-4" />
            {signingOut ? "Déconnexion..." : "Déconnecter tous les appareils"}
          </Button>
        }
      >
        <p className="text-app-sm text-app-text-secondary">
          Toutes les sessions ouvertes sont fermées, y compris celle-ci. Il faudra vous
          reconnecter.
        </p>
      </SettingsSection>
    </div>
  );
}
