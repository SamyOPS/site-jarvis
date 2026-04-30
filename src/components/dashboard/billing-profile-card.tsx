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
};

const fields: FieldConfig[] = [
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
  { key: "siret", label: "SIRET" },
  { key: "dailyRate", label: "Tarif journalier", type: "number", min: "0", step: "0.01" },
  { key: "iban", label: "IBAN" },
  { key: "bic", label: "BIC" },
];

export function BillingProfileCard({
  form,
  onChange,
  onSubmit,
  saving,
  loading,
}: BillingProfileCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-3">
        <div>
          <CardTitle>Profil de facturation</CardTitle>
          <p className="mt-1 text-sm text-[#0A1A2F]/70">
            Ces informations sont utilisees pour le CRA et les futurs flux de facturation.
          </p>
        </div>
        <Button type="button" size="sm" onClick={() => void onSubmit()} disabled={saving || loading}>
          {saving ? "Enregistrement..." : "Enregistrer"}
        </Button>
      </CardHeader>
      <CardContent className="grid gap-3 md:grid-cols-2">
        {fields.map((field) => (
          <div key={field.key} className={`space-y-1 ${field.className ?? ""}`.trim()}>
            <Label>{field.label}</Label>
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
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
