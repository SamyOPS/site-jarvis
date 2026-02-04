"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent, type ChangeEvent } from "react";
import { createClient, type Session, type User } from "@supabase/supabase-js";
import { ArrowLeft, CheckCircle2, Loader2, Pencil, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase =
  supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey)
    : null;

type ProfileRow = {
  id: string;
  email: string;
  role: string | null;
};

type NewsRow = {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  content: string | null;
  cover_image: string | null;
  video_url: string | null;
  pdf_url: string | null;
  status: "draft" | "published" | string;
  published_at: string | null;
  created_at: string;
};

type Status =
  | { type: "idle" }
  | { type: "error"; message: string }
  | { type: "success"; message: string };

const slugify = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");

export default function DashboardActusPage() {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
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
  const [inlineUploading, setInlineUploading] = useState(false);
  const [inlineUploadMessage, setInlineUploadMessage] = useState<string | null>(null);
  const contentRef = useRef<HTMLTextAreaElement | null>(null);
  const [contentMode, setContentMode] = useState<"article" | "pdf">("article");
  const [form, setForm] = useState({
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
      const { data: sessionData } = await supabase.auth.getSession();
      const currentSession = sessionData?.session ?? null;
      setSession(currentSession);
      setUser(currentSession?.user ?? null);

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
    const baseName = slugify(safeName) || "image";
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
    const baseName = slugify(safeName) || "video";
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
    const baseName = slugify(safeName) || "document";
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

  const insertContentAtCursor = (snippet: string) => {
    const textarea = contentRef.current;
    if (!textarea) {
      setForm((prev) => ({ ...prev, content: prev.content + snippet }));
      return;
    }

    const start = textarea.selectionStart ?? textarea.value.length;
    const end = textarea.selectionEnd ?? textarea.value.length;
    const nextValue =
      textarea.value.slice(0, start) + snippet + textarea.value.slice(end);

    setForm((prev) => ({ ...prev, content: nextValue }));

    requestAnimationFrame(() => {
      textarea.focus();
      const cursor = start + snippet.length;
      textarea.setSelectionRange(cursor, cursor);
    });
  };

  const handleInlineImageUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !supabase || !adminProfile) return;

    setInlineUploadMessage(null);
    setInlineUploading(true);

    const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
    const safeName = file.name.replace(/\.[^/.]+$/, "");
    const baseName = slugify(safeName) || "image";
    const filePath = `${adminProfile.id}/${Date.now()}-${baseName}.${ext}`;

    const { error: uploadError } = await supabase
      .storage
      .from("news-images")
      .upload(filePath, file, { upsert: true });

    if (uploadError) {
      setInlineUploadMessage(uploadError.message);
      setInlineUploading(false);
      return;
    }

    const { data } = supabase.storage.from("news-images").getPublicUrl(filePath);
    if (data?.publicUrl) {
      const snippet = `
![image](${data.publicUrl})
`;
      insertContentAtCursor(snippet);
    }

    setInlineUploading(false);
    event.currentTarget.value = "";
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!supabase || !adminProfile) return;

    const slug = form.slug ? slugify(form.slug) : slugify(form.title);
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

        <Card className="mt-8 rounded-none border border-slate-200">
          <CardHeader>
            <CardTitle>{editingId ? "Modifier un article" : "Nouvel article"}</CardTitle>
          </CardHeader>
          <CardContent>
            <form className="grid gap-4" onSubmit={handleSubmit}>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setContentMode("article")}
                  className={`rounded-none border px-3 py-1.5 text-xs font-medium ${
                    contentMode === "article"
                      ? "border-[#000080] bg-[#000080] text-white"
                      : "border-slate-200 text-slate-600"
                  }`}
                >
                  Article
                </button>
                <button
                  type="button"
                  onClick={() => setContentMode("pdf")}
                  className={`rounded-none border px-3 py-1.5 text-xs font-medium ${
                    contentMode === "pdf"
                      ? "border-[#000080] bg-[#000080] text-white"
                      : "border-slate-200 text-slate-600"
                  }`}
                >
                  PDF
                </button>
                <span className="text-xs text-slate-500">
                  {contentMode === "article"
                    ? "Redigez l'article directement."
                    : "Joignez un PDF comme contenu principal."}
                </span>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="title">Titre</Label>
                <Input
                  id="title"
                  value={form.title}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      title: event.target.value,
                      slug: prev.slug || slugify(event.target.value),
                    }))
                  }
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="slug">Slug</Label>
                <Input
                  id="slug"
                  value={form.slug}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, slug: event.target.value }))
                  }
                  placeholder="ex: nouvelle-offre-2026"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="excerpt">Résumé</Label>
                <Textarea
                  id="excerpt"
                  value={form.excerpt}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, excerpt: event.target.value }))
                  }
                  rows={3}
                />
              </div>
              {contentMode === "article" && (
                <div className="grid gap-2">
                  <Label htmlFor="content">Contenu (Markdown)</Label>
                  <Textarea
                    id="content"
                    value={form.content}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, content: event.target.value }))
                    }
                    rows={10}
                  />
                </div>
              )}
              <div className="grid gap-2">
                <Label htmlFor="cover_image_upload">Image de couverture (upload)</Label>
                <input
                  id="cover_image_upload"
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="h-10 border border-slate-200 px-3 text-sm"
                />
                {uploading && (
                  <p className="text-xs text-slate-500">Upload en cours...</p>
                )}
                {uploadMessage && (
                  <p className="text-xs text-red-600">{uploadMessage}</p>
                )}
                {form.cover_image && (
                  <img
                    src={form.cover_image}
                    alt="Aperçu"
                    className="mt-2 h-24 w-full max-w-sm border border-slate-200 object-cover"
                  />
                )}
              </div>
              {contentMode === "article" && (
                <div className="grid gap-2">
                <Label htmlFor="video_upload">Vidéo (MP4)</Label>
                <input
                  id="video_upload"
                  type="file"
                  accept="video/mp4"
                  onChange={handleVideoChange}
                  className="h-10 border border-slate-200 px-3 text-sm"
                />
                {uploadingVideo && (
                  <p className="text-xs text-slate-500">Upload vidéo en cours...</p>
                )}
                {uploadVideoMessage && (
                  <p className="text-xs text-red-600">{uploadVideoMessage}</p>
                )}
                {form.video_url && (
                  <video
                    src={form.video_url}
                    controls
                    className="mt-2 h-32 w-full max-w-sm border border-slate-200 object-cover"
                  />
                )}
              </div>
              )}
              {contentMode === "pdf" && (
                <div className="grid gap-2">
                  <Label htmlFor="pdf_upload">PDF (upload)</Label>
                  <input
                    id="pdf_upload"
                    type="file"
                    accept="application/pdf"
                    onChange={handlePdfChange}
                    className="h-10 border border-slate-200 px-3 text-sm"
                  />
                  {uploadingPdf && (
                    <p className="text-xs text-slate-500">Upload PDF en cours...</p>
                  )}
                  {uploadPdfMessage && (
                    <p className="text-xs text-red-600">{uploadPdfMessage}</p>
                  )}
                  {form.pdf_url && (
                    <a
                      href={form.pdf_url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs text-[#000080] underline"
                    >
                      Voir le PDF upload?
                    </a>
                  )}
                </div>
              )}
              <div className="grid gap-2">
                <Label htmlFor="cover_image">URL image de couverture</Label>
                <Input
                  id="cover_image"
                  value={form.cover_image}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, cover_image: event.target.value }))
                  }
                  placeholder="URL auto-remplie après upload"
                />
              </div>
              {contentMode === "article" && (
                <div className="grid gap-2">
                <Label htmlFor="video_url">URL vidéo (MP4)</Label>
                <Input
                  id="video_url"
                  value={form.video_url}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, video_url: event.target.value }))
                  }
                  placeholder="URL auto-remplie après upload"
                />
              </div>
              )}
              {contentMode === "pdf" && (
                <div className="grid gap-2">
                <Label htmlFor="pdf_url">URL PDF</Label>
                <Input
                  id="pdf_url"
                  value={form.pdf_url}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, pdf_url: event.target.value }))
                  }
                  placeholder="URL auto-remplie apr?s upload"
                />
              </div>
              )}
              <div className="grid gap-2">
                <Label htmlFor="status">Statut</Label>
                <select
                  id="status"
                  value={form.status}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, status: event.target.value }))
                  }
                  className="h-10 border border-slate-200 px-3 text-sm"
                >
                  <option value="draft">Brouillon</option>
                  <option value="published">Publié</option>
                </select>
              </div>
              <div className="flex flex-wrap gap-3">
                <Button type="submit" disabled={loading} className="rounded-none">
                  {loading ? (
                    <span className="inline-flex items-center gap-2">
                      <Loader2 className="size-4 animate-spin" />
                      Enregistrement...
                    </span>
                  ) : editingId ? (
                    "Mettre à jour"
                  ) : (
                    "Publier"
                  )}
                </Button>
                {editingId && (
                  <Button
                    type="button"
                    variant="outline"
                    className="rounded-none"
                    onClick={resetForm}
                  >
                    Annuler
                  </Button>
                )}
              </div>
            </form>
          </CardContent>
        </Card>

        <div className="mt-10 grid gap-4">
          {loading && !newsItems.length && (
            <div className="text-sm text-slate-500">Chargement...</div>
          )}
          {newsItems.map((item) => (
            <Card key={item.id} className="rounded-none border border-slate-200">
              <CardContent className="flex flex-col gap-3 py-4">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
                      {item.status === "published" ? "Publié" : "Brouillon"}
                    </p>
                    <p className="text-lg font-semibold text-[#0A1A2F]">{item.title}</p>
                    <p className="text-xs text-slate-500">/{item.slug}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      className="rounded-none"
                      onClick={() => handleEdit(item)}
                    >
                      <Pencil className="mr-2 size-4" />
                      Modifier
                    </Button>
                    <Button
                      type="button"
                      variant="destructive"
                      className="rounded-none"
                      onClick={() => handleDelete(item.id)}
                    >
                      <Trash2 className="mr-2 size-4" />
                      Supprimer
                    </Button>
                  </div>
                </div>
                {item.excerpt && (
                  <p className="text-sm text-slate-600 line-clamp-2">{item.excerpt}</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </main>
    </div>
  );
}
