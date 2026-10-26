import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SalarieCraInvoiceEditor } from "@/components/dashboard/salarie/cra-invoice-editor";
import type { CraCalendarCell } from "@/domain/cra";
import type { useCraEditor } from "@/features/dashboard/cra/use-cra-editor";
import { WEEKDAY_LABELS, shiftMonthInputValue, formatCraEntryDateLabel } from "@/domain/cra";

type BillingProfileSummary = {
  employeeId: string;
  profileLabel: string;
  employeeName: string;
  dailyRate: number;
  updatedAt: string | null;
};

type EmployeeOption = {
  id: string;
  full_name: string | null;
  email: string;
};

type RhCraInvoiceEditorProps = {
  generateEmployeeId: string;
  billingProfiles: BillingProfileSummary[];
  employees: EmployeeOption[];
  craGenerating: boolean;
  invoiceGenerating: boolean;
  /** Brouillon partage avec l'espace salarie. */
  craEditor: ReturnType<typeof useCraEditor>;
  craCalendarCells: CraCalendarCell[];
  craMissionsLoading: boolean;
  onGenerateEmployeeIdChange: (value: string) => void;
  onGenerateCraPdf: () => void | Promise<void>;
  onGenerateInvoicePdf: () => void | Promise<void>;
  resetCraEditor: () => void;
};

/**
 * CRA et facture generes par le RH pour un collaborateur.
 *
 * Seuls les DEUX SELECTEURS sont propres au RH — quel collaborateur, quel profil de
 * facturation. Toute la saisie est ensuite celle de l'espace salarie : le meme calendrier,
 * les memes entreprises, les memes absences, la meme saisie horaire.
 *
 * Cette page etait auparavant une reimplementation appauvrie du calendrier : ni entreprise,
 * ni absence, ni heures. C'est ce que le partage de `SalarieCraInvoiceEditor` et de
 * `useCraEditor` corrige.
 */
export function RhCraInvoiceEditor({
  generateEmployeeId,
  billingProfiles,
  employees,
  craGenerating,
  invoiceGenerating,
  craEditor,
  craCalendarCells,
  craMissionsLoading,
  onGenerateEmployeeIdChange,
  onGenerateCraPdf,
  onGenerateInvoicePdf,
  resetCraEditor,
}: RhCraInvoiceEditorProps) {
  const employeeChosen = Boolean(generateEmployeeId);

  // Le profil de facturation est TOUJOURS celui du collaborateur choisi : il n'y a plus de
  // second selecteur. Il est affiche pour information, et son absence est signalee car elle
  // empeche la generation.
  const billingProfile =
    billingProfiles.find((profileItem) => profileItem.employeeId === generateEmployeeId) ?? null;

  return (
    <div className="space-y-6">
      <div className="rounded-app-control bg-app-surface-hover px-4 py-3 text-app-sm text-app-text-secondary">
        Cette page permet de generer un CRA et une facture PDF a partir de la meme periode de
        travail.
      </div>

      <div className="max-w-5xl">
        <Card className="border-0 shadow-none">
          <CardHeader>
            <CardTitle className="text-app-md">Collaborateur</CardTitle>
            <p className="mt-1 text-app-sm text-app-text-secondary">
              Selectionne un collaborateur, puis saisis ses jours comme il le ferait lui-meme.
              Son propre profil de facturation est utilise.
            </p>
          </CardHeader>
          <CardContent>
            <div className="max-w-md space-y-1">
              <label className="text-app-sm font-medium">Collaborateur cible</label>
              <select
                value={generateEmployeeId}
                onChange={(event) => onGenerateEmployeeIdChange(event.target.value)}
                className="h-10 w-full rounded-app-control border border-app-line bg-app-field text-app-text placeholder:text-app-text-muted focus-visible:outline-app px-3 text-app-sm"
              >
                <option value="">Choisir un collaborateur</option>
                {employees.map((employee) => (
                  <option key={employee.id} value={employee.id}>
                    {employee.full_name ?? employee.email}
                  </option>
                ))}
              </select>
            </div>

            {employeeChosen && billingProfile ? (
              <p className="mt-3 text-app-sm text-app-text-secondary">
                Profil de facturation : <strong>{billingProfile.profileLabel}</strong>
              </p>
            ) : null}

            {employeeChosen && !billingProfile ? (
              <p className="mt-4 rounded-app-control border border-rejected-line bg-rejected-soft px-4 py-3 text-app-sm text-rejected">
                Ce collaborateur n&apos;a pas de profil de facturation. Renseigne-le avant de
                generer un CRA ou une facture.
              </p>
            ) : null}

            {employeeChosen && !craMissionsLoading && craEditor.craMissions.length === 0 ? (
              <p className="mt-4 rounded-app-control border border-pending-line bg-pending-soft px-4 py-3 text-app-sm text-pending">
                Ce collaborateur n&apos;a aucune entreprise cliente enregistree. La saisie reste
                possible en journees, mais la facture ne pourra pas etre detaillee par
                entreprise.
              </p>
            ) : null}
          </CardContent>
        </Card>
      </div>

      {employeeChosen ? (
        <SalarieCraInvoiceEditor
          billingProfileReady={Boolean(billingProfile)}
          selectedCraId={null}
          selectedCraSummary={null}
          craItems={[]}
          onSelectCra={() => {}}
          resetCraEditor={resetCraEditor}
          onGenerateCraPdf={onGenerateCraPdf}
          onGenerateInvoicePdf={onGenerateInvoicePdf}
          craGenerating={craGenerating}
          invoiceGenerating={invoiceGenerating}
          craCalendarMonth={craEditor.craCalendarMonth}
          craPeriodMonth={craEditor.craPeriodMonth}
          onCraCalendarMonthChange={craEditor.handleCraCalendarMonthChange}
          shiftMonthInputValue={shiftMonthInputValue}
          craDraftTotalDays={craEditor.craDraftTotalDays}
          craNotes={craEditor.craNotes}
          onCraNotesChange={craEditor.setCraNotes}
          invoice={craEditor.invoiceSettings}
          onInvoiceChange={craEditor.setInvoiceSettings}
          weekdayLabels={WEEKDAY_LABELS}
          craCalendarCells={craCalendarCells}
          craEntriesByDate={craEditor.craEntriesByDate}
          craEntries={craEditor.craEntries}
          onCycleCraWorkDate={craEditor.cycleCraWorkDate}
          onFillCraWorkingDays={craEditor.fillCraWorkingDays}
          onClearCraEntries={craEditor.clearCraEntries}
          craTimeUnit={craEditor.craTimeUnit}
          craDraftTotalHours={craEditor.craDraftTotalHours}
          onSetCraEntryHours={craEditor.setCraEntryHours}
          onSetCraEntryTimeSlots={craEditor.setCraEntryTimeSlots}
          onSetCraEntryDayQuantity={craEditor.setCraEntryDayQuantity}
          onRemoveCraWorkDate={craEditor.removeCraWorkDate}
          onApplyCraHoursToAllEntries={craEditor.applyCraHoursToAllEntries}
          craMissions={craEditor.craMissions}
          activeMissionId={craEditor.activeMissionId}
          onSelectMission={craEditor.selectMission}
          craInvoiceLines={craEditor.craInvoiceLines}
          activeAbsenceType={craEditor.activeAbsenceType}
          onSelectAbsence={craEditor.selectAbsence}
          craAbsenceTotals={craEditor.craAbsenceTotals}
          formatCraEntryDateLabel={formatCraEntryDateLabel}
          updateCraEntry={craEditor.updateCraEntry}
        />
      ) : null}
    </div>
  );
}
