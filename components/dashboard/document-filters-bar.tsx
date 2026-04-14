"use client";

import { ChevronDown } from "lucide-react";

type FilterFieldKey = "type" | "period" | "status" | "owner";

type FilterOption = {
  value: string;
  label: string;
};

type DocumentFiltersBarProps = {
  fields: FilterFieldKey[];
  values: Record<FilterFieldKey, string>;
  options: Record<FilterFieldKey, FilterOption[]>;
  onChange: (field: FilterFieldKey, value: string) => void;
};

const fieldLabels: Record<FilterFieldKey, string> = {
  type: "Type",
  period: "Periode",
  status: "Statut",
  owner: "Proprietaire",
};

const fieldWidths: Record<FilterFieldKey, string> = {
  type: "min-w-[120px]",
  period: "min-w-[170px]",
  status: "min-w-[130px]",
  owner: "min-w-[170px]",
};

export function DocumentFiltersBar({
  fields,
  values,
  options,
  onChange,
}: DocumentFiltersBarProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {fields.map((field) => (
        <div key={field} className="relative">
          <select
            value={values[field]}
            onChange={(event) => onChange(field, event.target.value)}
            className={`h-10 appearance-none rounded-lg border border-[#c7d7ea] bg-white px-4 pr-10 text-sm font-medium text-[#0A1A2F] outline-none transition focus:border-[#9bb8da] ${fieldWidths[field]}`}
          >
            <option value="all">{fieldLabels[field]}</option>
            {options[field].map((option) => (
              <option key={`${field}-${option.value}`} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#0A1A2F]/55" />
        </div>
      ))}
    </div>
  );
}
