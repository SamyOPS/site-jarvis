"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import { AlertCircle, CheckCircle2, LogIn, UserPlus } from "lucide-react";

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
type AuthMode = "login" | "register";

type AuthPageProps = {
  defaultMode?: AuthMode;
};

export default function AuthPage({ defaultMode = "login" }: AuthPageProps) {
  const router = useRouter();
  const [mode, setMode] = useState<AuthMode>(defaultMode);
  const [status, setStatus] = useState<Status>({ type: "idle" });
  const [loading, setLoading] = useState(false);

  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [company, setCompany] = useState("");
  const [website, setWebsite] = useState("");
  const [roleChoice, setRoleChoice] = useState<RoleChoice>("candidate");

  const mappedRole =
    roleChoice === "professional"
      ? "professional"
      : roleChoice === "salarie"
        ? "salarie"
        : "candidate";
  const mappedStatus =
    roleChoice === "professional" || roleChoice === "salarie" ? "pending" : "none";
  const isPro = roleChoice === "professional";
  const isSalarie = roleChoice === "salarie";

  const handleModeChange = (nextMode: AuthMode) => {
    setMode(nextMode);
    setStatus({ type: "idle" });
    setLoading(false);
  };

  const handleLoginSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
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
      email: loginEmail,
      password: loginPassword,
    });

    if (error) {
      setStatus({ type: "error", message: error.message });
      setLoading(false);
      return;
    }

    let resolvedRole = (data.user?.user_metadata as { role?: string } | undefined)?.role;

    if (data.user) {
      const { data: profileRow, error: profileSelectError } = await supabase
        .from("profiles")
        .select("id, role")
        .eq("id", data.user.id)
        .maybeSingle();

      if (profileRow?.role) {
        resolvedRole = profileRow.role;
      }

      if (!profileRow && !profileSelectError) {
        const { error: profileUpsertError } = await supabase.from("profiles").upsert({
          id: data.user.id,
          email: loginEmail,
          role: resolvedRole ?? "candidate",
        });

        if (profileUpsertError) {
          console.warn("Creation de profil ignoree :", profileUpsertError.message);
        }
      }
    }

    setStatus({
      type: "success",
      message: `Connecte en tant que ${data.user?.email ?? "utilisateur"}`,
    });
    setLoading(false);
    router.push("/");
  };

  const handleRegisterSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
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
      email: signupEmail,
      password: signupPassword,
      options: {
        data: {
          full_name: fullName,
          company_name: isPro ? company : null,
          website: isPro ? website : null,
          role: mappedRole,
          professional_status: mappedStatus,
          account_kind: roleChoice,
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
        email: signupEmail,
        full_name: fullName || null,
        company_name: isPro ? company : null,
        role: mappedRole,
        professional_status: mappedStatus,
      });

      if (profileError) {
        console.warn("Upsert profile ignoree:", profileError.message);
      }
    }

    setStatus({
      type: "success",
      message: "Compte cree. Verifie tes emails si la confirmation est activee.",
    });
    setLoading(false);
    setMode("login");
    setLoginEmail(signupEmail);
    setLoginPassword("");
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0A1A2F] via-[#0f2744] to-[#0A1A2F] text-white">
      <div className="mx-auto flex min-h-screen max-w-5xl items-center justify-center px-4 py-16">
        <Card className="w-full max-w-2xl border-white/10 bg-white/10 text-white shadow-2xl backdrop-blur">
          <CardHeader className="space-y-3">
            <div className="flex items-center gap-2 text-sm uppercase tracking-wide text-white/70">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10">
                {mode === "login" ? (
                  <LogIn className="h-4 w-4" />
                ) : (
                  <UserPlus className="h-4 w-4" />
                )}
              </span>
              <span>Compte Supabase</span>
            </div>
            <CardTitle className="text-3xl font-semibold">
              {mode === "login" ? "Connexion" : "Inscription"}
            </CardTitle>
            <CardDescription className="text-white/70">
              Un seul ecran pour se connecter ou creer un compte (candidat, salarie ou pro).
            </CardDescription>
            <div className="grid grid-cols-2 gap-2 pt-2">
              <Button
                type="button"
                onClick={() => handleModeChange("login")}
                variant={mode === "login" ? "default" : "outline"}
                className={`flex items-center justify-center gap-2 ${mode === "login" ? "bg-[#2aa0dd] text-white hover:bg-[#2493cb]" : "border-white/20 text-white hover:bg-white/10"}`}
              >
                <LogIn className="h-4 w-4" />
                Connexion
              </Button>
              <Button
                type="button"
                onClick={() => handleModeChange("register")}
                variant={mode === "register" ? "default" : "outline"}
                className={`flex items-center justify-center gap-2 ${mode === "register" ? "bg-[#2aa0dd] text-white hover:bg-[#2493cb]" : "border-white/20 text-white hover:bg-white/10"}`}
              >
                <UserPlus className="h-4 w-4" />
                Inscription
              </Button>
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
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

            {mode === "login" ? (
              <form onSubmit={handleLoginSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="loginEmail" className="text-white/80">
                    Email
                  </Label>
                  <Input
                    id="loginEmail"
                    type="email"
                    required
                    value={loginEmail}
                    onChange={(event) => setLoginEmail(event.target.value)}
                    className="border-white/10 bg-white/5 text-white placeholder:text-white/40 focus-visible:ring-[#2aa0dd]"
                    placeholder="admin@exemple.com"
                    autoComplete="email"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="loginPassword" className="text-white/80">
                    Mot de passe
                  </Label>
                  <Input
                    id="loginPassword"
                    type="password"
                    required
                    value={loginPassword}
                    onChange={(event) => setLoginPassword(event.target.value)}
                    className="border-white/10 bg-white/5 text-white placeholder:text-white/40 focus-visible:ring-[#2aa0dd]"
                    placeholder="Mot de passe admin"
                    autoComplete="current-password"
                  />
                </div>

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-[#2aa0dd] text-white hover:bg-[#2493cb]"
                >
                  {loading ? "Connexion en cours..." : "Se connecter"}
                </Button>

                <p className="text-xs leading-relaxed text-white/70">
                  Assure-toi que NEXT_PUBLIC_SUPABASE_URL et NEXT_PUBLIC_SUPABASE_ANON_KEY sont bien renseignees dans .env.local.
                </p>
              </form>
            ) : (
              <form onSubmit={handleRegisterSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-white/80">Type de compte</Label>
                  <Select
                    value={roleChoice}
                    onValueChange={(val: RoleChoice) => setRoleChoice(val)}
                  >
                    <SelectTrigger className="border-white/10 bg-white/5 text-white focus:ring-[#2aa0dd]">
                      <SelectValue placeholder="Selectionne un type" />
                    </SelectTrigger>
                    <SelectContent className="border-white/10 bg-[#0A1A2F] text-white">
                      <SelectItem value="candidate">Candidat</SelectItem>
                      <SelectItem value="salarie">Salarie</SelectItem>
                      <SelectItem value="professional">Entreprise / Pro</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-white/60">
                    Pro = role professional (statut pending). Salarie = role salarie (statut pending). Candidat = role candidate (statut none).
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
                        placeholder="Ma societe"
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
                  <Label htmlFor="signupEmail" className="text-white/80">
                    Email
                  </Label>
                  <Input
                    id="signupEmail"
                    type="email"
                    required
                    value={signupEmail}
                    onChange={(event) => setSignupEmail(event.target.value)}
                    className="border-white/10 bg-white/5 text-white placeholder:text-white/40 focus-visible:ring-[#2aa0dd]"
                    placeholder="utilisateur@exemple.com"
                    autoComplete="email"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signupPassword" className="text-white/80">
                    Mot de passe
                  </Label>
                  <Input
                    id="signupPassword"
                    type="password"
                    required
                    value={signupPassword}
                    onChange={(event) => setSignupPassword(event.target.value)}
                    className="border-white/10 bg-white/5 text-white placeholder:text-white/40 focus-visible:ring-[#2aa0dd]"
                    placeholder="Choisis un mot de passe"
                    autoComplete="new-password"
                    minLength={6}
                  />
                </div>

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-[#2aa0dd] text-white hover:bg-[#2493cb]"
                >
                  {loading
                    ? "Creation du compte..."
                    : isPro
                      ? "Creer le compte pro"
                      : "Creer le compte"}
                </Button>

                <div className="rounded-md border border-white/10 bg-white/5 p-4 text-xs leading-relaxed text-white/70">
                  <p className="mb-2 font-semibold text-white">A savoir :</p>
                  <ul className="list-disc space-y-1 pl-4">
                    <li>
                      Role envoye : <code>{mappedRole}</code> | Statut pro : <code>{mappedStatus}</code>
                      {" "} (pending pour salarie/pro).
                    </li>
                    <li>
                      Verifie les policies RLS d&apos;insert sur <code>profiles</code> (auth.uid() = id) ou garde le trigger cote base.
                    </li>
                    <li>
                      Les comptes admin se creent directement dans Supabase.
                    </li>
                  </ul>
                </div>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
