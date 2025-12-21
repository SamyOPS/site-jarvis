import { Feature108 } from "@/components/shadcnblocks-com-feature108";
import { Gallery6 } from "@/components/gallery6";
import { HeroSection } from "@/components/hero-section-with-smooth-bg-shader";
import { Blog7 } from "@/components/blog7";
import { ClientsShowcase } from "@/components/clients-showcase";
import { About3 } from "@/components/about-3";
import { Header2 } from "@/components/header-2";
import { Footer2 } from "@/components/footer-2";
import { AnimatedSection } from "@/components/animated-section";
import { Contact2 } from "@/components/contact-2";
import { Shield, Code2, Sparkles } from "lucide-react";

export default function Home() {
  const expertises = [
    {
      title: "Support & Infogérance IT",
      description:
        "Assistance utilisateurs, supervision, maintenance, sécurité et gestion du parc informatique.",
    },
    {
      title: "Développement d'applications",
      description:
        "Applications web, mobiles et métiers. Du MVP au produit complet.",
    },
    {
      title: "Conseil & Transformation Digitale",
      description:
        "Architecture, audit, cloud, cybersécurité et pilotage de projets.",
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
        "https://images.unsplash.com/photo-1545239351-1141bd82e8a6?auto=format&fit=crop&w=1200&q=80",
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
      name: "Danone",
      logo: "https://dummyimage.com/400x400/ffffff/000000&text=Danone",
    },
    {
      name: "Opéra de Paris",
      logo: "https://dummyimage.com/400x400/ffffff/000000&text=Opera+de+Paris",
    },
    {
      name: "Groupe ADP",
      logo: "https://dummyimage.com/400x400/ffffff/000000&text=Groupe+ADP",
    },
    {
      name: "Bordeaux Métropole",
      logo: "https://dummyimage.com/400x400/ffffff/000000&text=Bordeaux+Metropole",
    },
    {
      name: "Thales",
      logo: "https://dummyimage.com/400x400/ffffff/000000&text=Thales",
    },
    {
      name: "Safran",
      logo: "https://dummyimage.com/400x400/ffffff/000000&text=Safran",
    },
    {
      name: "Stellantis",
      logo: "https://dummyimage.com/400x400/ffffff/000000&text=Stellantis",
    },
    {
      name: "Hôpital de Cannes",
      logo: "https://dummyimage.com/400x400/ffffff/000000&text=Hopital+de+Cannes",
    },
  ];

  const aboutMainImage = {
    src: "https://images.unsplash.com/photo-1520607162513-77705c0f0d4a?auto=format&fit=crop&w=1200&q=80",
    alt: "Équipe Jarvis Connect",
  };

  const aboutBreakout = {
    src: "https://dummyimage.com/160x60/0a1a2f/ffffff&text=Jarvis+Connect",
    alt: "Jarvis Connect",
    title: "Des équipes engagées pour vos projets IT",
    description:
      "Support, développement et sécurité assurés par une équipe senior qui s'aligne sur vos enjeux. Nous pilotons les incidents, la supervision et l'industrialisation des déploiements pour que vos utilisateurs restent productifs. Nos experts anticipent les risques, documentent les architectures et vous accompagnent sur la durée, avec des engagements clairs et une communication transparente.",
    buttonText: "En savoir plus",
    buttonUrl: "#",
  };

  const aboutCompanies = [
    { src: "https://dummyimage.com/140x50/0a1a2f/ffffff&text=Cloud", alt: "Cloud" },
    { src: "https://dummyimage.com/140x50/0a1a2f/ffffff&text=Data", alt: "Data" },
    { src: "https://dummyimage.com/140x50/0a1a2f/ffffff&text=Security", alt: "Security" },
    { src: "https://dummyimage.com/140x50/0a1a2f/ffffff&text=Apps", alt: "Apps" },
  ];

  const aboutAchievements = [
    { label: "Clients accompagnés", value: "50+" },
    { label: "Projets délivrés", value: "250+" },
    { label: "Satisfaction", value: "98%" },
    { label: "Disponibilité support", value: "24/7" },
  ];

  const contactInfo = {
    title: "Contact Jarvis Connect",
    description:
      "Parlez-nous de vos projets, support ou sécurité. Notre équipe répond vite pour vous accompagner.",
    phone: "+33 (0)1 23 45 67 89",
    email: "contact@jarvisconnect.fr",
    web: { label: "jarvisconnect.fr", url: "https://jarvisconnect.fr" },
  };

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
    <div className="text-white">
      <AnimatedSection as="div" delay={0.05}>
        <Header2 />
      </AnimatedSection>
      <main>
        <section>
          <AnimatedSection as="div" delay={0.1}>
            <HeroSection
              title="Jarvis Connect propulse vos projets"
              highlightText="IT & digital"
              description="Support, développement applicatif et sécurité réunis au sein d'une équipe senior qui intervient vite et bien pour vos utilisateurs."
              showScrollIcon
              scrollIconLabel="Scroll vers les expertises"
              scrollText="Découvrir notre expertise"
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
          </AnimatedSection>
        </section>

        <section>
          <AnimatedSection as="div" delay={0.15}>
            <About3
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
          </AnimatedSection>
        </section>

        <section id="expertises" className="bg-white text-[#1E1E1E]">
          <AnimatedSection as="div" delay={0.2}>
            <Feature108
              badge="Jarvis Connect"
              heading="Nos expertises clés"
              description="Support & infogérance, développement applicatif, conseil et transformation digitale pour des SI performants."
              tabs={expertiseTabs}
            />
          </AnimatedSection>
        </section>

        <section>
          <AnimatedSection as="div" delay={0.3}>
            <ClientsShowcase
              title="Ils nous font confiance"
              description="Nous livrons nos solutions numériques en partenariat avec des acteurs majeurs en France et en Europe."
              clients={clients}
              highlightLogo="https://dummyimage.com/400x400/ffffff/000000&text=Danone"
              quote="Nous avons trouvé chez Jarvis Connect cette efficacité et cette flexibilité, avec une équipe qui accompagne sur la technique comme sur la logistique."
              author="Jean-Philippe Salomon, Manager IT"
            />
          </AnimatedSection>
        </section>

        <section className="bg-[#F4F7FA] text-[#1E1E1E]">
          <AnimatedSection as="div" delay={0.35}>
            <Gallery6 heading="Actualités de Jarvis Connect" demoUrl="#" items={newsItems} />
          </AnimatedSection>
        </section>

        <section className="bg-white text-[#1E1E1E]">
          <AnimatedSection as="div" delay={0.4}>
            <Blog7
              tagline="Recrutement"
              heading="Nos offres d'emploi"
              description="Découvrez les opportunités ouvertes chez Jarvis Connect et rejoignez une équipe technique qui fait bouger les SI."
              buttonText="Voir toutes les offres"
              buttonUrl="#"
              posts={jobOffers}
            />
          </AnimatedSection>
        </section>

        <section className="bg-white text-[#1E1E1E]">
          <AnimatedSection as="div" delay={0.42}>
            <Contact2
              title={contactInfo.title}
              description={contactInfo.description}
              phone={contactInfo.phone}
              email={contactInfo.email}
              web={contactInfo.web}
            />
          </AnimatedSection>
        </section>

        <section>
          <AnimatedSection as="div" delay={0.45}>
            <Footer2 />
          </AnimatedSection>
        </section>
      </main>
    </div>
  );
}
