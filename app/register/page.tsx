"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import { AlertCircle, CheckCircle2, UserPlus } from "lucide-react";

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

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
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
        data: { full_name: fullName, role: "candidate" },
      },
    });

    if (error) {
      setStatus({ type: "error", message: error.message });
      setLoading(false);
      return;
    }

    if (data.user) {
      // Best effort pour renseigner le profil (si RLS l'autorise dès l'inscription).
      const { error: profileError } = await supabase.from("profiles").upsert({
        id: data.user.id,
        email,
        full_name: fullName || null,
      });
      // Pas bloquant si RLS empêche l'upsert.
      if (profileError) {
        console.warn("Upsert profile ignoré:", profileError.message);
      }
    }

    setStatus({
      type: "success",
      message:
        "Compte créé. Vérifie tes emails si la confirmation est activée, puis connecte-toi.",
    });
    setLoading(false);

    // Redirige vers la page de login après un court délai
    setTimeout(() => router.push("/login"), 1200);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0A1A2F] via-[#0f2744] to-[#0A1A2F] text-white">
      <div className="mx-auto flex min-h-screen max-w-5xl items-center justify-center px-4 py-16">
        <Card className="w-full max-w-xl border-white/10 bg-white/10 text-white shadow-2xl backdrop-blur">
          <CardHeader className="space-y-2">
            <div className="flex items-center gap-2 text-sm uppercase tracking-wide text-white/70">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10">
                <UserPlus className="h-4 w-4" />
              </span>
              <span>Créer un compte</span>
            </div>
            <CardTitle className="text-3xl font-semibold">
              Inscription utilisateur
            </CardTitle>
            <CardDescription className="text-white/70">
              Comptes standard (ni admin ni pro). Utilise ton email et choisis un
              mot de passe.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="fullName" className="text-white/80">
                  Nom complet (optionnel)
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
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="border-white/10 bg-white/5 text-white placeholder:text-white/40 focus-visible:ring-[#2aa0dd]"
                  placeholder="utilisateur@exemple.com"
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
                {loading ? "Création du compte..." : "Créer le compte"}
              </Button>
            </form>

            <div className="rounded-md border border-white/10 bg-white/5 p-4 text-xs leading-relaxed text-white/70">
              <p className="mb-2 font-semibold text-white">À savoir :</p>
              <ul className="list-disc space-y-1 pl-4">
                <li>
                  Ce formulaire crée un compte standard. Le rôle admin/pro reste
                  réservé et géré côté base.
                </li>
                <li>
                  Si la confirmation email est activée, vérifie ta boîte puis
                  connecte-toi.
                </li>
                <li>
                  En cas d&apos;échec RLS sur l&apos;upsert du profil, seule la création du
                  compte sera faite (non bloquant).
                </li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
