import { Feature108 } from "@/components/shadcnblocks-com-feature108";
import { Shield, Code2, Sparkles } from "lucide-react";

export default function Home() {
  const expertises = [
    {
      title: "Support & Infogérance IT",
      description:
        "Assistance utilisateurs, supervision, maintenance, sécurité et gestion du parc informatique.",
    },
    {
      title: "Développement d’applications",
      description:
        "Applications web, mobiles et métiers. Du MVP au produit complet.",
    },
    {
      title: "Conseil & Transformation Digitale",
      description:
        "Architecture, audit, cloud, cybersécurité et pilotage de projets.",
    },
  ];

  const advantages = [
    {
      title: "Réactivité & disponibilité",
      description: "Une équipe proche de vous, avec un support rapide et humain.",
    },
    {
      title: "Expertise certifiée",
      description:
        "Ingénieurs spécialisés en IT, cloud, sécurité et développement applicatif.",
    },
    {
      title: "Solutions sur mesure",
      description: "Nous adaptons nos services à vos enjeux et votre budget.",
    },
    {
      title: "Transparence totale",
      description: "Suivi, reporting, indicateurs de performance : vous contrôlez tout.",
    },
  ];

  const stats = [
    { label: "utilisateurs supportés", value: "+ X" },
    { label: "projets applicatifs délivrés", value: "+ X" },
    { label: "temps moyen de prise en charge", value: "XX min" },
    { label: "satisfaction client", value: "XX %" },
  ];

  const services = [
    {
      title: "Support informatique",
      points: [
        "Helpdesk",
        "Assistance illimitée",
        "Supervision continue",
        "Sécurité",
        "Gestion de parc",
      ],
    },
    {
      title: "Développement d’applications",
      points: [
        "Web",
        "Mobile",
        "SaaS",
        "API",
        "Modernisation d’applications",
        "UI/UX",
      ],
    },
    {
      title: "Projets & Conseil IT",
      points: [
        "Audit",
        "Architecture",
        "Cloud",
        "Sécurité",
        "Transformation digitale",
      ],
    },
  ];

  const cases = [
    {
      title: "Projet 1 — Support IT pour [Client]",
      summary: "Problème → Solution → Résultats",
    },
    {
      title: "Projet 2 — Développement d’une application métier pour [Client]",
      summary: "Conception, développement, déploiement, adoption utilisateur.",
    },
    {
      title: "Projet 3 — Migration cloud & modernisation pour [Client]",
      summary: "Migration progressive, sécurisée, avec pilotage et accompagnement.",
    },
  ];

  const technologies = [
    "Azure",
    "M365",
    "AWS",
    "React",
    "Angular",
    "Vue",
    "Node.js",
    ".NET",
    "Flutter",
    "Python",
    "Docker",
    "Kubernetes",
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
    <div className="bg-[#0A1A2F] text-white">
      <main>
        <header className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-[#0A1A2F] via-[#0f2744] to-[#0A1A2F]" />
          <div className="absolute -left-24 -top-24 h-64 w-64 rounded-full bg-[#1A73E8]/20 blur-[100px]" />
          <div className="absolute -right-16 top-10 h-52 w-52 rounded-full bg-[#1A73E8]/10 blur-[90px]" />

          <div className="relative mx-auto flex max-w-6xl flex-col gap-16 px-6 pb-20 pt-20 lg:px-10 lg:pb-28 lg:pt-24">
            <div className="grid gap-12 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
              <div className="space-y-8">
                <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/80 backdrop-blur">
                  Jarvis Connect • ESN premium
                </div>
                <div className="space-y-6">
                  <h1 className="font-display text-4xl font-semibold leading-tight tracking-tight text-white sm:text-5xl lg:text-6xl">
                    Votre partenaire IT & digital pour un système d’information
                    performant.
                  </h1>
                  <p className="max-w-2xl text-lg text-white/80 lg:text-xl">
                    Support informatique, développement d’applications et
                    accompagnement technologique sur mesure pour PME & ETI.
                  </p>
                </div>

                <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                  <button className="w-full rounded-xl bg-[#1A73E8] px-5 py-3 text-base font-medium text-white shadow-lg shadow-[#1A73E8]/40 transition hover:bg-[#0f5bc0] sm:w-auto">
                    Demander un devis
                  </button>
                  <button className="w-full rounded-xl border border-[#1A73E8] px-5 py-3 text-base font-medium text-[#1A73E8] transition hover:border-white hover:text-white sm:w-auto">
                    Découvrir nos services
                  </button>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur">
                    <p className="text-sm uppercase tracking-[0.18em] text-white/60">
                      Visuels suggérés
                    </p>
                    <ul className="mt-3 space-y-2 text-sm text-white/80">
                      <li>• Écosystème IT (cloud, devices, workflow)</li>
                      <li>• Interface dashboard de monitoring / support</li>
                      <li>• Animation 3D tech épurée</li>
                    </ul>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur">
                    <p className="text-sm uppercase tracking-[0.18em] text-white/60">
                      Expérience fluide
                    </p>
                    <div className="mt-3 space-y-2 text-sm text-white/80">
                      <div className="flex items-center justify-between rounded-xl bg-white/5 px-3 py-2">
                        <span>Tickets résolus</span>
                        <span className="text-[#4CAF50] font-semibold">92%</span>
                      </div>
                      <div className="flex items-center justify-between rounded-xl bg-white/5 px-3 py-2">
                        <span>Disponibilité</span>
                        <span className="font-semibold text-[#1A73E8]">
                          24/7
                        </span>
                      </div>
                      <div className="flex items-center justify-between rounded-xl bg-white/5 px-3 py-2">
                        <span>Temps moyen</span>
                        <span className="font-semibold text-white">XX min</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="relative">
                <div className="absolute -left-10 -top-10 h-28 w-28 rounded-full bg-[#1A73E8]/15 blur-[70px]" />
                <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/5 p-6 shadow-[0_20px_70px_rgba(0,0,0,0.35)] backdrop-blur">
                  <div className="flex items-center justify-between">
                    <div className="rounded-xl bg-white/5 px-3 py-2 text-xs uppercase tracking-[0.18em] text-white/70">
                      Dashboard support
                    </div>
                    <div className="flex items-center gap-2 text-sm text-white/70">
                      <span className="h-2 w-2 rounded-full bg-[#4CAF50]" />
                      Live
                    </div>
                  </div>
                  <div className="mt-6 space-y-4">
                    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                      <div className="flex items-center justify-between text-sm text-white/80">
                        <span>Tickets ouverts</span>
                        <span className="rounded-full bg-[#1A73E8]/20 px-3 py-1 font-semibold text-[#1A73E8]">
                          18
                        </span>
                      </div>
                      <div className="mt-4 h-2 rounded-full bg-white/10">
                        <div className="h-2 w-[65%] rounded-full bg-[#1A73E8]" />
                      </div>
                      <p className="mt-2 text-xs text-white/60">
                        SLA <span className="font-semibold text-white">95%</span>{" "}
                        • Temps moyen <span className="text-white">XX min</span>
                      </p>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                        <p className="text-sm text-white/70">Supervision</p>
                        <p className="mt-2 text-lg font-semibold">En cours</p>
                        <p className="text-xs text-white/60">
                          124 devices monitorés
                        </p>
                      </div>
                      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                        <p className="text-sm text-white/70">Parc & sécurité</p>
                        <p className="mt-2 text-lg font-semibold">
                          Conforme
                        </p>
                        <p className="text-xs text-white/60">
                          Patchs et mises à jour OK
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </header>

        <section className="bg-white text-[#1E1E1E]">
          <Feature108
            badge="Jarvis Connect"
            heading="Nos expertises clés"
            description="Support & infogérance, développement applicatif, conseil et transformation digitale pour des SI performants."
            tabs={expertiseTabs}
          />
        </section>

        <section className="bg-[#F4F7FA] text-[#1E1E1E]">
          <div className="mx-auto max-w-6xl px-6 py-16 lg:px-10 lg:py-20">
            <div className="flex flex-col gap-4">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#1A73E8]">
                Pourquoi choisir Jarvis Connect ?
              </p>
              <h2 className="font-display text-3xl font-semibold text-[#0A1A2F] sm:text-4xl">
                4 avantages clés pour votre SI
              </h2>
            </div>
            <div className="mt-10 grid gap-6 md:grid-cols-2">
              {advantages.map((adv) => (
                <div
                  key={adv.title}
                  className="rounded-2xl border border-white bg-white p-6 shadow-[0_20px_70px_rgba(0,0,0,0.05)]"
                >
                  <h3 className="font-display text-xl font-semibold text-[#0A1A2F]">
                    {adv.title}
                  </h3>
                  <p className="mt-3 text-sm text-[#4B5563]">{adv.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-white text-[#1E1E1E]">
          <div className="mx-auto max-w-6xl px-6 py-14 lg:px-10 lg:py-20">
            <div className="rounded-3xl border border-slate-100 bg-gradient-to-br from-white to-[#F8FBFF] p-10 shadow-[0_20px_70px_rgba(0,0,0,0.05)]">
              <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#1A73E8]">
                    Chiffres clés
                  </p>
                  <h2 className="font-display text-3xl font-semibold text-[#0A1A2F] sm:text-4xl">
                    La performance du support en chiffres
                  </h2>
                </div>
              </div>
              <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                {stats.map((stat) => (
                  <div
                    key={stat.label}
                    className="rounded-2xl border border-slate-100 bg-white p-5 text-[#0A1A2F] shadow-[0_15px_45px_rgba(0,0,0,0.05)]"
                  >
                    <p className="font-display text-3xl font-semibold">
                      {stat.value}
                    </p>
                    <p className="mt-2 text-sm text-[#4B5563]">{stat.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="bg-[#F4F7FA] text-[#1E1E1E]">
          <div className="mx-auto max-w-6xl px-6 py-16 lg:px-10 lg:py-24">
            <div className="flex flex-col gap-4">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#1A73E8]">
                Solutions & services
              </p>
              <h2 className="font-display text-3xl font-semibold text-[#0A1A2F] sm:text-4xl">
                L’essentiel de notre offre
              </h2>
            </div>
            <div className="mt-10 grid gap-6 md:grid-cols-3">
              {services.map((service) => (
                <div
                  key={service.title}
                  className="rounded-2xl border border-white bg-white p-6 shadow-[0_20px_70px_rgba(0,0,0,0.05)]"
                >
                  <h3 className="font-display text-xl font-semibold text-[#0A1A2F]">
                    {service.title}
                  </h3>
                  <ul className="mt-4 space-y-2 text-sm text-[#4B5563]">
                    {service.points.map((point) => (
                      <li key={point} className="flex items-center gap-2">
                        <span className="h-1.5 w-1.5 rounded-full bg-[#1A73E8]" />
                        {point}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
            <div className="mt-10">
              <button className="rounded-xl bg-[#1A73E8] px-5 py-3 text-sm font-medium text-white shadow-lg shadow-[#1A73E8]/30 transition hover:bg-[#0f5bc0]">
                Explorer les services
              </button>
            </div>
          </div>
        </section>

        <section className="bg-white text-[#1E1E1E]">
          <div className="mx-auto max-w-6xl px-6 py-16 lg:px-10 lg:py-20">
            <div className="flex flex-col gap-4">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#1A73E8]">
                Cas clients
              </p>
              <h2 className="font-display text-3xl font-semibold text-[#0A1A2F] sm:text-4xl">
                Problème, solution, résultats
              </h2>
            </div>
            <div className="mt-10 grid gap-6 md:grid-cols-3">
              {cases.map((item) => (
                <div
                  key={item.title}
                  className="rounded-2xl border border-slate-100 bg-white p-6 shadow-[0_20px_70px_rgba(0,0,0,0.05)]"
                >
                  <h3 className="font-display text-lg font-semibold text-[#0A1A2F]">
                    {item.title}
                  </h3>
                  <p className="mt-3 text-sm text-[#4B5563]">{item.summary}</p>
                </div>
              ))}
            </div>
            <div className="mt-10">
              <button className="rounded-xl border border-[#1A73E8] px-5 py-3 text-sm font-medium text-[#1A73E8] transition hover:border-[#0f5bc0] hover:text-[#0f5bc0]">
                Voir toutes nos réalisations
              </button>
            </div>
          </div>
        </section>

        <section className="bg-[#0A1A2F] text-white">
          <div className="mx-auto max-w-6xl px-6 py-16 lg:px-10 lg:py-20">
            <div className="flex flex-col gap-4">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#1A73E8]">
                Technologies maîtrisées
              </p>
              <h2 className="font-display text-3xl font-semibold sm:text-4xl">
                Cloud, frameworks, data & sécurité
              </h2>
            </div>
            <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {technologies.map((tech) => (
                <div
                  key={tech}
                  className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/80 backdrop-blur"
                >
                  <span className="h-2 w-2 rounded-full bg-[#1A73E8]" />
                  {tech}
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-white text-[#1E1E1E]">
          <div className="mx-auto max-w-6xl px-6 py-16 lg:px-10 lg:py-24">
            <div className="rounded-3xl border border-slate-100 bg-[#0A1A2F] px-8 py-10 text-white shadow-[0_25px_90px_rgba(0,0,0,0.2)] lg:px-12 lg:py-14">
              <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                <div className="space-y-3">
                  <h2 className="font-display text-3xl font-semibold sm:text-4xl">
                    Accédez au support IT et au développement applicatif dont
                    votre entreprise a besoin.
                  </h2>
                  <p className="text-white/80">
                    Parlez-nous de vos enjeux, nous construisons une réponse
                    adaptée et transparente.
                  </p>
                </div>
                <div className="flex flex-col gap-3 sm:flex-row">
                  <button className="w-full rounded-xl bg-[#1A73E8] px-5 py-3 text-sm font-medium text-white shadow-lg shadow-[#1A73E8]/30 transition hover:bg-[#0f5bc0] sm:w-auto">
                    Contactez-nous
                  </button>
                  <button className="w-full rounded-xl border border-white/30 px-5 py-3 text-sm font-medium text-white transition hover:border-white sm:w-auto">
                    Ouvrir un ticket support
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
