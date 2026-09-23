import type { Metadata } from "next";
import Footer from "@/components/vitrine/footer";
import Menu from "@/components/vitrine/menu";

export const metadata: Metadata = {
  title: "Politique de confidentialité — Jarvis Connect",
  description:
    "Politique de confidentialité de Jarvis Connect : données collectées, finalités, durées de conservation et vos droits (RGPD).",
};

const donneesSite = [
  "Données de navigation (adresse IP, type de navigateur, pages consultées) via les cookies techniques et de mesure d'audience.",
  "Données du formulaire de contact : nom, prénom, adresse e-mail et contenu du message.",
  "Adresse e-mail en cas d'inscription à la newsletter.",
];

const donneesEspace = [
  "Données d'identification et professionnelles : nom, prénom, coordonnées, fonction.",
  "Documents administratifs et professionnels déposés (contrats, justificatifs, bulletins, CV, etc.).",
  "Données de connexion et de journalisation liées à l'utilisation de l'espace sécurisé.",
];

const finalites = [
  "Répondre aux demandes formulées via le formulaire de contact.",
  "Gérer la relation commerciale, les prestations et le support.",
  "Gérer l'espace sécurisé réservé aux salariés et au service RH : dépôt, stockage et partage sécurisé de documents, et gestion administrative du personnel.",
  "Envoyer la newsletter aux personnes qui y ont consenti.",
  "Assurer la sécurité, la maintenance et l'amélioration du site.",
];

const baseLegale = [
  "L'exécution d'un contrat (relation salariale ou prestation).",
  "Le respect d'obligations légales (gestion administrative, RH et comptable).",
  "Votre consentement (newsletter, cookies non essentiels).",
  "L'intérêt légitime de JARVIS CONNECT (sécurité et amélioration du site).",
];

const destinataires = [
  "Le personnel habilité de JARVIS CONNECT, dont le service RH pour l'espace sécurisé.",
  "Les sous-traitants techniques strictement nécessaires (notamment l'hébergeur).",
  "Les autorités administratives ou judiciaires lorsque la loi l'exige.",
];

const conservation = [
  "Demandes de contact : jusqu'à 3 ans après le dernier échange.",
  "Newsletter : jusqu'au retrait de votre consentement.",
  "Données et documents salariés / RH : pendant la durée de la relation, puis selon les durées légales de conservation applicables.",
  "Cookies : 13 mois maximum.",
];

const droits = [
  "Droit d'accès et de rectification.",
  "Droit à l'effacement et à la limitation du traitement.",
  "Droit à la portabilité de vos données.",
  "Droit d'opposition et de retrait de votre consentement à tout moment.",
];

