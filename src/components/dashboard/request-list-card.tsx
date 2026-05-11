import type { ReactNode } from "react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type RequestListItem = {
  id: string;
  title: string;
  meta?: string | null;
  status: string;
  note?: string | null;
};

type RequestListCardProps = {
  title: string;
  items: RequestListItem[];
  emptyMessage: string;
  action?: ReactNode;
};

export function RequestListCard({
  title,
  items,
  emptyMessage,
  action,
}: RequestListCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between">
        <CardTitle>{title}</CardTitle>
        {action}
      </CardHeader>
      <CardContent className="space-y-3">
        {items.length ? (
          items.map((item) => (
            <div key={item.id} className="rounded-lg border border-slate-200 p-3">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <p className="font-medium">{item.title}</p>
                  {item.meta ? (
                    <p className="text-sm text-[#0A1A2F]/70">{item.meta}</p>
                  ) : null}
                </div>
                <Badge variant="outline" className="self-start sm:self-auto shrink-0">{item.status}</Badge>
              </div>
              {item.note ? (
                <p className="mt-2 text-sm text-[#0A1A2F]/75">{item.note}</p>
              ) : null}
            </div>
          ))
        ) : (
          <p className="text-sm text-[#0A1A2F]/70">{emptyMessage}</p>
        )}
      </CardContent>
    </Card>
  );
}
