"use client";

import { Footer } from "@/components/sections/footer";
import { HomeHeader } from "@/components/sections/home-header";
import Link from "next/link";

const sections = [
  {
    number: "01",
    title: "Objectif et champ d'application",
    paragraphs: [
      <>JARVIS CONNECT accorde la plus grande importance à la protection de la vie privée et des données à caractère personnel de ses utilisateurs, ainsi qu'au respect des dispositions de la législation applicable.</>,
      <>Le Règlement (UE) 2016/679 du 27 avril 2016 relatif à la protection des personnes physiques à l'égard du traitement des données à caractère personnel (ci-après « RGPD ») affirme que ces données doivent être traitées de façon licite, loyale et transparente. La présente politique a pour objectif de vous informer clairement sur les traitements de données vous concernant, dans le cadre de votre navigation et des opérations réalisées sur notre site internet.</>,
    ],
  },
  {
    number: "02",
    title: "Responsable du traitement",
    paragraphs: [
      <>Dans le cadre de votre activité sur le site de JARVIS CONNECT, nous collectons et utilisons des données à caractère personnel vous concernant. JARVIS CONNECT, Société par Actions Simplifiée immatriculée sous le numéro SIREN <strong className="text-[#3c4e58]">921 375 317</strong>, dont le siège social est situé au <strong className="text-[#3c4e58]">4 Avenue de la Libération, 60160 Montataire</strong>, détermine les moyens et les finalités de ces traitements. À ce titre, JARVIS CONNECT agit en qualité de responsable de traitement au sens du RGPD.</>,
    ],
  },
  {
    number: "03",
    title: "Données collectées et modalités de collecte",
    paragraphs: [
      <>En utilisant notre site internet, vous pouvez être amené à nous transmettre des informations vous concernant, dont certaines sont de nature à vous identifier. C'est le cas lorsque vous naviguez sur le site, remplissez un formulaire en ligne, créez un compte ou déposez une candidature.</>,
      <>Les données à caractère personnel susceptibles d'être collectées sont les suivantes :</>,
    ],
    list: [
      { title: "Données d'identification", desc: "Nom, prénom, adresse e-mail, numéro de téléphone, société le cas échéant." },
      { title: "Données de compte", desc: "Identifiant, rôle attribué (salarié, RH, candidat, professionnel), historique de connexion." },
      { title: "Documents et pièces jointes", desc: "CV, lettres de motivation, bulletins de salaire, contrats, factures et comptes rendus d'activité (CRA) dans le cadre de la gestion RH." },
      { title: "Données de navigation", desc: "Adresse IP, pages visitées, durée de visite, collectées via les journaux serveur Vercel." },
      { title: "Contenu des échanges", desc: "Messages transmis via le formulaire de contact." },
    ],
  },
  {
    number: "04",
    title: "Finalités et bases légales des traitements",
    paragraphs: [
      <>Nous collectons vos données pour des finalités déterminées, explicites et légitimes, sur les fondements juridiques suivants :</>,
    ],
    list: [
      { title: "Exécution d'un contrat", desc: "Gestion de votre espace personnel connecté, traitement des missions et des documents RH associés." },
      { title: "Intérêt légitime", desc: "Traitement des demandes de contact, amélioration du service, sécurité du site et prévention des usages frauduleux." },
      { title: "Mesures précontractuelles", desc: "Réception et traitement des candidatures à nos offres d'emploi." },
      { title: "Obligation légale", desc: "Conservation des documents comptables et RH conformément aux dispositions du Code du commerce et du droit du travail." },
      { title: "Consentement", desc: "Dépôt de cookies non strictement nécessaires au fonctionnement du site." },
    ],
  },
  {
    number: "05",
    title: "Destinataires des données",
    paragraphs: [
      <>Vos données sont destinées aux collaborateurs de JARVIS CONNECT habilités à les traiter, en fonction des finalités de la collecte et dans la limite de leurs attributions respectives.</>,
      <>Elles peuvent également être transmises à nos sous-traitants techniques, dans le strict cadre de la fourniture du service :</>,
    ],
    list: [
      { title: "Supabase Inc.", desc: "Hébergement de la base de données et authentification des utilisateurs (infrastructure européenne)." },
      { title: "Vercel Inc.", desc: "Hébergement du site internet et des fichiers statiques." },
    ],
    footer: <>JARVIS CONNECT ne vend en aucun cas vos données à caractère personnel à des tiers.</>,
  },
  {
    number: "06",
    title: "Transferts hors Union européenne",
    paragraphs: [
      <>JARVIS CONNECT s'efforce de conserver vos données au sein de l'Espace Économique Européen (EEE). Toutefois, certains de nos prestataires techniques (Supabase, Vercel) étant des sociétés de droit américain, des transferts hors EEE peuvent intervenir.</>,
      <>Dans ce cas, JARVIS CONNECT s'assure que ces transferts sont encadrés par des garanties appropriées, notamment par la conclusion de Clauses Contractuelles Types (CCT) approuvées par la Commission européenne, garantissant un niveau de protection équivalent à celui exigé par le RGPD.</>,
    ],
  },
  {
    number: "07",
    title: "Durées de conservation",
    paragraphs: [
      <>Vos données sont conservées uniquement le temps nécessaire à la réalisation des finalités pour lesquelles elles ont été collectées, ou pour satisfaire à nos obligations légales.</>,
    ],
    table: [
      { finalite: "Demandes de contact", duree: "3 ans à compter du dernier contact" },
      { finalite: "Compte utilisateur actif", duree: "Durée de vie du compte" },
      { finalite: "Compte utilisateur clôturé", duree: "12 mois après la clôture" },
      { finalite: "Candidatures non retenues", duree: "2 ans à compter de la réception" },
      { finalite: "Documents RH et comptables", duree: "10 ans (obligation légale)" },
      { finalite: "Journaux serveur (logs)", duree: "12 mois maximum" },
      { finalite: "Cookies avec consentement", duree: "13 mois à compter du dépôt" },
    ],
  },
  {
    number: "08",
    title: "Sécurité des données",
    paragraphs: [
      <>JARVIS CONNECT met en œuvre toutes les mesures techniques et organisationnelles appropriées pour protéger vos données contre toute perte, destruction, altération, accès ou divulgation non autorisée.</>,
      <>Ces mesures comprennent notamment : un accès restreint aux données aux seules personnes habilitées, un chiffrement des communications via HTTPS, une authentification sécurisée des comptes utilisateurs via Supabase Auth, ainsi qu'une surveillance régulière de nos infrastructures.</>,
    ],
  },
  {
    number: "09",
    title: "Vos droits",
    paragraphs: [
      <>Conformément au RGPD et à la loi Informatique et Libertés, vous disposez des droits suivants sur vos données à caractère personnel :</>,
    ],
    list: [
      { title: "Droit d'accès", desc: "Obtenir une copie des données vous concernant détenues par JARVIS CONNECT." },
      { title: "Droit de rectification", desc: "Faire corriger des données inexactes, obsolètes ou incomplètes." },
      { title: "Droit à l'effacement", desc: "Demander la suppression de vos données dans les conditions prévues par le RGPD." },
      { title: "Droit à la portabilité", desc: "Recevoir vos données dans un format structuré et réexploitable." },
      { title: "Droit d'opposition", desc: "Vous opposer à un traitement fondé sur l'intérêt légitime de JARVIS CONNECT." },
      { title: "Droit à la limitation", desc: "Demander la suspension temporaire d'un traitement dans les cas prévus." },
      { title: "Droit de retrait du consentement", desc: "Retirer à tout moment votre consentement lorsque le traitement y est fondé." },
      { title: "Directives post-mortem", desc: "Définir des instructions relatives au sort de vos données après votre décès." },
    ],
    footer: <>Pour exercer ces droits, contactez-nous à l'adresse postale du siège social ou via le formulaire de contact disponible sur le site. Vous pouvez également introduire une réclamation auprès de la <a href="https://www.cnil.fr" target="_blank" rel="noopener noreferrer" className="text-[#2aa0dd] hover:underline">Commission Nationale de l'Informatique et des Libertés (CNIL)</a>, 3 Place de Fontenoy – TSA 80715 – 75334 Paris Cedex 07.</>,
  },
  {
    number: "10",
    title: "Cookies",
    paragraphs: [
      <>Ce site utilise des cookies techniques strictement nécessaires à son fonctionnement (gestion de session, authentification). Aucun cookie publicitaire ou de suivi tiers n'est déposé sans votre consentement préalable, conformément aux recommandations de la CNIL.</>,
      <>Vous pouvez à tout moment configurer votre navigateur pour refuser ou supprimer les cookies. Certaines fonctionnalités du site peuvent alors être affectées.</>,
    ],
  },
  {
    number: "11",
    title: "Mise à jour de la politique",
    paragraphs: [
      <>La présente politique de confidentialité peut être mise à jour à tout moment afin de tenir compte des évolutions légales, réglementaires ou liées à nos pratiques. La date de dernière mise à jour figurant en bas de page fait foi. Nous vous encourageons à consulter régulièrement cette page.</>,
    ],
  },
];

