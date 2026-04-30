import type { Dispatch, FormEvent, SetStateAction } from "react";
import { AlertCircle, CheckCircle2, Loader2, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
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
  AdminJobOffer,
  AdminOfferEditFormState,
  AdminStatus,
} from "@/features/dashboard/admin/types";

type AdminOffersListCardProps = {
  jobOffers: AdminJobOffer[];
  offerActionStatus: AdminStatus;
  offerActionId: string | null;
  editingOfferId: string | null;
  offerEditSaving: boolean;
  offerEditStatus: AdminStatus;
  offerEditForm: AdminOfferEditFormState;
  setOfferEditForm: Dispatch<SetStateAction<AdminOfferEditFormState>>;
  onEditStart: (offer: AdminJobOffer) => void;
  onEditCancel: () => void;
  onEditSubmit: (event: FormEvent<HTMLFormElement>) => void | Promise<void>;
  onDelete: (offerId: string) => void | Promise<void>;
};

export function AdminOffersListCard({
  jobOffers,
  offerActionStatus,
  offerActionId,
  editingOfferId,
  offerEditSaving,
  offerEditStatus,
  offerEditForm,
  setOfferEditForm,
  onEditStart,
  onEditCancel,
  onEditSubmit,
  onDelete,
}: AdminOffersListCardProps) {
  return (
    <Card className="border-slate-200 bg-white text-[#0A1A2F] shadow-lg backdrop-blur">
      <CardHeader className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <CardTitle className="text-xl">Offres d&apos;emploi</CardTitle>
          <CardDescription className="text-[#0A1A2F]/70">
            Liste des offres présentes en base (job_offers), triées par date de publication.
          </CardDescription>
        </div>
        <Badge variant="outline" className="border-slate-300 text-[#0A1A2F]">
          {jobOffers.length} offres
        </Badge>
      </CardHeader>
      <CardContent className="space-y-3">
        {offerActionStatus.type !== "idle" && (
          <div
            className={`flex items-start gap-2 rounded-md border px-3 py-2 text-sm ${
              offerActionStatus.type === "error"
                ? "border-red-300 bg-red-50 text-red-900"
                : "border-emerald-300 bg-emerald-50 text-emerald-900"
            }`}
          >
            {offerActionStatus.type === "error" ? (
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            ) : (
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
            )}
            <p className="leading-relaxed">{offerActionStatus.message}</p>
          </div>
        )}
        {jobOffers.length ? (
          <div className="grid gap-3">
            {jobOffers.map((offer) => (
              <div
                key={offer.id}
                className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-semibold">{offer.title}</p>
                    <p className="text-[#0A1A2F]/70 text-xs">
                      {offer.company_name ?? "Entreprise inconnue"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="border-slate-300 text-[#0A1A2F]">
                      {offer.status ?? "inconnu"}
                    </Badge>
                    {offer.contract_type && (
                      <Badge variant="outline" className="border-slate-300 text-[#0A1A2F]/80">
                        {offer.contract_type}
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="mt-2 text-[#0A1A2F]/70">
                  <span>{offer.location ?? "Localisation non précisée"}</span>
                </div>
                <div className="mt-1 text-xs text-[#0A1A2F]/60">
                  Publiée le{" "}
                  {offer.published_at
                    ? new Date(offer.published_at).toLocaleString()
                    : "N/A"}
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-slate-300 text-[#0A1A2F] hover:bg-white"
                    disabled={offerEditSaving && editingOfferId === offer.id}
                    onClick={() => onEditStart(offer)}
                  >
                    {offerEditSaving && editingOfferId === offer.id && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Modifier
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-red-300 text-red-700 hover:bg-red-50"
                    disabled={offerActionId === offer.id}
                    onClick={() => {
                      const confirmDelete = window.confirm(
                        "Supprimer définitivement cette offre ?"
                      );
                      if (confirmDelete) {
                        void onDelete(offer.id);
                      }
                    }}
                  >
                    {offerActionId === offer.id ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="mr-2 h-4 w-4" />
                    )}
                    Supprimer
                  </Button>
                </div>
                {editingOfferId === offer.id && (
                  <form
                    className="mt-3 space-y-3 rounded-md border border-slate-200 bg-white p-3 text-sm"
                    onSubmit={onEditSubmit}
                  >
                    <div className="space-y-1.5">
                      <Label className="text-[#0A1A2F]/80">Titre</Label>
                      <Input
                        value={offerEditForm.title}
                        onChange={(e) =>
                          setOfferEditForm((prev) => ({ ...prev, title: e.target.value }))
                        }
                        className="border-slate-200 bg-slate-50 text-[#0A1A2F] placeholder:text-[#0A1A2F]/40 focus-visible:ring-[#2aa0dd]"
                        placeholder="Titre de l'offre"
                        required
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[#0A1A2F]/80">Description</Label>
                      <Textarea
                        value={offerEditForm.description}
                        onChange={(e) =>
                          setOfferEditForm((prev) => ({
                            ...prev,
                            description: e.target.value,
                          }))
                        }
                        className="border-slate-200 bg-slate-50 text-[#0A1A2F] placeholder:text-[#0A1A2F]/40 focus-visible:ring-[#2aa0dd]"
                        placeholder="Missions, profil recherche, stack..."
                        rows={4}
                      />
                    </div>
                    <div className="grid gap-3 md:grid-cols-2">
                      <div className="space-y-1.5">
                        <Label className="text-[#0A1A2F]/80">Entreprise</Label>
                        <Input
                          value={offerEditForm.company_name}
                          onChange={(e) =>
                            setOfferEditForm((prev) => ({
                              ...prev,
                              company_name: e.target.value,
                            }))
                          }
                          className="border-slate-200 bg-slate-50 text-[#0A1A2F] placeholder:text-[#0A1A2F]/40 focus-visible:ring-[#2aa0dd]"
                          placeholder="Nom de l'entreprise"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-[#0A1A2F]/80">Localisation</Label>
                        <Input
                          value={offerEditForm.location}
                          onChange={(e) =>
                            setOfferEditForm((prev) => ({ ...prev, location: e.target.value }))
                          }
                          className="border-slate-200 bg-slate-50 text-[#0A1A2F] placeholder:text-[#0A1A2F]/40 focus-visible:ring-[#2aa0dd]"
                          placeholder="Paris / Remote"
                        />
                      </div>
                    </div>
                    <div className="grid gap-3 md:grid-cols-2">
                      <div className="space-y-1.5">
                        <Label className="text-[#0A1A2F]/80">Type de contrat</Label>
                        <Input
                          value={offerEditForm.contract_type}
                          onChange={(e) =>
                            setOfferEditForm((prev) => ({
                              ...prev,
                              contract_type: e.target.value,
                            }))
                          }
                          className="border-slate-200 bg-slate-50 text-[#0A1A2F] placeholder:text-[#0A1A2F]/40 focus-visible:ring-[#2aa0dd]"
                          placeholder="CDI / CDD / Freelance"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-[#0A1A2F]/80">Departement</Label>
                        <Input
                          value={offerEditForm.department}
                          onChange={(e) =>
                            setOfferEditForm((prev) => ({
                              ...prev,
                              department: e.target.value,
                            }))
                          }
                          className="border-slate-200 bg-slate-50 text-[#0A1A2F] placeholder:text-[#0A1A2F]/40 focus-visible:ring-[#2aa0dd]"
                          placeholder="IT / Support / Cloud"
                        />
                      </div>
                    </div>
                    <div className="grid gap-3 md:grid-cols-2">
                      <div className="space-y-1.5">
                        <Label className="text-[#0A1A2F]/80">Mode de travail</Label>
                        <Input
                          value={offerEditForm.work_mode}
                          onChange={(e) =>
                            setOfferEditForm((prev) => ({
                              ...prev,
                              work_mode: e.target.value,
                            }))
                          }
                          className="border-slate-200 bg-slate-50 text-[#0A1A2F] placeholder:text-[#0A1A2F]/40 focus-visible:ring-[#2aa0dd]"
                          placeholder="Remote / Hybride / On-site"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-[#0A1A2F]/80">Niveau d&apos;experience</Label>
                        <Input
                          value={offerEditForm.experience_level}
                          onChange={(e) =>
                            setOfferEditForm((prev) => ({
                              ...prev,
                              experience_level: e.target.value,
                            }))
                          }
                          className="border-slate-200 bg-slate-50 text-[#0A1A2F] placeholder:text-[#0A1A2F]/40 focus-visible:ring-[#2aa0dd]"
                          placeholder="Junior / Intermediaire / Senior"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label className="text-[#0A1A2F]/80">Salaire min</Label>
                        <Input
                          type="number"
                          value={offerEditForm.salary_min}
                          onChange={(e) =>
                            setOfferEditForm((prev) => ({
                              ...prev,
                              salary_min: e.target.value,
                            }))
                          }
                          className="border-slate-200 bg-slate-50 text-[#0A1A2F] placeholder:text-[#0A1A2F]/40 focus-visible:ring-[#2aa0dd]"
                          placeholder="50000"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-[#0A1A2F]/80">Salaire max</Label>
                        <Input
                          type="number"
                          value={offerEditForm.salary_max}
                          onChange={(e) =>
                            setOfferEditForm((prev) => ({
                              ...prev,
                              salary_max: e.target.value,
                            }))
                          }
                          className="border-slate-200 bg-slate-50 text-[#0A1A2F] placeholder:text-[#0A1A2F]/40 focus-visible:ring-[#2aa0dd]"
                          placeholder="70000"
                        />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[#0A1A2F]/80">
                        Stack technique (separee par des virgules)
                      </Label>
                      <Input
                        value={offerEditForm.tech_stack}
                        onChange={(e) =>
                          setOfferEditForm((prev) => ({
                            ...prev,
                            tech_stack: e.target.value,
                          }))
                        }
                        className="border-slate-200 bg-slate-50 text-[#0A1A2F] placeholder:text-[#0A1A2F]/40 focus-visible:ring-[#2aa0dd]"
                        placeholder="React, Node, PostgreSQL"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[#0A1A2F]/80">Statut</Label>
                      <Input
                        value={offerEditForm.status}
                        onChange={(e) =>
                          setOfferEditForm((prev) => ({ ...prev, status: e.target.value }))
                        }
                        className="border-slate-200 bg-slate-50 text-[#0A1A2F] placeholder:text-[#0A1A2F]/40 focus-visible:ring-[#2aa0dd]"
                        placeholder="draft / published"
                      />
                    </div>
                    {offerEditStatus.type !== "idle" && (
                      <div
                        className={`flex items-start gap-2 rounded-md border px-3 py-2 ${
                          offerEditStatus.type === "error"
                            ? "border-red-300 bg-red-50 text-red-900"
                            : "border-emerald-300 bg-emerald-50 text-emerald-900"
                        }`}
                      >
                        {offerEditStatus.type === "error" ? (
                          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                        ) : (
                          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                        )}
                        <p className="leading-relaxed">{offerEditStatus.message}</p>
                      </div>
                    )}
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="submit"
                        disabled={offerEditSaving}
                        className="bg-[#2aa0dd] text-[#0A1A2F] hover:bg-[#2493cb]"
                      >
                        {offerEditSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {offerEditSaving ? "Enregistrement..." : "Enregistrer"}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        className="border-slate-300 text-[#0A1A2F]"
                        disabled={offerEditSaving}
                        onClick={onEditCancel}
                      >
                        Annuler
                      </Button>
                    </div>
                  </form>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-[#0A1A2F]/70">Aucune offre trouvée.</p>
        )}
      </CardContent>
    </Card>
  );
}
