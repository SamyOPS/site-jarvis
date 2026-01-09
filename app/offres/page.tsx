"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { AlertCircle, ArrowLeft, ArrowRight, CalendarClock, Loader2, MapPin, Tag } from "lucide-react";

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
import { Header } from "@/components/sections/header";
import { Footer } from "@/components/sections/footer";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase =
  supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey)
    : null;

type JobOffer = {
  id: string;
  title: string;
  company_name: string | null;
  location: string | null;
  contract_type: string | null;
  department: string | null;
  work_mode: string | null;
  experience_level: string | null;
  salary_min: number | null;
  salary_max: number | null;
  tech_stack: string[] | null;
  status: string | null;
  published_at: string | null;
};

export default function OffresPage() {
  const [offers, setOffers] = useState<JobOffer[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!supabase) {
      setError("Configuration Supabase manquante (URL ou clé publique).");
      return;
    }

    const load = async () => {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from("job_offers")
        .select(
          "id,title,company_name,location,contract_type,department,work_mode,experience_level,salary_min,salary_max,tech_stack,status,published_at"
        )
        .eq("status", "published")
        .order("published_at", { ascending: false, nullsFirst: false });

      if (fetchError) {
        setError(fetchError.message);
      } else {
        setOffers(data ?? []);
      }

      setLoading(false);
    };

    void load();
  }, []);

  const sortedOffers = useMemo(
    () =>
      offers.slice().sort((a, b) => {
        const dateA = a.published_at ? new Date(a.published_at).getTime() : 0;
        const dateB = b.published_at ? new Date(b.published_at).getTime() : 0;
        return dateB - dateA;
      }),
    [offers]
  );

  const formatSalary = (min: number | null, max: number | null) => {
    if (!min && !max) return null;
    if (min && max) return `${min.toLocaleString()}€ - ${max.toLocaleString()}€`;
    if (min) return `≥ ${min.toLocaleString()}€`;
    return `≤ ${max?.toLocaleString()}€`;
  };

  return (
    <>
    <div className="min-h-screen bg-white text-[#0A1A2F]">
      <Header />

      <main className="particle-readability container mx-auto px-6 py-14 lg:px-10 xl:px-16">
        <div className="mb-6 flex items-center">
          <Button variant="link" className="p-0 text-[#0A1A2F]" asChild>
            <a href="/" className="inline-flex items-center gap-2">
              <ArrowLeft className="h-4 w-4" />
              Retour à l'accueil
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
          <div className="mx-auto max-w-3xl flex items-start gap-3 rounded-lg border border-red-500/20 bg-red-50 px-4 py-3 text-sm text-red-900">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <div>
              <p className="font-semibold">Erreur</p>
              <p>{error}</p>
            </div>
          </div>
        )}

        {loading ? (
          <div className="mx-auto max-w-3xl flex items-center gap-2 rounded-lg border border-[#0A1A2F]/10 bg-[#0A1A2F]/5 px-4 py-3 text-sm">
            <Loader2 className="h-4 w-4 animate-spin" />
            Chargement des offres...
          </div>
        ) : sortedOffers.length ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {sortedOffers.map((offer) => (
              <Card
                key={offer.id}
                className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-[#0A1A2F]/10 bg-white shadow-[0_12px_35px_-24px_rgba(10,26,47,0.8)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_20px_45px_-22px_rgba(10,26,47,0.8)]"
              >
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(0,0,128,0.08),_transparent_55%)]" />
                <div className="pointer-events-none absolute right-0 top-0 h-24 w-24 translate-x-8 -translate-y-8 rounded-full bg-[#000080]/10 blur-2xl" />
                <CardHeader className="relative z-10 space-y-4 pb-4">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-[#0A1A2F]/70">
                    <Badge variant="outline" className="border-[#0A1A2F]/20 text-[#0A1A2F]">
                      {offer.contract_type ?? "Contrat"}
                    </Badge>
                    {offer.work_mode && (
                      <Badge variant="outline" className="border-[#0A1A2F]/20 text-[#0A1A2F]/80">
                        {offer.work_mode}
                      </Badge>
                    )}
                    {offer.department && (
                      <Badge variant="outline" className="border-[#0A1A2F]/20 text-[#0A1A2F]/80">
                        {offer.department}
                      </Badge>
                    )}
                    {offer.published_at && (
                      <span className="ml-auto inline-flex items-center gap-1 rounded-full border border-[#0A1A2F]/10 bg-white/80 px-3 py-1 text-[11px] text-[#0A1A2F]/70">
                        <CalendarClock className="h-3.5 w-3.5" />
                        {new Date(offer.published_at).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                  <CardTitle className="text-xl font-semibold text-[#0A1A2F]">{offer.title}</CardTitle>
                  <CardDescription className="text-[#0A1A2F]/70">
                    {offer.company_name ?? "Entreprise confidentielle"}
                  </CardDescription>
                </CardHeader>
                <CardContent className="relative z-10 flex-1 space-y-4 text-sm text-[#0A1A2F]/80">
                  <div className="flex flex-wrap items-center gap-3">
                    {offer.location && (
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="h-4 w-4" />
                        {offer.location}
                      </span>
                    )}
                    {offer.experience_level && (
                      <span className="inline-flex items-center gap-1">
                        <Tag className="h-4 w-4" />
                        {offer.experience_level}
                      </span>
                    )}
                  </div>
                  {formatSalary(offer.salary_min, offer.salary_max) && (
                    <p className="text-[#0A1A2F]">Salaire: {formatSalary(offer.salary_min, offer.salary_max)}</p>
                  )}
                  {offer.tech_stack?.length ? (
                    <div className="flex flex-wrap gap-2 pt-1">
                      {offer.tech_stack.map((tech) => (
                        <Badge key={tech} variant="outline" className="border-[#0A1A2F]/15 text-[#0A1A2F]/80">
                          {tech}
                        </Badge>
                      ))}
                    </div>
                  ) : null}
                </CardContent>
                <CardFooter className="relative z-10 flex items-center justify-end text-[#0A1A2F]">
                  <Button
                    variant="outline"
                    className="rounded-full border-[#0A1A2F]/20 px-5 text-[#0A1A2F] transition hover:border-[#000080]/40 hover:text-[#000080]"
                    asChild
                  >
                    <a href={`/offres/${offer.id}`}>
                      Voir le détail
                      <ArrowRight className="ml-2 h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                    </a>
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        ) : (
          <div className="mx-auto max-w-3xl rounded-lg border border-[#0A1A2F]/10 bg-[#0A1A2F]/5 px-4 py-6 text-sm text-[#0A1A2F]/80">
            Aucune offre publiée pour le moment.
          </div>
        )}
      </main>
    </div>

    <Footer />
    </>
  );
}

