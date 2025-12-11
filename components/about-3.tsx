interface About3Props {
  title?: string;
  description?: string;
  mainImage?: {
    src: string;
    alt: string;
  };
  secondaryImage?: {
    src: string;
    alt: string;
  };
  breakout?: {
    title?: string;
    description?: string;
  };
  companiesTitle?: string;
  companies?: Array<{
    src: string;
    alt: string;
  }>;
  achievementsTitle?: string;
  achievementsDescription?: string;
  achievements?: Array<{
    label: string;
    value: string;
  }>;
}

const defaultCompanies = [
  {
    src: "https://shadcnblocks.com/images/block/logos/company/fictional-company-logo-1.svg",
    alt: "Arc",
  },
  {
    src: "https://shadcnblocks.com/images/block/logos/company/fictional-company-logo-2.svg",
    alt: "Descript",
  },
  {
    src: "https://shadcnblocks.com/images/block/logos/company/fictional-company-logo-3.svg",
    alt: "Mercury",
  },
  {
    src: "https://shadcnblocks.com/images/block/logos/company/fictional-company-logo-4.svg",
    alt: "Ramp",
  },
  {
    src: "https://shadcnblocks.com/images/block/logos/company/fictional-company-logo-5.svg",
    alt: "Retool",
  },
  {
    src: "https://shadcnblocks.com/images/block/logos/company/fictional-company-logo-6.svg",
    alt: "Watershed",
  },
];

const defaultAchievements = [
  { label: "Companies Supported", value: "300+" },
  { label: "Projects Finalized", value: "800+" },
  { label: "Happy Customers", value: "99%" },
  { label: "Recognized Awards", value: "10+" },
];

export const About3 = ({
  title = "About Us",
  description = "Shadcnblocks is a passionate team dedicated to creating innovative solutions that empower businesses to thrive in the digital age.",
  mainImage = {
    src: "https://shadcnblocks.com/images/block/placeholder-1.svg",
    alt: "placeholder",
  },
  secondaryImage = {
    src: "https://shadcnblocks.com/images/block/placeholder-2.svg",
    alt: "placeholder",
  },
  breakout = {
    title: "Des equipes engagees pour vos projets IT",
    description:
      "Support, developpement et securite assures par une equipe senior qui s aligne sur vos enjeux.",
  },
  companiesTitle = "Valued by clients worldwide",
  companies = defaultCompanies,
  achievementsTitle = "Our Achievements in Numbers",
  achievementsDescription = "Providing businesses with effective tools to improve workflows, boost efficiency, and encourage growth.",
  achievements = defaultAchievements,
}: About3Props = {}) => {
  return (
    <section className="bg-white py-16 text-[#0A1A2F] md:py-20">
      <div className="container mx-auto px-6 lg:px-10">
        <div className="mb-10 grid gap-4 text-center md:grid-cols-2 md:text-left">
          <h1 className="text-4xl font-semibold leading-tight md:text-5xl">
            {title}
          </h1>
          <p className="text-base text-[#4B5563] md:text-lg">{description}</p>
        </div>
        <div className="grid gap-7 lg:grid-cols-3">
          <img
            src={mainImage.src}
            alt={mainImage.alt}
            className="size-full max-h-[620px] rounded-none object-cover lg:col-span-2"
          />
          <div className="flex flex-col gap-6">
            <div className="text-left">
              <p className="mb-2 text-lg font-semibold text-[#0A1A2F]">
                {breakout.title}
              </p>
              <p className="text-sm text-[#4B5563]">{breakout.description}</p>
            </div>
            <img
              src={secondaryImage.src}
              alt={secondaryImage.alt}
              className="grow basis-0 rounded-none object-cover md:w-full lg:min-h-0 lg:w-auto"
            />
          </div>
        </div>
        <div className="relative overflow-hidden rounded-none bg-[#F4F7FA] p-8 md:p-12">
          <div className="flex flex-col gap-4 text-center md:text-left">
            <h2 className="text-3xl font-semibold md:text-4xl">
              {achievementsTitle}
            </h2>
            <p className="max-w-screen-sm text-[#4B5563]">
              {achievementsDescription}
            </p>
          </div>
          <div className="mt-8 flex flex-wrap justify-between gap-8 text-center">
            {achievements.map((item, idx) => (
              <div className="flex flex-col gap-4" key={item.label + idx}>
                <p className="text-sm text-[#4B5563]">{item.label}</p>
                <span className="text-4xl font-semibold md:text-5xl">
                  {item.value}
                </span>
              </div>
            ))}
          </div>
          <div className="pointer-events-none absolute -top-1 right-1 z-10 hidden h-full w-full bg-[linear-gradient(to_right,#d1d5db_1px,transparent_1px),linear-gradient(to_bottom,#d1d5db_1px,transparent_1px)] bg-[size:80px_80px] opacity-20 [mask-image:linear-gradient(to_bottom_right,#000,transparent,transparent)] md:block"></div>
        </div>
      </div>
    </section>
  );
};
