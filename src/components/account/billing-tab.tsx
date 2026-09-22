"use client";

import { useEffect } from "react";

import { BillingProfileForm } from "@/components/account/billing-profile-form";
import { MissionsEditor } from "@/components/dashboard/missions-card";
import { SettingsSection } from "@/components/console/settings-fields";
import { useSalarieBilling } from "@/features/account/use-salarie-billing";

type BillingTabProps = {
  /** Adresse de repli quand aucun profil de facturation n'existe encore. */
  email: string | null;
  onMessage: (message: string | null) => void;
};

/**
 * Facturation du consultant : identite administrative et entreprises clientes.
 *
 * Sections EMPILEES en pleine largeur, comme les autres onglets. La grille a deux colonnes
 * qu'elle utilisait auparavant serrait un formulaire de douze champs dans une demi-page,
 * et rompait la lecture des que l'on passait d'un onglet a l'autre.
 */
export function BillingTab({ email, onMessage }: BillingTabProps) {
  const billing = useSalarieBilling({ fallbackEmail: email, onMessage });
  const { loadBillingProfile, loadMissions } = billing;

  useEffect(() => {
    void loadBillingProfile().catch(() => {
      // Le message est deja remonte par le hook : rien a ajouter ici.
    });
    void loadMissions();
  }, [loadBillingProfile, loadMissions]);

  return (
    <div className="space-y-2">
      <BillingProfileForm
        form={billing.billingProfileForm}
        onChange={billing.setBillingProfileForm}
        onSubmit={billing.handleBillingProfileSave}
        saving={billing.billingProfileSaving}
        loading={billing.billingProfileLoading}
      />

      <SettingsSection
        title="Entreprises clientes"
        description="Une ligne par entreprise, avec son tarif et son unité de saisie. C'est ce couple qui commande la saisie du CRA et le calcul de la facture."
      >
        <MissionsEditor
          missions={billing.missions}
          onSave={billing.handleMissionSave}
          onDelete={billing.handleMissionDelete}
          saving={billing.missionsSaving}
          loading={billing.missionsLoading}
          message={billing.missionsMessage}
        />
      </SettingsSection>
    </div>
  );
}
