import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type JobOfferRow = {
  id: string;
  title: string;
  status: string;
  location: string | null;
};

type ApplicationRow = {
  id: string;
  jobTitle: string;
  candidateName: string;
  status: string;
};

type RhOffersSectionProps = {
  currentSubSection: string;
  jobOffers: JobOfferRow[];
  applications: ApplicationRow[];
};

export function RhOffersSection({
  currentSubSection,
  jobOffers,
  applications,
}: RhOffersSectionProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Offres</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto rounded-lg border border-slate-200">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-[#0A1A2F]/70">
              <tr>
                <th className="px-3 py-2">Titre</th>
                <th className="px-3 py-2">Statut</th>
                <th className="px-3 py-2">Lieu</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {(currentSubSection === "offres_candidatures" ? [] : jobOffers).map((offer) => (
                <tr key={offer.id}>
                  <td className="px-3 py-2">{offer.title}</td>
                  <td className="px-3 py-2">{offer.status}</td>
                  <td className="px-3 py-2">{offer.location ?? "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {currentSubSection === "offres_candidatures" ? (
          <div className="mt-4 overflow-x-auto rounded-lg border border-slate-200">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-[#0A1A2F]/70">
                <tr>
                  <th className="px-3 py-2">Offre</th>
                  <th className="px-3 py-2">Candidat</th>
                  <th className="px-3 py-2">Statut</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {applications.map((application) => (
                  <tr key={application.id}>
                    <td className="px-3 py-2">{application.jobTitle}</td>
                    <td className="px-3 py-2">{application.candidateName}</td>
                    <td className="px-3 py-2">{application.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
