"use client";

import { useState } from "react";
import { Pencil, Plus, Trash2, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { SettingsField, SettingsInput } from "@/components/console/settings-fields";

/** Une mission telle que la renvoie l'API (colonnes de MISSION_COLUMNS). */
export type MissionItem = {
  id: string;
  company_name: string;
  esn_partenaire: string | null;
  rate: number | null;
  rate_unit: string;
  archived_at: string | null;
};

export type MissionFormState = {
  /** null en creation, l'identifiant en modification. */
  id: string | null;
  companyName: string;
  esnPartenaire: string;
  rateUnit: "day" | "hour";
  rate: string;
};

export const emptyMissionForm = (): MissionFormState => ({
  id: null,
  companyName: "",
  esnPartenaire: "",
  rateUnit: "day",
  rate: "",
});

function missionToForm(mission: MissionItem): MissionFormState {
  return {
    id: mission.id,
    companyName: mission.company_name,
    esnPartenaire: mission.esn_partenaire ?? "",
    rateUnit: mission.rate_unit === "hour" ? "hour" : "day",
    rate: mission.rate === null ? "" : String(mission.rate),
  };
}

export function formatMissionRate(mission: MissionItem) {
  if (mission.rate === null) return "Tarif à renseigner";
  const suffix = mission.rate_unit === "hour" ? "/ h" : "/ j";
  return `${new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(
    mission.rate,
  )} ${suffix}`;
}

type MissionsEditorProps = {
  missions: MissionItem[];
  onSave: (form: MissionFormState) => void | Promise<void>;
  onDelete: (missionId: string) => void | Promise<void>;
  saving: boolean;
  loading: boolean;
  message: string | null;
};

type MissionsCardProps = MissionsEditorProps & {
  className?: string;
  /** Titre adapte au contexte : le RH gere les missions d'un collaborateur. */
  title?: string;
  description?: string;
};

/**
 * Gestion des entreprises clientes d'un collaborateur : liste, ajout, modification.
 *
 * Chaque mission porte son propre tarif et sa propre unite : un consultant peut etre
 * facture a l'heure chez un client et a la journee chez un autre. C'est ce couple qui
 * remplace les champs « Societe » et « Tarif journalier » du profil de facturation, qui
 * n'en admettaient qu'un seul.
 *
 * CORPS SEUL, sans cadre : la page de parametres le pose dans une `SettingsSection` pour
 * qu'il ait exactement la meme forme que les autres reglages, tandis que la fiche
 * collaborateur passe par `MissionsCard`, qui rend le cadre historique. Deux presentations,
 * une seule implementation.
 */
export function MissionsEditor({
  missions,
  onSave,
  onDelete,
  saving,
  loading,
  message,
}: MissionsEditorProps) {
  const [form, setForm] = useState<MissionFormState>(emptyMissionForm());
  const [editing, setEditing] = useState(false);

  const startCreate = () => {
    setForm(emptyMissionForm());
    setEditing(true);
  };

  const startEdit = (mission: MissionItem) => {
    setForm(missionToForm(mission));
    setEditing(true);
  };

  const cancel = () => {
    setForm(emptyMissionForm());
    setEditing(false);
  };

  const submit = async () => {
    await onSave(form);
    cancel();
  };

  const isHourly = form.rateUnit === "hour";

  return (
    <div className="space-y-4">
      {/*
        Le bouton d'ajout se tient AVEC la liste, et non dans l'en-tete du cadre : le corps
        est rendu tantot dans une `SettingsSection`, tantot dans le panneau de la fiche
        collaborateur, et il ne peut pas compter sur l'en-tete de l'un ou de l'autre.
      */}
      {!editing ? (
        <div className="flex justify-end">
          <Button type="button" size="sm" onClick={startCreate} disabled={loading}>
            <Plus className="mr-1 h-4 w-4" />
            Ajouter
          </Button>
        </div>
      ) : null}

      <div className="space-y-4">
        {loading ? (
          <p className="text-app-sm text-app-text-muted">Chargement...</p>
        ) : missions.length === 0 ? (
          <p className="rounded-app-card border border-dashed border-app-line p-4 text-app-sm text-app-text-muted">
            Aucune entreprise enregistrée. Ajoutez une première entreprise pour pouvoir
            saisir un CRA et générer une facture.
          </p>
        ) : (
          <ul className="divide-y divide-app-line rounded-app-card border border-app-line">
            {missions.map((mission) => (
              <li
                key={mission.id}
                className="flex flex-col gap-2 p-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <p className="truncate text-app-sm font-medium text-app-text">
                    {mission.company_name}
                  </p>
                  <p className="text-app-xs text-app-text-muted">
                    {formatMissionRate(mission)}
                    {mission.esn_partenaire ? ` · via ${mission.esn_partenaire}` : ""}
                  </p>
                </div>
                <div className="flex shrink-0 gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => startEdit(mission)}
                    disabled={saving}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => void onDelete(mission.id)}
                    disabled={saving}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}

        {editing ? (
          <div className="space-y-3 rounded-app-card border border-app-line bg-app-surface-hover p-3">
            <div className="flex items-center justify-between">
              <p className="text-app-sm font-medium text-app-text">
                {form.id ? "Modifier l'entreprise" : "Nouvelle entreprise"}
              </p>
              <Button type="button" size="sm" variant="ghost" onClick={cancel}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/*
              Une seule colonne : la carte s'affiche desormais dans une colonne d'un tiers
              sur la fiche collaborateur, ou `md:grid-cols-2` — qui suit la largeur de la
              FENETRE, pas celle du conteneur — serrait deux champs dans 180 px.
            */}
            <div className="grid gap-3">
              <SettingsField label="Entreprise cliente" htmlFor="mission-company">
                <SettingsInput
                  id="mission-company"
                  value={form.companyName}
                  onChange={(event) => setForm({ ...form, companyName: event.target.value })}
                  placeholder="Nom de l'entreprise"
                />
              </SettingsField>

              <SettingsField label="ESN partenaire" htmlFor="mission-esn" hint="Facultatif.">
                <SettingsInput
                  id="mission-esn"
                  value={form.esnPartenaire}
                  onChange={(event) => setForm({ ...form, esnPartenaire: event.target.value })}
                />
              </SettingsField>

              <SettingsField
                label="Unité"
                htmlFor="mission-unit"
                hint="Détermine la saisie du calendrier et l'unité du tarif."
              >
                <select
                  id="mission-unit"
                  value={form.rateUnit}
                  onChange={(event) =>
                    setForm({ ...form, rateUnit: event.target.value === "hour" ? "hour" : "day" })
                  }
                  className="h-9 w-full rounded-app-control border border-app-line bg-app-field px-3 text-app-sm text-app-text focus-visible:outline-app"
                >
                  <option value="day">Journées (1 j / demi-journée)</option>
                  <option value="hour">Heures par jour</option>
                </select>
              </SettingsField>

              <SettingsField
                label={isHourly ? "Tarif horaire" : "Tarif journalier"}
                htmlFor="mission-rate"
              >
                <SettingsInput
                  id="mission-rate"
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.rate}
                  onChange={(event) => setForm({ ...form, rate: event.target.value })}
                />
              </SettingsField>
            </div>

            <div className="flex justify-end gap-2">
              <Button type="button" size="sm" variant="outline" onClick={cancel} disabled={saving}>
                Annuler
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={() => void submit()}
                disabled={saving || !form.companyName.trim()}
              >
                {saving ? "Enregistrement..." : "Enregistrer"}
              </Button>
            </div>
          </div>
        ) : null}

        {message ? <p className="text-app-sm text-app-text-secondary">{message}</p> : null}
      </div>
    </div>
  );
}

/**
 * Le corps, dans le cadre de la console.
 *
 * Conserve pour la fiche collaborateur, qui aligne ses panneaux sur cette forme. La page
 * de parametres, elle, utilise `MissionsEditor` directement dans une `SettingsSection`.
 */
export function MissionsCard({
  className,
  title = "Mes entreprises",
  description = "Une ligne par entreprise cliente, avec son tarif et son unite de saisie.",
  ...editor
}: MissionsCardProps) {
  return (
    <section
      className={`rounded-app-card border border-app-line bg-app-surface p-5 ${className ?? ""}`}
    >
      <div className="min-w-0">
        <h2 className="text-app-md font-semibold text-app-text">{title}</h2>
        <p className="mt-1 text-app-sm text-app-text-secondary">{description}</p>
      </div>
      <div className="mt-4">
        <MissionsEditor {...editor} />
      </div>
    </section>
  );
}
