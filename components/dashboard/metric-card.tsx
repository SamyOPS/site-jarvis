import type { ReactNode } from "react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type MetricCardProps = {
  title: string;
  value: ReactNode;
  description?: ReactNode;
  className?: string;
  compact?: boolean;
};

export function MetricCard({
  title,
  value,
  description,
  className,
  compact = false,
}: MetricCardProps) {
  return (
    <Card className={className}>
      {compact ? null : (
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
      )}
      <CardContent className={compact ? "pt-6" : undefined}>
        <p className="text-sm text-[#0A1A2F]/70">{title}</p>
        <p className="mt-1 text-2xl font-semibold">{value}</p>
        {description ? (
          <p className="text-sm text-[#0A1A2F]/70">{description}</p>
        ) : null}
      </CardContent>
    </Card>
  );
}
