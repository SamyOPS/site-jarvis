import { ArrowRight } from "lucide-react";

import { Badge } from "@/components/ui/badge";
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

interface Blog7Props {
  tagline?: string;
  heading?: string;
  description?: string;
  buttonText?: string;
  buttonUrl?: string;
  posts?: Post[];
}

const Blog7 = ({
  tagline = "Recrutement",
  heading = "Nos offres d'emploi",
  description = "Découvrez les postes ouverts et rejoignez l'équipe Jarvis Connect. Des missions ambitieuses pour faire grandir votre carrière.",
  buttonText = "Toutes les offres",
  buttonUrl = "#",
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
}: Blog7Props) => {
  return (
    <section className="bg-white py-16 text-[#0A1A2F] md:py-20">
      <div className="container mx-auto flex flex-col items-center gap-12 px-6 lg:px-10 xl:px-16">
        <div className="text-center">
          <Badge variant="secondary" className="mb-4 rounded-none">
            {tagline}
          </Badge>
          <h2 className="mb-3 text-pretty text-3xl font-semibold md:mb-4 md:text-4xl lg:mb-5 lg:max-w-3xl lg:text-5xl">
            {heading}
          </h2>
          <p className="mb-6 text-muted-foreground md:text-base lg:max-w-2xl lg:text-lg">
            {description}
          </p>
          <Button variant="link" className="w-full rounded-none sm:w-auto" asChild>
            <a href={buttonUrl} target="_blank">
              {buttonText}
              <ArrowRight className="ml-2 size-4" />
            </a>
          </Button>
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 lg:gap-6">
          {posts.map((post) => (
            <Card
              key={post.id}
              className="grid grid-rows-[auto_auto_1fr_auto] rounded-none"
            >
              <div className="aspect-[16/9] w-full">
                <a
                  href={post.url}
                  target="_blank"
                  className="transition-opacity duration-200 fade-in hover:opacity-70"
                >
                  <img
                    src={post.image}
                    alt={post.title}
                    className="h-full w-full object-cover object-center"
                  />
                </a>
              </div>
              <CardHeader>
                <h3 className="text-lg font-semibold hover:underline md:text-xl">
                  <a href={post.url} target="_blank">
                    {post.title}
                  </a>
                </h3>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">{post.summary}</p>
              </CardContent>
              <CardFooter>
                <a
                  href={post.url}
                  target="_blank"
                  className="flex items-center text-foreground hover:underline"
                >
                  Voir l'offre
                  <ArrowRight className="ml-2 size-4" />
                </a>
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

export { Blog7 };
