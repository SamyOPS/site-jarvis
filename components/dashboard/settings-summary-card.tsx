import type { ReactNode } from "react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type SummaryRow = {
  label: string;
  value: ReactNode;
  valueClassName?: string;
};

type SettingsSummaryCardProps = {
  title: string;
  rows: SummaryRow[];
};

export function SettingsSummaryCard({
  title,
  rows,
}: SettingsSummaryCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        {rows.map((row) => (
          <div key={row.label} className="flex items-center justify-between gap-4">
            <span>{row.label}</span>
            <span className={row.valueClassName}>{row.value}</span>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

export function outlinedValueBadge(value: ReactNode) {
  return <Badge variant="outline">{value}</Badge>;
}
