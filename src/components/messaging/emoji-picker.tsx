"use client";

import { Smile } from "lucide-react";

import { ComposerPopover } from "@/components/messaging/composer-popover";

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
  return (
    <ComposerPopover
      icon={<Smile className="h-4 w-4" />}
      label="Insérer un emoji"
      disabled={disabled}
      className="w-72"
    >
      {() => (
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
      )}
    </ComposerPopover>
  );
}
