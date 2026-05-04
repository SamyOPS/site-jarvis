import { CheckCircle2, Clock3, LogOut } from "lucide-react";
import type { User } from "@supabase/supabase-js";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type ProSessionCardProps = {
  user: User | null;
  sessionExpiry: string | null;
  onSignOut: () => void | Promise<void>;
};

export function ProSessionCard({
  user,
  sessionExpiry,
  onSignOut,
}: ProSessionCardProps) {
  return (
    <Card className="border-slate-200 bg-white text-[#0A1A2F] shadow-sm">
      <CardHeader className="space-y-1">
        <CardTitle className="flex items-center gap-2 text-xl">
          <Clock3 className="h-5 w-5" />
          Session actuelle
        </CardTitle>
        <CardDescription className="text-[#0A1A2F]/70">
          Infos supabase.auth.getSession().
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <div className="flex items-center justify-between">
          <span className="text-[#0A1A2F]/70">Etat</span>
          <span className="inline-flex items-center gap-2 rounded-full bg-emerald-100 px-3 py-1 text-emerald-800">
            <CheckCircle2 className="h-4 w-4" />
            Connecte
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[#0A1A2F]/70">Expire</span>
          <span className="font-medium">{sessionExpiry ?? "Inconnu"}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[#0A1A2F]/70">User ID</span>
          <span className="font-mono text-xs">{user?.id ?? "N/A"}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[#0A1A2F]/70">Email confirme</span>
          <span className="font-medium">
            {user?.email_confirmed_at ? "Oui" : "Non / inconnu"}
          </span>
        </div>
        <Button
          variant="outline"
          onClick={onSignOut}
          className="border-slate-300 text-[#0A1A2F] hover:bg-white"
        >
          <LogOut className="mr-2 h-4 w-4" />
          Se deconnecter
        </Button>
      </CardContent>
    </Card>
  );
}