export default function PolitiqueConfidentialitePage() {
  return (
    <>
      <main className="font-soft relative min-h-dvh bg-white text-zinc-900">
        {/* Barre : logo + Contactez nous + burger + panneau */}
        <Menu />

        {/* Titre + date */}
        <header className="px-6 pt-32 sm:px-12 sm:pt-40">
          <h1 className="text-center text-[clamp(2.5rem,9vw,8rem)] font-bold uppercase leading-[0.95] tracking-tight">
            Politique de confidentialité
          </h1>
          <p className="mt-6 text-center text-sm text-zinc-500">
            Mise à jour : 3 juillet 2026
          </p>
        </header>

        {/* Contenu, colonne centrée */}
        <div className="mx-auto mt-16 max-w-3xl space-y-12 px-6 pb-32 sm:mt-24">
          <section>
            <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              1. Responsable du traitement
            </h2>
            <div className="mt-4 space-y-4 leading-relaxed text-zinc-600">
              <p>
                {
                  "Le responsable du traitement des données est la société JARVIS CONNECT, Société par Actions Simplifiée au capital de 500,00 €, immatriculée sous le SIREN 921 375 317, dont le siège social est situé 4 Avenue de la Libération, 60160 Montataire, représentée par Monsieur Azeez Abdoul."
                }
              </p>
              <p>
                {
                  "Pour toute question relative à vos données, vous pouvez contacter JARVIS CONNECT à l'adresse postale de son siège social ou via le formulaire de contact disponible sur le site."
                }
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              2. Données collectées
            </h2>
            <div className="mt-4 space-y-4 leading-relaxed text-zinc-600">
              <p>Dans le cadre de la navigation sur le site :</p>
              <ul className="list-disc space-y-1 pl-6">
                {donneesSite.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
              <p>
                {
                  "Dans le cadre de l'espace sécurisé réservé aux salariés et au service RH (dépôt de documents) :"
                }
              </p>
              <ul className="list-disc space-y-1 pl-6">
                {donneesEspace.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              3. Finalités du traitement
            </h2>
            <ul className="mt-4 list-disc space-y-1 pl-6 leading-relaxed text-zinc-600">
              {finalites.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              4. Base légale
            </h2>
            <p className="mt-4 leading-relaxed text-zinc-600">
              Les traitements réalisés reposent, selon les cas, sur les bases
              légales suivantes :
            </p>
            <ul className="mt-3 list-disc space-y-1 pl-6 leading-relaxed text-zinc-600">
              {baseLegale.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              5. Destinataires des données
            </h2>
            <p className="mt-4 leading-relaxed text-zinc-600">
              Vos données sont destinées, dans la limite de leurs attributions,
              aux :
            </p>
            <ul className="mt-3 list-disc space-y-1 pl-6 leading-relaxed text-zinc-600">
              {destinataires.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              6. Hébergement et transferts hors UE
            </h2>
            <p className="mt-4 leading-relaxed text-zinc-600">
              {
                "Le site et les données associées sont hébergés par Vercel Inc. (440 N Barranca Ave #4133, Covina, CA 91723, États-Unis). Ce prestataire pouvant impliquer un transfert de données en dehors de l'Union européenne, JARVIS CONNECT veille à ce que des garanties appropriées soient mises en place (clauses contractuelles types de la Commission européenne ou mécanisme de certification équivalent)."
              }
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              7. Durée de conservation
            </h2>
            <p className="mt-4 leading-relaxed text-zinc-600">
              Les données ne sont conservées que le temps nécessaire aux finalités
              poursuivies :
            </p>
            <ul className="mt-3 list-disc space-y-1 pl-6 leading-relaxed text-zinc-600">
              {conservation.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              8. Sécurité des données
            </h2>
            <p className="mt-4 leading-relaxed text-zinc-600">
              {
                "JARVIS CONNECT met en œuvre des mesures techniques et organisationnelles appropriées afin de protéger les données contre tout accès, altération, divulgation ou destruction non autorisés. L'accès à l'espace sécurisé et aux documents déposés est restreint aux seules personnes habilitées et fait l'objet de mesures de contrôle d'accès et de journalisation."
              }
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              9. Cookies
            </h2>
            <p className="mt-4 leading-relaxed text-zinc-600">
              {
                "Le site utilise des cookies techniques nécessaires à son bon fonctionnement. Les cookies non essentiels (mesure d'audience, etc.) sont soumis à votre consentement préalable, conformément aux recommandations de la CNIL. Vous pouvez configurer ou désactiver les cookies à tout moment depuis les paramètres de votre navigateur."
              }
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              10. Vos droits
            </h2>
            <p className="mt-4 leading-relaxed text-zinc-600">
              {
                "Conformément au Règlement Général sur la Protection des Données (RGPD — UE 2016/679) et à la loi Informatique et Libertés du 6 janvier 1978 modifiée, vous disposez des droits suivants :"
              }
            </p>
            <ul className="mt-3 list-disc space-y-1 pl-6 leading-relaxed text-zinc-600">
              {droits.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
            <p className="mt-4 leading-relaxed text-zinc-600">
              {
                "Pour exercer ces droits, contactez JARVIS CONNECT à l'adresse postale de son siège social ou via le formulaire de contact. Vous disposez également du droit d'introduire une réclamation auprès de la Commission Nationale de l'Informatique et des Libertés (CNIL)."
              }
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              11. Modification de la politique
            </h2>
            <p className="mt-4 leading-relaxed text-zinc-600">
              {
                "JARVIS CONNECT se réserve le droit de modifier la présente politique de confidentialité à tout moment, notamment pour l'adapter aux évolutions légales ou fonctionnelles du site. La date de dernière mise à jour figure en haut de cette page."
              }
            </p>
          </section>
        </div>
      </main>

      <Footer variant="light" />
    </>
  );
}
