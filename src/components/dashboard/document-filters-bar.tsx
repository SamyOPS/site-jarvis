"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, Search } from "lucide-react";

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
  searchableFields?: FilterFieldKey[];
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

const DEFAULT_SEARCHABLE_FIELDS: FilterFieldKey[] = ["owner"];

function SearchableFilterSelect({
  field,
  value,
  options,
  onChange,
}: {
  field: FilterFieldKey;
  value: string;
  options: FilterOption[];
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const containerRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const close = () => {
    setOpen(false);
    setQuery("");
  };

  useEffect(() => {
    if (!open) return;
    const handlePointerDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
        setQuery("");
      }
    };
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [open]);

  useEffect(() => {
    if (open) {
      inputRef.current?.focus();
    }
  }, [open]);

  const normalizedQuery = query.trim().toLowerCase();
  const filteredOptions = normalizedQuery
    ? options.filter((option) => option.label.toLowerCase().includes(normalizedQuery))
    : options;

  const selectedLabel =
    value === "all"
      ? fieldLabels[field]
      : options.find((option) => option.value === value)?.label ?? fieldLabels[field];

  const selectValue = (nextValue: string) => {
    onChange(nextValue);
    close();
  };

  return (
    <div ref={containerRef} className={`relative ${fieldWidths[field]}`}>
      <button
        type="button"
        onClick={() => (open ? close() : setOpen(true))}
        className="flex h-8 w-full items-center justify-between gap-2 rounded-md border border-[#c7d7ea] bg-white px-3 text-xs font-medium text-[#0A1A2F] outline-none transition focus:border-[#9bb8da]"
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className="truncate">{selectedLabel}</span>
        <ChevronDown className="h-3.5 w-3.5 shrink-0 text-[#0A1A2F]/55" />
      </button>
      {open ? (
        <div className="absolute left-0 top-full z-50 mt-1 w-full min-w-[210px] overflow-hidden rounded-md border border-[#c7d7ea] bg-white shadow-lg">
          <div className="relative border-b border-[#e4edf7] p-1.5">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#0A1A2F]/45" />
            <input
              ref={inputRef}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Escape") {
                  close();
                } else if (event.key === "Enter" && filteredOptions.length > 0) {
                  event.preventDefault();
                  selectValue(filteredOptions[0].value);
                }
              }}
              placeholder="Rechercher..."
              className="h-7 w-full rounded border border-[#dbe6f3] bg-white pl-8 pr-2 text-xs text-[#0A1A2F] outline-none focus:border-[#9bb8da]"
            />
          </div>
          <ul className="max-h-56 overflow-auto py-1 text-xs" role="listbox">
            <li>
              <button
                type="button"
                onClick={() => selectValue("all")}
                className={`flex w-full items-center px-3 py-1.5 text-left hover:bg-[#f1f6fc] ${
                  value === "all" ? "font-semibold text-[#0A1A2F]" : "text-[#0A1A2F]/80"
                }`}
              >
                {fieldLabels[field]}
              </button>
            </li>
            {filteredOptions.map((option) => (
              <li key={`${field}-${option.value}`}>
                <button
                  type="button"
                  onClick={() => selectValue(option.value)}
                  className={`flex w-full items-center px-3 py-1.5 text-left hover:bg-[#f1f6fc] ${
                    value === option.value ? "font-semibold text-[#0A1A2F]" : "text-[#0A1A2F]/80"
                  }`}
                >
                  <span className="truncate">{option.label}</span>
                </button>
              </li>
            ))}
            {filteredOptions.length === 0 ? (
              <li className="px-3 py-2 text-[#0A1A2F]/50">Aucun resultat</li>
            ) : null}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

export function DocumentFiltersBar({
  fields,
  values,
  options,
  onChange,
  searchableFields = DEFAULT_SEARCHABLE_FIELDS,
}: DocumentFiltersBarProps) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {fields.map((field) =>
        searchableFields.includes(field) ? (
          <SearchableFilterSelect
            key={field}
            field={field}
            value={values[field]}
            options={options[field]}
            onChange={(value) => onChange(field, value)}
          />
        ) : (
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
        ),
      )}
    </div>
  );
}
