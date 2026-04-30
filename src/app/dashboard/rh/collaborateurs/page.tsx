import RhWorkspace from "../rh-workspace";

import { RH_WORKSPACE_ROUTES } from "@/features/dashboard/rh/navigation";

export default function RhCollaborateursPage() {
  return <RhWorkspace {...RH_WORKSPACE_ROUTES.collaborateurs} />;
}
