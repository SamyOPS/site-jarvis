import type { Dispatch, FormEvent, SetStateAction } from "react";
import { AlertCircle, CheckCircle2 } from "lucide-react";

import { OfferFormFields } from "@/components/dashboard/offers/offer-form-fields";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { AsyncStatus } from "@/domain/common";
import type { JobOfferFormState } from "@/domain/offers";

type AdminOfferCreateFormProps = {
  offerForm: JobOfferFormState;
  setOfferForm: Dispatch<SetStateAction<JobOfferFormState>>;
  offerSaving: boolean;
  offerStatus: AsyncStatus;
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
          <OfferFormFields
            form={offerForm}
            setForm={setOfferForm}
            idPrefix=""
            showCompanyName
          />

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
            className="w-full bg-[#0A1A2F] text-white hover:bg-[#0d2a4b]"
          >
            {offerSaving ? "Création en cours..." : "Publier l'offre"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
