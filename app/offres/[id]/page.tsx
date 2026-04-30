"use client";

import { use, useEffect, useMemo, useState } from "react";
import { ArrowLeft, CalendarClock, Loader2, MapPin, Tag } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Footer } from "@/components/sections/footer";
import { browserSupabase } from "@/lib/supabase-browser";

const supabase = browserSupabase;

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

type DescriptionSections = {
  contexte: string[];
  missions: string[];
  profil: string[];
  avantages: string[];
};

const parseOfferDescription = (description: string | null): DescriptionSections => {
  const sections: DescriptionSections = {
    contexte: [],
    missions: [],
    profil: [],
    avantages: [],
  };

  if (!description) return sections;

  const headingMap: Array<[RegExp, keyof DescriptionSections]> = [
    [/^\s*(contexte et enjeux|contexte|description du poste|enjeux)\b/i, "contexte"],
    [/^\s*(missions principales|missions?)\b/i, "missions"],
    [/^\s*(profil recherché|profil)\b/i, "profil"],
    [/^\s*(avantages et perspectives|avantages|perspectives?)\b/i, "avantages"],
  ];

  const isBullet = (line: string) => /^[-•*]\s+/.test(line);
  const cleanBullet = (line: string) => line.replace(/^[-•*]\s+/, "");
  const cleanHeading = (line: string) => line.replace(/^\s*(contexte et enjeux|contexte|description du poste|enjeux|missions principales|missions?|profil recherché|profil|avantages et perspectives|avantages|perspectives?)\s*[:\-–—]*\s*/i, "");

  const blocks = description
    .split(/\r?\n\s*\n/)
    .map((block) => block.trim())
    .filter(Boolean);

  let currentSection: keyof DescriptionSections = "contexte";

  for (const block of blocks) {
    const lines = block.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
    if (lines.length === 0) continue;

    const firstLine = lines[0];
    const foundHeading = headingMap.find(([regex]) => regex.test(firstLine));

    if (foundHeading) {
      currentSection = foundHeading[1];
      const remaining = lines.slice(1);
      if (remaining.length === 0) continue;
      remaining.forEach((line) => {
        if (isBullet(line)) {
          sections[currentSection].push(cleanBullet(line));
        } else if (currentSection === "contexte") {
          sections.contexte.push(line);
        } else {
          sections[currentSection].push(line);
        }
      });
      continue;
    }

    const normalized = firstLine.toLowerCase();
    if (/^description\b/i.test(normalized)) {
      currentSection = "contexte";
      const rest = lines.slice(1).map((line) => line.trim()).filter(Boolean);
      rest.forEach((line) => sections.contexte.push(line));
      continue;
    }

    if (isBullet(firstLine)) {
      sections[currentSection].push(cleanBullet(firstLine));
      lines.slice(1).forEach((line) => {
        if (isBullet(line)) {
          sections[currentSection].push(cleanBullet(line));
        } else {
          sections[currentSection].push(line);
        }
      });
      continue;
    }

    if (lines.length > 1 && headingMap.some(([regex]) => regex.test(lines[1]))) {
      sections[currentSection].push(firstLine);
      continue;
    }

    sections[currentSection].push(...lines);
  }

  return sections;
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

  const descriptionSections = useMemo(
    () => parseOfferDescription(offer?.description ?? null),
    [offer?.description]
  );

  const hasAnyDescriptionSection =
    descriptionSections.contexte.length > 0 ||
    descriptionSections.missions.length > 0 ||
    descriptionSections.profil.length > 0 ||
    descriptionSections.avantages.length > 0;

  return (
    <>
    <div className="min-h-screen bg-gray-50 text-[#0A1A2F]">
      <main className="container mx-auto px-6 py-8 lg:px-10 xl:px-16">
        <div className="mb-6 flex items-center gap-3 text-sm">
          <Button variant="link" className="p-0 text-[#0A1A2F] hover:text-[#2aa0dd]" asChild>
            <a href="/offres" className="inline-flex items-center gap-2">
              <ArrowLeft className="h-4 w-4" /> Retour aux offres
            </a>
          </Button>
          <span className="text-[#0A1A2F]/50">|</span>
          <span className="uppercase tracking-[0.18em] text-[#2aa0dd]">Carrières</span>
        </div>

        {error && (
          <div className="mx-auto max-w-4xl flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 px-6 py-4 text-sm text-red-900">
            <div className="flex-shrink-0 w-5 h-5 text-red-500">⚠</div>
            Erreur : {error}
          </div>
        )}

        {loading ? (
          <div className="mx-auto max-w-4xl flex items-center gap-3 rounded-lg border border-gray-200 bg-white px-6 py-8 text-sm shadow-sm">
            <Loader2 className="h-5 w-5 animate-spin text-[#2aa0dd]" />
            Chargement du détail de l'offre...
          </div>
        ) : offer ? (
          <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
            <div className="space-y-6">
              <div className="bg-white rounded-lg border border-gray-200 p-8 shadow-sm">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-sm font-medium text-[#2aa0dd] uppercase tracking-wide">Offre d'emploi</span>
                      {offer.status && (
                        <Badge variant="outline" className="border-green-200 text-green-700 bg-green-50">
                          {offer.status}
                        </Badge>
                      )}
                    </div>
                    <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-[#0A1A2F] mb-2">
                      {offer.title}
                    </h1>
                    <p className="text-lg text-[#0A1A2F]/70 font-medium">
                      {offer.company_name ?? "Entreprise confidentielle"}
                    </p>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 pt-6 border-t border-gray-100">
                  {offer.location && (
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-[#2aa0dd]/10 flex items-center justify-center">
                        <MapPin className="h-5 w-5 text-[#2aa0dd]" />
                      </div>
                      <div>
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Localisation</p>
                        <p className="text-sm font-semibold text-[#0A1A2F]">{offer.location}</p>
                      </div>
                    </div>
                  )}

                  {offer.contract_type && (
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-[#2aa0dd]/10 flex items-center justify-center">
                        <Tag className="h-5 w-5 text-[#2aa0dd]" />
                      </div>
                      <div>
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Type de contrat</p>
                        <p className="text-sm font-semibold text-[#0A1A2F]">{offer.contract_type}</p>
                      </div>
                    </div>
                  )}

                  {offer.work_mode && (
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-[#2aa0dd]/10 flex items-center justify-center">
                        <CalendarClock className="h-5 w-5 text-[#2aa0dd]" />
                      </div>
                      <div>
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Mode de travail</p>
                        <p className="text-sm font-semibold text-[#0A1A2F]">{offer.work_mode}</p>
                      </div>
                    </div>
                  )}

                  {formatSalary(offer.salary_min, offer.salary_max) && (
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                        <span className="text-lg font-bold text-green-600">€</span>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Salaire estimé</p>
                        <p className="text-sm font-semibold text-[#0A1A2F]">{formatSalary(offer.salary_min, offer.salary_max)}</p>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap gap-2 mt-6">
                  {offer.department && (
                    <Badge variant="secondary" className="bg-gray-100 text-[#0A1A2F] hover:bg-gray-200">
                      {offer.department}
                    </Badge>
                  )}
                  {offer.experience_level && (
                    <Badge variant="secondary" className="bg-gray-100 text-[#0A1A2F] hover:bg-gray-200">
                      {offer.experience_level}
                    </Badge>
                  )}
                  {offer.published_at && (
                    <Badge variant="secondary" className="bg-gray-100 text-[#0A1A2F] hover:bg-gray-200">
                      Publié le {new Date(offer.published_at).toLocaleDateString('fr-FR')}
                    </Badge>
                  )}
                </div>

                {offer.tech_stack?.length ? (
                  <div className="mt-6 pt-6 border-t border-gray-100">
                    <p className="text-sm font-medium text-gray-700 mb-3">Technologies utilisées</p>
                    <div className="flex flex-wrap gap-2">
                      {offer.tech_stack.map((tech) => (
                        <Badge key={tech} variant="outline" className="border-[#2aa0dd]/30 text-[#2aa0dd] bg-[#2aa0dd]/5">
                          {tech}
                        </Badge>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>

              <div className="bg-white rounded-lg border border-gray-200 p-8 shadow-sm">
                <h2 className="text-2xl font-bold text-[#0A1A2F] mb-8">Description du poste</h2>

                <div className="space-y-8">
                  {offer.description && hasAnyDescriptionSection ? (
                    <>
                      {descriptionSections.contexte.length > 0 && (
                        <div>
                          <h3 className="text-lg font-semibold text-[#2aa0dd] mb-4 flex items-center gap-2">
                            <div className="w-1 h-6 bg-[#2aa0dd] rounded-full"></div>
                            Contexte et enjeux
                          </h3>
                          <div className="space-y-4 text-[#0A1A2F]/80 leading-relaxed pl-6">
                            {descriptionSections.contexte.map((paragraph, index) => (
                              <p key={index}>{paragraph}</p>
                            ))}
                          </div>
                        </div>
                      )}

                      {descriptionSections.missions.length > 0 && (
                        <div>
                          <h3 className="text-lg font-semibold text-[#2aa0dd] mb-4 flex items-center gap-2">
                            <div className="w-1 h-6 bg-[#2aa0dd] rounded-full"></div>
                            Missions principales
                          </h3>
                          <div className="space-y-3 pl-6">
                            {descriptionSections.missions.map((item, index) => (
                              <div key={index} className="flex items-start gap-3">
                                <div className="w-2 h-2 rounded-full bg-[#2aa0dd] mt-2 flex-shrink-0"></div>
                                <p className="text-[#0A1A2F]/80 leading-relaxed">{item}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {descriptionSections.profil.length > 0 && (
                        <div>
                          <h3 className="text-lg font-semibold text-[#2aa0dd] mb-4 flex items-center gap-2">
                            <div className="w-1 h-6 bg-[#2aa0dd] rounded-full"></div>
                            Profil recherché
                          </h3>
                          <div className="space-y-3 pl-6">
                            {descriptionSections.profil.map((item, index) => (
                              <div key={index} className="flex items-start gap-3">
                                <div className="w-2 h-2 rounded-full bg-[#2aa0dd] mt-2 flex-shrink-0"></div>
                                <p className="text-[#0A1A2F]/80 leading-relaxed">{item}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {descriptionSections.avantages.length > 0 && (
                        <div>
                          <h3 className="text-lg font-semibold text-[#2aa0dd] mb-4 flex items-center gap-2">
                            <div className="w-1 h-6 bg-[#2aa0dd] rounded-full"></div>
                            Avantages et perspectives
                          </h3>
                          <div className="space-y-3 pl-6">
                            {descriptionSections.avantages.map((item, index) => (
                              <div key={index} className="flex items-start gap-3">
                                <div className="w-2 h-2 rounded-full bg-[#2aa0dd] mt-2 flex-shrink-0"></div>
                                <p className="text-[#0A1A2F]/80 leading-relaxed">{item}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="text-[#0A1A2F]/80 leading-relaxed whitespace-pre-line">
                      {offer.description ?? "Les détails de cette mission seront bientôt partagés."}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm sticky top-6">
                <h3 className="text-lg font-semibold text-[#0A1A2F] mb-4">Intéressé ?</h3>
                <p className="text-sm text-[#0A1A2F]/70 mb-6">
                  Partagez-nous votre profil ou posez vos questions. Nous vous recontactons rapidement.
                </p>

                <div className="space-y-3">
                  <Button className="w-full bg-[#2aa0dd] hover:bg-[#2aa0dd]/90 text-white font-semibold py-3" asChild>
                    <a href="/contact">Postuler à cette offre</a>
                  </Button>

                  <Button variant="outline" className="w-full border-[#2aa0dd] text-[#2aa0dd] hover:bg-[#2aa0dd]/10 font-semibold py-3" asChild>
                    <a href="/contact">Contacter l'équipe</a>
                  </Button>

                  <Button variant="ghost" className="w-full text-[#0A1A2F] hover:bg-gray-100 font-medium" asChild>
                    <a href="/offres" className="inline-flex items-center gap-2">
                      <ArrowLeft className="h-4 w-4" /> Retour aux offres
                    </a>
                  </Button>
                </div>
              </div>

              <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
                <h4 className="font-semibold text-[#0A1A2F] mb-4">À propos de Jarvis Connect</h4>
                <p className="text-sm text-[#0A1A2F]/70 leading-relaxed">
                  Nous accompagnons les entreprises dans leur transformation digitale avec des solutions innovantes et sur mesure.
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="mx-auto max-w-4xl rounded-lg border border-gray-200 bg-white px-8 py-12 text-center shadow-sm">
            <div className="text-gray-400 mb-4">
              <Tag className="h-12 w-12 mx-auto" />
            </div>
            <h3 className="text-lg font-semibold text-[#0A1A2F] mb-2">Offre introuvable</h3>
            <p className="text-[#0A1A2F]/70 mb-6">Cette offre d'emploi n'est plus disponible ou n'existe pas.</p>
            <Button asChild>
              <a href="/offres">Voir toutes les offres</a>
            </Button>
          </div>
        )}
      </main>
    </div>

    <Footer />
    </>
  );
}

