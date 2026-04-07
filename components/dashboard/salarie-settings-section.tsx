import {
  BillingProfileCard,
  type BillingProfileFormState,
} from "@/components/dashboard/billing-profile-card";
import { PasswordUpdateCard } from "@/components/dashboard/password-update-card";
import {
  SettingsSummaryCard,
  outlinedValueBadge,
} from "@/components/dashboard/settings-summary-card";

type PasswordFormState = {
  newPassword: string;
  confirmPassword: string;
};

type SalarieSettingsSectionProps = {
  email: string;
  fullName: string;
  role: string;
  billingProfileForm: BillingProfileFormState;
  onBillingProfileChange: (form: BillingProfileFormState) => void;
  onBillingProfileSubmit: () => void | Promise<void>;
  billingProfileSaving: boolean;
  billingProfileLoading: boolean;
  passwordSaving: boolean;
  passwordMessage: string | null;
  passwordForm: PasswordFormState;
  onPasswordFormChange: (form: PasswordFormState) => void;
  onPasswordSubmit: () => void | Promise<void>;
};

export function SalarieSettingsSection({
  email,
  fullName,
  role,
  billingProfileForm,
  onBillingProfileChange,
  onBillingProfileSubmit,
  billingProfileSaving,
  billingProfileLoading,
  passwordSaving,
  passwordMessage,
  passwordForm,
  onPasswordFormChange,
  onPasswordSubmit,
}: SalarieSettingsSectionProps) {
  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,0.75fr)_minmax(0,1.25fr)]">
      <SettingsSummaryCard
        title="Profil"
        rows={[
          { label: "Email", value: email },
          { label: "Nom", value: fullName },
          { label: "Role", value: outlinedValueBadge(role) },
        ]}
      />

      <BillingProfileCard
        form={billingProfileForm}
        onChange={onBillingProfileChange}
        onSubmit={onBillingProfileSubmit}
        saving={billingProfileSaving}
        loading={billingProfileLoading}
      />

      <PasswordUpdateCard
        className="xl:col-span-2"
        contentClassName="grid gap-3 md:grid-cols-2"
        messageClassName="md:col-span-2 text-sm text-[#0A1A2F]/70"
        onSubmit={onPasswordSubmit}
        saving={passwordSaving}
        message={passwordMessage}
        form={passwordForm}
        onFormChange={onPasswordFormChange}
      />
    </div>
  );
}
