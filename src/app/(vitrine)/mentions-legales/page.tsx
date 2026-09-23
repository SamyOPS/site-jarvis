import type { Metadata } from "next";
import Footer from "@/components/vitrine/footer";
import Menu from "@/components/vitrine/menu";

export const metadata: Metadata = {
  title: "Mentions légales — Jarvis Connect",
  description:
    "Mentions légales du site Jarvis Connect : éditeur, hébergement, propriété intellectuelle, données personnelles.",
};

const editeur = [
  { label: "Raison sociale", value: "JARVIS CONNECT" },
  { label: "Forme juridique", value: "Société par Actions Simplifiée (SAS)" },
  { label: "Capital social", value: "500,00 €" },
  { label: "SIREN", value: "921 375 317" },
  { label: "SIRET (siège social)", value: "921 375 317 00010" },
  { label: "N° TVA intracommunautaire", value: "FR92 921 375 317" },
  { label: "Code NAF / APE", value: "62.01Z — Programmation informatique" },
  {
    label: "Siège social",
    value: "4 Avenue de la Libération, 60160 Montataire, France",
  },
  { label: "Date de création", value: "23 octobre 2022" },
];

const hebergement = [
  { label: "Hébergeur", value: "Vercel Inc." },
  {
    label: "Adresse",
    value: "440 N Barranca Ave #4133, Covina, CA 91723, États-Unis",
  },
];

export default function MentionsLegalesPage() {
  return (
    <>
      <main className="font-soft relative min-h-dvh bg-white text-zinc-900">
        {/* Barre : logo + Contactez nous + burger + panneau */}
        <Menu />

        {/* Titre + date */}
        <header className="px-6 pt-32 sm:px-12 sm:pt-40">
          <h1 className="text-center text-[clamp(2.5rem,9vw,8rem)] font-bold uppercase leading-[0.95] tracking-tight">
            Mentions légales
          </h1>
          <p className="mt-6 text-center text-sm text-zinc-500">
            Mise à jour : 3 juillet 2026
          </p>
        </header>

        {/* Contenu, colonne centrée */}
        <div className="mx-auto mt-16 max-w-3xl space-y-12 px-6 pb-32 sm:mt-24">
          <section>
            <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              1. Éditeur du site
            </h2>
            <div className="mt-4 leading-relaxed text-zinc-600">
              {editeur.map((item) => (
                <p key={item.label}>
                  <strong className="font-semibold text-zinc-900">
                    {item.label}
                  </strong>{" "}
                  : {item.value}
                </p>
              ))}
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              2. Directeur de la publication
            </h2>
            <p className="mt-4 leading-relaxed text-zinc-600">
              {
                "Monsieur Azeez Abdoul, dirigeant de la société JARVIS CONNECT, est responsable de la publication du présent site internet."
              }
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              3. Hébergement
            </h2>
            <div className="mt-4 leading-relaxed text-zinc-600">
              {hebergement.map((item) => (
                <p key={item.label}>
                  <strong className="font-semibold text-zinc-900">
                    {item.label}
                  </strong>{" "}
                  : {item.value}
                </p>
              ))}
              <p>
                <strong className="font-semibold text-zinc-900">Site web</strong>{" "}
                :{" "}
                <a
                  href="https://vercel.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline underline-offset-2 hover:text-zinc-900"
                >
                  https://vercel.com
                </a>
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              4. Propriété intellectuelle
            </h2>
            <div className="mt-4 space-y-4 leading-relaxed text-zinc-600">
              <p>
                {
                  "L'ensemble du contenu publié sur ce site — textes, images, graphismes, logo, icônes et logiciels — est la propriété exclusive de JARVIS CONNECT ou de ses partenaires, et est protégé par les dispositions du Code de la propriété intellectuelle ainsi que par les conventions internationales applicables."
                }
              </p>
              <p>
                {
                  "Toute reproduction, représentation, modification ou adaptation, partielle ou totale, de ces éléments est strictement interdite sans l'autorisation écrite préalable de JARVIS CONNECT."
                }
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              5. Limitation de responsabilité
            </h2>
            <div className="mt-4 space-y-4 leading-relaxed text-zinc-600">
              <p>
                {
                  "JARVIS CONNECT s'efforce d'assurer l'exactitude et la mise à jour régulière des informations diffusées sur ce site. Toutefois, la société ne peut garantir l'exhaustivité ou la parfaite actualité de ces informations."
                }
              </p>
              <p>
                {
                  "En conséquence, l'utilisateur reconnaît utiliser ces informations sous sa responsabilité exclusive. JARVIS CONNECT ne saurait être tenu responsable de tout dommage direct ou indirect résultant de l'accès au site ou de l'utilisation de son contenu."
                }
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              6. Données personnelles (RGPD)
            </h2>
            <div className="mt-4 space-y-4 leading-relaxed text-zinc-600">
              <p>
                {
                  "Conformément au Règlement Général sur la Protection des Données (RGPD — UE 2016/679) et à la loi Informatique et Libertés n° 78-17 du 6 janvier 1978 modifiée, vous disposez d'un droit d'accès, de rectification, d'effacement, de portabilité et d'opposition au traitement de vos données personnelles."
                }
              </p>
              <p>
                {
                  "Pour exercer ces droits, vous pouvez contacter JARVIS CONNECT à l'adresse postale de son siège social ou via le formulaire de contact disponible sur le site."
                }
              </p>
              <p>
                {
                  "Vous disposez également du droit d'introduire une réclamation auprès de la Commission Nationale de l'Informatique et des Libertés (CNIL)."
                }
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              7. Cookies
            </h2>
            <p className="mt-4 leading-relaxed text-zinc-600">
              {
                "Ce site utilise des cookies techniques nécessaires à son bon fonctionnement. Conformément aux recommandations de la CNIL et à la directive européenne ePrivacy, les cookies non essentiels sont soumis à votre consentement préalable. Vous pouvez configurer ou désactiver les cookies à tout moment depuis les paramètres de votre navigateur."
              }
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              8. Droit applicable et juridiction
            </h2>
            <p className="mt-4 leading-relaxed text-zinc-600">
              {
                "Les présentes mentions légales sont soumises au droit français. En cas de litige et à défaut de résolution amiable, les tribunaux français seront seuls compétents pour en connaître."
              }
            </p>
          </section>
        </div>
      </main>

      <Footer variant="light" />
    </>
  );
}
