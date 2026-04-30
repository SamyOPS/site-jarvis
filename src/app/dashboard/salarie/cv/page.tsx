import SalarieWorkspace from "../salarie-workspace";

import { SALARIE_WORKSPACE_ROUTES } from "@/features/dashboard/salarie/navigation";

export default function SalarieCvPage() {
  return <SalarieWorkspace {...SALARIE_WORKSPACE_ROUTES.cvs} />;
}
