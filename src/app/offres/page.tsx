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

type OffresPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

const getParam = (params: Record<string, string | string[] | undefined>, key: string) => {
  const value = params[key];
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
};

const sectorRules: Array<{ sector: string; keywords: string[] }> = [
  { sector: "Finance", keywords: ["banque", "finance", "assurance", "bpce", "bnp", "caisse", "icap"] },
  { sector: "Santé", keywords: ["santé", "sante", "curie", "hôpital", "hopital", "pharma", "etypharm"] },
  { sector: "Commerce", keywords: ["commerce", "retail", "uniqlo", "mousquetaires", "point p", "burberry", "norauto"] },
  { sector: "Logistique", keywords: ["logistique", "transport", "sncf", "supply", "automotive", "ald"] },
  { sector: "BTP", keywords: ["btp", "construction", "immobilier", "foncia", "sogeprom", "in'li"] },
  { sector: "Informatique", keywords: ["informatique", "it", "support", "poste de travail", "vvip", "helpline", "tibco", "cgi", "inetum", "nxo", "scc", "cloud", "réseau", "reseau", "cyber", "développeur", "developpeur"] },
];

const getOfferSector = (offer: JobOffer) => {
  const haystack = [offer.client, offer.company_name, offer.title, offer.description]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return sectorRules.find(({ keywords }) => keywords.some((keyword) => haystack.includes(keyword)))?.sector ?? "Secteur non renseigné";
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

export default async function OffresPage({ searchParams }: OffresPageProps) {
  const { offers, error } = await fetchOffers();
  const params = searchParams ? await searchParams : {};
  const query = getParam(params, "q").trim().toLowerCase();
  const selectedLocation = getParam(params, "location");
  const selectedContract = getParam(params, "contract");
  const locations = Array.from(new Set(offers.map((offer) => offer.location).filter(Boolean))).sort();
  const contracts = Array.from(new Set(offers.map((offer) => offer.contract_type).filter(Boolean))).sort();
  const filteredOffers = offers.filter((offer) => {
    const haystack = [
      offer.title,
      getOfferSector(offer),
      offer.location,
      offer.contract_type,
      offer.client,
      offer.company_name,
      offer.description,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    const matchesQuery = !query || haystack.includes(query);
    const matchesLocation = !selectedLocation || offer.location === selectedLocation;
    const matchesContract = !selectedContract || offer.contract_type === selectedContract;
    return matchesQuery && matchesLocation && matchesContract;
  });

  return (
    <>
      <div className="min-h-screen overflow-x-hidden bg-white text-[#0A1A2F]">
        <main className="particle-readability container mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14 lg:px-10 xl:px-16">
          <div className="mb-6 flex items-center">
            <Button variant="link" className="p-0 text-[#0A1A2F]" asChild>
              <Link href="/#offres" className="inline-flex min-w-0 items-center gap-2 text-sm sm:text-base">
                <ArrowLeft className="h-4 w-4 shrink-0" />
                Retour à l&apos;accueil
              </Link>
            </Button>
          </div>

          <div className="mx-auto mb-8 max-w-4xl space-y-3 text-center sm:mb-10">
            <p className="text-xs uppercase tracking-[0.2em] text-[#0A1A2F]/70 sm:text-sm">Carrières</p>
            <h1 className="text-3xl font-semibold leading-tight sm:text-4xl lg:text-5xl">
              Toutes nos offres d&apos;emploi
            </h1>
            <p className="mx-auto max-w-2xl text-sm text-[#0A1A2F]/70 sm:text-base">
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
            <form className="mb-8 grid min-w-0 grid-cols-1 gap-3 rounded-2xl border border-[#0A1A2F]/10 bg-[#F4F7FA] p-3 sm:grid-cols-2 sm:p-4 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)_minmax(0,1fr)_auto]" action="/offres">
              <input
                type="search"
                name="q"
                defaultValue={getParam(params, "q")}
                placeholder="Rechercher une offre, une mission, une techno..."
                className="h-11 min-w-0 rounded-xl border border-[#0A1A2F]/10 bg-white px-4 text-sm text-[#0A1A2F] outline-none transition placeholder:text-[#0A1A2F]/45 focus:border-[#2aa0dd] sm:col-span-2 lg:col-span-1"
              />
              <select
                name="location"
                defaultValue={selectedLocation}
                className="h-11 min-w-0 rounded-xl border border-[#0A1A2F]/10 bg-white px-4 text-sm text-[#0A1A2F] outline-none transition focus:border-[#2aa0dd]"
              >
                <option value="">Toutes les villes</option>
                {locations.map((location) => (
                  <option key={location} value={location ?? ""}>{location}</option>
                ))}
              </select>
              <select
                name="contract"
                defaultValue={selectedContract}
                className="h-11 min-w-0 rounded-xl border border-[#0A1A2F]/10 bg-white px-4 text-sm text-[#0A1A2F] outline-none transition focus:border-[#2aa0dd]"
              >
                <option value="">Tous les contrats</option>
                {contracts.map((contract) => (
                  <option key={contract} value={contract ?? ""}>{contract}</option>
                ))}
              </select>
              <Button className="h-11 rounded-xl bg-[#0A1A2F] px-5 text-white hover:bg-[#0d2a4b] sm:col-span-2 lg:col-span-1" type="submit">
                Filtrer
              </Button>
            </form>
          ) : null}

          {filteredOffers.length ? (
            <div className="grid min-w-0 gap-4 sm:gap-5 md:grid-cols-2 xl:grid-cols-3">
              {filteredOffers.map((offer) => (
                <Card
                  key={offer.id}
                  className="group flex h-full min-w-0 flex-col rounded-3xl border border-[#0A1A2F]/10 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-[#0A1A2F]/40 hover:shadow-[0_18px_45px_rgba(10,26,47,0.12)]"
                >
                  <CardHeader className="min-w-0 space-y-4 p-5 pb-3 sm:p-6 sm:pb-3">
                    <div className="flex min-w-0 flex-wrap items-center gap-2 text-xs text-[#0A1A2F]/70">
                      <Badge
                        variant="outline"
                        className="max-w-full rounded-full border-[#0A1A2F]/30 bg-[#eaf6fd] px-3 py-1 text-[#0A1A2F]"
                      >
                        {offer.contract_type ?? "Contrat"}
                      </Badge>
                      <span className="inline-flex min-w-0 items-center gap-1 text-[#0A1A2F]/60">
                        <CalendarClock className="h-4 w-4 shrink-0" />
                        {new Date(offer.created_at).toLocaleDateString("fr-FR")}
                      </span>
                    </div>

                    <CardTitle className="break-words text-xl font-semibold leading-tight text-[#0A1A2F] sm:text-2xl">
                      {offer.title}
                    </CardTitle>
                    <CardDescription className="break-words text-[#0A1A2F]/70">
                      {getOfferSector(offer)}
                    </CardDescription>
                  </CardHeader>

                  <CardContent className="min-w-0 flex-1 space-y-4 p-5 pt-0 text-sm text-[#0A1A2F]/80 sm:p-6 sm:pt-0">
                    <div className="flex min-w-0 flex-wrap items-center gap-3 rounded-2xl bg-[#F4F7FA] px-4 py-3">
                      {offer.location && (
                        <span className="inline-flex min-w-0 items-center gap-1.5 break-words font-medium text-[#0A1A2F]">
                          <MapPin className="h-4 w-4 shrink-0" />
                          {offer.location}
                        </span>
                      )}
                      <span className="inline-flex min-w-0 items-center gap-1.5 break-words font-medium text-[#0A1A2F]">
                        <BriefcaseBusiness className="h-4 w-4 shrink-0" />
                        {offer.contract_type ?? "Contrat"}
                      </span>
                    </div>

                    {offer.description && (
                      <p className="line-clamp-3 leading-relaxed text-[#0A1A2F]/70">
                        {offer.description}
                      </p>
                    )}
                  </CardContent>

                  <CardFooter className="p-5 pt-2 sm:p-6 sm:pt-2">
                    <Button className="w-full rounded-full bg-[#0A1A2F] text-white hover:bg-[#0d2a4b]" asChild>
                      <Link href={`/offres/${offer.id}`} className="min-w-0">
                        Voir l&apos;offre
                        <ArrowRight className="ml-1 h-4 w-4 shrink-0" />
                      </Link>
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          ) : !error ? (
            <div className="mx-auto max-w-3xl rounded-lg border border-[#0A1A2F]/10 bg-[#0A1A2F]/5 px-4 py-6 text-sm text-[#0A1A2F]/80">
              Aucune offre ne correspond a votre recherche. Vous pouvez ajuster les filtres ou nous contacter pour une candidature spontanee.
            </div>
          ) : null}
        </main>
      </div>

      <Footer />
    </>
  );
}
