"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
} from "react";
import { SendHorizonal } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { MESSAGE_MAX_LENGTH, type MessageItem } from "@/domain/messaging";
import { dayKey, formatDaySeparator, formatMessageTime } from "@/features/messaging/format";

type MessageThreadProps = {
  messages: MessageItem[];
  currentUserId: string;
  loading: boolean;
  sending: boolean;
  onSend: (body: string) => void | Promise<unknown>;
  /** Desactive la saisie : aucune conversation ouverte. */
  disabled?: boolean;
  className?: string;
};

/**
 * Fil d'une conversation et sa zone de saisie.
 *
 * Le defilement est ramene en bas a chaque nouveau message : un fil qui reste en haut
 * apres l'arrivee d'une reponse donne l'impression que rien ne s'est passe.
 */
export function MessageThread({
  messages,
  currentUserId,
  loading,
  sending,
  onSend,
  disabled = false,
  className,
}: MessageThreadProps) {
  const [draft, setDraft] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [messages]);

  const submit = async (event?: FormEvent) => {
    event?.preventDefault();
    const text = draft.trim();
    if (!text || sending || disabled) return;
    // Le champ se vide TOUT DE SUITE : attendre la reponse du serveur laisse le temps de
    // renvoyer deux fois le meme message avec la touche Entree.
    setDraft("");
    const ok = await onSend(text);
    // L'envoi a echoue : on rend sa saisie a l'utilisateur plutot que de la perdre.
    if (ok === false) setDraft(text);
  };

  /*
    Separateurs de journee calcules AVANT le rendu, et non au fil de la boucle : muter une
    variable pendant le rendu rend le resultat dependant de l'ordre d'evaluation, ce que
    React ne garantit pas.
  */
  const rows = useMemo(
    () =>
      messages.map((message, index) => ({
        message,
        // Comparaison avec le message precedent, sans accumulateur : le premier message
        // porte toujours son separateur, les suivants seulement au changement de jour.
        showDay:
          index === 0 ||
          dayKey(message.createdAt) !== dayKey(messages[index - 1].createdAt),
      })),
    [messages],
  );

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    // Entree envoie, Maj+Entree passe a la ligne. Convention des messageries.
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void submit();
    }
  };

  return (
    <div className={cn("flex min-h-0 flex-1 flex-col", className)}>
      <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
        {loading && messages.length === 0 ? (
          <p className="py-8 text-center text-app-sm text-app-text-muted">
            Chargement du fil...
          </p>
        ) : messages.length === 0 ? (
          <p className="py-8 text-center text-app-sm text-app-text-muted">
            Aucun message. Écrivez le premier.
          </p>
        ) : (
          <ul className="space-y-2">
            {rows.map(({ message, showDay }) => {
              const mine = message.senderId === currentUserId;

              return (
                <li key={message.id}>
                  {showDay && (
                    <p className="my-3 text-center text-app-2xs uppercase tracking-wider text-app-text-muted">
                      {formatDaySeparator(message.createdAt)}
                    </p>
                  )}
                  <div className={cn("flex", mine ? "justify-end" : "justify-start")}>
                    <div
                      className={cn(
                        "max-w-[78%] rounded-app-card px-3 py-2",
                        mine
                          ? "bg-app-accent text-white"
                          : "border border-app-line bg-app-surface text-app-text",
                      )}
                    >
                      <p className="whitespace-pre-wrap break-words text-app-sm">
                        {message.body}
                      </p>
                      <p
                        className={cn(
                          "mt-1 text-app-2xs",
                          mine ? "text-white/70" : "text-app-text-muted",
                        )}
                      >
                        {formatMessageTime(message.createdAt)}
                      </p>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
        <div ref={endRef} />
      </div>

      <form
        onSubmit={submit}
        className="shrink-0 border-t border-app-line bg-app-surface p-3"
      >
        <div className="flex items-end gap-2">
          <textarea
            value={draft}
            onChange={(event) => setDraft(event.target.value.slice(0, MESSAGE_MAX_LENGTH))}
            onKeyDown={handleKeyDown}
            disabled={disabled}
            rows={1}
            aria-label="Votre message"
            placeholder={disabled ? "Choisissez une conversation" : "Écrivez votre message..."}
            className="max-h-32 min-h-9 flex-1 resize-y rounded-app-control border border-app-line bg-app-field px-3 py-2 text-app-sm text-app-text placeholder:text-app-text-muted focus-visible:outline-app disabled:opacity-60"
          />
          <Button
            type="submit"
            size="sm"
            disabled={disabled || sending || !draft.trim()}
            aria-label="Envoyer le message"
          >
            <SendHorizonal className="h-4 w-4" />
          </Button>
        </div>
        {!disabled && (
          <p className="mt-1.5 px-1 text-app-2xs text-app-text-muted">
            Entrée pour envoyer, Maj+Entrée pour aller à la ligne.
          </p>
        )}
      </form>
    </div>
  );
}
