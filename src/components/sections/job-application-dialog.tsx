"use client";

import { useRef, useState, type DragEvent, type ReactNode, type RefObject } from "react";
import { ArrowRight, CheckCircle2, FileText, UploadCloud } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

type JobApplicationDialogProps = {
  jobId: string;
  jobTitle: string;
};

type FileKind = "cv" | "coverLetter";

const acceptedExtensions = ".pdf,.doc,.docx";
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function JobApplicationDialog({ jobId, jobTitle }: JobApplicationDialogProps) {
  const cvInputRef = useRef<HTMLInputElement>(null);
  const coverLetterInputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [cv, setCv] = useState<File | null>(null);
  const [coverLetter, setCoverLetter] = useState<File | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [serverMessage, setServerMessage] = useState("");

  const resetForm = () => {
    setFirstName("");
    setLastName("");
    setEmail("");
    setPhone("");
    setMessage("");
    setCv(null);
    setCoverLetter(null);
    setErrors({});
    if (cvInputRef.current) cvInputRef.current.value = "";
    if (coverLetterInputRef.current) coverLetterInputRef.current.value = "";
  };

  const validate = () => {
    const nextErrors: Record<string, string> = {};
    if (!lastName.trim()) nextErrors.lastName = "Le nom est obligatoire.";
    if (!firstName.trim()) nextErrors.firstName = "Le prénom est obligatoire.";
    if (!emailRegex.test(email.trim())) nextErrors.email = "Adresse e-mail invalide.";
    if (!cv) nextErrors.cv = "Le CV est obligatoire.";
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleFile = (kind: FileKind, file: File | null) => {
    if (!file) return;
    if (kind === "cv") {
      setCv(file);
      setErrors((current) => ({ ...current, cv: "" }));
      return;
    }
    setCoverLetter(file);
  };

  const handleDrop = (kind: FileKind) => (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    handleFile(kind, event.dataTransfer.files.item(0));
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
    formData.set("message", message.trim());
    if (cv) formData.set("cv", cv);
    if (coverLetter) formData.set("coverLetter", coverLetter);

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
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="w-full rounded-full bg-[#0A1A2F] py-6 text-base font-semibold text-white hover:bg-[#0d2a4b]">
          Postuler à cette offre
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl rounded-[28px] border-[#0A1A2F]/10 p-0">
        <div className="overflow-hidden rounded-[28px]">
          <div className="bg-[#0A1A2F] px-6 py-6 text-white sm:px-8">
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold">Candidater simplement</DialogTitle>
              <DialogDescription className="text-white/75">
                Envoyez votre dossier pour {jobTitle}. Les documents sont transmis de manière sécurisée.
              </DialogDescription>
            </DialogHeader>
          </div>

          <div className="space-y-6 bg-white px-6 py-6 sm:px-8">
            {status === "success" && (
              <div className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
                <CheckCircle2 className="mt-0.5 h-5 w-5" />
                <p>{serverMessage}</p>
              </div>
            )}

            {status === "error" && (
              <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">
                {serverMessage}
              </div>
            )}

            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Nom" error={errors.lastName}>
                <Input value={lastName} onChange={(event) => setLastName(event.target.value)} placeholder="Dupont" />
              </Field>
              <Field label="Prénom" error={errors.firstName}>
                <Input value={firstName} onChange={(event) => setFirstName(event.target.value)} placeholder="Camille" />
              </Field>
              <Field label="Adresse e-mail" error={errors.email}>
                <Input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="camille@exemple.fr"
                />
              </Field>
              <Field label="Numéro de téléphone">
                <Input value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="+33 6 00 00 00 00" />
              </Field>
            </div>

            <Field label="Message de motivation (optionnel)">
              <Textarea
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                placeholder="Présentez brièvement votre profil et vos motivations."
                className="min-h-28"
              />
            </Field>

            <div className="mt-8 grid gap-5 md:grid-cols-2">
              <UploadZone
                title="Déposer votre CV"
                file={cv}
                error={errors.cv}
                inputRef={cvInputRef}
                onDrop={handleDrop("cv")}
                onSelect={(file) => handleFile("cv", file)}
              />
              <UploadZone
                title="Déposer votre lettre de motivation"
                file={coverLetter}
                inputRef={coverLetterInputRef}
                onDrop={handleDrop("coverLetter")}
                onSelect={(file) => handleFile("coverLetter", file)}
              />
            </div>

            <Button
              type="button"
              disabled={status === "submitting"}
              onClick={handleSubmit}
              className="w-full rounded-full bg-[#0A1A2F] py-6 text-base font-bold text-white hover:bg-[#0d2a4b] disabled:opacity-60"
            >
              {status === "submitting" ? "Envoi en cours..." : "Envoyer ma candidature"}
            </Button>
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
    <label className="space-y-2 text-sm font-semibold text-[#0A1A2F]">
      <span>{label}</span>
      {children}
      {error && <span className="block text-xs font-medium text-red-600">{error}</span>}
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
      className="rounded-[24px] border border-dashed border-[#0A1A2F]/25 bg-[#F4F7FA] p-5 transition hover:border-[#0A1A2F]/60"
    >
      <input
        ref={inputRef}
        type="file"
        accept={acceptedExtensions}
        className="hidden"
        onChange={(event) => onSelect(event.target.files?.item(0) ?? null)}
      />
      <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#0A1A2F] text-white">
          {file ? <FileText className="h-5 w-5" /> : <UploadCloud className="h-5 w-5" />}
        </div>
        <div>
          <p className="font-bold text-[#0A1A2F]">{title}</p>
          <p className="mt-1 text-xs text-[#0A1A2F]/60">PDF, DOC ou DOCX, glisser-déposer ou sélection.</p>
        </div>
        {file && <p className="max-w-full truncate rounded-full bg-white px-3 py-1 text-xs font-semibold text-[#0A1A2F]">{file.name}</p>}
        <Button
          type="button"
          variant="outline"
          className="rounded-full border-[#0A1A2F] text-[#0A1A2F] hover:bg-[#0A1A2F]/10"
          onClick={() => inputRef.current?.click()}
        >
          Choisir un fichier
        </Button>
        {error && <p className="text-xs font-medium text-red-600">{error}</p>}
      </div>
    </div>
  );
}
