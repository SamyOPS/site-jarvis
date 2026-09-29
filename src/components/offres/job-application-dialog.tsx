"use client";

import { useRef, useState, type DragEvent, type ReactNode, type RefObject } from "react";
import { ArrowRight, CircleAlert, CircleCheck, FileText, UploadCloud } from "lucide-react";

import {
  FIELD,
  LABEL,
  MESSAGE,
  PILL_PRIMARY,
  PILL_SECONDARY,
} from "@/components/auth/auth-styles";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { VITRINE_FONT_VARS } from "@/features/vitrine/fonts";

// `Input` porte un cadre arrondi et un anneau de focus par defaut : FIELD les remplace
// par un filet bas, l'anneau est retire.
const INPUT = `${FIELD} focus-visible:ring-0 focus-visible:ring-offset-0`;
const SPINNER =
  "h-3 w-3 animate-spin rounded-full border border-white/40 border-t-white motion-reduce:animate-none";
type JobApplicationDialogProps = {
  jobId: string;
  jobTitle: string;
};

const acceptedExtensions = ".pdf,.doc,.docx";
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function JobApplicationDialog({ jobId, jobTitle }: JobApplicationDialogProps) {
  const cvInputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [salaryExpectation, setSalaryExpectation] = useState("");
  const [cv, setCv] = useState<File | null>(null);
  /*
   * Champ piege : invisible pour un humain, donc toujours vide quand un humain envoie.
   * Le serveur repond alors 200 sans rien faire (cf. src/lib/application-guard.ts).
   */
  const [companyWebsite, setCompanyWebsite] = useState("");
  /*
   * Instant d'ouverture du formulaire, pour en mesurer la DUREE de remplissage.
   *
   * On envoie une duree et non un horodatage : mesuree aux deux bouts avec la meme
   * horloge, elle ne depend pas du reglage de l'horloge du visiteur. Un horodatage en
   * avance de quelques minutes aurait fait refuser des candidats reels.
   *
   * Renseigne a l'ouverture du dialogue, pas au rendu : `Date.now()` est impur et n'a rien
   * a faire dans un corps de composant. A zero, la duree calculee est enorme, donc jamais
   * « trop rapide » — un formulaire ouvert autrement ne bloque personne.
   */
  const openedAtRef = useRef<number>(0);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [serverMessage, setServerMessage] = useState("");

  const resetForm = () => {
    setFirstName("");
    setLastName("");
    setEmail("");
    setPhone("");
    setSalaryExpectation("");
    setCv(null);
    setCompanyWebsite("");
    setErrors({});
    if (cvInputRef.current) cvInputRef.current.value = "";
  };

  const validate = () => {
    const nextErrors: Record<string, string> = {};
    if (!lastName.trim()) nextErrors.lastName = "Le nom est obligatoire.";
    if (!firstName.trim()) nextErrors.firstName = "Le prénom est obligatoire.";
    if (!emailRegex.test(email.trim())) nextErrors.email = "Adresse e-mail invalide.";
    const salary = Number(salaryExpectation.trim());
    if (!salaryExpectation.trim() || !Number.isFinite(salary) || salary <= 0) {
      nextErrors.salaryExpectation = "Indiquez votre prétention salariale annuelle.";
    }
    if (!cv) nextErrors.cv = "Le CV est obligatoire.";
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleFile = (file: File | null) => {
    if (!file) return;
    setCv(file);
    setErrors((current) => ({ ...current, cv: "" }));
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    handleFile(event.dataTransfer.files.item(0));
  };

  const handleSubmit = async () => {
    if (status === "submitting" || !validate()) return;
    setStatus("submitting");
    setServerMessage("");

    const formData = new FormData();
    formData.set("jobId", jobId);
    formData.set("firstName", firstName.trim());
    formData.set("lastName", lastName.trim());
    formData.set("email", email.trim());
    formData.set("phone", phone.trim());
    formData.set("salaryExpectation", salaryExpectation.trim());
    formData.set("companyWebsite", companyWebsite);
    formData.set("elapsedMs", String(Date.now() - openedAtRef.current));
    if (cv) formData.set("cv", cv);

    try {
      const response = await fetch("/api/applications", {
        method: "POST",
        body: formData,
      });
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;

      if (!response.ok) {
        setStatus("error");
        setServerMessage(payload?.error ?? "Impossible d'envoyer la candidature pour le moment.");
        return;
      }

      setStatus("success");
      setServerMessage("Votre candidature a bien été envoyée. Notre équipe l'étudiera dans les meilleurs délais.");
      resetForm();
    } catch {
      setStatus("error");
      setServerMessage("Une erreur réseau est survenue. Merci de réessayer.");
    }
  };


  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (nextOpen) openedAtRef.current = Date.now();
        setOpen(nextOpen);
      }}
    >
      <DialogTrigger asChild>
        <button type="button" className={`${PILL_PRIMARY} w-full`}>
          Postuler à cette offre
          <ArrowRight aria-hidden className="h-4 w-4" />
        </button>
      </DialogTrigger>
      {/*
        Le dialogue est rendu dans un portail, hors de l'enveloppe de la page : il repose
        lui-meme les polices de la vitrine, et Geist en style direct (`font-sans` est fige
        sur Inter par `@theme inline`).
      */}
      <DialogContent
        className={`${VITRINE_FONT_VARS} max-w-3xl rounded-none border-zinc-900 bg-white p-0 text-zinc-900 shadow-none sm:p-0`}
        style={{ fontFamily: "var(--font-geist-sans)" }}
      >
        <div>
          <div className="border-b border-zinc-900/25 px-6 pb-6 pt-8 sm:px-10 sm:pt-10">
            <DialogHeader className="text-left">
              <DialogTitle className="pr-8 text-[clamp(1.75rem,4vw,2.75rem)] font-bold uppercase leading-[0.95] tracking-tight">
                Candidater simplement
              </DialogTitle>
              <DialogDescription className="mt-3 text-sm leading-relaxed text-zinc-500 sm:text-base">
                Envoyez votre dossier pour {jobTitle}. Les documents sont transmis de manière sécurisée.
              </DialogDescription>
            </DialogHeader>
          </div>

          <div className="space-y-8 px-6 py-8 sm:px-10">
            {status === "success" && (
              <div className={MESSAGE}>
                <CircleCheck aria-hidden className="mt-1 h-4 w-4 shrink-0" />
                <p>{serverMessage}</p>
              </div>
            )}

            {status === "error" && (
              <div className={MESSAGE}>
                <CircleAlert aria-hidden className="mt-1 h-4 w-4 shrink-0" />
                <span>{serverMessage}</span>
              </div>
            )}

            <div className="grid gap-6 md:grid-cols-2">
              <Field label="Nom" error={errors.lastName}>
                <Input value={lastName} onChange={(event) => setLastName(event.target.value)} placeholder="Dupont" className={INPUT} />
              </Field>
              <Field label="Prénom" error={errors.firstName}>
                <Input value={firstName} onChange={(event) => setFirstName(event.target.value)} placeholder="Camille" className={INPUT} />
              </Field>
              <Field label="Adresse e-mail" error={errors.email}>
                <Input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="camille@exemple.fr"
                  className={INPUT}
                />
              </Field>
              <Field label="Numéro de téléphone">
                <Input value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="+33 6 00 00 00 00" className={INPUT} />
              </Field>
              <Field label="Prétention salariale annuelle (€ brut / an)" error={errors.salaryExpectation}>
                <Input
                  type="number"
                  min="0"
                  step="1000"
                  inputMode="numeric"
                  value={salaryExpectation}
                  onChange={(event) => setSalaryExpectation(event.target.value)}
                  placeholder="Ex : 45000"
                  className={INPUT}
                />
              </Field>
            </div>

            {/*
              Champ piege.

              Sorti du flux plutot que masque par `display:none` ou `hidden`, que les
              robots un peu sérieux savent ignorer. `aria-hidden` et `tabIndex={-1}` le
              retirent du fil accessible et de l'ordre de tabulation : un lecteur d'ecran
              comme une navigation au clavier ne peuvent jamais l'atteindre, et donc jamais
              le remplir par accident.
            */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute left-[-9999px] h-px w-px overflow-hidden"
            >
              <label htmlFor="company-website">Site web de votre entreprise</label>
              <input
                id="company-website"
                name="companyWebsite"
                type="text"
                tabIndex={-1}
                autoComplete="off"
                value={companyWebsite}
                onChange={(event) => setCompanyWebsite(event.target.value)}
              />
            </div>

            <div>
              <UploadZone
                title="Déposer votre CV"
                file={cv}
                error={errors.cv}
                inputRef={cvInputRef}
                onDrop={handleDrop}
                onSelect={handleFile}
              />
            </div>

            <button
              type="button"
              disabled={status === "submitting"}
              onClick={handleSubmit}
              className={`${PILL_PRIMARY} w-full`}
            >
              {status === "submitting" && <span aria-hidden className={SPINNER} />}
              {status === "submitting" ? "Envoi en cours..." : "Envoyer ma candidature"}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className={LABEL}>{label}</span>
      {children}
      {error && (
        <span className="mt-2 flex items-center gap-2 text-xs font-semibold text-zinc-900">
          <CircleAlert aria-hidden className="h-3 w-3 shrink-0" />
          {error}
        </span>
      )}
    </label>
  );
}

