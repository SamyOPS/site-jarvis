"use client";

import { Users } from "lucide-react";

import { AvatarBubble } from "@/components/console/avatar-bubble";
import { useIsOnline } from "@/features/messaging/presence-store";
import type { ConversationSummary } from "@/domain/messaging";

/** Pastille d'un groupe : une icone, un groupe n'ayant ni photo ni initiales propres. */
export function GroupAvatar({ size = 32 }: { size?: number }) {
  return (
    <span
      aria-hidden="true"
      style={{ width: size, height: size }}
      className="flex shrink-0 items-center justify-center rounded-full bg-app-accent-soft text-app-accent-fg"
    >
      <Users className="h-4 w-4" />
    </span>
  );
}

/** Pastille d'une conversation, quelle qu'elle soit : groupe, ou interlocuteur. */
export function ConversationAvatar({
  conversation,
  size = 32,
}: {
  conversation: Pick<ConversationSummary, "contact" | "group">;
  size?: number;
}) {
  if (conversation.group) return <GroupAvatar size={size} />;
  const name = conversation.contact?.name ?? "Compte supprimé";
  return (
    <ContactAvatar
      profileId={conversation.contact?.id}
      avatarUrl={conversation.contact?.avatarUrl}
      name={name}
      email={conversation.contact?.email}
      size={size}
    />
  );
}

type ContactAvatarProps = {
  profileId: string | null | undefined;
  avatarUrl: string | null | undefined;
  name: string;
  email: string | null | undefined;
  size?: number;
};

/**
 * Photo d'un interlocuteur, avec une pastille verte quand il est connecte.
 *
 * La pastille est doublee d'un texte pour les lecteurs d'ecran : une couleur seule ne dit
 * rien a qui ne la percoit pas.
 */
export function ContactAvatar({ profileId, avatarUrl, name, email, size = 32 }: ContactAvatarProps) {
  const online = useIsOnline(profileId);

  return (
    <span className="relative inline-flex shrink-0">
      <AvatarBubble avatarUrl={avatarUrl} name={name} email={email} size={size} />
      {online && (
        <span
          aria-hidden="true"
          className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-validated ring-2 ring-app-surface"
        />
      )}
      {online && <span className="sr-only">En ligne</span>}
    </span>
  );
}
