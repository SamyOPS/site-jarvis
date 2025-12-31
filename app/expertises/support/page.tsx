import type { Metadata } from "next";

import { expertises, ExpertisePageView, getMetadata } from "../content";

export const metadata: Metadata = getMetadata("support");

export default function SupportPage() {
  return <ExpertisePageView expertise={expertises.support} />;
}
