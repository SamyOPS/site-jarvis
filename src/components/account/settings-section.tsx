"use client";

import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * Briques de la page de parametres.
 *
 * Trois formes seulement, et c'est voulu : un cadre, une ligne « intitule a gauche,
 * controle a droite », et un champ empile. Les ecrans de reglages deviennent illisibles
 * des qu'on y melange quatre mises en page differentes.
 */

export function SettingsSection({
  title,
  description,
  actions,
  children,
  className,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn("rounded-app-card border border-app-line bg-app-surface", className)}
    >
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-app-line px-5 py-4">
        <div className="min-w-0">
          <h2 className="text-app-md font-semibold text-app-text">{title}</h2>
          {description && (
            <p className="mt-1 text-app-sm text-app-text-secondary">{description}</p>
          )}
        </div>
        {actions && <div className="shrink-0">{actions}</div>}
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
}

/** Ligne de reglage : intitule et explication a gauche, controle a droite. */
export function SettingsRow({
  label,
  hint,
  htmlFor,
  children,
}: {
  label: string;
  hint?: string;
  htmlFor?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-app-line py-3.5 first:pt-0 last:border-b-0 last:pb-0">
      <div className="min-w-0 flex-1">
        <label
          htmlFor={htmlFor}
          className="block text-app-sm font-medium text-app-text"
        >
          {label}
        </label>
        {hint && <p className="mt-0.5 text-app-xs text-app-text-muted">{hint}</p>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

/** Champ de saisie empile, avec son message d'erreur. */
export function SettingsField({
  label,
  htmlFor,
  hint,
  error,
  children,
  className,
}: {
  label: string;
  htmlFor?: string;
  hint?: string;
  error?: string | null;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <label htmlFor={htmlFor} className="block text-app-sm font-medium text-app-text">
        {label}
      </label>
      {children}
      {error ? (
        <p className="text-app-xs text-rejected">{error}</p>
      ) : hint ? (
        <p className="text-app-xs text-app-text-muted">{hint}</p>
      ) : null}
    </div>
  );
}

/** Champ texte, au gabarit de la console. */
export function SettingsInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={cn(
        "h-9 w-full rounded-app-control border border-app-line bg-app-field px-3 text-app-sm text-app-text placeholder:text-app-text-muted focus-visible:outline-app disabled:opacity-60",
        props.className,
      )}
    />
  );
}

/**
 * Interrupteur.
 *
 * `role="switch"` avec `aria-checked` : un lecteur d'ecran annonce alors « active » ou
 * « desactive », la ou un bouton nu ne dirait que son intitule.
 */
export function SettingsToggle({
  checked,
  onChange,
  label,
  disabled,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  /** Lu par les technologies d'assistance quand la ligne ne porte pas de <label>. */
  label: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors focus-visible:outline-app disabled:opacity-50",
        checked ? "bg-app-accent" : "bg-app-line",
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform",
          checked ? "translate-x-4" : "translate-x-0.5",
        )}
      />
    </button>
  );
}

/** Groupe de boutons exclusifs, pour un choix court (theme, taille de page). */
export function SettingsChoice<T extends string | number>({
  value,
  options,
  onChange,
  label,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (next: T) => void;
  label: string;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className="flex items-center gap-1 rounded-app-control border border-app-line p-1"
    >
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <button
            key={String(option.value)}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(option.value)}
            className={cn(
              "rounded-app-control px-3 py-1 text-app-sm transition-colors focus-visible:outline-app",
              selected
                ? "bg-app-surface-hover font-medium text-app-text"
                : "text-app-text-secondary hover:text-app-text",
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
