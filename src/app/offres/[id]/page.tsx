import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, CalendarClock, MapPin, Tag } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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

type DescriptionSections = {
  contexte: string[];
  missions: string[];
  profil: string[];
  avantages: string[];
};

const parseOfferDescription = (description: string | null): DescriptionSections => {
  const sections: DescriptionSections = { contexte: [], missions: [], profil: [], avantages: [] };
  if (!description) return sections;

  const headingMap: Array<[RegExp, keyof DescriptionSections]> = [
    [/^\s*(contexte et enjeux|contexte|description du poste|enjeux)\b/i, "contexte"],
    [/^\s*(missions principales|missions?)\b/i, "missions"],
    [/^\s*(profil recherché|profil)\b/i, "profil"],
    [/^\s*(avantages et perspectives|avantages|perspectives?)\b/i, "avantages"],
  ];

  const isBullet = (line: string) => /^[-•*]\s+/.test(line);
  const cleanBullet = (line: string) => line.replace(/^[-•*]\s+/, "");

  const blocks = description.split(/\r?\n\s*\n/).map((b) => b.trim()).filter(Boolean);
  let currentSection: keyof DescriptionSections = "contexte";

  for (const block of blocks) {
    const lines = block.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    if (lines.length === 0) continue;

    const firstLine = lines[0];
    const foundHeading = headingMap.find(([regex]) => regex.test(firstLine));

    if (foundHeading) {
      currentSection = foundHeading[1];
      lines.slice(1).forEach((line) => {
        if (isBullet(line)) sections[currentSection].push(cleanBullet(line));
        else sections[currentSection].push(line);
      });
      continue;
    }

    lines.forEach((line) => {
      if (isBullet(line)) sections[currentSection].push(cleanBullet(line));
      else sections[currentSection].push(line);
    });
  }

  return sections;
};

async function fetchOffer(id: string): Promise<JobOffer | null> {
  try {
    const client = getCvSupabaseClient();
    const { data, error } = await client
      .from("appels_offres")
      .select("id,title,company_name,client,location,contract_type,description,status,created_at")
      .eq("id", id)
      .eq("status", "published")
      .is("deleted_at", null)
      .maybeSingle();

    if (error || !data) return null;
    return data as JobOffer;
  } catch {
    return null;
  }
}

export default async function OffresDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const offer = await fetchOffer(id);

  if (!offer) notFound();

  const descriptionSections = parseOfferDescription(offer.description);
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
              <Link href="/offres" className="inline-flex items-center gap-2">
                <ArrowLeft className="h-4 w-4" /> Retour aux offres
              </Link>
            </Button>
            <span className="text-[#0A1A2F]/50">|</span>
            <span className="uppercase tracking-[0.18em] text-[#2aa0dd]">Carrières</span>
          </div>

          <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
            <div className="space-y-6">
              <div className="bg-white rounded-lg border border-gray-200 p-8 shadow-sm">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-sm font-medium text-[#2aa0dd] uppercase tracking-wide">Offre d&apos;emploi</span>
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
                      {offer.client ?? offer.company_name ?? "Entreprise confidentielle"}
                    </p>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 pt-6 border-t border-gray-100">
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

                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-[#2aa0dd]/10 flex items-center justify-center">
                      <CalendarClock className="h-5 w-5 text-[#2aa0dd]" />
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Publiée le</p>
                      <p className="text-sm font-semibold text-[#0A1A2F]">
                        {new Date(offer.created_at).toLocaleDateString("fr-FR")}
                      </p>
                    </div>
                  </div>

                </div>
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
                  <Button className="w-full bg-[#0A1A2F] hover:bg-[#0d2a4b] text-white font-semibold py-3" asChild>
                    <a href="/contact">Postuler à cette offre</a>
                  </Button>
                  <Button variant="outline" className="w-full border-[#0A1A2F] text-[#0A1A2F] hover:bg-[#0A1A2F]/10 font-semibold py-3" asChild>
                    <a href="/contact">Contacter l&apos;équipe</a>
                  </Button>
                  <Button variant="ghost" className="w-full text-[#0A1A2F] hover:bg-gray-100 font-medium" asChild>
                    <Link href="/offres" className="inline-flex items-center gap-2">
                      <ArrowLeft className="h-4 w-4" /> Retour aux offres
                    </Link>
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
        </main>
      </div>

      <Footer />
    </>
  );
}
