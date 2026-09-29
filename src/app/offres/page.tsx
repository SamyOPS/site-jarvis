import Link from "next/link";
import { ArrowRight, CircleAlert } from "lucide-react";

import {
  FIELD,
  KICKER,
  MESSAGE,
  PILL_PRIMARY,
  TEXT_LINK,
  TRACE,
} from "@/components/auth/auth-styles";
import Footer from "@/components/vitrine/footer";
import Menu from "@/components/vitrine/menu";
import { VITRINE_FONT_VARS } from "@/features/vitrine/fonts";
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
      {/*
        Geist en style direct : l'utilitaire `font-sans` est fige sur Inter par
        `@theme inline` (globals.css). VITRINE_FONT_VARS declare les familles.
      */}
      <div
        className={`${VITRINE_FONT_VARS} min-h-dvh overflow-x-hidden bg-white text-zinc-900`}
        style={{ fontFamily: "var(--font-geist-sans)" }}
      >
        {/* Barre : logo + Contactez nous + burger + panneau */}
        <Menu />

        {/*
          `pt-32 sm:pt-40` comme sur les pages legales : la barre est en
          `position: fixed` et ne reserve donc rien: sans cette marge elle
          recouvrirait le titre.
        */}
        <main className="px-6 pb-16 pt-32 sm:px-12 sm:pb-20 sm:pt-40 lg:pb-24">
          <div className="mx-auto w-full max-w-6xl">
            <div className="mb-12 max-w-3xl sm:mb-16">
              <h1>
                <span className={KICKER}>Carrières</span>
                <span className="mt-4 block text-[clamp(2rem,4.5vw,3.75rem)] font-bold uppercase leading-[0.95] tracking-tight">
                  Toutes nos offres d&apos;emploi
                </span>
              </h1>
              <p className="mt-8 max-w-xl font-quote text-xl leading-snug text-zinc-500 sm:text-2xl">
                Les opportunités ouvertes chez Jarvis Connect.
              </p>
            </div>

            {error && (
              <div className={`${MESSAGE} mb-10 max-w-3xl`}>
                <CircleAlert aria-hidden className="mt-1 h-4 w-4 shrink-0" />
                <div>
                  <p className="font-semibold">Erreur</p>
                  <p>{error}</p>
                </div>
              </div>
            )}

            {offers.length ? (
              <form
                className="mb-12 grid min-w-0 grid-cols-1 items-end gap-6 sm:mb-16 sm:grid-cols-2 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)_minmax(0,1fr)_auto]"
                action="/offres"
              >
                <input
                  type="search"
                  name="q"
                  defaultValue={getParam(params, "q")}
                  placeholder="Rechercher une offre, une mission, une techno..."
                  className={`${FIELD} min-w-0 sm:col-span-2 lg:col-span-1`}
                />
                <select
                  name="location"
                  defaultValue={selectedLocation}
                  className={`${FIELD} min-w-0 cursor-pointer`}
                >
                  <option value="">Toutes les villes</option>
                  {locations.map((location) => (
                    <option key={location} value={location ?? ""}>{location}</option>
                  ))}
                </select>
                <select
                  name="contract"
                  defaultValue={selectedContract}
                  className={`${FIELD} min-w-0 cursor-pointer`}
                >
                  <option value="">Tous les contrats</option>
                  {contracts.map((contract) => (
                    <option key={contract} value={contract ?? ""}>{contract}</option>
                  ))}
                </select>
                <button className={`${PILL_PRIMARY} sm:col-span-2 lg:col-span-1`} type="submit">
                  Filtrer
                </button>
              </form>
            ) : null}

            {filteredOffers.length ? (
              <div className="grid min-w-0 gap-x-12 md:grid-cols-2 xl:grid-cols-3">
                {filteredOffers.map((offer) => (
                  <article
                    key={offer.id}
                    className="flex min-w-0 flex-col border-t border-zinc-900 pb-12 pt-6"
                  >
                    <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 text-xs font-semibold uppercase tracking-[0.2em] text-zinc-900/50">
                      <span className="max-w-full break-words text-zinc-900">
                        {offer.contract_type ?? "Contrat"}
                      </span>
                      <span aria-hidden>·</span>
                      <span>{new Date(offer.created_at).toLocaleDateString("fr-FR")}</span>
                    </div>

                    <h2 className="mt-4 break-words text-2xl font-bold uppercase leading-[0.95] tracking-tight sm:text-3xl">
                      {offer.title}
                    </h2>
                    <p className="mt-3 break-words font-quote text-lg italic leading-snug text-zinc-500">
                      {getOfferSector(offer)}
                    </p>

                    <div className="mt-6 grid grid-cols-2 border-y border-zinc-900/25 py-3 text-sm font-semibold">
                      {offer.location && (
                        <span className="min-w-0 break-words pr-3">{offer.location}</span>
                      )}
                      <span className="min-w-0 break-words">{offer.contract_type ?? "Contrat"}</span>
                    </div>

                    {offer.description && (
                      <p className="mt-4 line-clamp-3 flex-1 text-sm leading-relaxed text-zinc-500">
                        {offer.description}
                      </p>
                    )}

                    <div className="mt-6">
                      <Link href={`/offres/${offer.id}`} className={`${TEXT_LINK} min-w-0`}>
                        <span>Voir l&apos;offre</span>
                        <ArrowRight aria-hidden className="h-4 w-4 shrink-0 transition-transform duration-300 group-hover:translate-x-1 motion-reduce:transition-none" />
                        <span aria-hidden className={TRACE} />
                      </Link>
                    </div>
                  </article>
                ))}
              </div>
            ) : !error ? (
              <p className="max-w-3xl border-t border-zinc-900/25 pt-6 font-quote text-xl italic leading-snug text-zinc-500">
                Aucune offre ne correspond a votre recherche. Vous pouvez ajuster les filtres ou nous contacter pour une candidature spontanee.
              </p>
            ) : null}
          </div>
        </main>
      </div>

      <Footer variant="light" />
    </>
  );
}
