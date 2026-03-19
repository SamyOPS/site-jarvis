import type { ReactNode } from "react";

import SalarieWorkspace from "./salarie-workspace";

type SalarieLayoutProps = {
  children: ReactNode;
};

export default function SalarieLayout({ children }: SalarieLayoutProps) {
  void children;
  return <SalarieWorkspace />;
}
