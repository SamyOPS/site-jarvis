import { TabsFeaturettes } from "@/components/sections/tabs-featurettes";

import { Actualites } from "@/components/sections/actualites";

import { Hero } from "@/components/sections/hero";

import { OffresEmploi } from "@/components/sections/offres-emploi";

import { Clients } from "@/components/sections/clients";

import { About } from "@/components/sections/about";

import { Header } from "@/components/sections/header";

import { Footer } from "@/components/sections/footer";

import { FormationsSupport } from "@/components/sections/formations-support";

import { Shield, Code2, Sparkles } from "lucide-react";



export default function Home() {

  const expertises = [

    {

      title: "Support & Infogérance IT",

      description:

        "Assistance utilisateurs et supervision 24/7, maintenance proactive, securite renforcee et pilotage complet du parc informatique. Nous prenons en charge N1 a N3, mettons en place des SLA mesurables, un reporting clair et un plan d'amelioration continue pour une disponibilite maximale.",

      href: "/expertises/support",

    },

    {

      title: "Développement d'applications",

      description:

        "Applications web, mobiles et metiers concues pour generer de la valeur. De la discovery a la mise en production, nos equipes UX/UI et dev full stack livrent vite, avec tests, CI/CD et qualite produit. Objectif: un MVP convaincant puis un produit robuste, evolutif et performant.",

      href: "/expertises/developpement",

    },

    {

      title: "Conseil & Transformation Digitale",

      description:

        "Architecture, audit, cloud et cybersecurite pour transformer votre SI en levier business. Nous definissons une roadmap claire, un business case solide et une gouvernance efficace, puis pilotons les chantiers avec vos equipes pour accelerer la transformation et reduire les risques.",

      href: "/expertises/conseil",

    },

  ];



  const newsItems = [

    {

      id: "news-1",

      title: "Support 24/7 et ouverture du SOC Jarvis",

      summary:

        "Nouvelle équipe dédiée à la supervision et à la réponse aux incidents pour renforcer la sécurité de nos clients.",

      url: "#",

      image:

        "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=1200&q=80",

    },

    {

      id: "news-2",

      title: "Lancement d'un centre de compétence Cloud",

      summary:

        "Accompagnement sur Azure et AWS pour la modernisation des infrastructures et l'industrialisation des déploiements.",

      url: "#",

      image:

        "https://images.unsplash.com/photo-1753715613382-dc3e8456dbc9?q=80&w=1082&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",

    },

    {

      id: "news-3",

      title: "Nouveau programme d'innovation applicative",

      summary:

        "Ateliers design et MVP pour accélérer la livraison de produits digitaux en moins de 12 semaines.",

      url: "#",

      image:

        "https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=1200&q=80",

    },

    {

      id: "news-4",

      title: "Partenariat stratégique cybersécurité",

      summary:

        "Renforcement de notre offre SOC, pentest et sensibilisation des équipes avec un partenaire spécialisé.",

      url: "#",

      image:

        "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=1200&q=80",

    },

  ];



  const jobOffers = [

    {

      id: "job-1",

      title: "Ingénieur support N2/N3",

      summary:

        "Prise en charge des incidents complexes, supervision et automatisation pour nos clients ETI et PME.",

      label: "CDI",

      author: "Jarvis Connect",

      published: "Déc 2025",

      url: "#",

      image:

        "https://images.unsplash.com/photo-1525182008055-f88b95ff7980?auto=format&fit=crop&w=1200&q=80",

    },

    {

      id: "job-2",

      title: "Développeur Full Stack JS",

      summary:

        "Delivery de produits web (React/Node), APIs et front-end avec forte exigence qualité et sécurité.",

      label: "CDI",

      author: "Jarvis Connect",

      published: "Déc 2025",

      url: "#",

      image:

        "https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&w=1200&q=80",

    },

    {

      id: "job-3",

      title: "Consultant Cloud & Sécu",

      summary:

        "Architecture, migration et hardening sur Azure/AWS avec approche FinOps et gouvernance.",

      label: "CDI",

      author: "Jarvis Connect",

      published: "Déc 2025",

      url: "#",

      image:

        "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&w=1200&q=80",

    },

  ];



  const clients = [

    {

      name: "Sisley",

      logo: "/client/sisley.png",

    },

    {

      name: "BPCE",

      logo: "/client/bpce.png",

    },

    {

      name: "Burberry",

      logo: "/client/burberry.png",

    },

    {

      name: "Etypharm",

      logo: "/client/etypharm.png",

    },

    {

      name: "Foncia",

      logo: "/client/Foncia.png",

    },

    {

      name: "RSA",

      logo: "/client/rsa.png",

    },

    {

      name: "ALD Automotive",

      logo: "/client/ald.png",

    },

    {

      name: "BNP Paribas",

      logo: "/client/bnp.png",

    },

  ];



  const aboutMainImage = {

    src: "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=1200&auto=format&fit=crop&q=80",

    alt: "Équipe Jarvis Connect",

  };



  const aboutBreakout = {

    src: "https://dummyimage.com/160x60/0a1a2f/ffffff&text=Jarvis+Connect",

    alt: "Jarvis Connect",

    title: "Des équipes engagées pour vos projets IT",

    description:

      "Support, développement et sécurité assurés par une équipe senior qui s'aligne sur vos enjeux. Nous pilotons les incidents, la supervision et l'industrialisation des déploiements pour que vos utilisateurs restent productifs. Nos experts anticipent les risques, documentent les architectures et vous accompagnent sur la durée, avec des engagements clairs et une communication transparente.",

    extra:

      "Nous mettons en place les bons indicateurs, les outils de collaboration et la formation pour que vos équipes adoptent les nouvelles solutions sans friction.",

    buttonText: "En savoir plus",

    buttonUrl: "#",

  };



  const aboutCompanies = [

    { src: "/partenaire/nxo.png", alt: "NXO" },

    { src: "/partenaire/scc.png", alt: "SCC" },

    { src: "/partenaire/opteamis.png", alt: "Opteamis" },

    { src: "/partenaire/iris.png", alt: "IRIS" },

  ];



  const aboutAchievements = [

    { label: "Clients accompagnés", value: "50+" },

    { label: "Projets délivrés", value: "250+" },

    { label: "Satisfaction", value: "98%" },

  ];



  const expertiseTabs = expertises.map((item, index) => ({

    value: `tab-${index + 1}`,

    icon:

      index === 0 ? (

        <Shield className="h-4 w-4" />

      ) : index === 1 ? (

        <Code2 className="h-4 w-4" />

      ) : (

        <Sparkles className="h-4 w-4" />

      ),

    label: item.title,

    content: {

      badge: "Expertise Jarvis",

      title: item.title,

      description: item.description,

      buttonText: "Découvrir",

      buttonUrl: item.href,

      imageSrc:

        index === 0

          ? "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1200&q=80"

          : index === 1

            ? "https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&w=1200&q=80"

            : "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&w=1200&q=80",

      imageAlt: item.title,

    },

  }));



  return (

    <>

    <div className="min-h-screen bg-white">
      <div className="text-white">

      <Header />

      <main className="particle-readability">
        <div id="top" />

        <section>

          <Hero

            title="Jarvis Connect propulse vos projets"

            highlightText="IT & digital"

            description="Support, développement applicatif et sécurité réunis au sein d'une équipe senior qui intervient vite et bien pour vos utilisateurs."

            showScrollIcon

            scrollIconLabel="Scroll vers les expertises"

            scrollText="Découvrir notre expertise"
            scrollTargetId="expertises"

            colors={["#0A1A2F", "#0d1f35", "#11345f", "#1f4f7d", "#2aa0dd", "#7ce0ff"]}

            className="text-white"

            titleClassName="!text-white drop-shadow-[0_12px_30px_rgba(0,0,0,0.35)]"

            descriptionClassName="text-white/90"

            buttonClassName="border-white/40"

            maxWidth="max-w-5xl"

            veilOpacity="bg-[#0A1A2F]/55"

            fontFamily="Inter, system-ui, -apple-system, sans-serif"

            fontWeight={700}

          />

        </section>



        <section id="about">

          <About

            title="Jarvis Connect, partenaire IT & digital"

            description="Nous combinons support, développement applicatif et sécurité pour accompagner la croissance des PME et ETI."

            mainImage={aboutMainImage}

            breakout={aboutBreakout}

            companiesTitle="Experts transverses pour vos projets"

            companies={aboutCompanies}

            achievementsTitle="Notre impact"

            achievementsDescription="Une équipe senior, des process industriels et une culture de la disponibilité pour vos utilisateurs."

            achievements={aboutAchievements}

          />

        </section>



        <section id="expertises" className="text-[#1E1E1E]">
          <TabsFeaturettes

            heading="Nos expertises clés"

            description="Support & infogérance, développement applicatif, conseil et transformation digitale pour des SI performants."

            tabs={expertiseTabs}

          />

        </section>



        <section>

          <Clients

            title="Ils nous font confiance"

            description="Nous livrons nos solutions numériques en partenariat avec des acteurs majeurs en France et en Europe."

            clients={clients}

            highlightLogo="/client/sisley.png"

            quote={

              <>

                "Nous travaillons depuis quelques mois avec la société <em>Jarvis Connect</em> et j'en suis pleinement satisfait.

                <br />

                <br />

                Des réponses rapides, pertinentes. Une équipe a notre écoute, souple et réactive !

                <br />

                <br />

                Je ne peux que recommander !"

              </>

            }

            author="Julien S, Responsable support IT"

          />

        </section>



        <section id="actualites" className="bg-[#F4F7FA] text-[#1E1E1E]">

          <Actualites heading="Actualités de Jarvis Connect" demoUrl="/actus" items={newsItems} />

        </section>



        <section id="formations" className="text-[#1E1E1E]">
          <FormationsSupport />

        </section>



        <section id="offres" className="text-[#1E1E1E]">
          <OffresEmploi

            tagline="Recrutement"

            heading="Nos offres d'emploi"

            description="Découvrez les opportunités ouvertes chez Jarvis Connect et rejoignez une équipe technique qui fait bouger les SI."

            buttonText="Voir toutes les offres"

            buttonUrl="/offres"

            posts={jobOffers}

          />

        </section>



      </main>

    </div>

    </div>


    <Footer />

    </>
  );

}




