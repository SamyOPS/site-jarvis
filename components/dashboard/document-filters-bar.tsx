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
  type: "min-w-[100px]",
  period: "min-w-[145px]",
  status: "min-w-[115px]",
  owner: "min-w-[145px]",
};

export function DocumentFiltersBar({
  fields,
  values,
  options,
  onChange,
}: DocumentFiltersBarProps) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {fields.map((field) => (
        <div key={field} className="relative">
          <select
            value={values[field]}
            onChange={(event) => onChange(field, event.target.value)}
            className={`h-8 appearance-none rounded-md border border-[#c7d7ea] bg-white px-3 pr-8 text-xs font-medium text-[#0A1A2F] outline-none transition focus:border-[#9bb8da] ${fieldWidths[field]}`}
          >
            <option value="all">{fieldLabels[field]}</option>
            {options[field].map((option) => (
              <option key={`${field}-${option.value}`} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#0A1A2F]/55" />
        </div>
      ))}
    </div>
  );
}
