"use client";

import { useEffect } from "react";

import { BillingProfileCard } from "@/components/dashboard/billing-profile-card";
import { MissionsCard } from "@/components/dashboard/missions-card";
import { useSalarieBilling } from "@/features/account/use-salarie-billing";

type BillingTabProps = {
  /** Adresse de repli quand aucun profil de facturation n'existe encore. */
  email: string | null;
  onMessage: (message: string | null) => void;
};

/**
 * Facturation du consultant : identite administrative et entreprises clientes.
 *
 * Les deux cartes sont celles de l'ancienne page, inchangees — elles fonctionnaient. Ce
 * qui change, c'est qu'elles ne dependent plus du workspace : le hook les alimente, et il
 * est partage avec l'ecran CRA.
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
    <div className="grid gap-2 xl:grid-cols-2">
      <BillingProfileCard
        form={billing.billingProfileForm}
        onChange={billing.setBillingProfileForm}
        onSubmit={billing.handleBillingProfileSave}
        saving={billing.billingProfileSaving}
        loading={billing.billingProfileLoading}
      />

      <MissionsCard
        missions={billing.missions}
        onSave={billing.handleMissionSave}
        onDelete={billing.handleMissionDelete}
        saving={billing.missionsSaving}
        loading={billing.missionsLoading}
        message={billing.missionsMessage}
        title="Entreprises clientes"
        description="Chaque entreprise porte son tarif et son unité."
      />
    </div>
  );
}
