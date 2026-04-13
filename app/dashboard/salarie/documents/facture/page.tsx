import SalarieWorkspace from "../../salarie-workspace";

import { SALARIE_WORKSPACE_ROUTES } from "@/features/dashboard/salarie/navigation";

export default function SalarieDocumentsFacturePage() {
  return <SalarieWorkspace {...SALARIE_WORKSPACE_ROUTES.documentsCraFacture} />;
}
