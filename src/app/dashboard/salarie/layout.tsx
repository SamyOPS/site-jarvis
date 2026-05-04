import type { ReactNode } from "react";

type SalarieLayoutProps = {
  children: ReactNode;
};

export default function SalarieLayout({ children }: SalarieLayoutProps) {
  return <>{children}</>;
}
