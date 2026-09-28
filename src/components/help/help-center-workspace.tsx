"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { BookOpen, ChevronDown } from "lucide-react";
import type { User } from "@supabase/supabase-js";

import { ConsoleShell } from "@/components/console/shell/console-shell";
import { ConsoleLoadingSkeleton } from "@/components/console/feedback/loading-skeleton";
import { resetAppearanceHydration } from "@/features/account/appearance-store";
import { resetAccountIdentity } from "@/features/account/identity-store";
import { displayNameFromMetadata } from "@/domain/profiles";
import { forceClientSignOut, safeGetClientSession } from "@/lib/client-auth";
import { browserSupabase as supabase } from "@/lib/supabase-browser";
import {
  CONSOLE_NAV_CONFIGS,
  type ConsoleRole,
} from "@/features/dashboard/shell/nav-config";

type Faq = {
  question: string;
  answer: ReactNode;
  /** Reserve a certains roles. Absent = visible par tous. */
  roles?: ConsoleRole[];
};

type FaqSection = {
  title: string;
  description: string;
  items: Faq[];
};

type ProfileRow = {
  email: string | null;
  full_name: string | null;
};

const SALARIE: ConsoleRole[] = ["salarie"];
const RH: ConsoleRole[] = ["rh"];

/*
  Reponses redigees d'apres le fonctionnement reel de la console, verifie dans le code
  (routes API, composants, messages d'erreur) — pas d'apres l'intention. Les libelles
  entre guillemets sont ceux de l'interface, fautes d'accent comprises : l'utilisateur
  doit pouvoir les retrouver tels quels a l'ecran.

  A relire a chaque changement d'un de ces ecrans : une aide fausse est pire que pas
  d'aide. Ne rien ecrire ici qui ne soit pas verifiable dans le code.
*/
const SECTIONS: FaqSection[] = [
  {
    title: "Vos documents",
    description: "Déposer, suivre et retrouver vos documents.",
    items: [
      {
        question: "Comment déposer un document demandé par mon RH ?",
        answer:
          "Mes documents › A deposer. Sur la demande concernée, « Utiliser cette demande » ouvre la fenêtre de dépôt déjà renseignée : choisissez le fichier, puis « Deposer le document ». Pour un dépôt libre, sans demande, utilisez « Deposer un document » depuis le tableau de bord. Les RH qui vous suivent sont prévenus par e-mail, sauf s'ils ont coupé cette notification.",
        roles: SALARIE,
      },
      {
        question: "Quels formats et quelle taille sont acceptés ?",
        answer:
          "PDF, PNG, JPG, DOC ou DOCX, 10 Mo maximum par fichier. Certains types de document exigent une période : le champ affiche alors « Periode (obligatoire) ».",
        roles: SALARIE,
      },
      {
        question: "Que signifient les statuts, et où lire le commentaire du RH ?",
        answer:
          "« En attente » : le document n'a pas encore été examiné. « Valide » : il est accepté. « Refuse » : il est refusé, et le RH a laissé un commentaire. Pour le lire, ouvrez le menu du document › « Voir commentaire RH ».",
        roles: SALARIE,
      },
      {
        question: "Pourquoi je ne peux plus renommer ni supprimer un document ?",
        answer:
          "Un document validé par le RH est verrouillé et porte le badge « Verrouillé ». Tant qu'il n'est pas validé, son menu propose « Renommer » et « Supprimer ».",
        roles: SALARIE,
      },
      {
        question: "Que devient un document supprimé ?",
        answer:
          "Il passe dans Mes documents › Corbeille, d'où « Restaurer » le remet en place. « Supprimer définitivement » l'efface pour de bon : c'est irréversible. La corbeille n'est jamais vidée automatiquement. Si le document répondait à une demande du RH, cette demande redevient à déposer.",
        roles: SALARIE,
      },
      {
        question: "Où trouver mes fiches de paie ?",
        answer:
          "Mes documents › Fiches de paie. Elles sont déposées par le service RH : vous pouvez les consulter et les télécharger.",
        roles: SALARIE,
      },
    ],
  },
  {
    title: "CRA et facture",
    description: "Pointer un mois et générer les documents correspondants.",
    items: [
      {
        question: "Que faut-il renseigner avant de générer un CRA ou une facture ?",
        answer:
          "Paramètres › Facturation. Remplissez le « Profil de facturation », puis ajoutez au moins une entreprise dans « Entreprises clientes », avec son tarif. Sans profil, aucun document ne peut être généré ; sans tarif, la facture ne peut pas l'être.",
        roles: SALARIE,
      },
      {
        question: "Comment remplir le calendrier ?",
        answer:
          "Un clic coche une journée, un second la passe en demi-journée, un troisième la retire. Pour une entreprise facturée à l'heure, un second clic ouvre la saisie des heures. « Tous les jours ouvres » coche le mois entier, hors week-ends et jours fériés. Les absences se pointent depuis la barre « Pointer : ». Un CRA couvre un seul mois.",
      },
      {
        question: "Que se passe-t-il si je régénère un CRA ?",
        answer:
          "« Generer le CRA » ajoute le PDF à vos documents et le transmet au RH. Le régénérer remplace le PDF précédent par une nouvelle version (v2, v3…) : le document repasse « En attente » et le commentaire du RH est effacé.",
        roles: SALARIE,
      },
      {
        question: "Pourquoi mon CRA ne peut plus être modifié ?",
        answer:
          "Un CRA validé par le RH est définitif : il ne peut plus être modifié, régénéré ni supprimé.",
        roles: SALARIE,
      },
      {
        question: "Comment générer une facture ?",
        answer:
          "Onglet « Facture ». Cochez si besoin « TVA appliquee (20%) » ou « Escompte accorde (2%) », puis « Generer la facture ». L'échéance est fixée à 30 jours après l'émission et les absences ne sont pas facturées. Chaque génération crée une nouvelle facture, numérotée par mois.",
        roles: SALARIE,
      },
      {
        question: "Comment générer un CRA ou une facture pour un collaborateur ?",
        answer:
          "Documents › CRA & Facture. Choisissez le « Collaborateur cible », remplissez le calendrier, puis « Generer le CRA » ou « Generer la facture ». Le document arrive dans l'espace du collaborateur, déjà validé. C'est impossible si un document validé existe déjà pour la même période.",
        roles: RH,
      },
    ],
  },
  {
    title: "Congés",
    description: "Demander un congé et suivre sa validation.",
    items: [
      {
        question: "Comment faire une demande de congé ?",
        answer:
          "Mes documents › Conges. Choisissez « Congé payé » ou « Congé sans solde », les dates de début et de fin, puis « Generer la demande ». Un PDF est ajouté à vos documents et transmis à votre RH, au statut « En attente ».",
        roles: SALARIE,
      },
      {
        question: "Comment générer une demande de congé pour un collaborateur ?",
        answer:
          "Documents › Congés. Recherchez le collaborateur, choisissez le type et les dates, puis « Generer la demande ». Le PDF est ajouté à son espace.",
        roles: RH,
      },
      {
        question: "Comment la durée est-elle calculée ?",
        answer:
          "En jours calendaires, dates de début et de fin incluses : les week-ends et jours fériés sont comptés.",
      },
      {
        question: "Qui valide la demande ?",
        answer:
          "Votre RH, comme pour tout document : son statut passe à « Valide » ou « Refuse ».",
        roles: SALARIE,
      },
    ],
  },
  {
    title: "Valider et réclamer des documents",
    description: "Examiner les dépôts de vos collaborateurs et leur demander des pièces.",
    items: [
      {
        question: "Comment valider ou refuser un document ?",
        answer:
          "Documents › À valider liste les dépôts de vos collaborateurs. Cliquez sur « Valider » ou « Refuser », puis « Confirmer ». Un refus exige un commentaire, que le collaborateur peut lire. « Remettre en attente », depuis Documents › Tous les documents, annule une décision. Le collaborateur n'est pas prévenu par e-mail.",
        roles: RH,
      },
      {
        question: "Comment demander un document à un collaborateur ?",
        answer:
          "Documents › Mes demandes › « Demander un document ». Choisissez le collaborateur, le type, l'échéance et, si besoin, la période et une note, puis « Creer la demande ». Le collaborateur reçoit un e-mail, sauf s'il a coupé cette notification. Tant que la demande n'est pas validée, « Annuler » la retire.",
        roles: RH,
      },
      {
        question: "Comment importer plusieurs documents d'un coup ?",
        answer:
          "Documents › Tous les documents, menu du titre › « Importer des documents ». Formats PDF, PNG, JPG, DOC ou DOCX, 10 Mo maximum par fichier. Le collaborateur et la période sont reconnus dans le nom du fichier, par exemple « 2026 08 Dupont.pdf ». Un document déposé par un RH est directement validé.",
        roles: RH,
      },
      {
        question: "Quels documents puis-je supprimer ?",
        answer:
          "Uniquement les documents que vous avez déposés vous-même. Les dépôts de vos collaborateurs se valident ou se refusent, mais ne se suppriment pas depuis votre espace.",
        roles: RH,
      },
      {
        question: "Pourquoi je ne vois pas certains collaborateurs ?",
        answer:
          "Vous ne voyez que les collaborateurs qu'un administrateur vous a affectés. Pour en suivre d'autres, adressez-vous à un administrateur.",
        roles: RH,
      },
    ],
  },
  {
    title: "Messagerie",
    description: "Échanger au sein de la console.",
    items: [
      {
        question: "À qui puis-je écrire ?",
        answer: "Uniquement aux RH qui vous suivent.",
        roles: SALARIE,
      },
      {
        question: "À qui puis-je écrire ?",
        answer: "Aux collaborateurs qui vous sont affectés, et aux autres RH.",
        roles: RH,
      },
      {
        question: "Comment démarrer une conversation ?",
        answer:
          "Messages › « Nouvelle conversation », puis recherchez votre interlocuteur par nom ou par e-mail. Entrée envoie le message, Maj+Entrée passe à la ligne.",
      },
      {
        question: "Puis-je joindre un fichier ?",
        answer: "Non : la messagerie n'accepte que du texte, 4000 caractères maximum par message.",
      },
      {
        question: "Comment savoir si j'ai des messages non lus ?",
        answer:
          "L'icône de messagerie, en haut de l'écran, indique le nombre de messages non lus, et chaque conversation concernée porte un compteur.",
      },
    ],
  },
  {
    title: "Compte et sécurité",
    description: "Vos informations, votre mot de passe et vos préférences.",
    items: [
      {
        question: "Comment changer mon mot de passe ?",
        answer:
          "Paramètres › Sécurité › « Changer le mot de passe ». Votre mot de passe actuel est demandé, et le nouveau doit compter au moins 8 caractères.",
      },
      {
        question: "J'ai oublié mon mot de passe : que faire ?",
        answer:
          "La console ne propose pas de réinitialisation en libre-service. Demandez à un administrateur : il peut définir un nouveau mot de passe et vous le communiquer.",
      },
      {
        question: "Comment changer mon adresse e-mail ?",
        answer:
          "Paramètres › Profil › « Changer l'adresse ». Le changement ne prend effet qu'après un clic sur le lien envoyé à la nouvelle adresse ; l'ancienne reste active d'ici là.",
      },
      {
        question: "Comment choisir les e-mails que je reçois ?",
        answer:
          "Paramètres › Notifications. Chaque type d'e-mail a son interrupteur, dont « Demandes de documents », « Dépôts de documents » et « CRA, factures et congés ». Tous sont activés par défaut.",
      },
      {
        question: "Comment changer l'écran d'accueil ou passer en thème sombre ?",
        answer:
          "Paramètres › Apparence : « Thème », « Écran d'accueil » (la page ouverte après la connexion) et « Lignes par page ». Le thème se change aussi depuis le menu du compte, section « Apparence ».",
      },
      {
        question: "Comment me déconnecter de tous mes appareils ?",
        answer:
          "Paramètres › Sécurité › « Déconnecter tous les appareils ». Toutes les sessions sont fermées, y compris celle en cours.",
      },
      {
        question: "Puis-je supprimer mon compte ?",
        answer:
          "Pas depuis la console : seul un administrateur peut supprimer un compte, et la suppression est définitive.",
      },
    ],
  },
];

