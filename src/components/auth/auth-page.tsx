"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { browserSupabase } from "@/lib/supabase-browser";
import { CircleAlert, CircleCheck } from "lucide-react";

import { resolveLandingPath } from "@/features/account/landing";
import { VITRINE_FONT_VARS } from "@/features/vitrine/fonts";
import { FIELD, KICKER, LABEL, MESSAGE, PILL_PRIMARY } from "@/components/auth/auth-styles";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { safeGetClientSession } from "@/lib/client-auth";

const supabase = browserSupabase;

// `Input` porte un cadre arrondi et un anneau de focus par defaut : FIELD les remplace
// par un filet bas, l'anneau est retire.
const INPUT = `${FIELD} focus-visible:ring-0 focus-visible:ring-offset-0`;
const TAB =
  "-mb-px border-b-2 pb-3 text-xs font-semibold uppercase tracking-[0.2em] transition-colors duration-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900";
const TAB_ACTIVE = "border-zinc-900 text-zinc-900";
const TAB_INACTIVE = "border-transparent text-zinc-900/40 hover:text-zinc-900";
// Geist en style direct : l'utilitaire `font-sans` est fige sur Inter par `@theme inline`.
// La liste du select est rendue dans un portail, hors de l'enveloppe : elle le repose.
const GEIST = { fontFamily: "var(--font-geist-sans)" };
const SELECT_ITEM = "rounded-none focus:bg-zinc-100 focus:text-zinc-900";
const SPINNER =
  "h-3 w-3 animate-spin rounded-full border border-white/40 border-t-white motion-reduce:animate-none";

type Status =
  | { type: "idle" }
  | { type: "error"; message: string }
  | { type: "success"; message: string };

type RoleChoice = "candidate" | "professional" | "salarie" | "rh";
type AuthMode = "login" | "register";
type AccessResolution = {
  allowed: boolean;
  message: string | null;
};

type AuthPageProps = {
  defaultMode?: AuthMode;
};

/**
 * Demande au serveur de creer le profil du compte courant.
 *
 * Best-effort : un echec ne doit pas bloquer la connexion, le profil sera recree a la
 * prochaine ouverture de session. Sans jeton (inscription en attente de confirmation
 * d'e-mail), la creation est simplement reportee au premier login.
 */
