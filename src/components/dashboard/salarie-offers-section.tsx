import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MetricCard } from "@/components/dashboard/metric-card";

type SalarieOffersSectionProps = {
  offersCount: number;
  applicationsCount: number;
  hasCv: boolean;
};

export function SalarieOffersSection({
  offersCount,
  applicationsCount,
  hasCv,
}: SalarieOffersSectionProps) {
  return (
    <section className="grid grid-cols-1 gap-3 md:grid-cols-3">
      <MetricCard
        title="Toutes les offres"
        value={offersCount}
        description="Offres actuellement publiees."
      />
      <MetricCard
        title="Mes candidatures"
        value={applicationsCount}
        description="Candidatures envoyees."
      />
      <Card>
        <CardHeader>
          <CardTitle>Mes CVs</CardTitle>
        </CardHeader>
        <CardContent>
          <Badge variant="outline">{hasCv ? "CV disponible" : "Aucun CV"}</Badge>
        </CardContent>
      </Card>
    </section>
  );
}
