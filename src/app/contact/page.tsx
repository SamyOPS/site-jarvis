"use client";

import { FormEvent, useState } from "react";
import { motion } from "motion/react";
import {
  ArrowRight,
  BadgeCheck,
  BriefcaseBusiness,
  CheckCircle2,
  Clock3,
  FileCheck2,
  Mail,
  MessageSquareText,
  ShieldCheck,
  Sparkles,
  UserRound,
} from "lucide-react";

import { Footer } from "@/components/sections/footer";
import { HomeHeader } from "@/components/sections/home-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { browserSupabase } from "@/lib/supabase-browser";

const supabase = browserSupabase;

const cardVariants = {
  hidden: { opacity: 0, y: 18 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.45,
      ease: [0.25, 0.46, 0.45, 0.94] as [number, number, number, number],
      delay: i,
    },
  }),
};

const benefits = [
  {
    icon: BriefcaseBusiness,
    title: "Cadrage senior",
    description: "Votre demande est qualifiee par un expert IT avant toute recommandation.",
  },
  {
    icon: FileCheck2,
    title: "Reponse structuree",
    description: "Vous recevez une lecture claire des priorites, risques et prochaines etapes.",
  },
  {
    icon: Sparkles,
    title: "Accompagnement sur mesure",
    description: "Support, developpement, securite ou conseil : l'equipe adaptee est mobilisee.",
  },
];

const assuranceItems = [
  { icon: Clock3, title: "Retour cible sous 24h", text: "Un premier contact rapide pour clarifier votre besoin." },
  { icon: BadgeCheck, title: "Expertise IT confirmee", text: "Des interlocuteurs habitues aux enjeux PME, ETI et grands comptes." },
  { icon: ShieldCheck, title: "Confidentialite", text: "Vos informations sont traitees avec discretion et uniquement pour votre demande." },
  { icon: CheckCircle2, title: "Suivi personnalise", text: "Un accompagnement lisible, de la qualification jusqu'a la mise en relation." },
];

const formFields = [
  {
    id: "email",
    name: "email",
    type: "email",
    label: "Adresse email",
    placeholder: "prenom.nom@entreprise.com",
    icon: Mail,
    inputMode: "email" as const,
    pattern: "[^\\s@]+@[^\\s@]+\\.[^\\s@]+",
  },
  {
    id: "firstName",
    name: "firstName",
    type: "text",
    label: "Prenom",
    placeholder: "Votre prenom",
    icon: UserRound,
    minLength: 2,
    maxLength: 50,
  },
  {
    id: "lastName",
    name: "lastName",
    type: "text",
    label: "Nom",
    placeholder: "Votre nom",
    icon: UserRound,
    minLength: 2,
    maxLength: 50,
  },
  {
    id: "subject",
    name: "subject",
    type: "text",
    label: "Objet de la demande",
    placeholder: "Ex. Renfort support N2, audit securite...",
    icon: MessageSquareText,
    minLength: 3,
    maxLength: 120,
  },
];

