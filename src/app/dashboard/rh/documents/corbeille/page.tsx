import { RH_WORKSPACE_ROUTES } from "@/features/dashboard/rh/navigation";
import RhWorkspace from "@/app/dashboard/rh/rh-workspace";

export default function RhDocumentsCorbeillePage() {
  return <RhWorkspace {...RH_WORKSPACE_ROUTES.documentsCorbeille} />;
}