type HelpCenterWorkspaceProps = {
  role: ConsoleRole;
};

export function HelpCenterWorkspace({ role }: HelpCenterWorkspaceProps) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [loadingSession, setLoadingSession] = useState(true);

  // Une question reservee a un autre role disparait ; une section videe avec elle aussi.
  const sections = useMemo(
    () =>
      SECTIONS.map((section) => ({
        ...section,
        items: section.items.filter((item) => !item.roles || item.roles.includes(role)),
      })).filter((section) => section.items.length > 0),
    [role],
  );

  // Meme garde que les autres pages de la console : session, role attendu, compte verifie.
  useEffect(() => {
    if (!supabase) return;
    const client = supabase;
    let cancelled = false;

    void (async () => {
      const { session } = await safeGetClientSession(client);
      if (cancelled) return;

      if (!session?.user) {
        router.push("/auth");
        return;
      }

      const { data, error } = await client
        .from("profiles")
        .select("email,full_name,role,professional_status")
        .eq("id", session.user.id)
        .single();

      if (cancelled) return;

      if (error || !data || data.role !== role || data.professional_status !== "verified") {
        router.push("/auth");
        return;
      }

      setUser(session.user);
      setProfile(data as ProfileRow);
      setLoadingSession(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [role, router]);

  const handleSignOut = useCallback(async () => {
    if (!supabase) return;
    resetAppearanceHydration();
    resetAccountIdentity();
    await forceClientSignOut(supabase);
    router.push("/auth?logged_out=1");
  }, [router]);

  const displayName =
    displayNameFromMetadata(user?.user_metadata) ??
    profile?.full_name ??
    profile?.email ??
    "utilisateur";

  const guideHref = CONSOLE_NAV_CONFIGS[role].documentationHref;

  return (
    <ConsoleShell
      role={role}
      displayName={displayName}
      email={profile?.email ?? "-"}
      onSignOut={handleSignOut}
      pageDescription="Les réponses aux questions les plus fréquentes sur Jarvis Connect."
      pageActions={
        guideHref ? (
          // Meme gabarit que le bouton secondaire « Retour » de la fiche collaborateur.
          <a
            href={guideHref}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 rounded-app-control border border-app-line px-3 py-2 text-app-sm text-app-text-secondary transition-colors hover:bg-app-surface-hover hover:text-app-text focus-visible:outline-app"
          >
            <BookOpen aria-hidden="true" className="h-4 w-4" />
            Guide PDF
            <span className="sr-only">(nouvel onglet)</span>
          </a>
        ) : undefined
      }
    >
      {loadingSession ? (
        <ConsoleLoadingSkeleton label="Chargement du centre d'aide..." showStats={false} />
      ) : (
        <div className="space-y-2">
          {sections.map((section) => (
            <section
              key={section.title}
              aria-labelledby={`aide-${slugify(section.title)}`}
              className="rounded-app-card border border-app-line bg-app-surface"
            >
              <header className="border-b border-app-line px-5 py-4">
                <h2
                  id={`aide-${slugify(section.title)}`}
                  className="text-app-md font-semibold text-app-text"
                >
                  {section.title}
                </h2>
                <p className="mt-1 text-app-sm text-app-text-secondary">{section.description}</p>
              </header>
              <ul className="divide-y divide-app-line px-5">
                {section.items.map((item) => (
                  <li key={item.question}>
                    <details className="group">
                      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 py-3 text-app-sm font-medium text-app-text focus-visible:outline-app [&::-webkit-details-marker]:hidden">
                        {item.question}
                        <ChevronDown
                          aria-hidden="true"
                          className="h-4 w-4 shrink-0 text-app-text-muted transition-transform group-open:rotate-180 motion-reduce:transition-none"
                        />
                      </summary>
                      <p className="max-w-3xl pb-4 text-app-sm text-app-text-secondary">
                        {item.answer}
                      </p>
                    </details>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </ConsoleShell>
  );
}

function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}
