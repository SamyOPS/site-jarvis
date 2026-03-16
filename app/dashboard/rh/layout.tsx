import type { ReactNode } from "react";

import RhWorkspace from "./rh-workspace";

type RhLayoutProps = {
  children: ReactNode;
};

export default function RhLayout({ children }: RhLayoutProps) {
  void children;
  return <RhWorkspace />;
}
