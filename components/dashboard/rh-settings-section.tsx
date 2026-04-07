import { PasswordUpdateCard } from "@/components/dashboard/password-update-card";
import { SettingsSummaryCard } from "@/components/dashboard/settings-summary-card";

type PasswordFormState = {
  newPassword: string;
  confirmPassword: string;
};

type RhSettingsSectionProps = {
  email: string;
  fullName: string;
  userId: string;
  expiresAt: string;
  passwordSaving: boolean;
  passwordMessage: string | null;
  passwordForm: PasswordFormState;
  onPasswordFormChange: (form: PasswordFormState) => void;
  onPasswordSubmit: () => void | Promise<void>;
};

export function RhSettingsSection({
  email,
  fullName,
  userId,
  expiresAt,
  passwordSaving,
  passwordMessage,
  passwordForm,
  onPasswordFormChange,
  onPasswordSubmit,
}: RhSettingsSectionProps) {
  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
      <SettingsSummaryCard
        title="Session"
        rows={[
          { label: "Email", value: email },
          { label: "Nom", value: fullName },
          { label: "User ID", value: userId, valueClassName: "font-mono text-xs" },
          { label: "Expire", value: expiresAt },
        ]}
      />

      <PasswordUpdateCard
        onSubmit={onPasswordSubmit}
        saving={passwordSaving}
        message={passwordMessage}
        form={passwordForm}
        onFormChange={onPasswordFormChange}
      />
    </div>
  );
}
