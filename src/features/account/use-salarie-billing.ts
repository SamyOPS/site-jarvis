"use client";

import { useCallback, useMemo, useState } from "react";

import { createAuthorizedFetch } from "@/lib/dashboard-api";
import type { BillingProfileFormState } from "@/components/account/billing-profile-form";
import type { MissionFormState, MissionItem } from "@/components/dashboard/missions-card";

/**
 * Profil de facturation et entreprises clientes d'un consultant.
 *
 * Extrait de `salarie-workspace` : ces reglages vivaient au milieu du chargement des
 * documents et du CRA, et la page de parametres refondue en a besoin sans rien entrainer
 * du reste. Les deux ecrans partagent desormais ce hook plutot que deux copies vouees a
 * diverger.
 *
 * Le hook ne rend aucun message a l'ecran : il les remonte par `onMessage`, chaque
 * appelant ayant sa propre zone de notification (bandeau du workspace, encart de la page
 * de parametres).
 */

export const emptyBillingProfileForm = (): BillingProfileFormState => ({
  firstName: "",
  lastName: "",
  addressLine1: "",
  addressLine2: "",
  postalCode: "",
  city: "",
  country: "France",
  phone: "",
  email: "",
  siret: "",
  iban: "",
  bic: "",
  timeUnit: "day",
});

type BillingProfilePayload = {
  profile?: Partial<{
    first_name: string | null;
    last_name: string | null;
    company_name: string | null;
    esn_partenaire: string | null;
    address_line_1: string | null;
    address_line_2: string | null;
    postal_code: string | null;
    city: string | null;
    country: string | null;
    phone: string | null;
    email: string | null;
    siret: string | null;
    iban: string | null;
    bic: string | null;
    daily_rate: number | null;
    time_unit: string | null;
  }> | null;
};

type UseSalarieBillingOptions = {
  /** Adresse de repli quand aucun profil de facturation n'existe encore. */
  fallbackEmail?: string | null;
  onMessage: (message: string | null) => void;
};

