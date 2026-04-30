import type { Dispatch, FormEvent, SetStateAction } from "react";
import { AlertCircle, CheckCircle2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type {
  AdminOfferFormState,
  AdminStatus,
} from "@/features/dashboard/admin/types";

type AdminOfferCreateFormProps = {
  offerForm: AdminOfferFormState;
  setOfferForm: Dispatch<SetStateAction<AdminOfferFormState>>;
  offerSaving: boolean;
  offerStatus: AdminStatus;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void | Promise<void>;
};

export function AdminOfferCreateForm({
  offerForm,
  setOfferForm,
  offerSaving,
  offerStatus,
  onSubmit,
}: AdminOfferCreateFormProps) {
  return (
    <Card className="border-slate-200 bg-white text-[#0A1A2F] shadow-lg backdrop-blur">
      <CardHeader>
        <CardTitle className="text-xl">Créer une offre d&apos;emploi</CardTitle>
        <CardDescription className="text-[#0A1A2F]/70">
          Formulaire rapide pour publier une offre (table job_offers).
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form className="space-y-4" onSubmit={onSubmit}>
          <div className="space-y-2">
            <Label htmlFor="offer-title" className="text-[#0A1A2F]/80">
              Titre
            </Label>
            <Input
              id="offer-title"
              required
              value={offerForm.title}
              onChange={(e) => setOfferForm((prev) => ({ ...prev, title: e.target.value }))}
              className="border-slate-200 bg-slate-50 text-[#0A1A2F] placeholder:text-[#0A1A2F]/40 focus-visible:ring-[#2aa0dd]"
              placeholder="Développeur Full Stack"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="offer-description" className="text-[#0A1A2F]/80">
              Description
            </Label>
            <Textarea
              id="offer-description"
              required
              value={offerForm.description}
              onChange={(e) =>
                setOfferForm((prev) => ({ ...prev, description: e.target.value }))
              }
              className="border-slate-200 bg-slate-50 text-[#0A1A2F] placeholder:text-[#0A1A2F]/40 focus-visible:ring-[#2aa0dd]"
              placeholder="Missions, profil recherché, stack..."
              rows={4}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="offer-location" className="text-[#0A1A2F]/80">
                Localisation
              </Label>
              <Input
                id="offer-location"
                value={offerForm.location}
                onChange={(e) =>
                  setOfferForm((prev) => ({ ...prev, location: e.target.value }))
                }
                className="border-slate-200 bg-slate-50 text-[#0A1A2F] placeholder:text-[#0A1A2F]/40 focus-visible:ring-[#2aa0dd]"
                placeholder="Paris / Remote"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="offer-contract" className="text-[#0A1A2F]/80">
                Type de contrat
              </Label>
              <Input
                id="offer-contract"
                value={offerForm.contract_type}
                onChange={(e) =>
                  setOfferForm((prev) => ({ ...prev, contract_type: e.target.value }))
                }
                className="border-slate-200 bg-slate-50 text-[#0A1A2F] placeholder:text-[#0A1A2F]/40 focus-visible:ring-[#2aa0dd]"
                placeholder="CDI / CDD / Freelance"
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="offer-department" className="text-[#0A1A2F]/80">
                Département
              </Label>
              <Input
                id="offer-department"
                value={offerForm.department}
                onChange={(e) =>
                  setOfferForm((prev) => ({ ...prev, department: e.target.value }))
                }
                className="border-slate-200 bg-slate-50 text-[#0A1A2F] placeholder:text-[#0A1A2F]/40 focus-visible:ring-[#2aa0dd]"
                placeholder="IT / Support / Cloud..."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="offer-workmode" className="text-[#0A1A2F]/80">
                Mode de travail
              </Label>
              <Input
                id="offer-workmode"
                value={offerForm.work_mode}
                onChange={(e) =>
                  setOfferForm((prev) => ({ ...prev, work_mode: e.target.value }))
                }
                className="border-slate-200 bg-slate-50 text-[#0A1A2F] placeholder:text-[#0A1A2F]/40 focus-visible:ring-[#2aa0dd]"
                placeholder="Remote / Hybride / On-site"
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="offer-experience" className="text-[#0A1A2F]/80">
                Niveau d&apos;expérience
              </Label>
              <Input
                id="offer-experience"
                value={offerForm.experience_level}
                onChange={(e) =>
                  setOfferForm((prev) => ({ ...prev, experience_level: e.target.value }))
                }
                className="border-slate-200 bg-slate-50 text-[#0A1A2F] placeholder:text-[#0A1A2F]/40 focus-visible:ring-[#2aa0dd]"
                placeholder="Junior / Intermédiaire / Senior"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="offer-salary-min" className="text-[#0A1A2F]/80">
                  Salaire min
                </Label>
                <Input
                  id="offer-salary-min"
                  type="number"
                  value={offerForm.salary_min}
                  onChange={(e) =>
                    setOfferForm((prev) => ({ ...prev, salary_min: e.target.value }))
                  }
                  className="border-slate-200 bg-slate-50 text-[#0A1A2F] placeholder:text-[#0A1A2F]/40 focus-visible:ring-[#2aa0dd]"
                  placeholder="50000"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="offer-salary-max" className="text-[#0A1A2F]/80">
                  Salaire max
                </Label>
                <Input
                  id="offer-salary-max"
                  type="number"
                  value={offerForm.salary_max}
                  onChange={(e) =>
                    setOfferForm((prev) => ({ ...prev, salary_max: e.target.value }))
                  }
                  className="border-slate-200 bg-slate-50 text-[#0A1A2F] placeholder:text-[#0A1A2F]/40 focus-visible:ring-[#2aa0dd]"
                  placeholder="70000"
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="offer-tech" className="text-[#0A1A2F]/80">
              Stack technique (séparée par des virgules)
            </Label>
            <Input
              id="offer-tech"
              value={offerForm.tech_stack}
              onChange={(e) =>
                setOfferForm((prev) => ({ ...prev, tech_stack: e.target.value }))
              }
              className="border-slate-200 bg-slate-50 text-[#0A1A2F] placeholder:text-[#0A1A2F]/40 focus-visible:ring-[#2aa0dd]"
              placeholder="React, Node, PostgreSQL"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="offer-company" className="text-[#0A1A2F]/80">
              Nom de l&apos;entreprise
            </Label>
            <Input
              id="offer-company"
              value={offerForm.company_name}
              onChange={(e) =>
                setOfferForm((prev) => ({ ...prev, company_name: e.target.value }))
              }
              className="border-slate-200 bg-slate-50 text-[#0A1A2F] placeholder:text-[#0A1A2F]/40 focus-visible:ring-[#2aa0dd]"
              placeholder="Jarvis Connect"
            />
          </div>

          {offerStatus.type !== "idle" && (
            <div
              className={`flex items-start gap-2 rounded-md border px-3 py-2 text-sm ${
                offerStatus.type === "error"
                  ? "border-red-300 bg-red-50 text-red-900"
                  : "border-emerald-300 bg-emerald-50 text-emerald-900"
              }`}
            >
              {offerStatus.type === "error" ? (
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              ) : (
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
              )}
              <p className="leading-relaxed">{offerStatus.message}</p>
            </div>
          )}

          <Button
            type="submit"
            disabled={offerSaving}
            className="w-full bg-[#2aa0dd] text-[#0A1A2F] hover:bg-[#2493cb]"
          >
            {offerSaving ? "Création en cours..." : "Publier l'offre"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
