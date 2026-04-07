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
      <CardHeader className="flex flex-row items-center justify-between gap-3">
        <CardTitle>{title}</CardTitle>
        {action}
      </CardHeader>
      <CardContent className="space-y-3">
        {items.length ? (
          items.map((item) => (
            <div key={item.id} className="rounded-lg border border-slate-200 p-3">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="font-medium">{item.title}</p>
                  {item.meta ? (
                    <p className="text-sm text-[#0A1A2F]/70">{item.meta}</p>
                  ) : null}
                </div>
                <Badge variant="outline">{item.status}</Badge>
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
