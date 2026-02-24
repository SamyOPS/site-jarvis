"use client";

import { ArrowLeft, ArrowRight, ArrowUpRight } from "lucide-react";
import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { motion } from "motion/react";

import { Button } from "@/components/ui/button";
import {
  Carousel,
  CarouselApi,
  CarouselContent,
  CarouselItem,
} from "@/components/ui/carousel";


const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase =
  supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey)
    : null;
interface GalleryItem {
  id: string;
  title: string;
  summary: string;
  url: string;
  image: string;
}

interface ActualitesProps {
  heading?: string;
  description?: string;
  demoUrl?: string;
  items?: GalleryItem[];
}


const fallbackItems: GalleryItem[] = [
  {
    id: "item-1",
    title: "Build Modern UIs",
    summary: "Create stunning user interfaces with our comprehensive design system.",
    url: "#",
    image: "/images/block/placeholder-dark-1.svg",
  },
  {
    id: "item-2",
    title: "Computer Vision Technology",
    summary:
      "Powerful image recognition and processing capabilities that allow AI systems to analyze, understand, and interpret visual information from the world.",
    url: "#",
    image: "/images/block/placeholder-dark-1.svg",
  },
  {
    id: "item-3",
    title: "Machine Learning Automation",
    summary:
      "Self-improving algorithms that learn from data patterns to automate complex tasks and make intelligent decisions with minimal human intervention.",
    url: "#",
    image: "/images/block/placeholder-dark-1.svg",
  },
  {
    id: "item-4",
    title: "Predictive Analytics",
    summary:
      "Advanced forecasting capabilities that analyze historical data to predict future trends and outcomes, helping businesses make data-driven decisions.",
    url: "#",
    image: "/images/block/placeholder-dark-1.svg",
  },
  {
    id: "item-5",
    title: "Neural Network Architecture",
    summary:
      "Sophisticated AI models inspired by human brain structure, capable of solving complex problems through deep learning and pattern recognition.",
    url: "#",
    image: "/images/block/placeholder-dark-1.svg",
  },
];

