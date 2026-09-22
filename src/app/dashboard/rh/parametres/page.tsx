import { Suspense } from "react";

import { SettingsWorkspace } from "@/components/account/settings-workspace";

/*
  `Suspense` est requis : l'onglet courant est lu dans l'URL (`?section=`) avec
  `useSearchParams`, que Next impose d'isoler pour pouvoir prerendre le reste de la page.
*/
export default function RhParametresPage() {
  return (
    <Suspense fallback={null}>
      <SettingsWorkspace role="rh" />
    </Suspense>
  );
}
