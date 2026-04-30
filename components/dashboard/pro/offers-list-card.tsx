import type { Dispatch, FormEvent, SetStateAction } from "react";
import { Loader2 } from "lucide-react";

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
  ProJobOffer,
  ProOfferEditFormState,
  ProStatus,
} from "@/features/dashboard/pro/types";

type ProOffersListCardProps = {
  jobOffers: ProJobOffer[];
  offersLoading: boolean;
  offersError: string | null;
  offerActionStatus: ProStatus;
  offerActionId: string | null;
  editingOfferId: string | null;
  offerEditSaving: boolean;
  offerEditStatus: ProStatus;
  offerEditForm: ProOfferEditFormState;
  setOfferEditForm: Dispatch<SetStateAction<ProOfferEditFormState>>;
  onEditStart: (offer: ProJobOffer) => void;
  onEditCancel: () => void;
  onEditSubmit: (event: FormEvent<HTMLFormElement>) => void | Promise<void>;
  onDelete: (offerId: string) => void | Promise<void>;
};

export function ProOffersListCard({
  jobOffers,
  offersLoading,
  offersError,
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
}: ProOffersListCardProps) {
  return (
    <Card className="border-slate-200 bg-white text-[#0A1A2F] shadow-sm">
      <CardHeader className="space-y-1">
        <CardTitle className="text-xl">Mes offres publiees</CardTitle>
        <CardDescription className="text-[#0A1A2F]/70">
          Liste des offres que tu as deposees.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        {offersError && (
          <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-red-900">
            {offersError}
          </div>
        )}
        {offerActionStatus.type !== "idle" && (
          <div
            className={`rounded-md border px-3 py-2 text-sm ${
              offerActionStatus.type === "error"
                ? "border-red-300 bg-red-50 text-red-900"
                : "border-emerald-300 bg-emerald-50 text-emerald-900"
            }`}
          >
            {offerActionStatus.message}
          </div>
        )}
        {offersLoading ? (
          <div className="flex items-center gap-2 text-[#0A1A2F]/70">
            <Loader2 className="h-4 w-4 animate-spin" />
            Chargement des offres...
          </div>
        ) : jobOffers.length ? (
          <div className="space-y-2">
            {jobOffers.map((offer) => (
              <div key={offer.id} className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
                  <div className="space-y-1">
                    <div className="font-semibold">{offer.title}</div>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-[#0A1A2F]/70">
                      {offer.contract_type && <span>{offer.contract_type}</span>}
                      {offer.location && <span>{offer.location}</span>}
                      {offer.published_at && (
                        <span>{new Date(offer.published_at).toLocaleDateString()}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline" className="border-slate-300 text-[#0A1A2F]">
                      {offer.status ?? "draft"}
                    </Badge>
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-slate-300 text-[#0A1A2F]"
                      disabled={offerEditSaving && editingOfferId === offer.id}
                      onClick={() => onEditStart(offer)}
                    >
                      Modifier
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-red-300 text-red-700 hover:bg-red-50"
                      disabled={offerActionId === offer.id}
                      onClick={() => {
                        const confirmDelete = window.confirm(
                          "Supprimer definitivement cette offre ?"
                        );
                        if (confirmDelete) {
                          void onDelete(offer.id);
                        }
                      }}
                    >
                      {offerActionId === offer.id ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : null}
                      Supprimer
                    </Button>
                  </div>
                </div>
                {editingOfferId === offer.id && (
                  <form
                    className="space-y-3 rounded-md border border-slate-200 bg-white p-3 text-sm"
                    onSubmit={onEditSubmit}
                  >
                    <div className="space-y-1.5">
                      <Label className="text-[#0A1A2F]/80">Titre</Label>
                      <Input
                        value={offerEditForm.title}
                        onChange={(e) =>
                          setOfferEditForm((prev) => ({
                            ...prev,
                            title: e.target.value,
                          }))
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
                    </div>
                    <div className="grid gap-3 md:grid-cols-2">
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
                          placeholder="Support / Cloud / IT"
                        />
                      </div>
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
                    </div>
                    <div className="grid gap-3 md:grid-cols-2">
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
                      <Label className="text-[#0A1A2F]/80">Nom de l&apos;entreprise</Label>
                      <Input
                        value={offerEditForm.company_name}
                        onChange={(e) =>
                          setOfferEditForm((prev) => ({
                            ...prev,
                            company_name: e.target.value,
                          }))
                        }
                        className="border-slate-200 bg-slate-50 text-[#0A1A2F] placeholder:text-[#0A1A2F]/40 focus-visible:ring-[#2aa0dd]"
                        placeholder="Jarvis Connect"
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
                        <p className="leading-relaxed">{offerEditStatus.message}</p>
                      </div>
                    )}
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="submit"
                        disabled={offerEditSaving}
                        className="bg-[#0A1A2F] text-white hover:bg-[#0d2a4b]"
                      >
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
          <div className="text-[#0A1A2F]/70">Aucune offre publiee pour le moment.</div>
        )}
      </CardContent>
    </Card>
  );
}