export default function ContactPage() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitState, setSubmitState] = useState<"idle" | "success" | "error">("idle");
  const [submitMessage, setSubmitMessage] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitState("idle");
    setSubmitMessage(null);

    if (!supabase) {
      setSubmitState("error");
      setSubmitMessage("Configuration Supabase manquante.");
      return;
    }

    const form = event.currentTarget;
    const formData = new FormData(form);

    const email = String(formData.get("email") ?? "").trim();
    const firstName = String(formData.get("firstName") ?? "").trim();
    const lastName = String(formData.get("lastName") ?? "").trim();
    const subject = String(formData.get("subject") ?? "").trim();
    const message = String(formData.get("message") ?? "").trim();

    if (!email || !firstName || !lastName || !subject || !message) {
      setSubmitState("error");
      setSubmitMessage("Merci de remplir tous les champs.");
      return;
    }

    const emailIsValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    if (!emailIsValid) {
      setSubmitState("error");
      setSubmitMessage("Merci de saisir une adresse email valide.");
      return;
    }

    const firstNameIsValid = /^[A-Za-z\u00C0-\u024F' -]{2,50}$/.test(firstName);
    const lastNameIsValid = /^[A-Za-z\u00C0-\u024F' -]{2,50}$/.test(lastName);
    if (!firstNameIsValid || !lastNameIsValid) {
      setSubmitState("error");
      setSubmitMessage("Le prenom et le nom doivent contenir uniquement des lettres.");
      return;
    }

    if (subject.length < 3 || subject.length > 120) {
      setSubmitState("error");
      setSubmitMessage("Merci de saisir un objet entre 3 et 120 caracteres.");
      return;
    }

    setIsSubmitting(true);

    const emailResponse = await fetch("/api/contact", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, firstName, lastName, subject, message }),
    });

    if (!emailResponse.ok) {
      setIsSubmitting(false);
      setSubmitState("error");
      setSubmitMessage("Impossible d'envoyer l'email pour le moment.");
      return;
    }

    const { error } = await supabase.from("contact_messages").insert({
      email,
      first_name: firstName,
      last_name: lastName,
      subject,
      message,
      source: "contact-page",
    });

    setIsSubmitting(false);

    if (error) {
      setSubmitState("error");
      setSubmitMessage("Impossible d'envoyer le message pour le moment.");
      return;
    }

    form.reset();
    setSubmitState("success");
    setSubmitMessage("Message envoye. Notre equipe revient vers vous rapidement avec une reponse claire.");
  };

  return (
    <>
      <div className="min-h-screen bg-[var(--gris-clair)] text-[#0A1A2F]">
        <HomeHeader />

        <main className="particle-readability">
          <section className="relative overflow-hidden bg-[#0A1A2F] pt-28 text-white sm:pt-32 lg:pt-36">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(42,160,221,0.24),transparent_32%),linear-gradient(135deg,rgba(10,26,47,0.98),rgba(13,42,75,0.96))]" />
            <div className="relative mx-auto grid max-w-7xl gap-10 px-6 pb-16 lg:grid-cols-[1.05fr_0.95fr] lg:px-8 lg:pb-20">
              <motion.div
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.55, ease: [0.25, 0.46, 0.45, 0.94] }}
                className="flex flex-col justify-center"
              >
                <Badge className="w-fit border-white/15 bg-white/10 text-white hover:bg-white/10">
                  Candidature expert
                </Badge>
                <h1 className="mt-6 max-w-4xl font-display text-4xl font-bold leading-tight tracking-tight text-white sm:text-5xl lg:text-6xl">
                  Parlez-nous de votre projet comme d'une mission a fort enjeu.
                </h1>
                <p className="mt-6 max-w-2xl text-base leading-8 text-white/78 sm:text-lg">
                  Decrivez votre besoin IT, vos contraintes et vos objectifs. Un expert Jarvis Connect analyse votre demande et vous oriente vers l'accompagnement le plus pertinent.
                </p>
                <div className="mt-8 flex flex-wrap gap-3">
                  {["Qualification expert", "Retour rapide", "Approche confidentielle"].map((item) => (
                    <span
                      key={item}
                      className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-semibold text-white/90"
                    >
                      <CheckCircle2 className="h-4 w-4 text-[#2aa0dd]" />
                      {item}
                    </span>
                  ))}
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.55, delay: 0.12, ease: [0.25, 0.46, 0.45, 0.94] }}
                className="grid content-end gap-4"
              >
                <Card className="border-white/12 bg-white/10 text-white shadow-[0_24px_70px_rgba(0,0,0,0.24)] backdrop-blur">
                  <CardContent className="p-6 sm:p-7">
                    <div className="flex items-center justify-between gap-4 border-b border-white/10 pb-5">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/50">
                          Dossier de contact
                        </p>
                        <h2 className="mt-2 text-2xl font-semibold tracking-tight">Analyse prioritaire</h2>
                      </div>
                      <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-[#2aa0dd] text-white">
                        <BriefcaseBusiness className="h-6 w-6" />
                      </div>
                    </div>
                    <div className="mt-6 grid gap-4 sm:grid-cols-3">
                      {[
                        ["24h", "retour cible"],
                        ["N1-N3", "expertise support"],
                        ["100%", "sur mesure"],
                      ].map(([value, label]) => (
                        <div key={label} className="rounded-lg border border-white/10 bg-white/8 p-4">
                          <p className="text-2xl font-bold text-white">{value}</p>
                          <p className="mt-1 text-xs font-semibold uppercase tracking-[0.16em] text-white/55">{label}</p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </div>
          </section>

          <section className="mx-auto max-w-7xl px-6 py-12 lg:px-8 lg:py-16">
            <div className="grid gap-5 md:grid-cols-3">
              {benefits.map((item, index) => (
                <motion.div
                  key={item.title}
                  variants={cardVariants}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true, amount: 0.25 }}
                  custom={index * 0.08}
                >
                  <Card className="h-full border-[#d1d5db] bg-white transition duration-300 hover:-translate-y-1 hover:shadow-lg">
                    <CardContent className="p-6">
                      <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <item.icon className="h-5 w-5" />
                      </div>
                      <h3 className="mt-5 text-xl font-semibold tracking-tight text-[#0A1A2F]">{item.title}</h3>
                      <p className="mt-3 text-sm leading-6 text-muted-foreground">{item.description}</p>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </section>

          <section className="mx-auto grid max-w-7xl gap-8 px-6 pb-20 lg:grid-cols-[0.78fr_1.22fr] lg:px-8 lg:pb-28">
            <aside className="space-y-5">
              <div className="rounded-lg border border-[#d1d5db] bg-white p-6 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">Votre parcours</p>
                <h2 className="mt-3 font-display text-3xl font-bold tracking-tight text-[#0A1A2F]">
                  Un processus clair, comme une candidature qualifiee.
                </h2>
                <div className="mt-6 space-y-4">
                  {["Depot de votre demande", "Qualification par un expert", "Proposition de prochaine etape"].map(
                    (step, index) => (
                      <div key={step} className="flex gap-3">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#0A1A2F] text-sm font-bold text-white">
                          {index + 1}
                        </span>
                        <div className="border-b border-[#d1d5db] pb-4">
                          <p className="font-semibold text-[#0A1A2F]">{step}</p>
                          <p className="mt-1 text-sm leading-6 text-muted-foreground">
                            {index === 0
                              ? "Vous precisez le contexte, les attentes et le niveau d'urgence."
                              : index === 1
                                ? "Nous analysons le besoin pour identifier le bon profil d'accompagnement."
                                : "Nous revenons avec une orientation exploitable et concrete."}
                          </p>
                        </div>
                      </div>
                    ),
                  )}
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
                {assuranceItems.map((item) => (
                  <div key={item.title} className="rounded-lg border border-[#d1d5db] bg-white p-5 shadow-sm">
                    <div className="flex items-start gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-secondary text-primary">
                        <item.icon className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="font-semibold text-[#0A1A2F]">{item.title}</p>
                        <p className="mt-1 text-sm leading-6 text-muted-foreground">{item.text}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </aside>

            <Card className="border-[#d1d5db] bg-white shadow-[0_22px_60px_rgba(10,26,47,0.09)]">
              <CardContent className="p-6 sm:p-8 lg:p-10">
                <div className="mb-8 flex flex-col gap-4 border-b border-[#d1d5db] pb-6 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <Badge variant="secondary" className="w-fit text-[#0A1A2F]">
                      Formulaire de candidature projet
                    </Badge>
                    <h2 className="mt-4 font-display text-3xl font-bold tracking-tight text-[#0A1A2F]">
                      Deposer votre demande
                    </h2>
                    <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
                      Les champs visibles permettent a nos experts de comprendre votre contexte avant le premier echange.
                    </p>
                  </div>
                  <div className="rounded-lg border border-primary/20 bg-primary/5 px-4 py-3 text-sm font-semibold text-primary">
                    Reponse humaine, pas de tri automatique
                  </div>
                </div>

                <form className="space-y-6" onSubmit={handleSubmit} noValidate>
                  <div className="grid gap-5 sm:grid-cols-2">
                    {formFields.map((field) => (
                      <div key={field.name} className={field.name === "subject" ? "sm:col-span-2" : ""}>
                        <Label htmlFor={field.id} className="text-[#0A1A2F]">
                          {field.label}
                        </Label>
                        <div className="relative mt-2">
                          <field.icon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                          <Input
                            id={field.id}
                            name={field.name}
                            type={field.type}
                            inputMode={field.inputMode}
                            pattern={field.pattern}
                            minLength={field.minLength}
                            maxLength={field.maxLength}
                            placeholder={field.placeholder}
                            required
                            className="h-12 rounded-lg bg-white pl-10 text-[#0A1A2F] transition duration-200 focus-visible:border-primary focus-visible:ring-primary/30 invalid:focus-visible:border-destructive invalid:focus-visible:ring-destructive/20"
                          />
                        </div>
                      </div>
                    ))}
                  </div>

                  <div>
                    <Label htmlFor="message" className="text-[#0A1A2F]">
                      Message
                    </Label>
                    <Textarea
                      id="message"
                      name="message"
                      placeholder="Presentez votre besoin, le contexte, les echeances, les profils recherches ou les difficultes rencontrees."
                      className="mt-2 min-h-[190px] resize-none rounded-lg bg-white text-[#0A1A2F] transition duration-200 focus-visible:border-primary focus-visible:ring-primary/30 invalid:focus-visible:border-destructive invalid:focus-visible:ring-destructive/20"
                      required
                    />
                  </div>

                  <div className="flex flex-col gap-4 border-t border-[#d1d5db] pt-6 sm:flex-row sm:items-center sm:justify-between">
                    <p className="max-w-md text-xs leading-5 text-muted-foreground">
                      En envoyant ce formulaire, vous transmettez les informations necessaires a la qualification de votre demande par Jarvis Connect.
                    </p>
                    <Button
                      type="submit"
                      size="lg"
                      disabled={isSubmitting}
                      className="h-12 rounded-lg bg-primary px-6 text-sm font-semibold shadow-[0_12px_30px_rgba(37,99,235,0.28)] transition duration-300 hover:-translate-y-0.5 hover:bg-primary/90"
                    >
                      {isSubmitting ? "Envoi en cours..." : "Envoyer ma demande"}
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>

                  <div className="min-h-14">
                    {submitMessage && (
                      <div
                        className={`rounded-lg border px-4 py-3 text-sm leading-relaxed ${
                          submitState === "success"
                            ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                            : "border-red-200 bg-red-50 text-red-700"
                        }`}
                        role="status"
                        aria-live="polite"
                      >
                        {submitMessage}
                      </div>
                    )}
                  </div>
                </form>
              </CardContent>
            </Card>
          </section>
        </main>
      </div>

      <Footer />
    </>
  );
}
