"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { createClient, type User } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase =
  supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey)
    : null;

type ProfileRow = {
  id: string;
  email: string;
  full_name: string | null;
  role: string | null;
};

export default function SalarieWorkspace() {
  const router = useRouter();
  const pathname = usePathname();

  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [loading, setLoading] = useState(false);
  const [documentsCount, setDocumentsCount] = useState(0);
  const [applicationsCount, setApplicationsCount] = useState(0);
  const [offersCount, setOffersCount] = useState(0);
  const [hasCv, setHasCv] = useState(false);

  useEffect(() => {
    if (!supabase) return;

    const load = async () => {
      setLoading(true);

      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        setLoading(false);
        router.push("/auth");
        return;
      }

      const currentUser = sessionData.session.user;
      setUser(currentUser);

      const { data: profileData } = await supabase
        .from("profiles")
        .select("id,email,full_name,role")
        .eq("id", currentUser.id)
        .single();

      if (!profileData || profileData.role !== "salarie") {
        setLoading(false);
        router.push("/dashboard");
        return;
      }

      setProfile(profileData);
      const [docsRes, appsRes, offersRes, cvRes] = await Promise.all([
        supabase.from("employee_documents").select("id", { count: "exact", head: true }).eq("employee_id", profileData.id),
        supabase.from("applications").select("id", { count: "exact", head: true }).eq("candidate_id", profileData.id),
        supabase.from("job_offers").select("id", { count: "exact", head: true }).eq("status", "published"),
        supabase.from("profile_cvs").select("user_id").eq("user_id", profileData.id).maybeSingle(),
      ]);
      setDocumentsCount(docsRes.count ?? 0);
      setApplicationsCount(appsRes.count ?? 0);
      setOffersCount(offersRes.count ?? 0);
      setHasCv(Boolean(cvRes.data?.user_id));
      setLoading(false);
    };

    void load();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      void load();
    });

    return () => subscription.unsubscribe();
  }, [router]);

  const handleSignOut = async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
    router.push("/auth");
  };

  const displayName = useMemo(() => {
    const meta = (user?.user_metadata ?? {}) as {
      full_name?: string;
      name?: string;
      display_name?: string;
    };
    return meta.full_name ?? meta.name ?? meta.display_name ?? profile?.full_name ?? profile?.email ?? "utilisateur";
  }, [profile?.email, profile?.full_name, user?.user_metadata]);

  const currentSection = useMemo(() => {
    if (pathname.startsWith("/dashboard/salarie/documents")) return "documents";
    if (pathname.startsWith("/dashboard/salarie/parametres")) return "parametres";
    if (
      pathname.startsWith("/dashboard/salarie/offres") ||
      pathname.startsWith("/dashboard/salarie/candidatures") ||
      pathname.startsWith("/dashboard/salarie/cv")
    ) {
      return "offres";
    }
    return "overview";
  }, [pathname]);
  const currentSubSection = useMemo(() => {
    if (pathname.startsWith("/dashboard/salarie/documents/a-deposer")) return "docs_a_deposer";
    if (pathname.startsWith("/dashboard/salarie/documents")) return "docs_tous";
    if (pathname.startsWith("/dashboard/salarie/candidatures")) return "candidatures";
    if (pathname.startsWith("/dashboard/salarie/cv")) return "cvs";
    return "offres_toutes";
  }, [pathname]);

  return (
    <div className="min-h-screen bg-white text-[#0A1A2F]">
      <div className="relative">
        <aside className="hidden border-r border-slate-200 bg-slate-50 lg:fixed lg:inset-y-0 lg:left-0 lg:block lg:w-[300px]">
          <div className="flex h-full flex-col gap-4 p-4">
            <div>
              <p className="text-sm font-medium text-[#0A1A2F]">Bonjour, {displayName}</p>
            </div>

            <nav className="text-sm">
              <p className="mb-2 text-xs uppercase tracking-wide text-[#0A1A2F]/60">Navigation</p>
              <div className="space-y-1">
                <Link
                  href="/dashboard/salarie"
                  className={`block px-1 py-2 text-[#0A1A2F] hover:underline ${
                    currentSection === "overview" ? "font-semibold" : ""
                  }`}
                >
                  Vue d&apos;ensemble
                </Link>
                <Link
                  href="/dashboard/salarie/documents"
                  className={`block px-1 py-2 text-[#0A1A2F] hover:underline ${
                    currentSection === "documents" ? "font-semibold" : ""
                  }`}
                >
                  Mes documents
                </Link>
                {currentSection === "documents" && (
                  <div className="ml-3 space-y-1 border-l border-slate-200 pl-3 text-xs">
                    <Link href="/dashboard/salarie/documents/a-deposer" className={`block py-1 ${currentSubSection === "docs_a_deposer" ? "font-semibold" : ""}`}>
                      A deposer
                    </Link>
                    <Link href="/dashboard/salarie/documents" className={`block py-1 ${currentSubSection === "docs_tous" ? "font-semibold" : ""}`}>
                      Tous mes documents
                    </Link>
                  </div>
                )}
                <Link
                  href="/dashboard/salarie/offres"
                  className={`block px-1 py-2 text-[#0A1A2F] hover:underline ${
                    currentSection === "offres" ? "font-semibold" : ""
                  }`}
                >
                  Offres d&apos;emploi
                </Link>
                {currentSection === "offres" && (
                  <div className="ml-3 space-y-1 border-l border-slate-200 pl-3 text-xs">
                    <Link href="/dashboard/salarie/offres" className={`block py-1 ${currentSubSection === "offres_toutes" ? "font-semibold" : ""}`}>
                      Toutes les offres
                    </Link>
                    <Link href="/dashboard/salarie/candidatures" className={`block py-1 ${currentSubSection === "candidatures" ? "font-semibold" : ""}`}>
                      Mes candidatures
                    </Link>
                    <Link href="/dashboard/salarie/cv" className={`block py-1 ${currentSubSection === "cvs" ? "font-semibold" : ""}`}>
                      Mes CVs
                    </Link>
                  </div>
                )}
              </div>
            </nav>

            <div className="mt-auto border-t border-slate-200 pt-3 text-sm">
              <div className="space-y-1">
                <Link
                  href="/dashboard/salarie/parametres"
                  className={`block px-1 py-2 text-[#0A1A2F] hover:underline ${
                    currentSection === "parametres" ? "font-semibold" : ""
                  }`}
                >
                  Parametres
                </Link>
                <button
                  type="button"
                  onClick={() => void handleSignOut()}
                  className="block px-1 py-2 text-left text-[#0A1A2F] hover:underline"
                >
                  Deconnexion
                </button>
              </div>
            </div>
          </div>
        </aside>

        <main
          className="px-4 py-6 lg:ml-[300px] lg:px-8 lg:py-8"
          data-documents-count={documentsCount}
          data-applications-count={applicationsCount}
          data-offers-count={offersCount}
          data-has-cv={hasCv ? "1" : "0"}
        />
      </div>

      {loading && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/20 backdrop-blur-sm">
          <div className="rounded-lg bg-white px-4 py-3 text-sm text-[#0A1A2F] shadow">Chargement...</div>
        </div>
      )}
    </div>
  );
}
