"use client"

import { useEffect, useMemo, useState } from "react"
import { createClient } from "@supabase/supabase-js"
import { ArrowRight } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { Button } from "@/components/ui/button"
import Lottie from "lottie-react"
import handshakeAnimation from "@/public/Hiring.json"
import ContractFilter from "@/components/sections/liste_contrat"
import OffreCard from "@/components/sections/offre_card"

interface Post {
  id: string
  title: string
  summary: string
  label: string
  author: string
  published: string
  url: string
  image: string
}

interface OffresEmploiProps {
  heading?: string
  description?: string
  buttonText?: string
  buttonUrl?: string
  posts?: Post[]
}

function normalizeContract(raw: string | null): string {
  if (!raw) return "Contrat"
  const val = raw.trim()
  const up = val.toUpperCase()
  if (up === "CDI") return "CDI"
  if (up === "CDD") return "CDD"
  if (up === "CDI / CDD" || up === "CDI/CDD") return "CDI / CDD"
  if (up.includes("ALTER")) return "Alternance"
  if (up.includes("FREE")) return "Freelance"
  if (up.includes("STAGE")) return "Stage"
  return val
}

const DEFAULT_POSTS: Post[] = [
  { id: "post-1", title: "Ingénieur support N2/N3", summary: "Pilotage des incidents, automatisation et maintien en conditions opérationnelles.", label: "CDI", author: "Paris", published: "Déc 2025", url: "#", image: "" },
  { id: "post-2", title: "Développeur Full Stack JS", summary: "Conception et delivery d'applications web modernes avec approche produit.", label: "CDI", author: "Télétravail", published: "Déc 2025", url: "#", image: "" },
  { id: "post-3", title: "Consultant Cloud & Sécu", summary: "Architecture, migration et sécurisation des environnements Azure/AWS.", label: "CDI", author: "Lyon", published: "Déc 2025", url: "#", image: "" },
  { id: "post-4", title: "Alternant DevOps", summary: "CI/CD et infrastructure as code au sein d'une équipe SRE.", label: "Alternance", author: "Bordeaux", published: "Jan 2026", url: "#", image: "" },
  { id: "post-5", title: "Développeur Backend Python", summary: "APIs robustes et pipelines de données pour nos clients bancaires.", label: "CDD", author: "Paris", published: "Jan 2026", url: "#", image: "" },
  { id: "post-6", title: "Architecte Solutions", summary: "Cadrage technique et transformation SI en environnement multi-cloud.", label: "Freelance", author: "Télétravail", published: "Fév 2026", url: "#", image: "" },
]

export function OffresEmploi({
  
  heading = "Job openings",
  description = "Découvrez les postes ouverts et rejoignez l'équipe Jarvis Connect.",
  buttonText = "Toutes les offres",
  buttonUrl = "/offres",
  posts = DEFAULT_POSTS,
}: OffresEmploiProps) {

  const supabase = useMemo(() => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    return url && key ? createClient(url, key) : null
  }, [])

  const [remoteOffers, setRemoteOffers] = useState<Post[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeFilter, setActiveFilter] = useState("Tous")

  useEffect(() => {
    if (!supabase) {
      setLoading(false)
      return
    }
    const load = async () => {
      try {
        const { data, error } = await supabase
          .from("job_offers")
          .select("id,title,status,published_at,contract_type,location,description")
          .eq("status", "published")
          .order("published_at", { ascending: false })
          .limit(20)
        if (error) {
          console.error("Erreur chargement offres:", error)
          setRemoteOffers([])
        } else {
          setRemoteOffers(data?.map(item => ({
            id: item.id,
            title: item.title,
            summary: item.description?.slice(0, 160) ?? "",
            label: normalizeContract(item.contract_type),
            author: item.location ?? "Entreprise",
            published: item.published_at ? new Date(item.published_at).toLocaleDateString() : "",
            url: `/offres/${item.id}`,
            image: "",
          })) ?? [])
        }
      } catch (err) {
        console.error("Erreur chargement offres:", err)
        setRemoteOffers([])
      } finally {
        setLoading(false)
      }
    }
    void load()
  }, [supabase])

  const allOffers = supabase ? remoteOffers ?? [] : posts

  const displayed = (
    activeFilter === "Tous"
      ? allOffers
      : allOffers.filter(o => {
          if (activeFilter === "CDI" && o.label === "CDI / CDD") return true
          if (activeFilter === "CDD" && o.label === "CDI / CDD") return true
          return o.label === activeFilter
        })
  ).filter((p): p is Post => !!p && !!p.label)

  return (
    <section className="relative py-16 text-[#0A1A2F] overflow-hidden">
      <div className="container mx-auto px-6 lg:px-10 xl:px-16">
        <div className="flex flex-col lg:flex-row items-start gap-12 w-full">

          <motion.div
            className="flex-shrink-0 flex flex-col items-center gap-6"
            initial={{ opacity: 0, x: -60 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.7, ease: [0.33, 1, 0.68, 1] }}
          >
            <Lottie
              animationData={handshakeAnimation}
              loop={true}
              style={{ width: 200, height: 200 }}
            />
            <ContractFilter active={activeFilter} onChange={setActiveFilter} />
          </motion.div>

          <motion.div
            className="flex-1 min-w-0 flex flex-col gap-12"
            initial={{ opacity: 0, x: 60 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.7, ease: [0.33, 1, 0.68, 1] }}
          >
            <div className="flex flex-col gap-4">
              <h2 className="text-4xl lg:text-6xl font-bold text-[#0A1A2F] tracking-tight">
                {heading}
              </h2>
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <p className="text-lg text-muted-foreground max-w-xl leading-relaxed">
                  {description}
                </p>
                <Button variant="link" className="group no-underline hover:no-underline px-0 w-fit text-[#2aa0dd] font-bold" asChild>
                  <a href={buttonUrl}>
                    {buttonText}
                    <ArrowRight className="ml-2 size-5 transition-transform group-hover:translate-x-2" />
                  </a>
                </Button>
              </div>
            </div>

            <AnimatePresence mode="popLayout">
              {loading ? (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-sm text-muted-foreground italic"
                >
                  Chargement des opportunités...
                </motion.p>
              ) : displayed.length === 0 ? (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-sm text-muted-foreground italic"
                >
                  {supabase ? "Aucune offre disponible pour le moment." : "Aucune offre disponible pour ce filtre."}
                </motion.p>
              ) : (
                <motion.div
                  className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
                  initial={{ opacity: 0, y: 40 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.7, delay: 0.2, ease: [0.33, 1, 0.68, 1] }}
                >
                  {displayed.map((post, idx) => (
                    <motion.div
                      key={post.id}
                      layout
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ duration: 0.35, delay: idx * 0.05 }}
                    >
                      <OffreCard post={post} />
                    </motion.div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>

          </motion.div>
        </div>
      </div>
    </section>
  )
}

export default OffresEmploi