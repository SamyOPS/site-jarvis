import type { ChangeEvent, Dispatch, FormEvent, RefObject, SetStateAction } from "react";
import Image from "next/image";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type {
  NewsContentMode,
  NewsFormState,
} from "@/features/dashboard/actus/types";

const slugify = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");

type NewsEditorFormProps = {
  form: NewsFormState;
  setForm: Dispatch<SetStateAction<NewsFormState>>;
  contentMode: NewsContentMode;
  setContentMode: Dispatch<SetStateAction<NewsContentMode>>;
  contentRef: RefObject<HTMLTextAreaElement | null>;
  editingId: string | null;
  loading: boolean;
  uploading: boolean;
  uploadMessage: string | null;
  uploadingVideo: boolean;
  uploadVideoMessage: string | null;
  uploadingPdf: boolean;
  uploadPdfMessage: string | null;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void | Promise<void>;
  onFileChange: (event: ChangeEvent<HTMLInputElement>) => void | Promise<void>;
  onVideoChange: (event: ChangeEvent<HTMLInputElement>) => void | Promise<void>;
  onPdfChange: (event: ChangeEvent<HTMLInputElement>) => void | Promise<void>;
  onResetForm: () => void;
};

export function NewsEditorForm({
  form,
  setForm,
  contentMode,
  setContentMode,
  editingId,
  loading,
  uploading,
  uploadMessage,
  uploadingVideo,
  uploadVideoMessage,
  uploadingPdf,
  uploadPdfMessage,
  onSubmit,
  onFileChange,
  onVideoChange,
  onPdfChange,
  onResetForm,
}: NewsEditorFormProps) {
  return (
    <Card className="mt-8 rounded-none border border-slate-200">
      <CardHeader>
        <CardTitle>{editingId ? "Modifier un article" : "Nouvel article"}</CardTitle>
      </CardHeader>
      <CardContent>
        <form className="grid gap-4" onSubmit={onSubmit}>
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
              onChange={onFileChange}
              className="h-10 border border-slate-200 px-3 text-sm"
            />
            {uploading && <p className="text-xs text-slate-500">Upload en cours...</p>}
            {uploadMessage && <p className="text-xs text-red-600">{uploadMessage}</p>}
            {form.cover_image && (
              <div className="relative mt-2 h-24 w-full max-w-sm border border-slate-200 rounded-lg overflow-hidden">
                <Image
                  src={form.cover_image}
                  alt="Aperçu"
                  fill
                  sizes="(max-width: 640px) 100vw, 384px"
                  className="object-cover"
                />
              </div>
            )}
          </div>
          {contentMode === "article" && (
            <div className="grid gap-2">
              <Label htmlFor="video_upload">Vidéo (MP4)</Label>
              <input
                id="video_upload"
                type="file"
                accept="video/mp4"
                onChange={onVideoChange}
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
                onChange={onPdfChange}
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
                onClick={onResetForm}
              >
                Annuler
              </Button>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
