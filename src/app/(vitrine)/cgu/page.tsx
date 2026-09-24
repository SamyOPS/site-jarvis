import type { Metadata } from "next";
import Link from "next/link";
import Footer from "@/components/vitrine/footer";
import Menu from "@/components/vitrine/menu";

export const metadata: Metadata = {
  title: "Conditions générales d'utilisation — Jarvis Connect",
  description:
    "Conditions générales d'utilisation du site Jarvis Connect : accès au site, espace sécurisé, propriété intellectuelle, responsabilité.",
};

const infosLegales = [
  { label: "Raison sociale", value: "JARVIS CONNECT" },
  { label: "Forme juridique", value: "Société par Actions Simplifiée (SAS)" },
  {
    label: "Siège social",
    value: "4 Avenue de la Libération, 60160 Montataire, France",
  },
  { label: "SIREN", value: "921 375 317" },
  { label: "N° TVA intracommunautaire", value: "FR92 921 375 317" },
];

export default function CguPage() {
  return (
    <>
      <main className="font-soft relative min-h-dvh bg-white text-zinc-900">
        {/* Barre : logo + Contactez nous + burger + panneau */}
        <Menu />

        {/* Titre + date */}
        <header className="px-6 pt-32 sm:px-12 sm:pt-40">
          <h1 className="text-center text-[clamp(2.5rem,9vw,8rem)] font-bold uppercase leading-[0.95] tracking-tight">
            Conditions générales d&apos;utilisation
          </h1>
          <p className="mt-6 text-center text-sm text-zinc-500">
            Mise à jour : 3 juillet 2026
          </p>
        </header>

        {/* Contenu, colonne centrée */}
        <div className="mx-auto mt-16 max-w-3xl space-y-12 px-6 pb-32 sm:mt-24">
          <p className="leading-relaxed text-zinc-600">
            {
              "Les présentes conditions générales d'utilisation (ci-après les « CGU ») définissent les modalités de mise à disposition et d'utilisation du site jarvis-connect.fr (ci-après le « Site »). En naviguant sur ce Site, l'utilisateur accepte sans réserve les présentes CGU."
            }
          </p>

          <section>
            <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              1. Informations légales
            </h2>
            <div className="mt-4 leading-relaxed text-zinc-600">
              <p>Ce Site est édité par :</p>
              {infosLegales.map((item) => (
                <p key={item.label}>
                  <strong className="font-semibold text-zinc-900">
                    {item.label}
                  </strong>{" "}
                  : {item.value}
                </p>
              ))}
              <p className="mt-3">
                Pour l&apos;ensemble des informations relatives à l&apos;éditeur
                et à l&apos;hébergeur, consultez les{" "}
                <Link
                  href="/mentions-legales"
                  className="underline underline-offset-2 hover:text-zinc-900"
                >
                  mentions légales
                </Link>
                .
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              2. Objet
            </h2>
            <p className="mt-4 leading-relaxed text-zinc-600">
              {
                "Les présentes CGU ont pour objet de définir les conditions d'accès et d'utilisation du Site ainsi que les droits et obligations des utilisateurs. Elles s'appliquent à toute personne accédant au Site, qu'il s'agisse d'un simple visiteur ou d'un utilisateur disposant d'un accès à un espace réservé."
              }
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              3. Accès au site
            </h2>
            <div className="mt-4 space-y-4 leading-relaxed text-zinc-600">
              <p>
                {
                  "Le Site est accessible gratuitement à tout utilisateur disposant d'un accès à Internet. Les coûts liés à l'accès (matériel, logiciels, connexion) sont à la charge exclusive de l'utilisateur."
                }
              </p>
              <p>
                {
                  "JARVIS CONNECT s'efforce d'assurer l'accessibilité du Site 24h/24 et 7j/7, sans toutefois y être tenue. L'accès peut être interrompu, notamment pour des raisons de maintenance, de mise à jour ou en cas de force majeure, sans que la responsabilité de JARVIS CONNECT puisse être engagée à ce titre, sauf faute de sa part."
                }
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              4. Espace sécurisé (salariés et RH)
            </h2>
            <div className="mt-4 space-y-4 leading-relaxed text-zinc-600">
              <p>
                {
                  "Le Site peut proposer un espace sécurisé réservé aux salariés de JARVIS CONNECT et au service des ressources humaines, permettant notamment le dépôt, la consultation et le partage de documents. L'accès à cet espace est strictement personnel et nécessite une authentification."
                }
              </p>
              <p>
                {
                  "L'utilisateur est responsable de la confidentialité de ses identifiants et de toute action effectuée depuis son compte. Il s'engage à ne déposer que des contenus licites, exacts et dont il détient les droits, et à utiliser cet espace conformément à sa destination."
                }
              </p>
              <p>
                {
                  "Toute utilisation frauduleuse, non autorisée ou toute perte d'identifiants doit être signalée sans délai à JARVIS CONNECT. Le traitement des données à caractère personnel dans ce cadre est décrit dans la "
                }
                <Link
                  href="/politique-de-confidentialite"
                  className="underline underline-offset-2 hover:text-zinc-900"
                >
                  politique de confidentialité
                </Link>
                .
              </p>
              <p>
                {
                  "Pour les salariés, l'utilisation de l'espace sécurisé s'inscrit dans le cadre de la charte informatique et du règlement intérieur de JARVIS CONNECT, que les présentes CGU complètent sans s'y substituer."
                }
              </p>
              <p>
                {
                  "JARVIS CONNECT peut suspendre ou supprimer l'accès à l'espace sécurisé, immédiatement et sans préavis, en cas de manquement aux présentes CGU, d'utilisation abusive ou de compromission de la sécurité. Pour les salariés, l'accès est désactivé en cas de suspension ou de rupture du contrat de travail, ou de retrait de l'habilitation. Le sort des documents déposés est alors déterminé conformément aux durées légales de conservation et à la politique de confidentialité."
                }
              </p>
              <p>
                {
                  "Sous réserve de l'information préalable des personnes concernées, les données d'authentification et les journaux de connexion pourront être utilisés comme moyen de preuve en cas de litige."
                }
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              5. Propriété intellectuelle
            </h2>
            <div className="mt-4 space-y-4 leading-relaxed text-zinc-600">
              <p>
                {
                  "L'ensemble des éléments du Site (textes, images, graphismes, logo, icônes, structure et logiciels) est la propriété exclusive de JARVIS CONNECT ou de ses partenaires et est protégé par le Code de la propriété intellectuelle. Toute reproduction, représentation ou exploitation, totale ou partielle, sans autorisation écrite préalable, est strictement interdite."
                }
              </p>
              <p>
                {
                  "L'utilisateur conserve ses droits sur les contenus et documents qu'il dépose sur le Site. Il garantit détenir les droits nécessaires sur ces contenus et concède à JARVIS CONNECT la licence strictement nécessaire à leur hébergement et à leur mise à disposition dans le cadre de l'espace sécurisé."
                }
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              6. Données personnelles
            </h2>
            <p className="mt-4 leading-relaxed text-zinc-600">
              {
                "Le traitement des données à caractère personnel collectées via le Site est régi par la "
              }
              <Link
                href="/politique-de-confidentialite"
                className="underline underline-offset-2 hover:text-zinc-900"
              >
                politique de confidentialité
              </Link>
              {
                ", qui précise notamment les finalités, les bases légales, les durées de conservation et les droits dont l'utilisateur dispose conformément au RGPD. Le site ne dépose aucun cookie : seul le stockage local du navigateur est utilisé, pour les besoins strictement nécessaires au service — authentification et préférences d'affichage."
              }
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              7. Obligations de l&apos;utilisateur
            </h2>
            <p className="mt-4 leading-relaxed text-zinc-600">
              {
                "L'utilisateur s'engage à utiliser le Site de manière loyale et conforme à la loi. Il s'interdit notamment de porter atteinte au bon fonctionnement du Site, de tenter d'accéder frauduleusement à ses systèmes, de diffuser des contenus illicites ou de nature à porter atteinte aux droits de tiers ou à l'image de JARVIS CONNECT."
              }
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              8. Responsabilité et liens externes
            </h2>
            <div className="mt-4 space-y-4 leading-relaxed text-zinc-600">
              <p>
                {
                  "JARVIS CONNECT s'efforce d'assurer l'exactitude des informations diffusées sur le Site mais ne saurait garantir leur exhaustivité ou leur parfaite actualité. Dans les limites autorisées par la loi, sa responsabilité ne saurait être engagée pour les dommages indirects ni pour ceux résultant d'un cas de force majeure, du fait d'un tiers ou d'une utilisation non conforme du Site. Ces limitations ne s'appliquent pas en cas de faute lourde ou dolosive, de dommage corporel, ni lorsque la loi l'interdit."
                }
              </p>
              <p>
                {
                  "Le Site peut contenir des liens vers des sites tiers sur lesquels JARVIS CONNECT n'exerce aucun contrôle et dont elle ne saurait être tenue responsable du contenu."
                }
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              9. Modification des CGU
            </h2>
            <p className="mt-4 leading-relaxed text-zinc-600">
              {
                "JARVIS CONNECT se réserve le droit de modifier les présentes CGU à tout moment, notamment pour les adapter aux évolutions légales ou fonctionnelles du Site. Les CGU applicables sont celles en vigueur à la date de navigation de l'utilisateur ; la date de dernière mise à jour figure en haut de cette page."
              }
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              10. Divisibilité
            </h2>
            <p className="mt-4 leading-relaxed text-zinc-600">
              {
                "Si l'une des stipulations des présentes CGU était déclarée nulle, invalide ou inapplicable, les autres stipulations conserveraient leur pleine force et leur plein effet."
              }
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              11. Droit applicable et juridiction
            </h2>
            <p className="mt-4 leading-relaxed text-zinc-600">
              {
                "Les présentes CGU sont soumises au droit français. En cas de litige et à défaut de résolution amiable, les tribunaux français seront seuls compétents pour en connaître."
              }
            </p>
          </section>
        </div>
      </main>

      <Footer variant="light" />
    </>
  );
}
