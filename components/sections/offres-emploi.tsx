"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { ArrowRight } from "lucide-react";
import { motion } from "motion/react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";

interface Post {
  id: string;
  title: string;
  summary: string;
  label: string;
  author: string;
  published: string;
  url: string;
  image: string;
}

interface OffresEmploiProps {
  tagline?: string;
  heading?: string;
  description?: string;
  buttonText?: string;
  buttonUrl?: string;
  posts?: Post[];
}

const OffresEmploi = ({
  heading = "Nos offres d'emploi",
  description = "Découvrez les postes ouverts et rejoignez l'équipe Jarvis Connect. Des missions ambitieuses pour faire grandir votre carrière.",
  buttonText = "Toutes les offres",
  buttonUrl = "/offres",
  posts = [
    {
      id: "post-1",
      title: "Ingénieur support N2/N3",
      summary:
        "Pilotage des incidents, automatisation et maintien en conditions opérationnelles des infrastructures clients.",
      label: "CDI",
      author: "Jarvis Connect",
      published: "Déc 2025",
      url: "#",
      image:
        "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1200&q=80",
    },
    {
      id: "post-2",
      title: "Développeur Full Stack JS",
      summary:
        "Conception et delivery d'applications web modernes (React/Node) avec approche produit et qualité.",
      label: "CDI",
      author: "Jarvis Connect",
      published: "Déc 2025",
      url: "#",
      image:
        "https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&w=1200&q=80",
    },
    {
      id: "post-3",
      title: "Consultant Cloud & Sécu",
      summary:
        "Architecture, migration et sécurisation des environnements Azure/AWS avec démarche FinOps.",
      label: "CDI",
      author: "Jarvis Connect",
      published: "Déc 2025",
      url: "#",
      image:
        "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&w=1200&q=80",
    },
  ],
}: OffresEmploiProps) => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const supabase =
    supabaseUrl && supabaseAnonKey
      ? createClient(supabaseUrl, supabaseAnonKey)
      : null;

  const isUsingRemote = Boolean(supabase);

  const [remoteOffers, setRemoteOffers] = useState<Post[] | null>(null);

  useEffect(() => {
    if (!supabase) return;

    const load = async () => {
      const fallbackImages = [
        "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1200&q=80",
        "https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&w=1200&q=80",
        "https://images.unsplash.com/photo-1525182008055-f88b95ff7980?auto=format&fit=crop&w=1200&q=80",
      ];

      const { data, error } = await supabase
        .from("job_offers")
        .select(
          "id,title,company_name,status,published_at,contract_type,location,description"
        )
        .eq("status", "published")
        .order("published_at", { ascending: false, nullsFirst: false })
        .limit(20);

      if (error || !data?.length) {
        setRemoteOffers(null);
        return;
      }

      const shuffled = data
        .map((item) => ({ sort: Math.random(), item }))
        .sort((a, b) => a.sort - b.sort)
        .slice(0, 3)
        .map(({ item }, index) => ({
          id: item.id,
          title: item.title,
          summary:
            item.description?.slice(0, 160) ??
            "Découvre cette opportunité ouverte.",
          label: item.contract_type ?? "Contrat",
          author: item.company_name ?? "Entreprise",
          published: item.published_at
            ? new Date(item.published_at).toLocaleDateString()
            : "Date inconnue",
          url: `/offres/${item.id}`,
          image: fallbackImages[index % fallbackImages.length],
        }));

      setRemoteOffers(shuffled);
    };

    void load();
  }, []);

  const offersToRender = useMemo(
    () => (isUsingRemote ? remoteOffers ?? [] : posts),
    [isUsingRemote, remoteOffers, posts]
  );

  return (
    <section className="relative overflow-hidden py-16 text-[#0A1A2F] md:py-20">
      <div className="container mx-auto flex flex-col items-center gap-12 px-6 lg:px-10 xl:px-16">
        <div className="text-center">
          <motion.h2
            className="mb-3 text-pretty text-3xl font-semibold md:mb-4 md:text-4xl lg:mb-5 lg:max-w-3xl lg:text-5xl"
            initial={{ opacity: 0, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.45, ease: [0.33, 1, 0.68, 1] }}
          >
            {heading}
          </motion.h2>
          <motion.p
            className="mb-6 text-muted-foreground md:text-base lg:max-w-2xl lg:text-lg"
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.4, ease: [0.33, 1, 0.68, 1], delay: 0.05 }}
          >
            {description}
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.4, ease: [0.33, 1, 0.68, 1], delay: 0.08 }}
          >
            <Button variant="link" className="group w-full rounded-none sm:w-auto no-underline hover:no-underline" asChild>
              <a href={buttonUrl} className="no-underline hover:no-underline">
                {buttonText}
                <ArrowRight className="ml-2 size-4 transition-transform duration-200 group-hover:translate-x-1" />
              </a>
            </Button>
          </motion.div>
        </div>
        {offersToRender.length === 0 ? (
          <div className="w-full text-center text-sm text-muted-foreground">
            Chargement des offres…
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 lg:gap-6">
            {offersToRender.map((post, idx) => (
              <motion.div
                key={post.id}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.2 }}
                transition={{ duration: 0.45, ease: [0.33, 1, 0.68, 1], delay: idx * 0.15 }}
              >
                <Card className="group grid grid-rows-[auto_auto_1fr_auto] rounded-none">
                  <div className="aspect-[16/9] w-full">
                    <a
                      href={post.url}
                      className="flex h-full transition-opacity duration-200 fade-in hover:opacity-80"
                    >
                      <div className="relative h-full w-full origin-bottom overflow-hidden">
                        <img
                          src={post.image}
                          alt={post.title}
                          className="h-full w-full object-cover object-center transition duration-300 group-hover:scale-105"
                        />
                      </div>
                    </a>
                  </div>
                  <CardHeader>
                    <h3 className="text-lg font-semibold hover:underline md:text-xl">
                      <a href={post.url}>{post.title}</a>
                    </h3>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground">{post.summary}</p>
                  </CardContent>
                  <CardFooter>
                    <a href={post.url} className="flex items-center text-foreground">
                      Voir l'offre
                      <ArrowRight className="ml-2 size-4 transition-transform group-hover:translate-x-1" />
                    </a>
                  </CardFooter>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

export { OffresEmploi };

