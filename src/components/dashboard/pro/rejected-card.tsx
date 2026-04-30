import { Ban } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function ProRejectedCard() {
  return (
    <Card className="border-red-200 bg-red-50 text-[#0A1A2F]">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-xl text-red-800">
          <Ban className="h-5 w-5 text-red-700" />
          Compte refusé
        </CardTitle>
        <CardDescription className="text-red-800/80">
          Ton compte n&apos;a pas été validé. Contacte l&apos;administration pour plus d&apos;informations.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2 text-sm text-red-900/90">
        <Button
          variant="outline"
          className="border-red-300 text-red-800 hover:bg-red-100"
          onClick={() => (window.location.href = "/contact")}
        >
          Contacter le support
        </Button>
      </CardContent>
    </Card>
  );
}
