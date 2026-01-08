"use client";

import { use, useEffect, useMemo, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { ArrowLeft, CalendarClock, Loader2, MapPin, Tag } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Header } from "@/components/sections/header";
import { Footer } from "@/components/sections/footer";
import { ParticlePage } from "@/components/particle-page";

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
  description: string | null;
};

export default function OffresDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [offer, setOffer] = useState<JobOffer | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!supabase) {
      setError("Configuration Supabase manquante (URL ou cle publique).");
      return;
    }

    const load = async () => {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from("job_offers")
        .select(
          "id,title,company_name,location,contract_type,department,work_mode,experience_level,salary_min,salary_max,tech_stack,status,published_at,description"
        )
        .eq("id", id)
        .maybeSingle();

      if (fetchError) {
        setError(fetchError.message);
      } else {
        setOffer(data);
      }

      setLoading(false);
    };

    void load();
  }, [id]);

  const formatSalary = useMemo(
    () =>
      (min: number | null, max: number | null) => {
        if (!min && !max) return null;
        if (min && max) return `${min.toLocaleString()}€ - ${max.toLocaleString()}€`;
        if (min) return `>= ${min.toLocaleString()}€`;
        return `<= ${max?.toLocaleString()}€`;
      },
    []
  );

  return (
    <>
    <ParticlePage className="bg-white text-[#0A1A2F]">
      <Header />

      <main className="particle-readability container mx-auto px-6 py-14 lg:px-10 xl:px-16">
        <div className="mb-8 flex items-center gap-3 text-sm">
          <Button variant="link" className="p-0 text-[#0A1A2F]" asChild>
            <a href="/offres" className="inline-flex items-center gap-2">
              <ArrowLeft className="h-4 w-4" /> Retour aux offres
            </a>
          </Button>
          <span className="text-[#0A1A2F]/50">|</span>
          <span className="uppercase tracking-[0.18em] text-[#000080]">Carrieres</span>
        </div>

        {error && (
          <div className="mx-auto max-w-3xl flex items-start gap-3 rounded-lg border border-red-500/20 bg-red-50 px-4 py-3 text-sm text-red-900">
            Erreur : {error}
          </div>
        )}

        {loading ? (
          <div className="mx-auto max-w-3xl flex items-center gap-2 rounded-lg border border-[#0A1A2F]/10 bg-[#0A1A2F]/5 px-4 py-3 text-sm">
            <Loader2 className="h-4 w-4 animate-spin" /> Chargement du detail de l'offre...
          </div>
        ) : offer ? (
          <div className="grid gap-10 lg:grid-cols-[1.4fr_1fr]">
            <div className="space-y-4">
              <p className="text-sm uppercase tracking-[0.18em] text-[#000080]">Offre d'emploi</p>
              <h1 className="text-3xl font-semibold md:text-4xl lg:text-5xl text-[#0A1A2F]">
                {offer.title}
              </h1>
              <p className="text-[#0A1A2F]/70">{offer.company_name ?? "Entreprise confidentielle"}</p>

              <div className="flex flex-wrap items-center gap-3 text-sm text-[#0A1A2F]">
                {offer.contract_type && (
                  <Badge variant="outline" className="border-[#000080]/30 text-[#000080]">
                    {offer.contract_type}
                  </Badge>
                )}
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
                {offer.status && (
                  <Badge variant="outline" className="border-emerald-300/60 text-emerald-700">
                    {offer.status}
                  </Badge>
                )}
              </div>

              <div className="grid gap-3 text-sm text-[#0A1A2F]/80">
                <div className="flex flex-wrap items-center gap-3">
                  {offer.location && (
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="h-4 w-4" /> {offer.location}
                    </span>
                  )}
                  {offer.experience_level && (
                    <span className="inline-flex items-center gap-1">
                      <Tag className="h-4 w-4" /> {offer.experience_level}
                    </span>
                  )}
                  {offer.published_at && (
                    <span className="inline-flex items-center gap-1">
                      <CalendarClock className="h-4 w-4" />
                      {new Date(offer.published_at).toLocaleDateString()}
                    </span>
                  )}
                </div>
                {formatSalary(offer.salary_min, offer.salary_max) && (
                  <p className="text-[#0A1A2F]">
                    Salaire estime : {formatSalary(offer.salary_min, offer.salary_max)}
                  </p>
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
              </div>

              <div className="mt-6 space-y-4 rounded-none border border-[#0A1A2F]/10 bg-white p-6 shadow-sm">
                <h2 className="text-xl font-semibold text-[#0A1A2F]">Mission</h2>
                <p className="text-[#0A1A2F]/80 leading-relaxed">
                  {offer.description ?? "Les details de cette mission seront bientot partages."}
                </p>
              </div>
            </div>

            <div className="h-fit space-y-4 rounded-none border border-[#0A1A2F]/15 bg-white p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-[#0A1A2F]">Interesse ?</h3>
              <p className="text-sm text-[#0A1A2F]/70">
                Partagez-nous votre profil ou posez vos questions. Nous vous recontactons rapidement.
              </p>
              <div className="flex flex-col gap-3">
                <Button className="w-full rounded-none bg-[#000080] text-white hover:bg-[#000080]/90" asChild>
                  <a href="/contact">Postuler</a>
                </Button>
                <Button className="w-full rounded-none border border-[#0A1A2F]/20 bg-white text-[#0A1A2F] hover:bg-[#000080]/10" asChild>
                  <a href="/contact">Contacter l'equipe</a>
                </Button>
                <Button variant="link" className="w-full justify-start text-[#0A1A2F]" asChild>
                  <a href="/offres" className="inline-flex items-center gap-2">
                    <ArrowLeft className="h-4 w-4" /> Retour aux offres
                  </a>
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="mx-auto max-w-3xl rounded-lg border border-[#0A1A2F]/10 bg-[#0A1A2F]/5 px-4 py-6 text-sm text-[#0A1A2F]/80">
            Offre introuvable ou non disponible.
          </div>
        )}
      </main>
    </ParticlePage>

    <Footer />
    </>
  );
}

