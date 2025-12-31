import type { Metadata } from "next";

import { expertises, ExpertisePageView, getMetadata } from "../content";

export const metadata: Metadata = getMetadata("developpement");

export default function DeveloppementPage() {
  return <ExpertisePageView expertise={expertises.developpement} />;
}
