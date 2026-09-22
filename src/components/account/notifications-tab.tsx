"use client";

import {
  SettingsRow,
  SettingsSection,
  SettingsToggle,
} from "@/components/account/settings-section";
import {
  NOTIFICATION_KINDS,
  NOTIFICATION_LABELS,
  type NotificationSettings,
} from "@/domain/account-settings";

type NotificationsTabProps = {
  notifications: NotificationSettings;
  onChange: (patch: Partial<NotificationSettings>) => void;
};

/**
 * Notifications par e-mail.
 *
 * Une case par famille d'e-mails REELLEMENT envoyee par l'application : proposer de
 * couper des messages qui n'existent pas serait un reglage sans effet.
 */
export function NotificationsTab({ notifications, onChange }: NotificationsTabProps) {
  const allOff = NOTIFICATION_KINDS.every((kind) => !notifications[kind]);

  return (
    <div className="space-y-2">
      <SettingsSection
        title="Notifications par e-mail"
        description="Ce que vous recevez dans votre boîte. La console, elle, continue de tout afficher."
      >
        {NOTIFICATION_KINDS.map((kind) => (
          <SettingsRow
            key={kind}
            label={NOTIFICATION_LABELS[kind].title}
            hint={NOTIFICATION_LABELS[kind].description}
          >
            <SettingsToggle
              label={NOTIFICATION_LABELS[kind].title}
              checked={notifications[kind]}
              onChange={(value) => onChange({ [kind]: value } as Partial<NotificationSettings>)}
            />
          </SettingsRow>
        ))}
      </SettingsSection>

      {allOff && (
        <div className="rounded-app-card border border-pending-line bg-pending-soft px-5 py-4">
          <p className="text-app-sm text-app-text">
            <span className="font-medium">Tous les e-mails sont coupés.</span> Vous ne serez
            plus prévenu des demandes de documents ni des messages non lus. Pensez à passer
            régulièrement sur la console.
          </p>
        </div>
      )}
    </div>
  );
}
