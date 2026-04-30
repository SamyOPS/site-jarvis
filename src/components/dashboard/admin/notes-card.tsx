import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function AdminNotesCard() {
  return (
    <Card className="border-slate-200 bg-white text-[#0A1A2F] shadow-lg backdrop-blur">
      <CardHeader>
        <CardTitle className="text-lg">Notes importantes</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm text-[#0A1A2F]/70">
        <p>
          - Le suivi des connexions de tous les utilisateurs necessite la cle
          service (auth.admin) ou une table dediee aux sessions. Avec la cle
          publique, seule ta session active est visible.
        </p>
        <p>
          - Assure-toi que RLS autorise les admins a lire la table profiles.
        </p>
      </CardContent>
    </Card>
  );
}
