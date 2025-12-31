import type { Metadata } from "next";

import { expertises, ExpertisePageView, getMetadata } from "../content";

export const metadata: Metadata = getMetadata("conseil");

export default function ConseilPage() {
  return <ExpertisePageView expertise={expertises.conseil} />;
}