function UploadZone({
  title,
  file,
  error,
  inputRef,
  onDrop,
  onSelect,
}: {
  title: string;
  file: File | null;
  error?: string;
  inputRef: RefObject<HTMLInputElement | null>;
  onDrop: (event: DragEvent<HTMLDivElement>) => void;
  onSelect: (file: File | null) => void;
}) {
  return (
    <div
      onDragOver={(event) => event.preventDefault()}
      onDrop={onDrop}
      className="border border-dashed border-zinc-900/25 p-6 transition-colors duration-300 hover:border-zinc-900"
    >
      <input
        ref={inputRef}
        type="file"
        accept={acceptedExtensions}
        className="hidden"
        onChange={(event) => onSelect(event.target.files?.item(0) ?? null)}
      />
      <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full border border-zinc-900">
          {file ? <FileText aria-hidden className="h-5 w-5" /> : <UploadCloud aria-hidden className="h-5 w-5" />}
        </div>
        <div>
          <p className="text-sm font-bold uppercase tracking-tight">{title}</p>
          <p className="mt-1 text-xs text-zinc-500">PDF, DOC ou DOCX, glisser-déposer ou sélection.</p>
        </div>
        {file && (
          <p className="max-w-full truncate rounded-full border border-zinc-900/25 px-3 py-1 text-xs font-semibold">
            {file.name}
          </p>
        )}
        <button
          type="button"
          className={PILL_SECONDARY}
          onClick={() => inputRef.current?.click()}
        >
          Choisir un fichier
        </button>
        {error && (
          <p className="flex items-center gap-2 text-xs font-semibold text-zinc-900">
            <CircleAlert aria-hidden className="h-3 w-3 shrink-0" />
            {error}
          </p>
        )}
      </div>
    </div>
  );
}
