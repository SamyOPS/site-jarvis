"use client";

import {
  SettingsChoice,
  SettingsRow,
  SettingsSection,
  SettingsToggle,
} from "@/components/console/settings-fields";
import {
  HOME_PAGES,
  HOME_PAGE_LABELS,
  PAGE_SIZES,
  type AppearanceSettings,
  type HomePage,
  type PageSize,
} from "@/domain/account-settings";

type AppearanceTabProps = {
  appearance: AppearanceSettings;
  onChange: (patch: Partial<AppearanceSettings>) => void;
};

export function AppearanceTab({ appearance, onChange }: AppearanceTabProps) {
  return (
    <div className="space-y-2">
      <SettingsSection
        title="Apparence"
        description="Ces réglages suivent votre compte : vous les retrouvez sur un autre poste."
      >
        <SettingsRow label="Thème" hint="Clair ou sombre, appliqué immédiatement.">
          <SettingsChoice
            label="Thème de l'interface"
            value={appearance.theme}
            onChange={(theme) => onChange({ theme })}
            options={[
              { value: "light", label: "Clair" },
              { value: "dark", label: "Sombre" },
            ]}
          />
        </SettingsRow>

        <SettingsRow
          label="Barre latérale repliée"
          hint="N'affiche que les icônes, pour gagner de la largeur."
        >
          <SettingsToggle
            label="Replier la barre latérale par défaut"
            checked={appearance.sidebarCollapsed}
            onChange={(sidebarCollapsed) => onChange({ sidebarCollapsed })}
          />
        </SettingsRow>
      </SettingsSection>

      <SettingsSection
        title="Listes et navigation"
        description="Comment la console s'ouvre et affiche vos documents."
      >
        <SettingsRow
          label="Lignes par page"
          hint="Nombre de documents affichés avant de devoir tourner la page."
        >
          <SettingsChoice
            label="Lignes par page"
            value={appearance.pageSize}
            onChange={(pageSize) => onChange({ pageSize: pageSize as PageSize })}
            options={PAGE_SIZES.map((size) => ({ value: size, label: String(size) }))}
          />
        </SettingsRow>

        <SettingsRow
          label="Écran d'accueil"
          hint="La page ouverte juste après la connexion."
        >
          <SettingsChoice
            label="Écran d'accueil"
            value={appearance.homePage}
            onChange={(homePage) => onChange({ homePage: homePage as HomePage })}
            options={HOME_PAGES.map((page) => ({
              value: page,
              label: HOME_PAGE_LABELS[page],
            }))}
          />
        </SettingsRow>
      </SettingsSection>
    </div>
  );
}
