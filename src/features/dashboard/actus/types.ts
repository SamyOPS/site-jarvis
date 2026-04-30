export type ActusProfileRow = {
  id: string;
  email: string;
  role: string | null;
};

export type NewsRow = {
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

export type NewsStatus =
  | { type: "idle" }
  | { type: "error"; message: string }
  | { type: "success"; message: string };

export type NewsFormState = {
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  cover_image: string;
  video_url: string;
  pdf_url: string;
  status: string;
};

export type NewsContentMode = "article" | "pdf";
