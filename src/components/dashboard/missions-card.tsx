"use client";

import { useState } from "react";
import { Pencil, Plus, Trash2, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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
  if (mission.rate === null) return "Tarif a renseigner";
  const suffix = mission.rate_unit === "hour" ? "/ h" : "/ j";
  return `${new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(
    mission.rate,
  )} ${suffix}`;
}

type MissionsCardProps = {
  missions: MissionItem[];
  onSave: (form: MissionFormState) => void | Promise<void>;
  onDelete: (missionId: string) => void | Promise<void>;
  saving: boolean;
  loading: boolean;
  message: string | null;
  className?: string;
  /** Titre adapte au contexte : le RH gere les missions d'un collaborateur. */
  title?: string;
  description?: string;
};

/**
 * Gestion des entreprises clientes d'un collaborateur.
 *
 * Chaque mission porte son propre tarif et sa propre unite : un consultant peut etre
 * facture a l'heure chez un client et a la journee chez un autre. C'est ce couple qui
 * remplace les champs « Societe » et « Tarif journalier » du profil de facturation, qui
 * n'en admettaient qu'un seul.
 */
export function MissionsCard({
  missions,
  onSave,
  onDelete,
  saving,
  loading,
  message,
  className,
  title = "Mes entreprises",
  description = "Une ligne par entreprise cliente, avec son tarif et son unite de saisie.",
}: MissionsCardProps) {
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
    <Card className={className}>
      <CardHeader className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle>{title}</CardTitle>
          <p className="mt-1 text-sm text-[#0A1A2F]/70">{description}</p>
        </div>
        {!editing ? (
          <Button
            type="button"
            size="sm"
            onClick={startCreate}
            disabled={loading}
            className="self-start sm:self-auto"
          >
            <Plus className="mr-1 h-4 w-4" />
            Ajouter
          </Button>
        ) : null}
      </CardHeader>

      <CardContent className="space-y-4">
        {loading ? (
          <p className="text-sm text-[#0A1A2F]/60">Chargement...</p>
        ) : missions.length === 0 ? (
          <p className="rounded-md border border-dashed border-slate-300 p-4 text-sm text-[#0A1A2F]/60">
            Aucune entreprise enregistree. Ajoute ta premiere entreprise pour pouvoir saisir
            un CRA et generer une facture.
          </p>
        ) : (
          <ul className="divide-y divide-slate-200 rounded-md border border-slate-200">
            {missions.map((mission) => (
              <li
                key={mission.id}
                className="flex flex-col gap-2 p-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-[#0A1A2F]">
                    {mission.company_name}
                  </p>
                  <p className="text-xs text-[#0A1A2F]/60">
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
          <div className="space-y-3 rounded-md border border-slate-200 bg-slate-50/60 p-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-[#0A1A2F]">
                {form.id ? "Modifier l'entreprise" : "Nouvelle entreprise"}
              </p>
              <Button type="button" size="sm" variant="ghost" onClick={cancel}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-1 md:col-span-2">
                <Label>Entreprise cliente</Label>
                <Input
                  value={form.companyName}
                  onChange={(event) => setForm({ ...form, companyName: event.target.value })}
                  placeholder="Nom de l'entreprise"
                />
              </div>

              <div className="space-y-1">
                <Label>ESN partenaire (optionnel)</Label>
                <Input
                  value={form.esnPartenaire}
                  onChange={(event) => setForm({ ...form, esnPartenaire: event.target.value })}
                />
              </div>

              <div className="space-y-1">
                <Label>Unite</Label>
                <select
                  value={form.rateUnit}
                  onChange={(event) =>
                    setForm({ ...form, rateUnit: event.target.value === "hour" ? "hour" : "day" })
                  }
                  className="h-9 w-full rounded-md border border-slate-300 bg-white px-3 text-sm"
                >
                  <option value="day">Journees (1 j / demi-journee)</option>
                  <option value="hour">Heures par jour</option>
                </select>
                <p className="text-xs text-[#0A1A2F]/55">
                  Determine la saisie du calendrier et l&apos;unite du tarif.
                </p>
              </div>

              <div className="space-y-1">
                <Label>{isHourly ? "Tarif horaire" : "Tarif journalier"}</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.rate}
                  onChange={(event) => setForm({ ...form, rate: event.target.value })}
                />
              </div>

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

        {message ? <p className="text-sm text-[#0A1A2F]/70">{message}</p> : null}
      </CardContent>
    </Card>
  );
}