async function bootstrapProfile(
  accessToken: string | undefined,
  body: { accountKind: RoleChoice; fullName?: string | null; companyName?: string | null },
) {
  if (!accessToken) return null;

  try {
    const response = await fetch("/api/auth/bootstrap-profile", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    const payload = (await response.json().catch(() => null)) as {
      profile?: { role?: string | null; professional_status?: string | null };
      error?: string;
    } | null;

    if (!response.ok) {
      console.warn("Creation de profil ignoree :", payload?.error ?? response.status);
      return null;
    }
    return payload?.profile ?? null;
  } catch (error) {
    console.warn("Creation de profil ignoree :", error);
    return null;
  }
}

const getDashboardPath = (role?: string | null) => {
  if (role === "admin") return "/dashboard";
  if (role === "professional") return "/dashboard/pro";
  if (role === "salarie") return "/dashboard/salarie";
  if (role === "rh") return "/dashboard/rh";
  return "/dashboard/candidat";
};

const resolveDashboardAccess = (
  role?: string | null,
  professionalStatus?: string | null
): AccessResolution => {
  if (!role || role === "candidate") {
    return { allowed: true, message: null };
  }
  if (role === "admin") {
    return { allowed: true, message: null };
  }
  if (["professional", "salarie", "rh"].includes(role)) {
    if (professionalStatus === "verified") {
      return { allowed: true, message: null };
    }
    if (professionalStatus === "rejected") {
      return {
        allowed: false,
        message: "Compte refuse. Contacte un administrateur.",
      };
    }
    return {
      allowed: false,
      message: "Compte en attente de validation administrateur.",
    };
  }
  return { allowed: true, message: null };
};

export default function AuthPage({ defaultMode = "login" }: AuthPageProps) {
  const router = useRouter();
  const [mode, setMode] = useState<AuthMode>(defaultMode);
  const [status, setStatus] = useState<Status>({ type: "idle" });
  const [loading, setLoading] = useState(false);
  const [justLoggedOut, setJustLoggedOut] = useState(false);

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
        : roleChoice === "rh"
          ? "rh"
        : "candidate";
  const mappedStatus =
    roleChoice === "professional" || roleChoice === "salarie" || roleChoice === "rh"
      ? "pending"
      : "none";
  const isPro = roleChoice === "professional";
  useEffect(() => {
    if (typeof window === "undefined") return;
    setJustLoggedOut(new URLSearchParams(window.location.search).get("logged_out") === "1");
  }, []);

  useEffect(() => {
    if (!supabase) return;
    if (justLoggedOut) return;

    let isMounted = true;

    const redirectIfAuthenticated = async () => {
      const { session, error } = await safeGetClientSession(supabase);

      if (error || !session?.user || !isMounted) {
        return;
      }

      let resolvedRole = (
        session.user.user_metadata as { role?: string } | undefined
      )?.role;

      const { data: profileRow } = await supabase
        .from("profiles")
        .select("role,professional_status")
        .eq("id", session.user.id)
        .maybeSingle();

      if (!isMounted) return;

      if (profileRow?.role) {
        resolvedRole = profileRow.role;
      }
      const access = resolveDashboardAccess(
        resolvedRole,
          profileRow?.professional_status ??
          ((session.user.user_metadata as { professional_status?: string } | undefined)
            ?.professional_status ?? null)
      );
      if (!access.allowed) {
        setStatus({
          type: "error",
          message: access.message ?? "Compte non autorise.",
        });
        return;
      }
      // L'ecran d'accueil suit la preference du compte, quand elle existe.
      router.replace(
        await resolveLandingPath(resolvedRole, getDashboardPath(resolvedRole)),
      );
    };

    void redirectIfAuthenticated();

    return () => {
      isMounted = false;
    };
  }, [justLoggedOut, router]);

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
    let resolvedProfessionalStatus =
      (data.user?.user_metadata as { professional_status?: string } | undefined)
        ?.professional_status ?? null;

    if (data.user) {
      const { data: profileRow, error: profileSelectError } = await supabase
        .from("profiles")
        .select("id, role, professional_status")
        .eq("id", data.user.id)
        .maybeSingle();

      if (profileRow?.role) {
        resolvedRole = profileRow.role;
      }
      if (profileRow?.professional_status) {
        resolvedProfessionalStatus = profileRow.professional_status;
      }

      if (!profileRow && !profileSelectError) {
        // Le profil est cree par le serveur : le rang ne peut pas etre choisi ici.
        // `user_metadata.role` n'est plus utilise — l'utilisateur peut le reecrire lui-meme
        // via `auth.updateUser`, il ne prouve donc rien.
        const bootstrapped = await bootstrapProfile(data.session?.access_token, {
          accountKind: "candidate",
        });
        if (bootstrapped) {
          resolvedRole = bootstrapped.role ?? resolvedRole;
          resolvedProfessionalStatus =
            bootstrapped.professional_status ?? resolvedProfessionalStatus;
        }
      }
    }

    setStatus({
      type: "success",
      message: `Connecte en tant que ${data.user?.email ?? "utilisateur"}`,
    });
    setLoading(false);
    const access = resolveDashboardAccess(resolvedRole, resolvedProfessionalStatus);
    if (!access.allowed) {
      setStatus({
        type: "error",
        message: access.message ?? "Compte non autorise.",
      });
      return;
    }
    router.replace(await resolveLandingPath(resolvedRole, getDashboardPath(resolvedRole)));
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
      // Le profil est cree cote serveur, qui decide seul du rang a partir du type de compte
      // demande. Il etait auparavant ecrit directement ici, avec le role du formulaire.
      await bootstrapProfile(data.session?.access_token, {
        accountKind: roleChoice,
        fullName: fullName || null,
        companyName: isPro ? company : null,
      });
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
    <div
      className={`${VITRINE_FONT_VARS} min-h-dvh bg-white text-zinc-900`}
      style={GEIST}
    >
      <div className="fixed left-8 top-8 z-50 sm:left-12 sm:top-12">
        <Image
          src="/logo-jarvis-noir.png"
          alt="Jarvis"
          width={256}
          height={195}
          sizes="64px"
          priority
          className="h-10 w-auto object-contain sm:h-12"
        />
      </div>

      <main className="px-6 pb-16 pt-32 sm:px-12 sm:pb-20 sm:pt-40 lg:pb-24">
        <div className="mx-auto w-full max-w-md">
          <h1>
            <span className={KICKER}>Compte Jarvis</span>
            <span className="mt-4 block text-[clamp(1.75rem,4vw,2.75rem)] font-bold uppercase leading-[0.95] tracking-tight">
              {mode === "login" ? "Connexion" : "Inscription"}
            </span>
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-zinc-500 sm:text-base">
            Un seul ecran pour se connecter ou creer un compte (candidat, salarie, RH ou pro).
          </p>

          <div className="mb-10 mt-10 flex gap-8 border-b border-zinc-900/25">
            <button
              type="button"
              onClick={() => handleModeChange("login")}
              className={`${TAB} ${mode === "login" ? TAB_ACTIVE : TAB_INACTIVE}`}
            >
              Connexion
            </button>
            <button
              type="button"
              onClick={() => handleModeChange("register")}
              className={`${TAB} ${mode === "register" ? TAB_ACTIVE : TAB_INACTIVE}`}
            >
              Inscription
            </button>
          </div>

          <div className="space-y-6">
            {status.type !== "idle" && (
              <div className={MESSAGE}>
                {status.type === "error" ? (
                  <CircleAlert aria-hidden className="mt-1 h-4 w-4 shrink-0" />
                ) : (
                  <CircleCheck aria-hidden className="mt-1 h-4 w-4 shrink-0" />
                )}
                <span>{status.message}</span>
              </div>
            )}

            {mode === "login" ? (
              <form onSubmit={handleLoginSubmit} className="space-y-6">
                <div>
                  <Label htmlFor="loginEmail" className={LABEL}>
                    Email
                  </Label>
                  <Input
                    id="loginEmail"
                    type="email"
                    required
                    value={loginEmail}
                    onChange={(event) => setLoginEmail(event.target.value)}
                    className={INPUT}
                    placeholder="admin@exemple.com"
                    autoComplete="email"
                  />
                </div>

                <div>
                  <Label htmlFor="loginPassword" className={LABEL}>
                    Mot de passe
                  </Label>
                  <Input
                    id="loginPassword"
                    type="password"
                    required
                    value={loginPassword}
                    onChange={(event) => setLoginPassword(event.target.value)}
                    className={INPUT}
                    autoComplete="current-password"
                  />
                </div>

                <button type="submit" disabled={loading} className={`${PILL_PRIMARY} w-full`}>
                  {loading && <span aria-hidden className={SPINNER} />}
                  {loading ? "Connexion en cours..." : "Se connecter"}
                </button>
              </form>
            ) : (
              <form onSubmit={handleRegisterSubmit} className="space-y-6">
                <div>
                  <Label className={LABEL}>Type de compte</Label>
                  <Select
                    value={roleChoice}
                    onValueChange={(val: RoleChoice) => setRoleChoice(val)}
                  >
                    <SelectTrigger
                      className={`${FIELD} text-left focus:ring-0 focus:ring-offset-0 data-[placeholder]:text-zinc-900/40 [&>svg]:opacity-100`}
                    >
                      <SelectValue placeholder="Selectionne un type" />
                    </SelectTrigger>
                    <SelectContent
                      className={`${VITRINE_FONT_VARS} rounded-none border-zinc-900 bg-white text-zinc-900 shadow-none`}
                      style={GEIST}
                    >
                      <SelectItem value="candidate" className={SELECT_ITEM}>Candidat</SelectItem>
                      <SelectItem value="salarie" className={SELECT_ITEM}>Salarie</SelectItem>
                      <SelectItem value="rh" className={SELECT_ITEM}>RH</SelectItem>
                      <SelectItem value="professional" className={SELECT_ITEM}>Entreprise / Pro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="fullName" className={LABEL}>
                    Nom complet (optionnel)
                  </Label>
                  <Input
                    id="fullName"
                    type="text"
                    value={fullName}
                    onChange={(event) => setFullName(event.target.value)}
                    className={INPUT}
                    placeholder="Jean Dupont"
                    autoComplete="name"
                  />
                </div>

                {isPro && (
                  <div className="grid gap-6 sm:grid-cols-2">
                    <div>
                      <Label htmlFor="company" className={LABEL}>
                        Nom de l&apos;entreprise
                      </Label>
                      <Input
                        id="company"
                        type="text"
                        required={isPro}
                        value={company}
                        onChange={(event) => setCompany(event.target.value)}
                        className={INPUT}
                        placeholder="Ma societe"
                        autoComplete="organization"
                      />
                    </div>
                    <div>
                      <Label htmlFor="website" className={LABEL}>
                        Site web (optionnel)
                      </Label>
                      <Input
                        id="website"
                        type="url"
                        value={website}
                        onChange={(event) => setWebsite(event.target.value)}
                        className={INPUT}
                        placeholder="https://exemple.com"
                        autoComplete="url"
                      />
                    </div>
                  </div>
                )}

                <div>
                  <Label htmlFor="signupEmail" className={LABEL}>
                    Email
                  </Label>
                  <Input
                    id="signupEmail"
                    type="email"
                    required
                    value={signupEmail}
                    onChange={(event) => setSignupEmail(event.target.value)}
                    className={INPUT}
                    placeholder="utilisateur@exemple.com"
                    autoComplete="email"
                  />
                </div>

                <div>
                  <Label htmlFor="signupPassword" className={LABEL}>
                    Mot de passe
                  </Label>
                  <Input
                    id="signupPassword"
                    type="password"
                    required
                    value={signupPassword}
                    onChange={(event) => setSignupPassword(event.target.value)}
                    className={INPUT}
                    placeholder="Choisis un mot de passe"
                    autoComplete="new-password"
                    minLength={6}
                  />
                </div>

                <button type="submit" disabled={loading} className={`${PILL_PRIMARY} w-full`}>
                  {loading && <span aria-hidden className={SPINNER} />}
                  {loading
                    ? "Creation du compte..."
                    : isPro
                      ? "Creer le compte pro"
                      : "Creer le compte"}
                </button>
              </form>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
