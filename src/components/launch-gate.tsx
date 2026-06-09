"use client";

import { SplashScreen } from "@/components/SplashScreen";
import { JarvisIntroV2 } from "@/components/jarvis-intro-v2";
import type { ReactNode } from "react";
import { useEffect, useState, useSyncExternalStore } from "react";

const INTRO_STORAGE_KEY = "jarvis_intro_seen";

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
  const showSplash = hasHydrated && introSeen && !introCompletedThisVisit;
  const showBlockingOverlay = !hasHydrated || showIntro;

  return (
    <>
      {children}

      {showBlockingOverlay ? (
        <div className="fixed inset-0 z-[250] overflow-hidden bg-[#03060d]">
          {hasHydrated && showIntro ? (
            <JarvisIntroV2
              onComplete={() => {
                persistIntroSeen();
                setIntroCompletedThisVisit(true);
              }}
            />
          ) : null}
        </div>
      ) : null}

      {showSplash ? <SplashScreen /> : null}
    </>
  );
}
