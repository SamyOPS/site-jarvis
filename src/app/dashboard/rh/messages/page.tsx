import { Suspense } from "react";

import { MessagesWorkspace } from "@/components/messaging/messages-workspace";

/*
  `Suspense` est requis : le composant lit les parametres de l'URL (`?c=<id>`) avec
  `useSearchParams`, que Next impose d'isoler pour pouvoir prerendre le reste de la page.
*/
export default function RhMessagesPage() {
  return (
    <Suspense fallback={null}>
      <MessagesWorkspace role="rh" />
    </Suspense>
  );
}
