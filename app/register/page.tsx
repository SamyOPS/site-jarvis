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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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

type RoleChoice = "candidate" | "professional" | "salarie";

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [company, setCompany] = useState("");
  const [website, setWebsite] = useState("");
  const [roleChoice, setRoleChoice] = useState<RoleChoice>("candidate");
  const [status, setStatus] = useState<Status>({ type: "idle" });
  const [loading, setLoading] = useState(false);

  const mappedRole =
    roleChoice === "professional" ? "professional" : roleChoice === "salarie" ? "salarie" : "candidate";
  const mappedStatus = roleChoice === "professional" || roleChoice === "salarie" ? "pending" : "none";
  const isPro = roleChoice === "professional";
  const isSalarie = roleChoice === "salarie";

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
          company_name: isPro ? company : null,
          website: isPro ? website : null,
          role: mappedRole,
          professional_status: mappedStatus,
          account_kind: roleChoice, // trace du choix salarie/candidat/pro
        },
      },
    });

    if (error) {
      setStatus({ type: "error", message: error.message });
      setLoading(false);
      return;
    }

    if (data.user) {
      const { error: profileError } = await supabase.from("profiles").upsert({
        id: data.user.id,
        email,
        full_name: fullName || null,
        company_name: isPro ? company : null,
        role: mappedRole,
        professional_status: mappedStatus,
      });

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
    setTimeout(() => router.push("/login"), 1200);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0A1A2F] via-[#0f2744] to-[#0A1A2F] text-white">
      <div className="mx-auto flex min-h-screen max-w-5xl items-center justify-center px-4 py-16">
        <Card className="w-full max-w-2xl border-white/10 bg-white/10 text-white shadow-2xl backdrop-blur">
          <CardHeader className="space-y-2">
            <div className="flex items-center gap-2 text-sm uppercase tracking-wide text-white/70">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10">
                <UserPlus className="h-4 w-4" />
              </span>
              <span>Créer un compte</span>
            </div>
            <CardTitle className="text-3xl font-semibold">
              Inscription (candidat, salarié ou pro)
            </CardTitle>
            <CardDescription className="text-white/70">
              Choisis le type de compte. Les admins sont créés directement dans Supabase.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label className="text-white/80">Type de compte</Label>
                <Select
                  value={roleChoice}
                  onValueChange={(val: RoleChoice) => setRoleChoice(val)}
                >
                  <SelectTrigger className="border-white/10 bg-white/5 text-white focus:ring-[#2aa0dd]">
                    <SelectValue placeholder="Sélectionne un type" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#0A1A2F] text-white border-white/10">
                    <SelectItem value="candidate">Candidat</SelectItem>
                    <SelectItem value="salarie">Salarié</SelectItem>
                    <SelectItem value="professional">Entreprise / Pro</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-white/60">
                  Pro = rôle professional (statut pending). Salarié = rôle salarie (statut pending). Candidat = rôle candidate (statut none).
                </p>
              </div>

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

              {isPro && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="company" className="text-white/80">
                      Nom de l&apos;entreprise
                    </Label>
                    <Input
                      id="company"
                      type="text"
                      required={isPro}
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
                </>
              )}

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
                {loading
                  ? "Création du compte..."
                  : isPro
                    ? "Créer le compte pro"
                    : "Créer le compte"}
              </Button>
            </form>

            <div className="rounded-md border border-white/10 bg-white/5 p-4 text-xs leading-relaxed text-white/70">
              <p className="mb-2 font-semibold text-white">À savoir :</p>
              <ul className="list-disc space-y-1 pl-4">
                <li>
                  Rôle envoyé : <code>{mappedRole}</code> |
                  Statut pro : <code>{mappedStatus}</code> (pending seulement pour pro).
                </li>
                <li>
                  Pense à activer/ajuster la policy RLS d&apos;insert sur
                  <code>profiles</code> (auth.uid() = id) ou garde le trigger côté base.
                </li>
                <li>
                  Admins sont créés directement dans Supabase (pas via ce formulaire).
                </li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
