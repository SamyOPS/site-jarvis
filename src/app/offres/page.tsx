import { ArrowLeft, ArrowRight, CalendarClock, MapPin, Tag } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Footer } from "@/components/sections/footer";
import { getCvSupabaseClient } from "@/lib/cv-supabase";

export const revalidate = 60;

type JobOffer = {
  id: string;
  title: string;
  company_name: string | null;
  client: string | null;
  location: string | null;
  contract_type: string | null;
  description: string | null;
  status: string | null;
  target_tjm: number | null;
  created_at: string;
};

async function fetchOffers(): Promise<{ offers: JobOffer[]; error: string | null }> {
  try {
    const client = getCvSupabaseClient();
    const { data, error } = await client
      .from("appels_offres")
      .select("id,title,company_name,client,location,contract_type,description,status,target_tjm,created_at")
      .eq("status", "published")
      .is("deleted_at", null)
      .order("created_at", { ascending: false });

    if (error) return { offers: [], error: error.message };
    return { offers: (data ?? []) as JobOffer[], error: null };
  } catch (err) {
    return { offers: [], error: err instanceof Error ? err.message : "Erreur inconnue" };
  }
}

export default async function OffresPage() {
  const { offers, error } = await fetchOffers();

  return (
    <>
      <div className="min-h-screen bg-white text-[#0A1A2F]">
        <main className="particle-readability container mx-auto px-6 py-14 lg:px-10 xl:px-16">
          <div className="mb-6 flex items-center">
            <Button variant="link" className="p-0 text-[#0A1A2F]" asChild>
              <a href="/#offres" className="inline-flex items-center gap-2">
                <ArrowLeft className="h-4 w-4" />
                Retour à l&apos;accueil
              </a>
            </Button>
          </div>

          <div className="text-center space-y-3 mb-10">
            <p className="text-sm uppercase tracking-[0.2em] text-[#0A1A2F]/70">Carrières</p>
            <h1 className="text-3xl font-semibold md:text-4xl lg:text-5xl">Toutes nos offres d&apos;emploi</h1>
            <p className="mx-auto max-w-2xl text-[#0A1A2F]/70">
              Les opportunités ouvertes chez Jarvis Connect.
            </p>
          </div>

          {error && (
            <div className="mx-auto max-w-3xl flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">
              <div>
                <p className="font-semibold">Erreur</p>
                <p>{error}</p>
              </div>
            </div>
          )}

          {offers.length ? (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {offers.map((offer) => (
                <Card
                  key={offer.id}
                  className="group grid grid-rows-[auto_auto_1fr_auto] rounded-none border border-[#0A1A2F]/10 shadow-sm"
                >
                  <div className="h-36 w-full bg-gradient-to-br from-[#e6f3ff] to-[#f7fbff] group-hover:from-[#d9ecff] group-hover:to-white transition-colors" />
                  <CardHeader>
                    <div className="flex items-center gap-2 text-xs text-[#0A1A2F]/70">
                      <Badge variant="outline" className="border-[#0A1A2F]/20 text-[#0A1A2F]">
                        {offer.contract_type ?? "Contrat"}
                      </Badge>
                    </div>
                    <CardTitle className="text-xl font-semibold text-[#0A1A2F]">{offer.title}</CardTitle>
                    <CardDescription className="text-[#0A1A2F]/70">
                      {offer.client ?? offer.company_name ?? "Entreprise confidentielle"}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm text-[#0A1A2F]/80">
                    <div className="flex flex-wrap items-center gap-3">
                      {offer.location && (
                        <span className="inline-flex items-center gap-1">
                          <MapPin className="h-4 w-4" />
                          {offer.location}
                        </span>
                      )}
                      <span className="inline-flex items-center gap-1">
                        <CalendarClock className="h-4 w-4" />
                        {new Date(offer.created_at).toLocaleDateString("fr-FR")}
                      </span>
                    </div>
                    {offer.target_tjm && (
                      <p className="text-[#0A1A2F] inline-flex items-center gap-1">
                        <Tag className="h-4 w-4" />
                        TJM cible : {offer.target_tjm}€/j
                      </p>
                    )}
                  </CardContent>
                  <CardFooter className="flex items-center justify-between text-[#0A1A2F]">
                    <Badge variant="outline" className="border-emerald-300/70 text-emerald-700">
                      {offer.status ?? "published"}
                    </Badge>
                    <Button variant="link" className="text-[#0A1A2F] hover:text-[#0A1A2F]" asChild>
                      <a href={`/offres/${offer.id}`}>
                        Voir le détail
                        <ArrowRight className="ml-1 h-4 w-4" />
                      </a>
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          ) : !error ? (
            <div className="mx-auto max-w-3xl rounded-lg border border-[#0A1A2F]/10 bg-[#0A1A2F]/5 px-4 py-6 text-sm text-[#0A1A2F]/80">
              Aucune offre publiée pour le moment.
            </div>
          ) : null}
        </main>
      </div>

      <Footer />
    </>
  );
}
