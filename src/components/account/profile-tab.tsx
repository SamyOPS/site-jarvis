"use client";

import { useRef, useState } from "react";
import { Trash2, Upload } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  SettingsField,
  SettingsInput,
  SettingsSection,
} from "@/components/console/settings-fields";
import { PROFILE_LIMITS, type AccountProfile } from "@/domain/account-settings";
import { messagingRoleLabel } from "@/domain/messaging";
import { AVATAR_MAX_BYTES, AVATAR_MIME_TYPES } from "@/lib/avatars";
import { AvatarBubble } from "@/components/console/avatar-bubble";

type ProfileTabProps = {
  profile: AccountProfile;
  savingProfile: boolean;
  savingAvatar: boolean;
  onSave: (values: { fullName: string; phone: string }) => Promise<boolean>;
  onChangeEmail: (email: string) => Promise<boolean>;
  onUploadAvatar: (file: File) => Promise<boolean>;
  onRemoveAvatar: () => Promise<void>;
};

export function ProfileTab({
  profile,
  savingProfile,
  savingAvatar,
  onSave,
  onChangeEmail,
  onUploadAvatar,
  onRemoveAvatar,
}: ProfileTabProps) {
  const [fullName, setFullName] = useState(profile.fullName ?? "");
  const [phone, setPhone] = useState(profile.phone ?? "");
  const [email, setEmail] = useState(profile.email);
  const fileRef = useRef<HTMLInputElement>(null);

  /*
    Resynchronisation du formulaire quand le profil enregistre change — la valeur
    normalisee par le serveur, un nom dont les espaces ont ete retires par exemple, doit
    apparaitre a l'ecran.

    Ajustement PENDANT LE RENDU et non dans un effet : c'est la forme que React
    recommande pour « corriger un etat quand une prop change ». Un effet declencherait un
    second rendu avec la valeur perimee entre les deux, et le linter le signale a juste
    titre.
  */
  const [syncedProfile, setSyncedProfile] = useState(profile);
  if (
    profile.fullName !== syncedProfile.fullName ||
    profile.phone !== syncedProfile.phone ||
    profile.email !== syncedProfile.email
  ) {
    setSyncedProfile(profile);
    setFullName(profile.fullName ?? "");
    setPhone(profile.phone ?? "");
    setEmail(profile.email);
  }

  const identityDirty =
    fullName.trim() !== (profile.fullName ?? "").trim() ||
    phone.trim() !== (profile.phone ?? "").trim();
  const emailDirty = email.trim().toLowerCase() !== profile.email.toLowerCase();

  const displayName = fullName.trim() || profile.email;

  return (
    <div className="space-y-2">
      <SettingsSection
        title="Photo de profil"
        description="Elle remplace vos initiales dans la messagerie et les listes."
      >
        <div className="flex flex-wrap items-center gap-4">
          <AvatarBubble
            avatarUrl={profile.avatarUrl}
            name={displayName}
            email={profile.email}
            size={64}
            className="text-app-lg"
          />

          <div className="flex flex-wrap items-center gap-2">
            <input
              ref={fileRef}
              type="file"
              accept={AVATAR_MIME_TYPES.join(",")}
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                // Le champ est vide tout de suite : sans cela, choisir deux fois le meme
                // fichier ne declencherait pas d'evenement la seconde fois.
                event.target.value = "";
                if (file) void onUploadAvatar(file);
              }}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={savingAvatar}
              onClick={() => fileRef.current?.click()}
            >
              <Upload className="mr-2 h-4 w-4" />
              {profile.avatarUrl ? "Remplacer" : "Ajouter une photo"}
            </Button>
            {profile.avatarUrl && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={savingAvatar}
                onClick={() => void onRemoveAvatar()}
                className="text-rejected hover:text-rejected"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Retirer
              </Button>
            )}
          </div>
        </div>
        <p className="mt-3 text-app-xs text-app-text-muted">
          {`JPEG, PNG ou WebP, ${Math.round(AVATAR_MAX_BYTES / 1024 / 1024)} Mo maximum.`}
        </p>
      </SettingsSection>

      <SettingsSection
        title="Identité"
        description="Ce nom vous désigne partout dans la console."
        actions={
          <Button
            type="button"
            size="sm"
            disabled={!identityDirty || savingProfile || !fullName.trim()}
            onClick={() => void onSave({ fullName: fullName.trim(), phone: phone.trim() })}
          >
            {savingProfile ? "Enregistrement..." : "Enregistrer"}
          </Button>
        }
      >
        <div className="grid gap-4 md:grid-cols-2">
          <SettingsField label="Nom affiché" htmlFor="account-name">
            <SettingsInput
              id="account-name"
              value={fullName}
              maxLength={PROFILE_LIMITS.fullName}
              onChange={(event) => setFullName(event.target.value)}
            />
          </SettingsField>

          <SettingsField label="Téléphone" htmlFor="account-phone" hint="Facultatif.">
            <SettingsInput
              id="account-phone"
              type="tel"
              value={phone}
              maxLength={PROFILE_LIMITS.phone}
              onChange={(event) => setPhone(event.target.value)}
            />
          </SettingsField>

          <SettingsField
            label="Rôle"
            hint="Défini par un administrateur, non modifiable ici."
          >
            <SettingsInput value={messagingRoleLabel(profile.role)} disabled readOnly />
          </SettingsField>
        </div>
      </SettingsSection>

      <SettingsSection
        title="Adresse e-mail"
        description="Elle sert à vous connecter et à recevoir les notifications."
        actions={
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={!emailDirty || !email.trim()}
            onClick={() => void onChangeEmail(email)}
          >
            Changer l&apos;adresse
          </Button>
        }
      >
        <SettingsField
          label="Adresse actuelle"
          htmlFor="account-email"
          hint="Le changement n'est effectif qu'après confirmation par le lien envoyé à la nouvelle adresse."
        >
          <SettingsInput
            id="account-email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="md:max-w-md"
          />
        </SettingsField>
      </SettingsSection>
    </div>
  );
}
