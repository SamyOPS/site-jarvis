import RhWorkspace from "../../rh-workspace";

import { RH_WORKSPACE_ROUTES } from "@/features/dashboard/rh/navigation";

export default function RhCollaborateursActifsPage() {
  return <RhWorkspace {...RH_WORKSPACE_ROUTES.collaborateursActifs} />;
}