const Actualites = ({
  heading = "Galerie",
  description = "Retrouvez nos actualités, annonces et retours d'expérience autour des projets, expertises et initiatives Jarvis Connect.",
  demoUrl = "#",
  items,
}: ActualitesProps) => {
  const [carouselApi, setCarouselApi] = useState<CarouselApi>();
  const [canScrollPrev, setCanScrollPrev] = useState(false);
  const [canScrollNext, setCanScrollNext] = useState(false);
  const [remoteItems, setRemoteItems] = useState<GalleryItem[]>([]);
  const [isLoadingItems, setIsLoadingItems] = useState(false);
  useEffect(() => {
    if (items?.length || !supabase) return;
    const fetchNews = async () => {
      setIsLoadingItems(true);
      const { data } = await supabase
        .from("news")
        .select("id,title,slug,excerpt,cover_image,published_at,created_at")
        .eq("status", "published")
        .order("published_at", { ascending: false, nullsFirst: false })
        .order("created_at", { ascending: false });

      const mapped = (data ?? []).map((row) => ({
        id: row.id,
        title: row.title,
        summary: row.excerpt ?? "",
        url: `/actus/${row.slug}`,
        image: row.cover_image ?? "/images/block/placeholder-dark-1.svg",
      }));
      setRemoteItems(mapped);
      setIsLoadingItems(false);
    };

    fetchNews();
  }, [items]);

  useEffect(() => {
    if (!carouselApi) {
      return;
    }
    const updateSelection = () => {
      setCanScrollPrev(carouselApi.canScrollPrev());
      setCanScrollNext(carouselApi.canScrollNext());
    };
    updateSelection();
    carouselApi.on("select", updateSelection);
    return () => {
      carouselApi.off("select", updateSelection);
    };
  }, [carouselApi]);
  return (
    <motion.section
      className="bg-[#F4F7FA] py-16 text-[#0A1A2F] md:py-20"
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.45, ease: [0.33, 1, 0.68, 1] }}
    >
      <div className="mx-auto max-w-6xl px-6 lg:px-10">
        <div className="mb-8 flex flex-col items-center text-center md:mb-10 lg:mb-12">
          <div className="max-w-3xl">
            <motion.h2
              className="mb-3 text-3xl font-semibold md:mb-4 md:text-4xl lg:mb-5 lg:text-5xl"
              initial={{ opacity: 0, y: 14 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.45, ease: [0.33, 1, 0.68, 1] }}
            >
              {heading}
            </motion.h2>
            <motion.p
              className="mx-auto mb-5 max-w-2xl text-sm text-muted-foreground md:text-base lg:text-lg"
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.4, ease: [0.33, 1, 0.68, 1], delay: 0.04 }}
            >
              {description}
            </motion.p>
            <motion.a
              href={demoUrl}
              className="group inline-flex items-center gap-1 text-sm font-medium md:text-base lg:text-lg"
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.4, ease: [0.33, 1, 0.68, 1], delay: 0.05 }}
            >
              Voir toutes les actus
              <ArrowUpRight className="size-4 transition-transform group-hover:translate-x-1" />
            </motion.a>
          </div>
          <div className="mt-6 flex shrink-0 items-center justify-center gap-2">
            <Button
              size="icon"
              variant="outline"
              className="rounded-none border-black text-black disabled:pointer-events-auto"
              onClick={() => {
                carouselApi?.scrollPrev();
              }}
              disabled={!canScrollPrev}
            >
              <ArrowLeft className="size-5" />
            </Button>
            <Button
              size="icon"
              variant="outline"
              className="rounded-none border-black text-black disabled:pointer-events-auto"
              onClick={() => {
                carouselApi?.scrollNext();
              }}
              disabled={!canScrollNext}
            >
              <ArrowRight className="size-5" />
            </Button>
          </div>
        </div>
      </div>
      <div className="w-full px-6 lg:px-10">
        <Carousel
          setApi={setCarouselApi}
          opts={{
            breakpoints: {
              "(max-width: 768px)": {
                dragFree: true,
              },
            },
          }}
          className="relative left-[-1rem]"
        >
          <CarouselContent className="-mr-4 ml-8 2xl:ml-[max(8rem,calc(50vw-700px+1rem))] 2xl:mr-[max(0rem,calc(50vw-700px-1rem))]">
            {(items && items.length ? items : remoteItems.length ? remoteItems : fallbackItems).map((item, idx) => (
              <CarouselItem key={item.id} className="pl-4 md:max-w-[452px]">
                <motion.a
                  href={item.url}
                  className="group flex flex-col justify-between"
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.15 }}
                  transition={{ duration: 0.45, ease: [0.33, 1, 0.68, 1], delay: idx * 0.15 }}
                >
                  <div>
                    <div className="flex aspect-[3/2] overflow-clip rounded-none">
                      <div className="flex-1">
                        <div className="relative h-full w-full origin-bottom transition duration-300 group-hover:scale-105">
                          <motion.img
                            src={item.image}
                            alt={item.title}
                            className="h-full w-full object-cover object-center"
                            initial={{ opacity: 0 }}
                            whileInView={{ opacity: 1 }}
                            viewport={{ once: true, amount: 0.1 }}
                            transition={{ duration: 0.5, ease: "easeOut" }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                  <motion.div
                    className="mb-2 line-clamp-3 break-words pt-4 text-lg font-medium md:mb-3 md:pt-4 md:text-xl lg:pt-4 lg:text-2xl"
                    initial={{ opacity: 0, y: 8 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, amount: 0.2 }}
                    transition={{ duration: 0.35, ease: [0.33, 1, 0.68, 1] }}
                  >
                    {item.title}
                  </motion.div>
                  <motion.div
                    className="mb-8 line-clamp-2 text-sm text-muted-foreground md:mb-12 md:text-base lg:mb-9"
                    initial={{ opacity: 0, y: 8 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, amount: 0.2 }}
                    transition={{ duration: 0.35, ease: [0.33, 1, 0.68, 1], delay: 0.05 }}
                  >
                    {item.summary}
                  </motion.div>
                  <motion.div
                    className="flex items-center text-sm"
                    initial={{ opacity: 0, y: 6 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, amount: 0.2 }}
                    transition={{ duration: 0.3, ease: [0.33, 1, 0.68, 1], delay: 0.08 }}
                  >
                    En savoir plus{" "}
                    <ArrowRight className="ml-2 size-5 transition-transform group-hover:translate-x-1" />
                  </motion.div>
                </motion.a>
              </CarouselItem>
            ))}
          </CarouselContent>
        </Carousel>
      </div>
    </motion.section>
  );
};

export { Actualites };

