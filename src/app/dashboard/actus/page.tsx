"use client";

import { useEffect, useMemo, useState, type FormEvent, type ChangeEvent } from "react";
import { ArrowLeft, CheckCircle2 } from "lucide-react";

import { NewsEditorForm } from "@/components/dashboard/actus/news-editor-form";
import { NewsList } from "@/components/dashboard/actus/news-list";
import { safeGetClientSession } from "@/lib/client-auth";
import { browserSupabase } from "@/lib/supabase-browser";

const supabase = browserSupabase;
import { slugifyArticle } from "@/domain/slug";
import type {
  ActusProfileRow as ProfileRow,
  NewsContentMode,
  NewsFormState,
  NewsRow,
  NewsStatus as Status,
} from "@/features/dashboard/actus/types";

export default function DashboardActusPage() {
  const [adminProfile, setAdminProfile] = useState<ProfileRow | null>(null);
  const [newsItems, setNewsItems] = useState<NewsRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<Status>({ type: "idle" });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState<string | null>(null);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [uploadVideoMessage, setUploadVideoMessage] = useState<string | null>(null);
  const [uploadingPdf, setUploadingPdf] = useState(false);
  const [uploadPdfMessage, setUploadPdfMessage] = useState<string | null>(null);
  const [contentMode, setContentMode] = useState<NewsContentMode>("article");
  const [form, setForm] = useState<NewsFormState>({
    title: "",
    slug: "",
    excerpt: "",
    content: "",
    cover_image: "",
    video_url: "",
    pdf_url: "",
    status: "draft",
  });

  const isConfigured = useMemo(() => Boolean(supabase), []);

  useEffect(() => {
    const init = async () => {
      if (!supabase) {
        setError("Configuration Supabase manquante.");
        return;
      }
      const { session: currentSession } = await safeGetClientSession(supabase);

      if (!currentSession?.user) {
        setError("Connecte-toi pour accéder au dashboard.");
        return;
      }

      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("id,email,role")
        .eq("id", currentSession.user.id)
        .maybeSingle();

      if (profileError || !profileData) {
        setError(profileError?.message ?? "Profil admin introuvable.");
        return;
      }

      if (profileData.role !== "admin") {
        setError("Accès réservé aux administrateurs.");
        return;
      }

      setAdminProfile(profileData);
    };

    init();
  }, []);

  useEffect(() => {
    const fetchNews = async () => {
      if (!supabase || !adminProfile) return;
      setLoading(true);
      const { data, error: fetchError } = await supabase
        .from("news")
        .select("id,title,slug,excerpt,content,cover_image,video_url,pdf_url,status,published_at,created_at")
        .order("created_at", { ascending: false });
      if (fetchError) {
        setError(fetchError.message);
      } else {
        setNewsItems(data ?? []);
      }
      setLoading(false);
    };

    fetchNews();
  }, [adminProfile]);

  const resetForm = () => {
    setForm({
      title: "",
      slug: "",
      excerpt: "",
      content: "",
      cover_image: "",
      video_url: "",
      pdf_url: "",
      status: "draft",
    });
    setContentMode("article");
    setEditingId(null);
  };

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !supabase || !adminProfile) return;

    setUploadMessage(null);
    setUploading(true);
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
    const safeName = file.name.replace(/\.[^/.]+$/, "");
    const baseName = slugifyArticle(safeName) || "image";
    const filePath = `${adminProfile.id}/${Date.now()}-${baseName}.${ext}`;

    const { error: uploadError } = await supabase
      .storage
      .from("news-images")
      .upload(filePath, file, { upsert: true });

    if (uploadError) {
      setUploadMessage(uploadError.message);
      setUploading(false);
      return;
    }

    const { data } = supabase.storage.from("news-images").getPublicUrl(filePath);
    if (data?.publicUrl) {
      setForm((prev) => ({ ...prev, cover_image: data.publicUrl }));
    }
    setUploading(false);
  };

  const handleVideoChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !supabase || !adminProfile) return;

    setUploadVideoMessage(null);
    setUploadingVideo(true);
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "mp4";
    const safeName = file.name.replace(/\.[^/.]+$/, "");
    const baseName = slugifyArticle(safeName) || "video";
    const filePath = `${adminProfile.id}/${Date.now()}-${baseName}.${ext}`;

    const { error: uploadError } = await supabase
      .storage
      .from("news-videos")
      .upload(filePath, file, { upsert: true });

    if (uploadError) {
      setUploadVideoMessage(uploadError.message);
      setUploadingVideo(false);
      return;
    }

    const { data } = supabase.storage.from("news-videos").getPublicUrl(filePath);
    if (data?.publicUrl) {
      setForm((prev) => ({ ...prev, video_url: data.publicUrl }));
    }
    setUploadingVideo(false);
  };

  const handlePdfChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !supabase || !adminProfile) return;

    setUploadPdfMessage(null);
    setUploadingPdf(true);
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "pdf";
    const safeName = file.name.replace(/\.[^/.]+$/, "");
    const baseName = slugifyArticle(safeName) || "document";
    const filePath = `${adminProfile.id}/${Date.now()}-${baseName}.${ext}`;

    const { error: uploadError } = await supabase
      .storage
      .from("news-pdfs")
      .upload(filePath, file, { upsert: true });

    if (uploadError) {
      setUploadPdfMessage(uploadError.message);
      setUploadingPdf(false);
      return;
    }

    const { data } = supabase.storage.from("news-pdfs").getPublicUrl(filePath);
    if (data?.publicUrl) {
      setForm((prev) => ({ ...prev, pdf_url: data.publicUrl }));
    }
    setUploadingPdf(false);
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!supabase || !adminProfile) return;

    const slug = form.slug ? slugifyArticle(form.slug) : slugifyArticle(form.title);
    if (!slug) {
      setStatus({ type: "error", message: "Le slug est obligatoire." });
      return;
    }

    setStatus({ type: "idle" });
    setLoading(true);

    const payload = {
      title: form.title,
      slug,
      excerpt: form.excerpt || null,
      content: contentMode === "pdf" ? null : form.content || null,
      cover_image: form.cover_image || null,
      video_url: form.video_url || null,
      pdf_url: contentMode === "pdf" ? form.pdf_url || null : form.pdf_url || null,
      status: form.status,
      published_at:
        form.status === "published" ? new Date().toISOString() : null,
      author_id: adminProfile.id,
    };

    const query = editingId
      ? supabase.from("news").update(payload).eq("id", editingId)
      : supabase.from("news").insert(payload);

    const { error: saveError } = await query;

    if (saveError) {
      setStatus({ type: "error", message: saveError.message });
      setLoading(false);
      return;
    }

    setStatus({ type: "success", message: "Article enregistré." });
    resetForm();

    const { data } = await supabase
      .from("news")
      .select("id,title,slug,excerpt,content,cover_image,video_url,pdf_url,status,published_at,created_at")
      .order("created_at", { ascending: false });

    setNewsItems(data ?? []);
    setLoading(false);
  };

  const handleEdit = (item: NewsRow) => {
    setEditingId(item.id);
    setForm({
      title: item.title,
      slug: item.slug,
      excerpt: item.excerpt ?? "",
      content: item.content ?? "",
      cover_image: item.cover_image ?? "",
      video_url: item.video_url ?? "",
      pdf_url: item.pdf_url ?? "",
      status: item.status ?? "draft",
    });
    setContentMode(item.pdf_url ? "pdf" : "article");
  };

  const handleDelete = async (id: string) => {
    if (!supabase) return;
    setLoading(true);
    const { error: deleteError } = await supabase.from("news").delete().eq("id", id);
    if (deleteError) {
      setStatus({ type: "error", message: deleteError.message });
      setLoading(false);
      return;
    }
    setNewsItems((prev) => prev.filter((item) => item.id !== id));
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-white text-[#0A1A2F]">
      <main className="mx-auto max-w-6xl px-6 py-12 lg:px-8">
        <div className="mb-8 flex flex-col gap-3">
          <a href="/dashboard" className="inline-flex items-center text-sm text-[#000080]">
            <ArrowLeft className="mr-2 size-4" />
            Retour dashboard
          </a>
          <h1 className="text-3xl font-semibold">Actus (admin)</h1>
          <p className="text-sm text-slate-600">
            Crée, édite et publie les actualités visibles sur le site.
          </p>
        </div>

        {!isConfigured && (
          <div className="rounded-none border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            Configuration Supabase manquante (URL ou clé publique).
          </div>
        )}

        {error && (
          <div className="rounded-none border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {status.type === "success" && (
          <div className="mt-4 flex items-center gap-2 rounded-none border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            <CheckCircle2 className="size-4" />
            {status.message}
          </div>
        )}

        {status.type === "error" && (
          <div className="mt-4 rounded-none border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {status.message}
          </div>
        )}

        <NewsEditorForm
          form={form}
          setForm={setForm}
          contentMode={contentMode}
          setContentMode={setContentMode}
          editingId={editingId}
          loading={loading}
          uploading={uploading}
          uploadMessage={uploadMessage}
          uploadingVideo={uploadingVideo}
          uploadVideoMessage={uploadVideoMessage}
          uploadingPdf={uploadingPdf}
          uploadPdfMessage={uploadPdfMessage}
          onSubmit={handleSubmit}
          onFileChange={handleFileChange}
          onVideoChange={handleVideoChange}
          onPdfChange={handlePdfChange}
          onResetForm={resetForm}
        />
        <NewsList
          newsItems={newsItems}
          loading={loading}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      </main>
    </div>
  );
}
