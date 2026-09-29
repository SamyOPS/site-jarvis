"use client";

import { useEffect, useRef, useState } from "react";
import { Smile } from "lucide-react";

import { cn } from "@/lib/utils";

/*
  Selection courte et figee plutot qu'une bibliotheque : une messagerie professionnelle
  n'a besoin que de quelques dizaines d'emoji, et le clavier systeme (Win+. / Cmd+Ctrl+Espace)
  reste disponible pour le reste.
*/
const EMOJI_GROUPS: { label: string; emojis: string[] }[] = [
  {
    label: "Visages",
    emojis: ["😀", "😃", "😄", "😁", "😅", "😂", "🙂", "😉", "😊", "😍", "🤩", "😎", "🤔", "😐", "😬", "🙄", "😴", "😢", "😭", "😮", "😱", "😡", "🥳", "🤗"],
  },
  {
    label: "Gestes",
    emojis: ["👍", "👎", "👌", "✌️", "🤞", "👏", "🙌", "🙏", "💪", "👋", "🤝", "✋", "👉", "👀"],
  },
  {
    label: "Symboles",
    emojis: ["❤️", "🔥", "✨", "🎉", "✅", "❌", "⚠️", "❓", "💡", "⭐", "💯", "🚀", "📌", "📎", "📅", "⏰", "☕", "🍀"],
  },
];

type EmojiPickerProps = {
  onSelect: (emoji: string) => void;
  disabled?: boolean;
};

/** Bouton d'emoji et son panneau, ouvert au-dessus de la zone de saisie. */
export function EmojiPicker({ onSelect, disabled = false }: EmojiPickerProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    // Clic hors du panneau ou Echap : on ferme, comme n'importe quel menu.
    const handlePointer = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const handleKey = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", handlePointer);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("pointerdown", handlePointer);
      document.removeEventListener("keydown", handleKey);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        disabled={disabled}
        aria-label="Insérer un emoji"
        aria-expanded={open}
        aria-haspopup="dialog"
        className={cn(
          "flex h-9 w-9 items-center justify-center rounded-app-control text-app-text-muted transition-colors hover:bg-app-surface-hover hover:text-app-text focus-visible:outline-app disabled:pointer-events-none disabled:opacity-60",
          open && "bg-app-surface-hover text-app-text",
        )}
      >
        <Smile className="h-4 w-4" />
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Emoji"
          className="absolute bottom-full left-0 z-20 mb-2 w-72 max-w-[calc(100vw-2rem)] rounded-app-card border border-app-line bg-app-raised p-2 shadow-app-raised"
        >
          <div className="max-h-64 space-y-2 overflow-y-auto">
            {EMOJI_GROUPS.map((group) => (
              <div key={group.label}>
                <p className="px-1 pb-1 text-app-2xs uppercase tracking-wider text-app-text-muted">
                  {group.label}
                </p>
                <div className="grid grid-cols-8 gap-0.5">
                  {group.emojis.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      // Le panneau reste ouvert : on enchaine souvent plusieurs emoji.
                      onClick={() => onSelect(emoji)}
                      aria-label={emoji}
                      className="flex h-8 w-8 items-center justify-center rounded-app-control text-lg leading-none hover:bg-app-surface-hover focus-visible:outline-app"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
