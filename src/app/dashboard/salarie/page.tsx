import SalarieWorkspace from "./salarie-workspace";

import { SALARIE_WORKSPACE_ROUTES } from "@/features/dashboard/salarie/navigation";

export default function SalarieRootPage() {
  return <SalarieWorkspace {...SALARIE_WORKSPACE_ROUTES.overview} />;
}
