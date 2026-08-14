import type { Dispatch, FormEvent, SetStateAction } from "react";
import { AlertCircle, ShieldCheck } from "lucide-react";

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
import type { ProOfferFormState } from "@/features/dashboard/pro/types";

type ProOfferCreateFormProps = {
  offerForm: ProOfferFormState;
  setOfferForm: Dispatch<SetStateAction<ProOfferFormState>>;
  offerSaving: boolean;
  offerStatus: AsyncStatus;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void | Promise<void>;
};

export function ProOfferCreateForm({
  offerForm,
  setOfferForm,
  offerSaving,
  offerStatus,
  onSubmit,
}: ProOfferCreateFormProps) {
  return (
    <Card className="border-slate-200 bg-white text-[#0A1A2F] shadow-sm">
      <CardHeader className="space-y-1">
        <CardTitle className="text-xl">Deposer une offre</CardTitle>
        <CardDescription className="text-[#0A1A2F]/70">
          Publie une offre visible immediatement sur le site.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form className="space-y-4" onSubmit={onSubmit}>
          <OfferFormFields
            form={offerForm}
            setForm={setOfferForm}
            idPrefix="pro-"
            showCompanyName={false}
            placeholders={{
              title: "Responsable support IT",
              department: "Support / Cloud / IT",
            }}
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
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
              )}
              <p className="leading-relaxed">{offerStatus.message}</p>
            </div>
          )}

          <Button
            type="submit"
            disabled={offerSaving}
            className="w-full bg-[#0A1A2F] text-white hover:bg-[#0d2a4b]"
          >
            {offerSaving ? "Publication en cours..." : "Publier l'offre"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
