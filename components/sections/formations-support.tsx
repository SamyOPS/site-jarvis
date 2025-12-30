import { ArrowRight } from "lucide-react";

interface FeatureItem {
  id: string;
  title: string;
  description: string;
  image: string;
}

interface FormationsSupportProps {
  heading?: string;
  description?: string;
  linkUrl?: string;
  linkText?: string;
  features?: FeatureItem[];
}

export const FormationsSupport = ({
  heading = "Formations Support",
  description =
    "Programmes courts pour former vos equipes support (N1/N2), supervision, ITIL, outils et automatisations pour des interventions plus rapides.",
  linkUrl = "#formations",
  linkText = "Decouvrir les formations",
  features = [
    {
      id: "feature-1",
      title: "Parcours support et supervision",
      description:
        "Modules pratiques sur la gestion des incidents, l'escalade, la supervision, la communication et les standards ITIL.",
      image:
        "https://images.unsplash.com/photo-1542744173-8e7e53415bb0?q=80&w=1170&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
    },
    {
      id: "feature-2",
      title: "Ateliers outillage",
      description:
        "Prise en main des outils de ticketing, supervision, MDM et automatisation pour gagner en efficacite.",
      image:
        "https://images.unsplash.com/photo-1573496774379-b930dba17d8b?q=80&w=1169&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
    },
    {
      id: "feature-3",
      title: "Coaching gestes techniques",
      description:
        "Bonnes pratiques de diagnostic, securisation poste, scripts d'intervention et relation utilisateur.",
      image:
        "https://images.unsplash.com/photo-1503428593586-e225b39bddfe?q=80&w=1170&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
    },
  ],
}: FormationsSupportProps) => {
  return (
    <section className="relative overflow-hidden bg-white py-32">
      <div className="container flex flex-col gap-16 lg:px-16">
        <div className="w-full lg:ml-auto">
          <h2 className="mb-3 text-right text-xl font-semibold md:mb-4 md:text-4xl lg:mb-6 whitespace-nowrap">
            {heading}
          </h2>
          <p className="mb-3 ml-auto max-w-3xl text-right text-xl text-muted-foreground md:mb-10 lg:mb-6">
            {description}
          </p>
          <a
            href={linkUrl}
            className="group ml-auto flex items-center justify-end text-xs font-medium md:text-base lg:text-lg"
          >
            {linkText}
            <ArrowRight className="ml-2 size-4 transition-transform group-hover:translate-x-1" />
          </a>
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:gap-8">
          {features[0] && (
            <div className="flex flex-col overflow-clip rounded-none md:col-span-2 md:grid md:grid-cols-2 md:gap-6 lg:gap-8">
              <div className="md:min-h-[14rem] lg:min-h-[16rem] xl:min-h-[18rem]">
                <img
                  src={features[0].image}
                  alt={features[0].title}
                  className="aspect-[16/9] h-full w-full object-cover object-center"
                />
              </div>
              <div className="flex flex-col justify-center px-6 py-8 md:px-8 md:py-10 lg:px-10 lg:py-12">
                <h3 className="mb-3 text-lg font-semibold md:mb-4 md:text-2xl lg:mb-6">
                  {features[0].title}
                </h3>
                <p className="text-muted-foreground lg:text-lg">
                  {features[0].description}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
      {features.slice(1).length > 0 && (
        <div className="container mt-6 grid gap-6 px-6 md:grid-cols-2 md:px-10 lg:gap-8 lg:px-16">
          {features.slice(1).map((feature) => (
            <div key={feature.id} className="flex flex-col gap-4">
              <div className="overflow-hidden rounded-none">
                <img
                  src={feature.image}
                  alt={feature.title}
                  className="aspect-[16/9] h-full w-full object-cover object-center"
                />
              </div>
              <div>
                <h3 className="mb-3 text-lg font-semibold md:mb-4 md:text-2xl lg:mb-6">
                  {feature.title}
                </h3>
                <p className="text-muted-foreground lg:text-lg">
                  {feature.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
};
