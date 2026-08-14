import Link from "next/link";
import { ChevronRight } from "lucide-react";

import type { ConsoleCrumb } from "@/features/dashboard/shell/nav-config";

export function ConsoleBreadcrumb({ items }: { items: ConsoleCrumb[] }) {
  if (!items.length) return null;

  return (
    <nav aria-label="Fil d'Ariane" className="min-w-0">
      <ol className="flex min-w-0 items-center gap-1 text-app-sm">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;

          return (
            <li key={`${item.label}-${index}`} className="flex min-w-0 items-center gap-1">
              {index > 0 && (
                <ChevronRight
                  aria-hidden="true"
                  className="h-4 w-4 shrink-0 text-app-text-muted"
                />
              )}
              {item.href && !isLast ? (
                <Link
                  href={item.href}
                  className="truncate rounded-app-control text-app-text-muted transition-colors hover:text-app-text focus-visible:outline-app"
                >
                  {item.label}
                </Link>
              ) : (
                <span
                  aria-current={isLast ? "page" : undefined}
                  className="truncate font-medium text-app-text"
                >
                  {item.label}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