export function useSalarieBilling({ fallbackEmail, onMessage }: UseSalarieBillingOptions) {
  const callApi = useMemo(() => createAuthorizedFetch("salarie"), []);

  const [billingProfileForm, setBillingProfileForm] =
    useState<BillingProfileFormState>(emptyBillingProfileForm);
  const [billingProfileReady, setBillingProfileReady] = useState(false);
  const [billingProfileLoading, setBillingProfileLoading] = useState(false);
  const [billingProfileSaving, setBillingProfileSaving] = useState(false);

  const [missions, setMissions] = useState<MissionItem[]>([]);
  const [missionsLoading, setMissionsLoading] = useState(false);
  const [missionsSaving, setMissionsSaving] = useState(false);
  const [missionsMessage, setMissionsMessage] = useState<string | null>(null);

  const loadBillingProfile = useCallback(async () => {
    setBillingProfileLoading(true);
    try {
      // Toutes ces colonnes sont nullables en base : daily_rate / iban / bic / siret
      // ne concernent que les auto-entrepreneurs (migration optional_billing_fields),
      // et les autres peuvent etre vides sur un profil incomplet. On les traite donc
      // toutes comme nullables, et le formulaire ne manipule que des chaines.
      const payload = (await callApi("/api/salarie/billing-profile")) as BillingProfilePayload;

      if (!payload.profile) {
        setBillingProfileReady(false);
        setBillingProfileForm((prev) => ({
          ...prev,
          firstName: prev.firstName || "",
          lastName: prev.lastName || "",
          phone: prev.phone || "",
          email: prev.email || fallbackEmail || "",
        }));
        return;
      }

      setBillingProfileForm({
        firstName: payload.profile.first_name ?? "",
        lastName: payload.profile.last_name ?? "",
        addressLine1: payload.profile.address_line_1 ?? "",
        addressLine2: payload.profile.address_line_2 ?? "",
        postalCode: payload.profile.postal_code ?? "",
        city: payload.profile.city ?? "",
        country: payload.profile.country ?? "",
        phone: payload.profile.phone ?? "",
        email: payload.profile.email ?? "",
        siret: payload.profile.siret ?? "",
        iban: payload.profile.iban ?? "",
        bic: payload.profile.bic ?? "",
        timeUnit: payload.profile.time_unit === "hour" ? "hour" : "day",
      });
      setBillingProfileReady(true);
    } finally {
      setBillingProfileLoading(false);
    }
  }, [callApi, fallbackEmail]);

  const handleBillingProfileSave = useCallback(async () => {
    try {
      setBillingProfileSaving(true);
      onMessage(null);
      await callApi("/api/salarie/billing-profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(billingProfileForm),
      });
      // Marque le profil comme utilisable sans attendre la relecture : c'est ce qui
      // debloque la generation du CRA et de la facture des l'enregistrement.
      setBillingProfileReady(true);
      onMessage("Profil de facturation enregistre.");
      await loadBillingProfile();
    } catch (error) {
      onMessage(
        error instanceof Error ? error.message : "Enregistrement du profil impossible.",
      );
    } finally {
      setBillingProfileSaving(false);
    }
  }, [billingProfileForm, callApi, loadBillingProfile, onMessage]);

  const loadMissions = useCallback(async () => {
    try {
      setMissionsLoading(true);
      const payload = (await callApi("/api/salarie/missions")) as {
        items?: MissionItem[];
      } | null;
      setMissions(payload?.items ?? []);
    } catch (error) {
      setMissionsMessage(
        error instanceof Error ? error.message : "Chargement des entreprises impossible.",
      );
    } finally {
      setMissionsLoading(false);
    }
  }, [callApi]);

  const handleMissionSave = useCallback(
    async (form: MissionFormState) => {
      try {
        setMissionsSaving(true);
        setMissionsMessage(null);
        const body = JSON.stringify({
          companyName: form.companyName,
          esnPartenaire: form.esnPartenaire,
          rate: form.rate,
          rateUnit: form.rateUnit,
        });
        await callApi(form.id ? `/api/salarie/missions/${form.id}` : "/api/salarie/missions", {
          method: form.id ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body,
        });
        setMissionsMessage(form.id ? "Entreprise mise a jour." : "Entreprise ajoutee.");
        await loadMissions();
      } catch (error) {
        setMissionsMessage(
          error instanceof Error ? error.message : "Enregistrement de l'entreprise impossible.",
        );
      } finally {
        setMissionsSaving(false);
      }
    },
    [callApi, loadMissions],
  );

  const handleMissionDelete = useCallback(
    async (missionId: string) => {
      const mission = missions.find((item) => item.id === missionId);
      if (
        !window.confirm(
          `Retirer l'entreprise "${mission?.company_name ?? ""}" ? Les CRA deja saisis la conservent.`,
        )
      ) {
        return;
      }

      try {
        setMissionsSaving(true);
        setMissionsMessage(null);
        const payload = (await callApi(`/api/salarie/missions/${missionId}`, {
          method: "DELETE",
        })) as { archived?: boolean } | null;
        setMissionsMessage(
          payload?.archived
            ? "Entreprise archivee : elle reste visible sur les CRA passes."
            : "Entreprise supprimee.",
        );
        await loadMissions();
      } catch (error) {
        setMissionsMessage(
          error instanceof Error ? error.message : "Suppression de l'entreprise impossible.",
        );
      } finally {
        setMissionsSaving(false);
      }
    },
    [callApi, loadMissions, missions],
  );

  return {
    billingProfileForm,
    setBillingProfileForm,
    billingProfileReady,
    billingProfileLoading,
    billingProfileSaving,
    loadBillingProfile,
    handleBillingProfileSave,
    missions,
    missionsLoading,
    missionsSaving,
    missionsMessage,
    loadMissions,
    handleMissionSave,
    handleMissionDelete,
  };
}
