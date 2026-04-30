import type { ReactNode } from "react";

type RhLayoutProps = {
  children: ReactNode;
};

export default function RhLayout({ children }: RhLayoutProps) {
  return <>{children}</>;
}
