"use client";

import { Footer } from "@/components/sections/footer";
import { HomeHeader } from "@/components/sections/home-header";
import Link from "next/link";

const sections = [
  {
    number: "01",
    title: "Éditeur du site",
    type: "dl" as const,
    rows: [
      { label: "Raison sociale", value: "JARVIS CONNECT" },
      { label: "Forme juridique", value: "Société par Actions Simplifiée (SAS)" },
      { label: "Capital social", value: "500,00 €" },
      { label: "SIREN", value: "921 375 317" },
      { label: "SIRET (siège social)", value: "921 375 317 00010" },
      { label: "N° TVA intracommunautaire", value: "FR92 921 375 317" },
      { label: "Code NAF / APE", value: "62.01Z — Programmation informatique" },
      { label: "Siège social", value: "4 Avenue de la Libération, 60160 Montataire, France" },
      { label: "Date de création", value: "23 octobre 2022" },
    ],
  },
  {
    number: "02",
    title: "Directeur de la publication",
    type: "text" as const,
    paragraphs: [
      <>Monsieur <strong className="text-[#3c4e58]">Azeez Abdoul</strong>, dirigeant de la société JARVIS CONNECT, est responsable de la publication du présent site internet.</>,
    ],
  },
  {
    number: "03",
    title: "Hébergement",
    type: "dl" as const,
    rows: [
      { label: "Hébergeur", value: "Vercel Inc." },
      { label: "Adresse", value: "440 N Barranca Ave #4133, Covina, CA 91723, États-Unis" },
      { label: "Site web", value: "https://vercel.com", isLink: true },
    ],
  },
  {
    number: "04",
    title: "Propriété intellectuelle",
    type: "text" as const,
    paragraphs: [
      <>L'ensemble du contenu publié sur ce site — textes, images, graphismes, logo, icônes et logiciels — est la propriété exclusive de JARVIS CONNECT ou de ses partenaires, et est protégé par les dispositions du Code de la propriété intellectuelle ainsi que par les conventions internationales applicables.</>,
      <>Toute reproduction, représentation, modification ou adaptation, partielle ou totale, de ces éléments est strictement interdite sans l'autorisation écrite préalable de JARVIS CONNECT.</>,
    ],
  },
  {
    number: "05",
    title: "Limitation de responsabilité",
    type: "text" as const,
    paragraphs: [
      <>JARVIS CONNECT s'efforce d'assurer l'exactitude et la mise à jour régulière des informations diffusées sur ce site. Toutefois, la société ne peut garantir l'exhaustivité ou la parfaite actualité de ces informations.</>,
      <>En conséquence, l'utilisateur reconnaît utiliser ces informations sous sa responsabilité exclusive. JARVIS CONNECT ne saurait être tenu responsable de tout dommage direct ou indirect résultant de l'accès au site ou de l'utilisation de son contenu.</>,
    ],
  },
  {
    number: "06",
    title: "Données personnelles (RGPD)",
    type: "text" as const,
    paragraphs: [
      <>Conformément au Règlement Général sur la Protection des Données (RGPD — UE 2016/679) et à la loi Informatique et Libertés n° 78-17 du 6 janvier 1978 modifiée, vous disposez d'un droit d'accès, de rectification, d'effacement, de portabilité et d'opposition au traitement de vos données personnelles.</>,
      <>Pour exercer ces droits, vous pouvez contacter JARVIS CONNECT à l'adresse postale de son siège social ou via le formulaire de contact disponible sur le site.</>,
      <>Vous disposez également du droit d'introduire une réclamation auprès de la <a href="https://www.cnil.fr" target="_blank" rel="noopener noreferrer" className="text-[#2aa0dd] hover:underline">Commission Nationale de l'Informatique et des Libertés (CNIL)</a>.</>,
    ],
  },
  {
    number: "07",
    title: "Cookies",
    type: "text" as const,
    paragraphs: [
      <>Ce site utilise des cookies techniques nécessaires à son bon fonctionnement. Conformément aux recommandations de la CNIL et à la directive européenne ePrivacy, les cookies non essentiels sont soumis à votre consentement préalable. Vous pouvez configurer ou désactiver les cookies à tout moment depuis les paramètres de votre navigateur.</>,
    ],
  },
  {
    number: "08",
    title: "Droit applicable et juridiction",
    type: "text" as const,
    paragraphs: [
      <>Les présentes mentions légales sont soumises au droit français. En cas de litige et à défaut de résolution amiable, les tribunaux français seront seuls compétents pour en connaître.</>,
    ],
  },
];

export default function MentionsLegalesPage() {
  return (
    <>
      <div className="min-h-screen bg-[#eaedf0] text-[#2f3b42]">
        <HomeHeader />

        <main className="particle-readability max-w-4xl mx-auto px-6 pt-32 pb-24 lg:pt-36 lg:pb-32">

          {/* En-tête */}
          <div className="mb-12">
            <span className="inline-flex items-center gap-2 bg-[#2aa0dd]/10 border border-[#2aa0dd]/20 rounded-full px-3 py-1 mb-4">
              <span className="w-1.5 h-1.5 rounded-full bg-[#2aa0dd]" />
              <span className="text-[10px] font-bold tracking-widest text-[#2aa0dd] uppercase">Informations légales</span>
            </span>
            <h1 className="text-3xl font-extrabold tracking-tight text-[#0A1A2F] lg:text-4xl mb-3">
              Mentions légales
            </h1>
            <p className="text-sm text-[#4f5e66] max-w-xl">
              Conformément aux articles 6-III et 19 de la loi n° 2004-575 du 21 juin 2004
              pour la Confiance dans l'Économie Numérique (LCEN).
            </p>
          </div>

          <div className="space-y-3">
            {sections.map((section) => (
              <div
                key={section.number}
                className="bg-white border border-[#d6dce0] rounded-xl p-6 md:p-8"
              >
                <div className="flex items-start gap-5">
                  <span className="text-[11px] font-bold tracking-widest text-[#2aa0dd]/60 mt-0.5 shrink-0">
                    {section.number}
                  </span>
                  <div className="flex-1 min-w-0">
                    <h2 className="text-sm font-bold text-[#0A1A2F] mb-4 uppercase tracking-wider">
                      {section.title}
                    </h2>

                    {section.type === "dl" && section.rows && (
                      <dl className="grid gap-y-2">
                        {section.rows.map((row) => (
                          <div key={row.label} className="grid grid-cols-[200px_1fr] gap-4 text-sm">
                            <dt className="text-[#7a8d96] font-medium">{row.label}</dt>
                            <dd className="text-[#2f3b42]">
                              {row.isLink ? (
                                <a
                                  href={row.value}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-[#2aa0dd] hover:underline"
                                >
                                  {row.value}
                                </a>
                              ) : (
                                row.value
                              )}
                            </dd>
                          </div>
                        ))}
                      </dl>
                    )}

                    {section.type === "text" && section.paragraphs && (
                      <div className="space-y-3">
                        {section.paragraphs.map((para, i) => (
                          <p key={i} className="text-sm text-[#4f5e66] leading-relaxed">
                            {para}
                          </p>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

           <div className="mt-12 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[#7a8d96] border-t border-[#d6dce0] pt-6">
            <p>Dernière mise à jour : avril 2026</p>
            <Link href="/" className="text-[#2aa0dd] hover:underline">
              ← Retour à l'accueil
            </Link>
          </div>

        </main>
      </div>

      <Footer />
    </>
  );
}