import Link from "next/link";
import { ArrowLeft, ArrowRight, BriefcaseBusiness, CalendarClock, MapPin } from "lucide-react";

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
  created_at: string;
};

async function fetchOffers(): Promise<{ offers: JobOffer[]; error: string | null }> {
  try {
    const client = getCvSupabaseClient();
    const { data, error } = await client
      .from("appels_offres")
      .select("id,title,company_name,client,location,contract_type,description,status,created_at")
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
              <Link href="/#offres" className="inline-flex items-center gap-2">
                <ArrowLeft className="h-4 w-4" />
                Retour à l&apos;accueil
              </Link>
            </Button>
          </div>

          <div className="mb-10 space-y-3 text-center">
            <p className="text-sm uppercase tracking-[0.2em] text-[#0A1A2F]/70">Carrières</p>
            <h1 className="text-3xl font-semibold md:text-4xl lg:text-5xl">
              Toutes nos offres d&apos;emploi
            </h1>
            <p className="mx-auto max-w-2xl text-[#0A1A2F]/70">
              Les opportunités ouvertes chez Jarvis Connect.
            </p>
          </div>

          {error && (
            <div className="mx-auto flex max-w-3xl items-start gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">
              <div>
                <p className="font-semibold">Erreur</p>
                <p>{error}</p>
              </div>
            </div>
          )}

          {offers.length ? (
            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {offers.map((offer) => (
                <Card
                  key={offer.id}
                  className="group flex h-full flex-col rounded-[28px] border border-[#0A1A2F]/10 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-[#0A1A2F]/40 hover:shadow-[0_18px_45px_rgba(10,26,47,0.12)]"
                >
                  <CardHeader className="space-y-4 pb-3">
                    <div className="flex flex-wrap items-center gap-2 text-xs text-[#0A1A2F]/70">
                      <Badge
                        variant="outline"
                        className="rounded-full border-[#0A1A2F]/30 bg-[#eaf6fd] px-3 py-1 text-[#0A1A2F]"
                      >
                        {offer.contract_type ?? "Contrat"}
                      </Badge>
                      <span className="inline-flex items-center gap-1 text-[#0A1A2F]/60">
                        <CalendarClock className="h-4 w-4" />
                        {new Date(offer.created_at).toLocaleDateString("fr-FR")}
                      </span>
                    </div>

                    <CardTitle className="text-2xl font-semibold leading-tight text-[#0A1A2F]">
                      {offer.title}
                    </CardTitle>
                    <CardDescription className="text-[#0A1A2F]/70">
                      {offer.client ?? offer.company_name ?? "Entreprise confidentielle"}
                    </CardDescription>
                  </CardHeader>

                  <CardContent className="flex-1 space-y-4 text-sm text-[#0A1A2F]/80">
                    <div className="flex flex-wrap items-center gap-3 rounded-2xl bg-[#F4F7FA] px-4 py-3">
                      {offer.location && (
                        <span className="inline-flex items-center gap-1.5 font-medium text-[#0A1A2F]">
                          <MapPin className="h-4 w-4" />
                          {offer.location}
                        </span>
                      )}
                      <span className="inline-flex items-center gap-1.5 font-medium text-[#0A1A2F]">
                        <BriefcaseBusiness className="h-4 w-4" />
                        {offer.contract_type ?? "Contrat"}
                      </span>
                    </div>

                    {offer.description && (
                      <p className="line-clamp-3 leading-relaxed text-[#0A1A2F]/70">
                        {offer.description}
                      </p>
                    )}
                  </CardContent>

                  <CardFooter className="pt-2">
                    <Button className="w-full rounded-full bg-[#0A1A2F] text-white hover:bg-[#0d2a4b]" asChild>
                      <Link href={`/offres/${offer.id}`}>
                        Candidater
                        <ArrowRight className="ml-1 h-4 w-4" />
                      </Link>
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
