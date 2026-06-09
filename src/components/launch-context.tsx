"use client";

import type { ReactNode } from "react";
import { createContext, useContext } from "react";

export interface LaunchContextValue {
  introSeen: boolean;
  introActive: boolean;
  introRevealing: boolean;
  introTransitioning: boolean;
}

const LaunchContext = createContext<LaunchContextValue>({
  introSeen: false,
  introActive: false,
  introRevealing: false,
  introTransitioning: false,
});

export function LaunchProvider({
  children,
  value,
}: {
  children: ReactNode;
  value: LaunchContextValue;
}) {
  return <LaunchContext.Provider value={value}>{children}</LaunchContext.Provider>;
}

export function useLaunchContext() {
  return useContext(LaunchContext);
}
