"use client";

import type { Dispatch, SetStateAction } from "react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { JobOfferFormState } from "@/domain/offers";

/** Habillage commun a tous les champs du formulaire, repete 11 fois par copie. */
const FIELD_CLASS =
  "border-slate-200 bg-slate-50 text-[#0A1A2F] placeholder:text-[#0A1A2F]/40 focus-visible:ring-[#2aa0dd]";

type OfferFieldKey = keyof JobOfferFormState;

/** Socle commun aux deux appelants : le formulaire pro n'a pas de champ entreprise. */
type OfferFormBase = Omit<JobOfferFormState, "company_name">;

type OfferFormFieldsProps<TForm extends OfferFormBase> = {
  form: TForm;
  setForm: Dispatch<SetStateAction<TForm>>;
  /**
   * Prefixe des `id` de champs. Deux formulaires peuvent coexister dans la meme page :
   * sans prefixe distinct, cliquer un libelle activerait le champ de l'autre.
   */
  idPrefix: string;
  /** Placeholders specifiques a l'appelant. Les autres gardent la valeur par defaut. */
  placeholders?: Partial<Record<OfferFieldKey, string>>;
  /**
   * L'entreprise est saisie a la main cote admin ; cote pro elle est deduite du profil
   * du compte, le champ n'a donc pas lieu d'exister.
   */
  showCompanyName: boolean;
};

const DEFAULT_PLACEHOLDERS: Record<OfferFieldKey, string> = {
  title: "Développeur Full Stack",
  description: "Missions, profil recherché, stack...",
  location: "Paris / Remote",
  contract_type: "CDI / CDD / Freelance",
  company_name: "Jarvis Connect",
  department: "IT / Support / Cloud...",
  work_mode: "Remote / Hybride / On-site",
  experience_level: "Junior / Intermédiaire / Senior",
  salary_min: "50000",
  salary_max: "70000",
  tech_stack: "React, Node, PostgreSQL",
};

/**
 * Les onze champs d'une offre d'emploi, dans la mise en page du formulaire de creation.
 *
 * Les espaces admin et pro en portaient chacun une copie, ne differant que par le prefixe
 * des identifiants, quelques placeholders et la presence du champ entreprise. Les libelles
 * sont ici ceux, accentues, de la version admin : la copie pro avait perdu ses accents.
 */
export function OfferFormFields<TForm extends OfferFormBase>({
  form,
  setForm,
  idPrefix,
  placeholders,
  showCompanyName,
}: OfferFormFieldsProps<TForm>) {
  const placeholderFor = (key: OfferFieldKey) =>
    placeholders?.[key] ?? DEFAULT_PLACEHOLDERS[key];

  // `company_name` n'existe que sur le formulaire complet ; il n'est lu que sous
  // `showCompanyName`, que seul l'appelant qui porte ce champ active.
  const valueOf = (key: OfferFieldKey) =>
    (form as unknown as JobOfferFormState)[key] ?? "";

  const field = (
    key: OfferFieldKey,
    label: string,
    options?: { required?: boolean; type?: string },
  ) => (
    <div className="space-y-2">
      <Label htmlFor={`${idPrefix}offer-${key}`} className="text-[#0A1A2F]/80">
        {label}
      </Label>
      <Input
        id={`${idPrefix}offer-${key}`}
        type={options?.type}
        required={options?.required}
        value={valueOf(key)}
        onChange={(event) =>
          setForm((prev) => ({ ...prev, [key]: event.target.value }))
        }
        className={FIELD_CLASS}
        placeholder={placeholderFor(key)}
      />
    </div>
  );

  return (
    <>
      {field("title", "Titre", { required: true })}

      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}offer-description`} className="text-[#0A1A2F]/80">
          Description
        </Label>
        <Textarea
          id={`${idPrefix}offer-description`}
          required
          value={form.description}
          onChange={(event) =>
            setForm((prev) => ({ ...prev, description: event.target.value }))
          }
          className={FIELD_CLASS}
          placeholder={placeholderFor("description")}
          rows={4}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {field("location", "Localisation")}
        {field("contract_type", "Type de contrat")}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {field("department", "Département")}
        {field("work_mode", "Mode de travail")}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {field("experience_level", "Niveau d’expérience")}
        <div className="grid grid-cols-2 gap-3">
          {field("salary_min", "Salaire min", { type: "number" })}
          {field("salary_max", "Salaire max", { type: "number" })}
        </div>
      </div>

      {field("tech_stack", "Stack technique (séparée par des virgules)")}

      {showCompanyName ? field("company_name", "Nom de l’entreprise") : null}
    </>
  );
}
