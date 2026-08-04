"use client";

import { useEffect, useRef, useState } from "react";

/** Delai avant reconstruction du PDF : une frappe ne doit pas relancer un build. */
const REBUILD_DEBOUNCE_MS = 300;

type PdfPreviewFrameProps = {
  title: string;
  /**
   * Construit les octets du PDF. Doit etre stable en identite tant que les donnees
   * n'ont pas change (memoiser chez l'appelant) : c'est cette identite qui declenche
   * la reconstruction.
   */
  build: () => Uint8Array<ArrayBuffer>;
  /** Tant que false, aucun PDF n'est construit (breakpoint, donnees pas pretes...). */
  enabled?: boolean;
  /** Message affiche a la place du PDF quand enabled est false. */
  disabledLabel?: string;
};

/**
 * Cadre A4 affichant un PDF construit cote client.
 *
 * Trois details non evidents, qui comptent des lors que l'apercu est visible en
 * permanence plutot que replie :
 *
 * 1. On remplace le document via `contentWindow.location.replace()` au lieu de
 *    reaffecter `src`. Reaffecter `src` empile une entree dans l'historique de
 *    navigation (le bouton Retour du navigateur remonterait les anciens PDF) et
 *    provoque un clignotement plus un reset du zoom a chaque frappe.
 * 2. On revoque l'ancienne object URL au chargement de la nouvelle, et non dans le
 *    nettoyage de l'effet : revoquer trop tot coupe le chargement en cours et laisse
 *    un cadre gris.
 * 3. Le build est debounce, et toute erreur est capturee. Sans try/catch, une
 *    exception dans l'effet ferait tomber toute la route du dashboard.
 */
export function PdfPreviewFrame({
  title,
  build,
  enabled = true,
  disabledLabel = "Apercu indisponible.",
}: PdfPreviewFrameProps) {
  const frameRef = useRef<HTMLIFrameElement | null>(null);
  const currentUrlRef = useRef<string | null>(null);
  const previousUrlRef = useRef<string | null>(null);
  const [status, setStatus] = useState<"idle" | "ready" | "error">("idle");

  useEffect(() => {
    if (!enabled) return;

    const timeoutId = window.setTimeout(() => {
      let nextUrl: string | null = null;
      try {
        const pdfBytes = build();
        nextUrl = URL.createObjectURL(new Blob([pdfBytes], { type: "application/pdf" }));
      } catch {
        setStatus("error");
        return;
      }

      previousUrlRef.current = currentUrlRef.current;
      currentUrlRef.current = nextUrl;
      setStatus("ready");

      const frameWindow = frameRef.current?.contentWindow;
      if (frameWindow) {
        // `#view=Fit` est un indice pour le lecteur PDF integre ; les navigateurs
        // recents l'ignorent partiellement, c'est la largeur du cadre qui garantit
        // qu'aucune barre de defilement n'apparait.
        frameWindow.location.replace(`${nextUrl}#view=Fit`);
      }
    }, REBUILD_DEBOUNCE_MS);

    return () => window.clearTimeout(timeoutId);
  }, [build, enabled]);

  // Filet de securite : liberer la derniere URL au demontage.
  useEffect(
    () => () => {
      if (previousUrlRef.current) URL.revokeObjectURL(previousUrlRef.current);
      if (currentUrlRef.current) URL.revokeObjectURL(currentUrlRef.current);
    },
    [],
  );

  return (
    <div className="relative mx-auto aspect-[595/842] w-full max-w-[520px] overflow-hidden rounded-lg border border-slate-200 bg-slate-100 xl:max-w-[calc((100dvh-13rem)*0.707)]">
      <iframe
        ref={frameRef}
        title={title}
        src="about:blank"
        className="h-full w-full bg-white"
        onLoad={() => {
          // Le nouveau document est affiche : l'ancien blob peut disparaitre.
          if (previousUrlRef.current) {
            URL.revokeObjectURL(previousUrlRef.current);
            previousUrlRef.current = null;
          }
        }}
      />
      {status !== "ready" ? (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-100 px-6 text-center text-sm text-[#0A1A2F]/60">
          {!enabled
            ? disabledLabel
            : status === "error"
              ? "Apercu indisponible pour le moment."
              : "Generation de l'apercu..."}
        </div>
      ) : null}
    </div>
  );
}
