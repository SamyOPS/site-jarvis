"use client";

import { AvatarBubble } from "@/components/console/avatar-bubble";
import { useIsOnline } from "@/features/messaging/presence-store";

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
