import { NextResponse } from "next/server";

import { unwrap, withActor } from "@/lib/api-handler";

export const runtime = "nodejs";

/**
 * Collegues RH de l'utilisateur courant.
 *
 * POURQUOI UNE ROUTE, ET PAS UNE LECTURE DEPUIS LE NAVIGATEUR. La policy
 * `profiles_select_scoped` n'autorise un RH qu'a lire son propre profil et ceux des
 * collaborateurs qui lui sont affectes — un pair n'entre dans aucun des deux cas. Une
 * requete PostgREST depuis le tableau de bord ne remonterait donc RIEN, en silence.
 *
 * Deux facons de le resoudre : elargir la policy, ou passer par le serveur. La seconde est
 * retenue. Elargir aurait ouvert la table `profiles` en lecture directe sur tous les
 * comptes RH — telephone et statut professionnel compris — a qui appelle l'API a la main.
 * Ici, les colonnes rendues sont choisies, et rien d'autre ne sort.
 *
 * Le droit lui-meme n'est pas nouveau : la messagerie admet deja qu'un RH puisse ouvrir
 * une conversation avec n'importe quel autre RH.
 */
export const GET = withActor(
  ["rh", "admin"],
  async ({ adminClient, profile }) => {
    const items = unwrap(
      await adminClient
        .from("profiles")
        .select(
          "id,email,full_name,phone,role,professional_status,employment_status,company_name,esn_partenaire,avatar_url",
        )
        .eq("role", "rh")
        .neq("id", profile.id)
        .order("full_name", { ascending: true }),
    );

    return NextResponse.json({ items: items ?? [] });
  },
  { missingSession: "Session RH manquante." },
);
