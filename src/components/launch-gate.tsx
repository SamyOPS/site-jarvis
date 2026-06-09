"use client";

import { JarvisIntroV2 } from "@/components/jarvis-intro-v2";
import { LaunchProvider } from "@/components/launch-context";
import type { ReactNode } from "react";
import { useCallback, useEffect, useState, useSyncExternalStore } from "react";

const INTRO_STORAGE_KEY = "jarvis_intro_seen";
const MAIN_PAGE_PRELOAD_DELAY_MS = 1800;
const INTRO_FADE_DURATION_MS = 900;

declare global {
  interface Window {
    jarvisResetIntro?: () => void;
  }
}

interface LaunchGateProps {
  children: ReactNode;
}

function readIntroSeen() {
  try {
    return window.localStorage.getItem(INTRO_STORAGE_KEY) === "true";
  } catch {
    return false;
  }
}

function clearIntroSeen() {
  try {
    window.localStorage.removeItem(INTRO_STORAGE_KEY);
  } catch {
    // Local storage can be unavailable in restrictive browser modes.
  }
}

function persistIntroSeen() {
  try {
    window.localStorage.setItem(INTRO_STORAGE_KEY, "true");
  } catch {
    // We still let the current session continue even if persistence fails.
  }
}

export function LaunchGate({ children }: LaunchGateProps) {
  const [introCompletedThisVisit, setIntroCompletedThisVisit] = useState(false);
  const [mainPagePrimed, setMainPagePrimed] = useState(false);
  const [introRevealing, setIntroRevealing] = useState(false);
  const [introFadingOut, setIntroFadingOut] = useState(false);
  const hasHydrated = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );

  useEffect(() => {
    window.jarvisResetIntro = () => {
      clearIntroSeen();
      window.location.reload();
    };

    return () => {
      delete window.jarvisResetIntro;
    };
  }, []);

  const introSeen = hasHydrated ? readIntroSeen() : false;
  const showIntro = hasHydrated && !introSeen && !introCompletedThisVisit;
  const showBlockingOverlay = !hasHydrated || showIntro || introFadingOut;
  const introActive = showIntro || introFadingOut;

  useEffect(() => {
    if (!showIntro || mainPagePrimed) return;

    const preloadTimer = window.setTimeout(() => {
      setMainPagePrimed(true);
    }, MAIN_PAGE_PRELOAD_DELAY_MS);

    return () => {
      window.clearTimeout(preloadTimer);
    };
  }, [mainPagePrimed, showIntro]);

  const handleIntroReveal = useCallback(() => {
    setMainPagePrimed(true);
    setIntroRevealing(true);
  }, []);

  const handleIntroComplete = useCallback(() => {
    persistIntroSeen();
    setIntroFadingOut(true);
    window.setTimeout(() => {
      setIntroCompletedThisVisit(true);
      setIntroRevealing(false);
      setIntroFadingOut(false);
    }, INTRO_FADE_DURATION_MS);
  }, []);

  const launchState = {
    introSeen,
    introActive,
    introRevealing,
    introTransitioning: introRevealing || introFadingOut,
  };
  const revealMainPage = hasHydrated && (!introActive || introRevealing || introFadingOut);
  const shouldMountMainPage =
    hasHydrated &&
    (introSeen ||
      introCompletedThisVisit ||
      mainPagePrimed ||
      introRevealing ||
      introFadingOut);

  return (
    <LaunchProvider value={launchState}>
      {shouldMountMainPage ? (
        <div
          style={{
            opacity: revealMainPage ? 1 : 0,
            transform: revealMainPage ? "translateY(0) scale(1)" : "translateY(12px) scale(0.996)",
            pointerEvents: introActive ? "none" : "auto",
            transition:
              "opacity 900ms cubic-bezier(0.22, 1, 0.36, 1), transform 900ms cubic-bezier(0.22, 1, 0.36, 1)",
          }}
        >
          {children}
        </div>
      ) : null}

      {showBlockingOverlay ? (
        <div
          className="fixed inset-0 z-[250] overflow-hidden bg-[#071225]"
          style={{
            opacity: introFadingOut ? 0 : introRevealing ? 0.58 : 1,
            transform: introFadingOut
              ? "scale(1.012)"
              : introRevealing
                ? "scale(1.006)"
                : "scale(1)",
            transition:
              "opacity 900ms cubic-bezier(0.22, 1, 0.36, 1), transform 900ms cubic-bezier(0.22, 1, 0.36, 1)",
          }}
        >
          <div
            className="absolute inset-0"
            style={{
              background:
                "radial-gradient(circle at 50% 42%, rgba(112, 224, 255, 0.14) 0%, rgba(7, 18, 37, 0) 50%), linear-gradient(180deg, rgba(7, 18, 37, 0.78) 0%, rgba(8, 27, 52, 0.58) 48%, rgba(7, 18, 37, 0.82) 100%)",
            }}
            aria-hidden="true"
          />

          {hasHydrated && (showIntro || introFadingOut) ? (
            <JarvisIntroV2
              onReveal={handleIntroReveal}
              onComplete={handleIntroComplete}
            />
          ) : null}
        </div>
      ) : null}
    </LaunchProvider>
  );
}
