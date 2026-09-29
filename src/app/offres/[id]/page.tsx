import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import {
  KICKER,
  LABEL,
  PILL_SECONDARY,
  TEXT_LINK,
  TRACE,
} from "@/components/auth/auth-styles";
import { JobApplicationDialog } from "@/components/offres/job-application-dialog";
import Footer from "@/components/vitrine/footer";
import Menu from "@/components/vitrine/menu";
import { VITRINE_FONT_VARS } from "@/features/vitrine/fonts";
import { getCvSupabaseClient } from "@/lib/cv-supabase";

// Intertitre d'une rubrique de la description, et ligne de liste a puces.
const SECTION_TITLE =
  "border-t border-zinc-900 pt-4 text-sm font-bold uppercase tracking-tight";
const BULLET_ROW = "flex items-start gap-4 border-b border-zinc-900/25 py-3";
const BULLET_MARK = "mt-3 h-px w-3 shrink-0 bg-zinc-900";

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
      {/*
        Geist en style direct : l'utilitaire `font-sans` est fige sur Inter par
        `@theme inline` (globals.css). VITRINE_FONT_VARS declare les familles.
      */}
      <div
        className={`${VITRINE_FONT_VARS} min-h-dvh bg-white text-zinc-900`}
        style={{ fontFamily: "var(--font-geist-sans)" }}
      >
        {/* Barre : logo + Contactez nous + burger + panneau */}
        <Menu />

        {/* Meme marge haute que la liste : la barre fixe ne reserve rien. */}
        <main className="px-6 pb-16 pt-32 sm:px-12 sm:pb-20 sm:pt-40 lg:pb-24">
          <div className="mx-auto w-full max-w-6xl">
            <div className="mb-12 flex flex-wrap items-center gap-3 text-sm sm:mb-16">
              <Link href="/offres" className={TEXT_LINK}>
                <ArrowLeft aria-hidden className="h-4 w-4" />
                <span>Retour aux offres</span>
                <span aria-hidden className={TRACE} />
              </Link>
              <span className="text-zinc-900/25">|</span>
              <span className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-900/50">Carrières</span>
            </div>

            <div className="grid gap-16 lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-24">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-3">
                  <span className={KICKER}>Offre d&apos;emploi</span>
                  {offer.status && (
                    <span className="rounded-full border border-zinc-900 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em]">
                      {offer.status}
                    </span>
                  )}
                </div>
                <h1 className="mt-4 break-words text-[clamp(2rem,4.5vw,3.75rem)] font-bold uppercase leading-[0.95] tracking-tight">
                  {offer.title}
                </h1>

                <div className="mt-10 grid border-t border-zinc-900 sm:grid-cols-3">
                  {offer.location && (
                    <div className="border-b border-zinc-900/25 py-4 sm:pr-6">
                      <p className={LABEL}>Localisation</p>
                      <p className="mt-1 break-words text-base font-semibold">{offer.location}</p>
                    </div>
                  )}

                  {offer.contract_type && (
                    <div className="border-b border-zinc-900/25 py-4 sm:pr-6">
                      <p className={LABEL}>Type de contrat</p>
                      <p className="mt-1 break-words text-base font-semibold">{offer.contract_type}</p>
                    </div>
                  )}

                  <div className="border-b border-zinc-900/25 py-4">
                    <p className={LABEL}>Publiée le</p>
                    <p className="mt-1 text-base font-semibold">
                      {new Date(offer.created_at).toLocaleDateString("fr-FR")}
                    </p>
                  </div>
                </div>

                <h2 className="mt-16 text-[clamp(1.75rem,4vw,2.75rem)] font-bold uppercase leading-[0.95] tracking-tight">
                  Description du poste
                </h2>
                <div className="mt-10 space-y-12">
                  {offer.description && hasAnyDescriptionSection ? (
                    <>
                      {descriptionSections.contexte.length > 0 && (
                        <div>
                          <h3 className={SECTION_TITLE}>Contexte et enjeux</h3>
                          <div className="mt-4 max-w-2xl space-y-4 leading-relaxed text-zinc-600">
                            {descriptionSections.contexte.map((paragraph, index) => (
                              <p key={index}>{paragraph}</p>
                            ))}
                          </div>
                        </div>
                      )}
                      {descriptionSections.missions.length > 0 && (
                        <div>
                          <h3 className={SECTION_TITLE}>Missions principales</h3>
                          <div className="mt-2">
                            {descriptionSections.missions.map((item, index) => (
                              <div key={index} className={BULLET_ROW}>
                                <span aria-hidden className={BULLET_MARK} />
                                <p className="leading-relaxed text-zinc-600">{item}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      {descriptionSections.profil.length > 0 && (
                        <div>
                          <h3 className={SECTION_TITLE}>Profil recherché</h3>
                          <div className="mt-2">
                            {descriptionSections.profil.map((item, index) => (
                              <div key={index} className={BULLET_ROW}>
                                <span aria-hidden className={BULLET_MARK} />
                                <p className="leading-relaxed text-zinc-600">{item}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      {descriptionSections.avantages.length > 0 && (
                        <div>
                          <h3 className={SECTION_TITLE}>Avantages et perspectives</h3>
                          <div className="mt-2">
                            {descriptionSections.avantages.map((item, index) => (
                              <div key={index} className={BULLET_ROW}>
                                <span aria-hidden className={BULLET_MARK} />
                                <p className="leading-relaxed text-zinc-600">{item}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="max-w-2xl whitespace-pre-line leading-relaxed text-zinc-600">
                      {offer.description ?? "Les détails de cette mission seront bientôt partagés."}
                    </div>
                  )}
                </div>
              </div>

              <div className="min-w-0">
                {/*
                  `top-28 sm:top-32` et non `top-6` : la barre de navigation est
                  fixe, et le burger occupe le coin haut droit — exactement la
                  colonne de ce bloc. A 24px du haut, il serait passe dessous au
                  defilement.
                */}
                <div className="space-y-10 lg:sticky lg:top-32">
                  <div className="border-t border-zinc-900 pt-6">
                    <h3 className="text-[clamp(1.5rem,3vw,2rem)] font-bold uppercase leading-[0.95] tracking-tight">
                      Intéressé ?
                    </h3>
                    <p className="mt-4 font-quote text-lg leading-snug text-zinc-500 sm:text-xl">
                      Partagez-nous votre profil ou posez vos questions. Nous vous recontactons rapidement.
                    </p>

                    <div className="mt-8 space-y-3">
                      <JobApplicationDialog jobId={offer.id} jobTitle={offer.title} />
                      <a href="mailto:am@jarvis-connect.fr" className={`${PILL_SECONDARY} w-full`}>
                        Contacter l&apos;équipe
                      </a>
                      <div className="pt-3 text-center">
                        <Link href="/offres" className={TEXT_LINK}>
                          <ArrowLeft aria-hidden className="h-4 w-4" />
                          <span>Retour aux offres</span>
                          <span aria-hidden className={TRACE} />
                        </Link>
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-zinc-900/25 pt-6">
                    <h4 className={LABEL}>À propos de Jarvis Connect</h4>
                    <p className="mt-3 font-quote text-base italic leading-relaxed text-zinc-500 sm:text-lg">
                      Nous accompagnons les entreprises dans leur transformation digitale avec des solutions innovantes et sur mesure.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>

      <Footer variant="light" />
    </>
  );
}
