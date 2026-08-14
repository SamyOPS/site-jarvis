import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type ConsolePageHeaderProps = {
  title: string;
  description?: ReactNode;
  /** Actions primaires, alignees a droite sur ecran large. */
  actions?: ReactNode;
  className?: string;
};

export function ConsolePageHeader({
  title,
  description,
  actions,
  className,
}: ConsolePageHeaderProps) {
  return (
    <div
      className={cn(
        "mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between",
        className,
      )}
    >
      <div className="min-w-0">
        <h1 className="text-app-xl font-semibold text-app-text">{title}</h1>
        {description && (
          <p className="mt-1 max-w-2xl text-app-sm text-app-text-secondary">
            {description}
          </p>
        )}
      </div>

      {actions && (
        <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>
      )}
    </div>
  );
}
