"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import { AlertCircle, Briefcase, CheckCircle2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase =
  supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey)
    : null;

type Status =
  | { type: "idle" }
  | { type: "error"; message: string }
  | { type: "success"; message: string };

export default function EntrepriseRegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [company, setCompany] = useState("");
  const [website, setWebsite] = useState("");
  const [status, setStatus] = useState<Status>({ type: "idle" });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!supabase) {
      setStatus({
        type: "error",
        message:
          "Variables NEXT_PUBLIC_SUPABASE_URL et NEXT_PUBLIC_SUPABASE_ANON_KEY manquantes.",
      });
      return;
    }

    setLoading(true);
    setStatus({ type: "idle" });

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          company_name: company,
          website,
          role: "professional",
        },
      },
    });

    if (error) {
      setStatus({ type: "error", message: error.message });
      setLoading(false);
      return;
    }

    if (data.user) {
      // Best effort : créer/mettre à jour le profil avec rôle pro + statut pending (si RLS autorise).
      const { error: profileError } = await supabase.from("profiles").upsert({
        id: data.user.id,
        email,
        full_name: fullName || null,
        company_name: company || null,
        role: "professional",
        professional_status: "pending",
      });

      if (profileError) {
        console.warn("Upsert profile entreprise ignoré :", profileError.message);
      }
    }

    setStatus({
      type: "success",
      message:
        "Compte entreprise créé. Vérifie ton email si la confirmation est activée, puis connecte-toi.",
    });
    setLoading(false);

    setTimeout(() => router.push("/login"), 1200);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0A1A2F] via-[#0f2744] to-[#0A1A2F] text-white">
      <div className="mx-auto flex min-h-screen max-w-5xl items-center justify-center px-4 py-16">
        <Card className="w-full max-w-2xl border-white/10 bg-white/10 text-white shadow-2xl backdrop-blur">
          <CardHeader className="space-y-2">
            <div className="flex items-center gap-2 text-sm uppercase tracking-wide text-white/70">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10">
                <Briefcase className="h-4 w-4" />
              </span>
              <span>Espace entreprise</span>
            </div>
            <CardTitle className="text-3xl font-semibold">
              Créer un compte pro
            </CardTitle>
            <CardDescription className="text-white/70">
              Destiné aux entreprises souhaitant publier des offres. Le rôle est
              défini sur <strong>professional</strong> et le statut sur{" "}
              <strong>pending</strong> en attente de validation.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="company" className="text-white/80">
                  Nom de l&apos;entreprise
                </Label>
                <Input
                  id="company"
                  type="text"
                  required
                  value={company}
                  onChange={(event) => setCompany(event.target.value)}
                  className="border-white/10 bg-white/5 text-white placeholder:text-white/40 focus-visible:ring-[#2aa0dd]"
                  placeholder="Ma société"
                  autoComplete="organization"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="website" className="text-white/80">
                  Site web (optionnel)
                </Label>
                <Input
                  id="website"
                  type="url"
                  value={website}
                  onChange={(event) => setWebsite(event.target.value)}
                  className="border-white/10 bg-white/5 text-white placeholder:text-white/40 focus-visible:ring-[#2aa0dd]"
                  placeholder="https://exemple.com"
                  autoComplete="url"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="fullName" className="text-white/80">
                  Nom complet du contact
                </Label>
                <Input
                  id="fullName"
                  type="text"
                  value={fullName}
                  onChange={(event) => setFullName(event.target.value)}
                  className="border-white/10 bg-white/5 text-white placeholder:text-white/40 focus-visible:ring-[#2aa0dd]"
                  placeholder="Jean Dupont"
                  autoComplete="name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="text-white/80">
                  Email pro
                </Label>
                <Input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="border-white/10 bg-white/5 text-white placeholder:text-white/40 focus-visible:ring-[#2aa0dd]"
                  placeholder="contact@exemple.com"
                  autoComplete="email"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-white/80">
                  Mot de passe
                </Label>
                <Input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="border-white/10 bg-white/5 text-white placeholder:text-white/40 focus-visible:ring-[#2aa0dd]"
                  placeholder="Choisis un mot de passe"
                  autoComplete="new-password"
                  minLength={6}
                />
              </div>

              {status.type !== "idle" && (
                <div
                  className={`flex items-start gap-2 rounded-md border px-3 py-2 text-sm ${
                    status.type === "error"
                      ? "border-red-400/70 bg-red-500/10 text-red-100"
                      : "border-emerald-400/70 bg-emerald-500/10 text-emerald-50"
                  }`}
                >
                  {status.type === "error" ? (
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  ) : (
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                  )}
                  <p className="leading-relaxed">{status.message}</p>
                </div>
              )}

              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-[#2aa0dd] text-white hover:bg-[#2493cb]"
              >
                {loading ? "Création du compte..." : "Créer le compte pro"}
              </Button>
            </form>

            <div className="rounded-md border border-white/10 bg-white/5 p-4 text-xs leading-relaxed text-white/70">
              <p className="mb-2 font-semibold text-white">À savoir :</p>
              <ul className="list-disc space-y-1 pl-4">
                <li>
                  Le rôle est défini sur <code>professional</code> et le statut sur{" "}
                  <code>pending</code> pour validation.
                </li>
                <li>
                  Ajoute la policy RLS permettant à un utilisateur d&apos;insérer sa
                  propre ligne dans <code>profiles</code> (auth.uid() = id) pour que
                  l&apos;upsert fonctionne côté client.
                </li>
                <li>
                  Si la confirmation email est activée, vérifie la boîte mail puis
                  connecte-toi via l&apos;espace login.
                </li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
