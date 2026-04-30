import { SALARIE_WORKSPACE_ROUTES } from "@/features/dashboard/salarie/navigation";
import SalarieWorkspace from "@/app/dashboard/salarie/salarie-workspace";

export default function SalarieDocumentsCorbeillePage() {
  return <SalarieWorkspace {...SALARIE_WORKSPACE_ROUTES.documentsCorbeille} />;
}

