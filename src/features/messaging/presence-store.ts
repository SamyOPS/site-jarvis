"use client";

import { useSyncExternalStore } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";

import { browserSupabase } from "@/lib/supabase-browser";
import { safeGetClientSession } from "@/lib/client-auth";

/**
 * Qui est connecte a la console, en temps reel.
 *
 * POURQUOI UN STORE. « Connecte » veut dire « a un onglet ouvert sur la console », pas
 * « regarde la messagerie » : la presence s'annonce donc depuis le shell, present sur
 * tous les ecrans, et se lit dans la messagerie. Un seul canal par onglet, quel que soit
 * le nombre de composants qui s'y interessent.
 *
 * Le canal est PRIVE (voir la migration 20260930010000_console_presence.sql) : seuls les
 * comptes de la console peuvent le lire ou s'y annoncer. Un onglet ferme, une mise en
 * veille ou une coupure reseau font disparaitre l'utilisateur apres quelques secondes :
 * Realtime retire de lui-meme une presence dont la connexion est tombee.
 */

const CHANNEL_TOPIC = "console-presence";

type Listener = () => void;

let onlineIds: ReadonlySet<string> = new Set();
let listeners: Listener[] = [];
let channel: RealtimeChannel | null = null;
/** Nombre de shells montes. Le mode strict de React monte, demonte puis remonte. */
let users = 0;
/** Incremente a chaque arret : un demarrage asynchrone perime ne pose pas son canal. */
let generation = 0;

function publish(next: ReadonlySet<string>) {
  onlineIds = next;
  for (const listener of listeners) listener();
}

function subscribe(listener: Listener) {
  listeners.push(listener);
  return () => {
    listeners = listeners.filter((entry) => entry !== listener);
  };
}

async function open(startedAt: number) {
  const client = browserSupabase;
  if (!client) return;

  const { session } = await safeGetClientSession(client);
  if (startedAt !== generation || !session?.access_token) return;
  // Canal prive : Realtime evalue les policies avec ce jeton. Sans lui, refus.
  await client.realtime.setAuth(session.access_token);
  if (startedAt !== generation) return;

  const userId = session.user.id;
  const next = client.channel(CHANNEL_TOPIC, {
    config: { private: true, presence: { key: userId } },
  });

  next
    .on("presence", { event: "sync" }, () => {
      // Une cle par utilisateur : plusieurs onglets du meme compte n'en font qu'un.
      publish(new Set(Object.keys(next.presenceState())));
    })
    .subscribe((status) => {
      if (status === "SUBSCRIBED") {
        void next.track({ online_at: new Date().toISOString() });
      }
    });

  channel = next;
}

/**
 * Annonce l'utilisateur courant comme connecte, et suit la presence des autres. Rend la
 * fonction d'arret, a appeler au demontage.
 */
export function startConsolePresence() {
  users += 1;
  if (users === 1) void open(generation);

  return () => {
    users -= 1;
    if (users > 0) return;
    generation += 1;
    const current = channel;
    channel = null;
    if (current && browserSupabase) void browserSupabase.removeChannel(current);
    publish(new Set());
  };
}

/** Vrai si l'utilisateur a au moins un onglet ouvert sur la console. */
export function useIsOnline(profileId: string | null | undefined) {
  return useSyncExternalStore(
    subscribe,
    () => (profileId ? onlineIds.has(profileId) : false),
    () => false,
  );
}
