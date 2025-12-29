import type { Metadata } from "next";
import Link from "next/link";
import { Clock, Mail } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const metadata: Metadata = {
  title: "Page en cours de developpement | Jarvis Connect",
  description:
    "Cette page arrive bientot. Laissez votre email pour etre prevenu du lancement.",
};

export default function PageEnDeveloppement() {
  return (
    <div className="min-h-screen bg-white text-[#0A1A2F]">
      <div className="container mx-auto px-6 py-20 lg:py-28">
        <div className="mb-10 inline-flex items-center gap-2 border border-[#000080] bg-[#000080]/5 px-4 py-2 text-xs uppercase tracking-[0.24em] text-[#000080]">
          <Clock className="h-4 w-4" />
          En cours de developpement
        </div>

        <div className="grid gap-10 lg:grid-cols-[1.2fr_1fr]">
          <div className="space-y-6">
            <h1 className="text-4xl font-semibold leading-tight lg:text-5xl text-[#000080]">
              Nous peaufinons cette page
            </h1>
            <p className="max-w-2xl text-lg text-[#0A1A2F]">
              Encore un peu de patience : cette section sera bientot en ligne. Laissez-nous votre email
              pour etre prevenu des nouveautes des qu'elles sont disponibles.
            </p>

            <div className="space-y-4 border border-black/10 bg-white p-6 shadow-sm">
              <div className="flex items-center gap-3 text-sm uppercase tracking-[0.18em] text-[#000080]">
                <Mail className="h-4 w-4" />
                Newsletter
              </div>
              <form className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <Input
                  type="email"
                  placeholder="Votre email professionnel"
                  className="h-12 flex-1 rounded-none border-[#000080] bg-white text-[#0A1A2F] placeholder:text-black/60 focus-visible:ring-[#000080]"
                  required
                />
                <Button className="h-12 rounded-none border border-[#000080] bg-[#000080] text-white hover:bg-[#000080]/90">
                  Me prevenir
                </Button>
              </form>
              <p className="text-xs text-black/70">
                Pas de spam. Vous recevrez une seule notification lorsque cette page sera publiee.
              </p>
            </div>
          </div>

          <div className="space-y-4 border border-black/10 bg-white p-6 shadow-sm">
            <h3 className="text-xl font-semibold text-[#000080]">Ce que nous preparons</h3>
            <ul className="space-y-3 text-[#0A1A2F]">
              <li className="flex gap-3">
                <span className="mt-1 h-2 w-2 bg-[#000080]" />
                Un parcours simple et clair aligne sur l'experience Jarvis Connect.
              </li>
              <li className="flex gap-3">
                <span className="mt-1 h-2 w-2 bg-[#000080]" />
                Des informations detaillees, mises a jour et actionnables.
              </li>
              <li className="flex gap-3">
                <span className="mt-1 h-2 w-2 bg-[#000080]" />
                Un formulaire de contact adapte a ce besoin specifique.
              </li>
            </ul>
            <div className="border border-[#000080] bg-[#000080]/5 px-4 py-3 text-sm text-[#0A1A2F]">
              Besoin d'aller plus vite ?{" "}
              <Link className="font-semibold text-[#000080] underline" href="/#contact">
                Contactez-nous
              </Link>{" "}
              et nous reviendrons vers vous rapidement.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
