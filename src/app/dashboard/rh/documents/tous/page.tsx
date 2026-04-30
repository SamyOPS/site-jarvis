import RhWorkspace from "../../rh-workspace";

import { RH_WORKSPACE_ROUTES } from "@/features/dashboard/rh/navigation";

export default function RhDocumentsTousPage() {
  return <RhWorkspace {...RH_WORKSPACE_ROUTES.documentsTous} />;
}
