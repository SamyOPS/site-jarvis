import { Pencil, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { NewsRow } from "@/features/dashboard/actus/types";

type NewsListProps = {
  newsItems: NewsRow[];
  loading: boolean;
  onEdit: (item: NewsRow) => void;
  onDelete: (id: string) => void | Promise<void>;
};

export function NewsList({ newsItems, loading, onEdit, onDelete }: NewsListProps) {
  return (
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
                  onClick={() => onEdit(item)}
                >
                  <Pencil className="mr-2 size-4" />
                  Modifier
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  className="rounded-none"
                  onClick={() => onDelete(item.id)}
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
  );
}
