import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export type BillingProfileFormState = {
  firstName: string;
  lastName: string;
  companyName: string;
  esnPartenaire: string;
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
  dailyRate: string;
  /** "day" (journees, defaut) ou "hour" (heures par jour). */
  timeUnit: string;
  hoursPerDay: string;
};

type BillingProfileCardProps = {
  form: BillingProfileFormState;
  onChange: (form: BillingProfileFormState) => void;
  onSubmit: () => void | Promise<void>;
  saving: boolean;
  loading: boolean;
};

type FieldConfig = {
  key: keyof BillingProfileFormState;
  label: string;
  className?: string;
  type?: string;
  min?: string;
  step?: string;
  /** Presente => le champ est rendu comme une liste deroulante au lieu d'un Input. */
  options?: { value: string; label: string }[];
  hint?: string;
};

const generalFields: FieldConfig[] = [
  { key: "firstName", label: "Prenom" },
  { key: "lastName", label: "Nom" },
  { key: "companyName", label: "Societe", className: "md:col-span-2" },
  { key: "esnPartenaire", label: "ESN partenaire", className: "md:col-span-2" },
  { key: "addressLine1", label: "Adresse", className: "md:col-span-2" },
  { key: "addressLine2", label: "Complement d'adresse", className: "md:col-span-2" },
  { key: "postalCode", label: "Code postal" },
  { key: "city", label: "Ville" },
  { key: "country", label: "Pays" },
  { key: "phone", label: "Telephone" },
  { key: "email", label: "Email", className: "md:col-span-2" },
];

const craEntryFields: FieldConfig[] = [
  {
    key: "timeUnit",
    label: "Unite de saisie",
    options: [
      { value: "day", label: "Journees (1 j / demi-journee)" },
      { value: "hour", label: "Heures par jour" },
    ],
    hint: "Determine la facon de remplir le calendrier du CRA.",
  },
];

const hoursPerDayField: FieldConfig = {
  key: "hoursPerDay",
  label: "Heures par jour",
  type: "number",
  min: "0.5",
  step: "0.5",
  hint: "Base contractuelle, utilisee comme valeur par defaut et pour l'equivalent en jours.",
};

const autoEntrepreneurFields: FieldConfig[] = [
  { key: "siret", label: "SIRET" },
  { key: "dailyRate", label: "Tarif journalier", type: "number", min: "0", step: "0.01" },
  { key: "iban", label: "IBAN" },
  { key: "bic", label: "BIC" },
];

function renderField(
  field: FieldConfig,
  form: BillingProfileFormState,
  onChange: (form: BillingProfileFormState) => void,
) {
  return (
    <div key={field.key} className={`space-y-1 ${field.className ?? ""}`.trim()}>
      <Label>{field.label}</Label>
      {field.options ? (
        <select
          value={form[field.key]}
          onChange={(event) => onChange({ ...form, [field.key]: event.target.value })}
          className="h-9 w-full rounded-md border border-slate-300 bg-white px-3 text-sm"
        >
          {field.options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      ) : (
        <Input
          type={field.type}
          min={field.min}
          step={field.step}
          value={form[field.key]}
          onChange={(event) =>
            onChange({
              ...form,
              [field.key]: event.target.value,
            })
          }
        />
      )}
      {field.hint ? <p className="text-xs text-[#0A1A2F]/55">{field.hint}</p> : null}
    </div>
  );
}

export function BillingProfileCard({
  form,
  onChange,
  onSubmit,
  saving,
  loading,
}: BillingProfileCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle>Profil de facturation</CardTitle>
          <p className="mt-1 text-sm text-[#0A1A2F]/70">
            Ces informations sont utilisees pour le CRA et les futurs flux de facturation.
          </p>
        </div>
        <Button
          type="button"
          size="sm"
          onClick={() => void onSubmit()}
          disabled={saving || loading}
          className="self-start sm:self-auto"
        >
          {saving ? "Enregistrement..." : "Enregistrer"}
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 md:grid-cols-2">
          {generalFields.map((field) => renderField(field, form, onChange))}
        </div>

        <fieldset className="rounded-xl border border-[#0A1A2F]/15 px-4 pb-4 pt-2">
          <legend className="px-2 text-sm font-semibold text-[#0A1A2F]/70">
            Saisie du CRA
          </legend>
          <div className="grid gap-3 md:grid-cols-2">
            {craEntryFields.map((field) => renderField(field, form, onChange))}
            {/* La base horaire n'a de sens qu'en mode horaire : on evite un champ inerte. */}
            {form.timeUnit === "hour" ? renderField(hoursPerDayField, form, onChange) : null}
          </div>
        </fieldset>

        <fieldset className="rounded-xl border border-[#0A1A2F]/15 px-4 pb-4 pt-2">
          <legend className="px-2 text-sm font-semibold text-[#0A1A2F]/70">
            Reserve aux auto-entrepreneurs{" "}
            <span className="font-normal text-[#0A1A2F]/50">(optionnel)</span>
          </legend>
          <div className="grid gap-3 md:grid-cols-2">
            {autoEntrepreneurFields.map((field) => renderField(field, form, onChange))}
          </div>
        </fieldset>
      </CardContent>
    </Card>
  );
}
