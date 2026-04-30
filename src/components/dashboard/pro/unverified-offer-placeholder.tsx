import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type ProUnverifiedOfferPlaceholderProps = {
  isPending: boolean;
};

export function ProUnverifiedOfferPlaceholder({
  isPending,
}: ProUnverifiedOfferPlaceholderProps) {
  return (
    <Card className="border-slate-200 bg-white text-[#0A1A2F] shadow-sm">
      <CardHeader className="space-y-1">
        <CardTitle className="text-xl">Deposer une offre</CardTitle>
        <CardDescription className="text-[#0A1A2F]/70">
          Disponible apres validation du compte professionnel.
        </CardDescription>
      </CardHeader>
      <CardContent className="text-sm text-[#0A1A2F]/70">
        {isPending
          ? "Ton compte est en cours de verification. Tu pourras publier des offres des que le statut sera verifie."
          : "Demande la verification de ton compte pour publier des offres."}
        <div className="mt-4">
          <Button
            variant="outline"
            className="border-slate-300 text-[#0A1A2F]"
            onClick={() => (window.location.href = "/contact")}
          >
            Contacter l&apos;administration
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
