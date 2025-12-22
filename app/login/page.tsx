"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import { AlertCircle, CheckCircle2, LogIn } from "lucide-react";

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

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setStatus({ type: "error", message: error.message });
    } else {
      // Si le profil n'existe pas encore, on tente de le créer (RLS doit autoriser l'utilisateur connecté).
      if (data.user) {
        const { data: profileRow, error: profileSelectError } = await supabase
          .from("profiles")
          .select("id")
          .eq("id", data.user.id)
          .maybeSingle();

        if (!profileRow && !profileSelectError) {
          const { error: profileUpsertError } = await supabase.from("profiles").upsert({
            id: data.user.id,
            email,
          });

          if (profileUpsertError) {
            console.warn("Création de profil ignorée :", profileUpsertError.message);
          }
        }
      }

      setStatus({
        type: "success",
        message: `Connecte en tant que ${data.user?.email ?? "utilisateur"}`,
      });
      router.push("/dashboard");
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0A1A2F] via-[#0f2744] to-[#0A1A2F] text-white">
      <div className="mx-auto flex min-h-screen max-w-5xl items-center justify-center px-4 py-16">
        <Card className="w-full max-w-xl border-white/10 bg-white/10 text-white shadow-2xl backdrop-blur">
          <CardHeader className="space-y-2">
            <div className="flex items-center gap-2 text-sm uppercase tracking-wide text-white/70">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10">
                <LogIn className="h-4 w-4" />
              </span>
              <span>Console admin</span>
            </div>
            <CardTitle className="text-3xl font-semibold">
              Connexion Supabase
            </CardTitle>
            <CardDescription className="text-white/70">
              Utilise ton compte admin cree dans Supabase pour tester
              l&apos;authentification.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            <form onSubmit={handleSubmit} className="space-y-4">
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
                  placeholder="admin@exemple.com"
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
                  placeholder="Mot de passe admin"
                  autoComplete="current-password"
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
                {loading ? "Connexion en cours..." : "Se connecter"}
              </Button>
            </form>

            <div className="rounded-md border border-white/10 bg-white/5 p-4 text-xs leading-relaxed text-white/70">
              <p className="mb-2 font-semibold text-white">
                Pour tester rapidement :
              </p>
              <ul className="list-disc space-y-1 pl-4">
                <li>
                  Verifie que NEXT_PUBLIC_SUPABASE_URL et NEXT_PUBLIC_SUPABASE_ANON_KEY
                  sont definis dans ton fichier .env.local.
                </li>
                <li>
                  Saisis l&apos;email et le mot de passe du compte admin que tu viens
                  de creer sur Supabase.
                </li>
                <li>
                  En cas d&apos;erreur, le message Supabase s&apos;affiche dans le
                  cadre ci-dessus.
                </li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
