import RhWorkspace from "../../rh-workspace";

import { createRhCollaborateurDetailRoute } from "@/features/dashboard/rh/navigation";

type RhCollaborateurDetailPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function RhCollaborateurDetailPage({
  params,
}: RhCollaborateurDetailPageProps) {
  const { id } = await params;

  return <RhWorkspace {...createRhCollaborateurDetailRoute(id)} />;
}
