"use client";

import Image from "next/image";

import { cn } from "@/lib/utils";

/**
 * Initiales tirees d'un nom, a defaut d'une adresse e-mail.
 *
 * Coupe aussi sur le point, le tiret et le soulignement : sans cela,
 * « samy.bouchehida@... » donnerait « SA » au lieu de « SB ». C'est la version qui vivait
 * dans le menu de compte, reprise ici pour que toutes les pastilles de l'application
 * disent la meme chose.
 */
export function initialsFrom(name: string, email?: string | null) {
  const source = name.trim() || (email ?? "").trim();
  if (!source) return "?";

  const words = source.split(/[\s._-]+/).filter(Boolean);
  if (words.length >= 2) {
    return `${words[0][0]}${words[1][0]}`.toUpperCase();
  }
  return source.slice(0, 2).toUpperCase();
}

type AvatarBubbleProps = {
  /** Photo de profil, ou `null` pour retomber sur les initiales. */
  avatarUrl?: string | null;
  /** Nom dont on tire les initiales, et qui nomme l'image pour l'accessibilite. */
  name: string;
  /** Repli quand le nom est vide : l'adresse e-mail porte alors les initiales. */
  email?: string | null;
  /** Diametre en pixels. */
  size?: number;
  className?: string;
};

/**
 * Pastille d'identite : la photo si elle existe, les initiales sinon.
 *
 * Une seule implementation, partagee par la barre superieure, la messagerie et les
 * parametres. Elle existait auparavant en trois exemplaires qui ne savaient afficher que
 * des initiales — d'ou une photo enregistree qui n'apparaissait nulle part.
 *
 * `unoptimized` : l'image vient du stockage Supabase, dont le domaine n'est pas declare
 * dans next.config. L'optimiseur la refuserait.
 *
 * L'image est DECORATIVE (`alt=""`) : le nom qu'elle represente est toujours ecrit a cote
 * ou porte par le libelle du bouton qui la contient. Le repeter la ferait annoncer deux
 * fois.
 */
export function AvatarBubble({
  avatarUrl,
  name,
  email,
  size = 28,
  className,
}: AvatarBubbleProps) {
  if (avatarUrl) {
    return (
      <Image
        src={avatarUrl}
        alt=""
        width={size}
        height={size}
        unoptimized
        style={{ width: size, height: size }}
        className={cn(
          "shrink-0 rounded-full border border-app-line object-cover",
          className,
        )}
      />
    );
  }

  return (
    <span
      aria-hidden="true"
      style={{ width: size, height: size }}
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full bg-app-accent-soft font-semibold text-app-accent-fg",
        size <= 28 ? "text-app-xs" : "text-app-sm",
        className,
      )}
    >
      {initialsFrom(name, email)}
    </span>
  );
}
