"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";

import { createAuthorizedFetch } from "@/lib/dashboard-api";
import { browserSupabase } from "@/lib/supabase-browser";
import { safeGetClientSession } from "@/lib/client-auth";
import { applyChessMove, type ChessMoveInput } from "@/lib/chess-game";
import type { ChessState, GameItem } from "@/domain/games";

/**
 * Etat d'une partie ouverte : chargement, arrivee des coups adverses, envoi des siens.
 *
 * Meme double mecanisme que la messagerie (voir use-messaging) : Realtime pousse chaque
 * UPDATE de la ligne, un rafraichissement periodique prend le relais s'il ne s'etablit
 * pas. Le rythme de repli est ici bien plus court — attendre 15 secondes le coup de
 * l'adversaire rendrait la partie injouable.
 */

const POLL_INTERVAL_MS = 3_000;
const POLL_INTERVAL_REALTIME_MS = 20_000;

type GameRealtimeRow = {
  id: string;
  conversation_id: string;
  game_type: GameItem["gameType"];
  status: GameItem["status"];
  created_by: string | null;
  player_one_id: string | null;
  player_two_id: string | null;
  state: GameItem["state"];
  result: GameItem["result"];
  result_reason: string | null;
  updated_at: string;
};

function fromRealtime(row: GameRealtimeRow): GameItem {
  return {
    id: row.id,
    conversationId: row.conversation_id,
    gameType: row.game_type,
    status: row.status,
    createdBy: row.created_by,
    playerOneId: row.player_one_id,
    playerTwoId: row.player_two_id,
    state: row.state,
    result: row.result,
    resultReason: row.result_reason,
    updatedAt: row.updated_at,
  };
}

export function useGame(gameId: string | null) {
  const callApi = useMemo(() => createAuthorizedFetch("jeu"), []);
  const channelName = `jeu:${useId()}`;

  const [game, setGame] = useState<GameItem | null>(null);
  const [loading, setLoading] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [realtimeReady, setRealtimeReady] = useState(false);

  /*
    Une reponse plus ancienne ne doit pas ecraser une plus recente : le coup optimiste,
    la reponse du serveur et l'evenement Realtime arrivent dans un ordre quelconque.
    `updatedAt` sert d'horloge.
  */
  const accept = useCallback((next: GameItem | null | undefined) => {
    if (!next) return;
    setGame((current) => {
      if (!current || current.id !== next.id) return next;
      // Comparaison en dates et non en chaines : Realtime et PostgREST ne formatent pas
      // forcement l'horodatage de la meme facon.
      if (Date.parse(current.updatedAt) > Date.parse(next.updatedAt)) return current;
      // Un evenement Realtime ne porte pas les donnees privees : on garde les dernieres.
      return next.private ? next : { ...next, private: current.private };
    });
  }, []);

  const call = useCallback(
    async (path: string, init?: RequestInit) => {
      const payload = (await callApi(path, init)) as { game?: GameItem } | null;
      return payload?.game ?? null;
    },
    [callApi],
  );

  const refresh = useCallback(async () => {
    if (!gameId) return;
    try {
      accept(await call(`/api/messages/games/${encodeURIComponent(gameId)}`));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Chargement de la partie impossible.");
    }
  }, [accept, call, gameId]);

  /*
    Ouverture = tentative de rejoindre. La route est idempotente : pour un joueur deja
    assis, ou une partie deja lancee, elle rend simplement l'etat courant. Cliquer sur
    l'invitation suffit donc a lancer la partie, sans second bouton.
  */
  useEffect(() => {
    if (!gameId) {
      setGame(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    void (async () => {
      try {
        const joined = await call(`/api/messages/games/${encodeURIComponent(gameId)}/join`, {
          method: "POST",
        });
        if (!cancelled) setGame(joined);
      } catch (caught) {
        if (!cancelled) {
          setError(caught instanceof Error ? caught.message : "Ouverture de la partie impossible.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [call, gameId]);

  // Abonnement Realtime a la seule ligne de la partie.
  useEffect(() => {
    if (!gameId || !browserSupabase) return;
    const client = browserSupabase;
    let channel: ReturnType<typeof client.channel> | null = null;
    let cancelled = false;

    void (async () => {
      const { session } = await safeGetClientSession(client);
      if (cancelled || !session?.access_token) return;
      await client.realtime.setAuth(session.access_token);
      if (cancelled) return;

      channel = client
        .channel(channelName)
        .on(
          "postgres_changes",
          { event: "UPDATE", schema: "public", table: "games", filter: `id=eq.${gameId}` },
          (payload) => accept(fromRealtime(payload.new as GameRealtimeRow)),
        )
        .subscribe((status) => {
          if (!cancelled) setRealtimeReady(status === "SUBSCRIBED");
        });
    })();

    return () => {
      cancelled = true;
      setRealtimeReady(false);
      if (channel) void client.removeChannel(channel);
    };
  }, [accept, channelName, gameId]);

  // Repli periodique, inutile une fois la partie terminee.
  const finished = game?.status === "finished";
  useEffect(() => {
    if (!gameId || finished) return;
    const interval = window.setInterval(
      () => void refresh(),
      realtimeReady ? POLL_INTERVAL_REALTIME_MS : POLL_INTERVAL_MS,
    );
    return () => window.clearInterval(interval);
  }, [finished, gameId, realtimeReady, refresh]);

  const gameRef = useRef(game);
  useEffect(() => {
    gameRef.current = game;
  }, [game]);

  /**
   * Envoie un coup. `optimistic` applique le coup localement pour qu'il se voie tout de
   * suite ; le serveur tranche ensuite, et en cas de refus on revient a sa version.
   */
  const submitMove = useCallback(
    async (body: Record<string, unknown>, optimistic?: (game: GameItem) => GameItem | null) => {
      const current = gameRef.current;
      if (!current || pending) return;

      if (optimistic) {
        const next = optimistic(current);
        if (!next) return;
        setGame(next);
      }

      setPending(true);
      try {
        accept(
          await call(`/api/messages/games/${encodeURIComponent(current.id)}/move`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          }),
        );
        setError(null);
      } catch (caught) {
        setGame(current);
        setError(caught instanceof Error ? caught.message : "Coup refusé.");
        void refresh();
      } finally {
        setPending(false);
      }
    },
    [accept, call, pending, refresh],
  );

  /** Echecs : la piece bouge tout de suite, le coup etant rejoue localement. */
  const playMove = useCallback(
    (move: ChessMoveInput) =>
      submitMove({ ...move }, (current) => {
        try {
          const outcome = applyChessMove(current.state as ChessState, move);
          return { ...current, state: outcome.state };
        } catch {
          return null;
        }
      }),
    [submitMove],
  );

  const resign = useCallback(async () => {
    const current = gameRef.current;
    if (!current) return;
    setPending(true);
    try {
      accept(
        await call(`/api/messages/games/${encodeURIComponent(current.id)}/resign`, {
          method: "POST",
        }),
      );
      setError(null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Action impossible.");
    } finally {
      setPending(false);
    }
  }, [accept, call]);

  return {
    game,
    loading,
    pending,
    error,
    realtimeReady,
    /** Coup quelconque, dans le format attendu par le moteur du jeu. */
    sendMove: submitMove,
    playMove,
    resign,
  };
}