export default function PolitiqueConfidentialitePage() {
  return (
    <>
      <div className="min-h-screen bg-[#eaedf0] text-[#2f3b42]">
        <HomeHeader />

        <main className="particle-readability max-w-4xl mx-auto px-6 pt-32 pb-24 lg:pt-36 lg:pb-32">

          <div className="mb-12">
            <span className="inline-flex items-center gap-2 bg-[#2aa0dd]/10 border border-[#2aa0dd]/20 rounded-full px-3 py-1 mb-4">
              <span className="w-1.5 h-1.5 rounded-full bg-[#2aa0dd]" />
              <span className="text-[10px] font-bold tracking-widest text-[#2aa0dd] uppercase">RGPD</span>
            </span>
            <h1 className="text-3xl font-extrabold tracking-tight text-[#0A1A2F] lg:text-4xl mb-3">
              Politique de confidentialité
            </h1>
            <p className="text-sm text-[#4f5e66] max-w-xl leading-relaxed">
              JARVIS CONNECT s'engage à protéger vos données personnelles conformément au
              Règlement Général sur la Protection des Données (RGPD — UE 2016/679) et à la
              loi Informatique et Libertés n° 78-17 du 6 janvier 1978 modifiée.
            </p>
          </div>

          <div className="space-y-3">
            {sections.map((section) => (
              <div key={section.number} className="bg-white border border-[#d6dce0] rounded-xl p-6 md:p-8">
                <div className="flex items-start gap-5">
                  <span className="text-[11px] font-bold tracking-widest text-[#2aa0dd]/60 mt-0.5 shrink-0">
                    {section.number}
                  </span>
                  <div className="flex-1 min-w-0">
                    <h2 className="text-sm font-bold text-[#0A1A2F] mb-4 uppercase tracking-wider">
                      {section.title}
                    </h2>

                    {section.paragraphs && (
                      <div className="space-y-3 mb-4">
                        {section.paragraphs.map((para, i) => (
                          <p key={i} className="text-sm text-[#4f5e66] leading-relaxed">{para}</p>
                        ))}
                      </div>
                    )}

                    {section.list && (
                      <ul className="space-y-2.5 mb-4">
                        {section.list.map((item, i) => (
                          <li key={i} className="flex gap-3 text-sm">
                            <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-[#2aa0dd] shrink-0" />
                            <span className="text-[#4f5e66] leading-relaxed">
                              <span className="font-semibold text-[#2f3b42]">{item.title}</span>
                              {" — "}
                              {item.desc}
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}

                    {section.table && (
                      <div className="overflow-x-auto mb-4">
                        <table className="w-full text-sm border-collapse">
                          <thead>
                            <tr className="bg-[#f4f7fa]">
                              <th className="text-left px-4 py-2.5 text-[#0A1A2F] font-semibold border border-[#d6dce0] rounded-tl-lg">Finalité</th>
                              <th className="text-left px-4 py-2.5 text-[#0A1A2F] font-semibold border border-[#d6dce0] rounded-tr-lg">Durée de conservation</th>
                            </tr>
                          </thead>
                          <tbody>
                            {section.table.map((row, i) => (
                              <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-[#f9fafb]"}>
                                <td className="px-4 py-2.5 text-[#4f5e66] border border-[#d6dce0]">{row.finalite}</td>
                                <td className="px-4 py-2.5 text-[#4f5e66] border border-[#d6dce0]">{row.duree}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}

                    {section.footer && (
                      <p className="text-sm text-[#4f5e66] leading-relaxed mt-4 pt-4 border-t border-[#eaedf0]">
                        {section.footer}
                      </p>
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