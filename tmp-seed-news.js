const { createClient } = require("@supabase/supabase-js");

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://egxtskkaulojfynckhji.supabase.co";
const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "sb_publishable_89SWCkKmhz0jwmTuURJT1g_VqJgatfn";

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const now = new Date().toISOString();

const rows = [
  {
    title: "Jarvis Connect renforce son offre cybersécurité managée",
    slug: "jarvis-connect-renforce-son-offre-cybersecurite-managee",
    excerpt:
      "Une offre structurée autour de la prévention, de la détection et de l’accompagnement opérationnel pour aider les entreprises à mieux maîtriser leur exposition.",
    content: `# Une offre cybersécurité plus lisible et plus opérationnelle

Jarvis Connect structure son accompagnement cybersécurité autour de trois axes : **audit**, **protection** et **pilotage**. L’objectif est simple : donner aux entreprises un cadre clair pour prioriser leurs actions et sécuriser leurs usages sans alourdir leur quotidien.

## Ce que cette offre apporte

- Un état des lieux rapide des risques prioritaires
- Des recommandations actionnables à court terme
- Un accompagnement sur les sujets de sensibilisation et de gouvernance

## Une approche orientée résultats

Au-delà des outils, l’enjeu est d’améliorer durablement les réflexes, la visibilité et la capacité de réaction des équipes. Cette approche permet d’avancer étape par étape, avec une trajectoire adaptée à la taille de l’organisation et à ses contraintes métier.`,
    cover_image:
      "https://images.unsplash.com/photo-1510915228340-29c85a43dcfe?auto=format&fit=crop&w=1200&q=80",
    video_url: null,
    pdf_url: null,
    status: "published",
    published_at: now,
  },
  {
    title: "Transformation digitale : 5 priorités concrètes pour 2026",
    slug: "transformation-digitale-5-priorites-concretes-2026",
    excerpt:
      "Entre industrialisation, accompagnement des usages et pilotage des coûts, les entreprises cherchent aujourd’hui des feuilles de route plus sobres et plus efficaces.",
    content: `# Cinq priorités pour avancer sans disperser les équipes

La transformation digitale ne se résume plus à empiler des projets. En 2026, les organisations qui progressent le mieux sont celles qui cadrent leurs chantiers autour de gains mesurables, de décisions rapides et d’une meilleure adoption interne.

## 1. Simplifier les parcours utilisateurs

Réduire la friction dans les outils du quotidien améliore immédiatement l’expérience collaborateur et limite les tâches de support à faible valeur.

## 2. Standardiser les méthodes de delivery

Des rituels, une documentation utile et des arbitrages plus courts permettent d’accélérer les projets sans dégrader la qualité.

## 3. Mesurer l’impact réel

Les indicateurs utiles sont ceux qui éclairent l’adoption, la stabilité et la valeur délivrée aux métiers.`,
    cover_image:
      "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=1200&q=80",
    video_url: null,
    pdf_url: null,
    status: "published",
    published_at: now,
  },
  {
    title: "Support IT : améliorer la satisfaction utilisateur sans alourdir les process",
    slug: "support-it-satisfaction-utilisateur-process",
    excerpt:
      "Le niveau de satisfaction ne dépend pas seulement du temps de réponse. Il repose aussi sur la clarté, la qualité de traitement et la capacité à mieux prévenir les incidents.",
    content: `# Repenser le support autour de l’expérience réelle

Un support IT performant ne se limite pas à fermer des tickets rapidement. Il doit aussi rassurer, orienter et rendre visible la progression du traitement pour les utilisateurs.

## Des gains rapides à mettre en place

- Clarifier les niveaux de priorité
- Harmoniser les réponses les plus fréquentes
- Mettre en avant les incidents récurrents pour mieux les traiter à la source

## Mieux prévenir plutôt que subir

La supervision, l’analyse des tendances et la documentation opérationnelle permettent de réduire le volume d’incidents et de concentrer les équipes sur les cas les plus utiles.`,
    cover_image:
      "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1200&q=80",
    video_url: null,
    pdf_url: null,
    status: "published",
    published_at: now,
  },
];

async function main() {
  const { data, error } = await supabase
    .from("news")
    .upsert(rows, { onConflict: "slug" })
    .select("id,title,slug,status,published_at");

  if (error) {
    console.error(JSON.stringify(error, null, 2));
    process.exit(1);
  }

  console.log(JSON.stringify(data, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
