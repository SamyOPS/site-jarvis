import { NextResponse } from "next/server";
import type { SupabaseClient, User } from "@supabase/supabase-js";

import {
  getAccessTokenFromRequest,
  getAuthorizedActor,
  isAuthorizedActorError,
  type AuthorizedProfile,
} from "@/lib/server-supabase";

/**
 * Erreur metier portant son code HTTP. Levee depuis un handler, elle ressort telle quelle
 * dans la reponse — le front lit ce message, il ne doit pas etre remplace par « Erreur
 * serveur. ».
 */
export class ApiError extends Error {
  readonly status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

export type ActorContext = {
  adminClient: SupabaseClient;
  user: User;
  profile: AuthorizedProfile;
  request: Request;
};

type WithActorOptions = {
  /**
   * Message du 401 quand aucun jeton n'accompagne la requete. Chaque route garde le sien
   * (« Session RH manquante. », « Session admin manquante. »...) : ces textes s'affichent
   * a l'ecran, les uniformiser est une decision produit, pas un effet de bord de
   * factorisation.
   */
  missingSession?: string;
};

/**
 * Enveloppe d'un handler de route authentifiee.
 *
 * Remplace le preambule recopie dans 26 fichiers : extraction du jeton, garde 401,
 * autorisation par role, et le `catch` final qui retombe en 500.
 *
 * Le contrat de reponse est preserve au caractere pres : memes codes, memes messages.
 * C'est le point critique de cette factorisation — le front construit ses messages
 * d'erreur a partir du corps de la reponse.
 */
export function withActor<TRouteContext = unknown>(
  roles: string[],
  handler: (actor: ActorContext, routeContext: TRouteContext) => Promise<Response>,
  options?: WithActorOptions,
) {
  return async (request: Request, routeContext: TRouteContext): Promise<Response> => {
    try {
      const accessToken = getAccessTokenFromRequest(request);
      if (!accessToken) {
        return NextResponse.json(
          { error: options?.missingSession ?? "Session manquante." },
          { status: 401 },
        );
      }

      const authorized = await getAuthorizedActor(accessToken, roles);
      if (isAuthorizedActorError(authorized)) {
        return NextResponse.json({ error: authorized.error }, { status: authorized.status });
      }

      return await handler(
        {
          adminClient: authorized.adminClient,
          user: authorized.user,
          profile: authorized.profile,
          request,
        },
        routeContext,
      );
    } catch (error) {
      if (error instanceof ApiError) {
        return NextResponse.json({ error: error.message }, { status: error.status });
      }
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "Erreur serveur." },
        { status: 500 },
      );
    }
  };
}

/**
 * Rend les donnees d'une reponse Supabase, ou leve son message d'erreur.
 *
 * Le statut par defaut est 400, celui que les routes rendaient deja pour une erreur de
 * requete — un 500 masquerait le message aupres de l'utilisateur.
 */
export function unwrap<T>(
  result: { data: T; error: { message: string } | null },
  status = 400,
): T {
  if (result.error) {
    throw new ApiError(result.error.message, status);
  }
  return result.data;
}

/** Leve une erreur 400 si la valeur est absente ou vide. */
export function required<T>(value: T | null | undefined, message: string): T {
  if (value === null || value === undefined || value === "") {
    throw new ApiError(message, 400);
  }
  return value;
}
