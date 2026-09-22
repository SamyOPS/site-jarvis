"use client";

import { Button } from "@/components/ui/button";
import {
  SettingsField,
  SettingsInput,
  SettingsSection,
} from "@/components/console/settings-fields";

export type BillingProfileFormState = {
  firstName: string;
  lastName: string;
  addressLine1: string;
  addressLine2: string;
  postalCode: string;
  city: string;
  country: string;
  phone: string;
  email: string;
  siret: string;
  iban: string;
  bic: string;
  /**
   * Unite de repli, conservee pour les CRA anterieurs au multi-entreprises. L'unite
   * effective est celle de la mission, reglee dans « Entreprises clientes ».
   *
   * N'apparait dans AUCUN champ : elle n'est plus modifiable, seulement transportee.
   */
  timeUnit: string;
};

type FieldConfig = {
  key: keyof BillingProfileFormState;
  label: string;
  /** Occupe les deux colonnes de la grille. */
  wide?: boolean;
  type?: string;
  hint?: string;
};

const IDENTITY_FIELDS: FieldConfig[] = [
  { key: "firstName", label: "Prénom" },
  { key: "lastName", label: "Nom" },
  { key: "addressLine1", label: "Adresse", wide: true },
  { key: "addressLine2", label: "Complément d'adresse", wide: true },
  { key: "postalCode", label: "Code postal" },
  { key: "city", label: "Ville" },
  { key: "country", label: "Pays" },
  { key: "phone", label: "Téléphone", type: "tel" },
  { key: "email", label: "Adresse e-mail", type: "email", wide: true },
];

const AUTO_ENTREPRENEUR_FIELDS: FieldConfig[] = [
  { key: "siret", label: "SIRET" },
  { key: "iban", label: "IBAN" },
  { key: "bic", label: "BIC" },
];

type BillingProfileFormProps = {
  form: BillingProfileFormState;
  onChange: (form: BillingProfileFormState) => void;
  onSubmit: () => void | Promise<void>;
  saving: boolean;
  loading: boolean;
};

/**
 * Profil de facturation du consultant.
 *
 * Reprend les briques de la page de parametres — meme cadre, memes champs, meme
 * typographie — la ou cette carte etait restee sur le gabarit generique, avec ses couleurs
 * ecrites en dur et ses controles shadcn. Elle detonnait des qu'on passait d'un onglet a
 * l'autre.
 *
 * UN SEUL bouton d'enregistrement pour les deux groupes de champs : ils forment une seule
 * ligne en base, les separer en deux formulaires laisserait croire le contraire.
 */
export function BillingProfileForm({
  form,
  onChange,
  onSubmit,
  saving,
  loading,
}: BillingProfileFormProps) {
  const renderField = (field: FieldConfig) => (
    <SettingsField
      key={field.key}
      label={field.label}
      htmlFor={`billing-${field.key}`}
      hint={field.hint}
      className={field.wide ? "md:col-span-2" : undefined}
    >
      <SettingsInput
        id={`billing-${field.key}`}
        type={field.type}
        value={form[field.key]}
        onChange={(event) => onChange({ ...form, [field.key]: event.target.value })}
      />
    </SettingsField>
  );

  return (
    <SettingsSection
      title="Profil de facturation"
      description="Vos coordonnées d'émetteur, communes à toutes vos factures. L'entreprise cliente et son tarif se règlent juste en dessous."
      actions={
        <Button
          type="button"
          size="sm"
          onClick={() => void onSubmit()}
          disabled={saving || loading}
        >
          {saving ? "Enregistrement..." : "Enregistrer"}
        </Button>
      }
    >
      <div className="grid gap-4 md:grid-cols-2">{IDENTITY_FIELDS.map(renderField)}</div>

      {/*
        Bloc separe par un filet plutot que par un `fieldset` a legende : la page de
        parametres ne connait que le filet, et ces trois champs ne concernent qu'une partie
        des consultants.
      */}
      <div className="mt-5 border-t border-app-line pt-5">
        <p className="text-app-sm font-medium text-app-text">
          Auto-entrepreneurs
          <span className="ml-2 font-normal text-app-text-muted">facultatif</span>
        </p>
        <p className="mt-0.5 text-app-xs text-app-text-muted">
          Ces informations n&apos;apparaissent sur vos factures que si elles sont renseignées.
        </p>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          {AUTO_ENTREPRENEUR_FIELDS.map(renderField)}
        </div>
      </div>
    </SettingsSection>
  );
}
