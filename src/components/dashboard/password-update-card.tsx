import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type PasswordFormState = {
  newPassword: string;
  confirmPassword: string;
};

type PasswordUpdateCardProps = {
  onSubmit: () => void | Promise<void>;
  saving: boolean;
  message: string | null;
  form: PasswordFormState;
  onFormChange: (form: PasswordFormState) => void;
  className?: string;
  contentClassName?: string;
  messageClassName?: string;
};

export function PasswordUpdateCard({
  onSubmit,
  saving,
  message,
  form,
  onFormChange,
  className,
  contentClassName = "space-y-3",
  messageClassName,
}: PasswordUpdateCardProps) {
  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-center justify-between gap-3">
        <div>
          <CardTitle>Mot de passe</CardTitle>
          <p className="mt-1 text-sm text-[#0A1A2F]/70">
            Modifie le mot de passe utilise pour te connecter.
          </p>
        </div>
        <Button type="button" size="sm" onClick={() => void onSubmit()} disabled={saving}>
          {saving ? "Enregistrement..." : "Mettre a jour"}
        </Button>
      </CardHeader>
      <CardContent className={contentClassName}>
        <div className="space-y-1">
          <Label>Nouveau mot de passe</Label>
          <Input
            type="password"
            value={form.newPassword}
            onChange={(event) => onFormChange({ ...form, newPassword: event.target.value })}
            autoComplete="new-password"
          />
        </div>
        <div className="space-y-1">
          <Label>Confirmer le mot de passe</Label>
          <Input
            type="password"
            value={form.confirmPassword}
            onChange={(event) => onFormChange({ ...form, confirmPassword: event.target.value })}
            autoComplete="new-password"
          />
        </div>
        {message ? (
          <p className={messageClassName ?? "text-sm text-[#0A1A2F]/70"}>{message}</p>
        ) : null}
      </CardContent>
    </Card>
  );
}
