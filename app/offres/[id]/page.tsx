"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { useParams } from "next/navigation";
import {
  AlertCircle,
  ArrowLeft,
  CalendarClock,
  Loader2,
  Mail,
  MapPin,
  Tag,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase =
  supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey)
    : null;

type JobOffer = {
  id: string;
  title: string;
  description: string | null;
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

export default function OffreDetailPage() {
  const params = useParams<{ id: string }>();
  const [offer, setOffer] = useState<JobOffer | null>(null);
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
          "id,title,description,company_name,location,contract_type,department,work_mode,experience_level,salary_min,salary_max,tech_stack,status,published_at"
        )
        .eq("id", params?.id)
        .maybeSingle();

      if (fetchError) {
        setError(fetchError.message);
      } else if (!data || data.status !== "published") {
        setError("Offre introuvable ou non publiée.");
      } else {
        setOffer(data);
      }

      setLoading(false);
    };

    if (params?.id) {
      void load();
    } else {
      setError("Identifiant d'offre manquant.");
    }
  }, [params?.id]);

  const formattedSalary = useMemo(() => {
    if (!offer) return null;
    const { salary_min, salary_max } = offer;
    if (!salary_min && !salary_max) return null;
    if (salary_min && salary_max) return `${salary_min.toLocaleString()}€ - ${salary_max.toLocaleString()}€`;
    if (salary_min) return `≥ ${salary_min.toLocaleString()}€`;
    return `≤ ${salary_max?.toLocaleString()}€`;
  }, [offer]);

  return (
    <div className="min-h-screen bg-white text-[#0A1A2F]">
      <div className="container mx-auto px-6 py-14 lg:px-10 xl:px-16 space-y-8">
        <div className="flex items-center justify-between">
          <Button variant="link" className="px-0 text-[#0A1A2F]" asChild>
            <a href="/offres" className="inline-flex items-center gap-2">
              <ArrowLeft className="h-4 w-4" />
              Retour aux offres
            </a>
          </Button>
          {offer?.published_at && (
            <div className="flex items-center gap-2 text-sm text-[#0A1A2F]/70">
              <CalendarClock className="h-4 w-4" />
              Publiée le {new Date(offer.published_at).toLocaleDateString()}
            </div>
          )}
        </div>

        {error && (
          <div className="mx-auto max-w-4xl flex items-start gap-3 rounded-lg border border-red-500/20 bg-red-50 px-4 py-3 text-sm text-red-900">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <div>
              <p className="font-semibold">Erreur</p>
              <p>{error}</p>
            </div>
          </div>
        )}

        {loading ? (
          <div className="mx-auto max-w-4xl flex items-center gap-2 rounded-lg border border-[#0A1A2F]/10 bg-[#0A1A2F]/5 px-4 py-3 text-sm">
            <Loader2 className="h-4 w-4 animate-spin" />
            Chargement de l&apos;offre...
          </div>
        ) : offer ? (
          <Card className="mx-auto max-w-4xl rounded-none border border-[#0A1A2F]/10 shadow-sm">
            <CardHeader className="space-y-3">
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
                {offer.experience_level && (
                  <Badge variant="outline" className="border-[#0A1A2F]/20 text-[#0A1A2F]/80">
                    {offer.experience_level}
                  </Badge>
                )}
              </div>
              <CardTitle className="text-3xl font-semibold text-[#0A1A2F]">{offer.title}</CardTitle>
              <CardDescription className="text-[#0A1A2F]/70">
                {offer.company_name ?? "Entreprise confidentielle"}
              </CardDescription>
              <div className="flex flex-wrap items-center gap-4 text-sm text-[#0A1A2F]/80">
                {offer.location && (
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="h-4 w-4" />
                    {offer.location}
                  </span>
                )}
                {formattedSalary && <span>{formattedSalary}</span>}
              </div>
            </CardHeader>
            <CardContent className="space-y-6 text-sm leading-relaxed text-[#0A1A2F]/85">
              {offer.description ? (
                <p className="whitespace-pre-line">{offer.description}</p>
              ) : (
                <p>Description non fournie.</p>
              )}

              {offer.tech_stack?.length ? (
                <div className="space-y-2">
                  <p className="text-[#0A1A2F] font-semibold">Stack / Outils</p>
                  <div className="flex flex-wrap gap-2">
                    {offer.tech_stack.map((tech) => (
                      <Badge key={tech} variant="outline" className="border-[#0A1A2F]/15 text-[#0A1A2F]/80">
                        {tech}
                      </Badge>
                    ))}
                  </div>
                </div>
              ) : null}

              <div className="flex flex-wrap gap-3">
                <Button className="bg-[#0A1A2F] text-white hover:bg-[#0d2a4b]" asChild>
                  <a href="/contact" className="inline-flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    Postuler / Contacter
                  </a>
                </Button>
                <Button variant="outline" className="border-[#0A1A2F]/20 text-[#0A1A2F]" asChild>
                  <a href="/offres" className="inline-flex items-center gap-2">
                    <ArrowLeft className="h-4 w-4" />
                    Retour aux offres
                  </a>
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : null}
      </div>
    </div>
  );
}
