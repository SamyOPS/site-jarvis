import { NextResponse } from "next/server";

import {
  APPLICATION_GUARD,
  checkApplicationLimits,
  getClientIp,
  hashClientIp,
  isHoneypotFilled,
  isSubmittedTooFast,
} from "@/lib/application-guard";
import { sanitizeFileName } from "@/lib/document-storage";
import { notifyAdminOfApplication } from "@/lib/email";
import { getCvSupabaseClient } from "@/lib/cv-supabase";

export const runtime = "nodejs";

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const allowedMimeTypes = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);
const allowedExtensions = new Set(["pdf", "doc", "docx"]);
const maxFileSize = 5 * 1024 * 1024;
const storageBucket = "application-documents";
const applicationsTable = "job_applications";
const signedUrlTtlSeconds = 60 * 60 * 24 * 7;

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const jobId = String(formData.get("jobId") ?? "").trim();
    const firstName = String(formData.get("firstName") ?? "").trim();
    const lastName = String(formData.get("lastName") ?? "").trim();
    const email = String(formData.get("email") ?? "").trim().toLowerCase();
    const phone = String(formData.get("phone") ?? "").trim();
    const salaryRaw = String(formData.get("salaryExpectation") ?? "").trim();
    const cv = formData.get("cv");

    /*
     * Champ piege. Rempli, l'envoi ne vient pas d'un humain : il n'existe que dans le DOM,
     * hors ecran et hors de l'ordre de tabulation.
     *
     * On repond 200 comme a une candidature acceptee, et on ne fait RIEN. Un 400 apprendrait
     * au robot que le champ est piege, et il suffirait de le laisser vide au tour suivant.
     */
    if (isHoneypotFilled(formData)) {
      return NextResponse.json({ ok: true, applicationId: crypto.randomUUID(), stored: false, emailed: false });
    }

    if (!jobId || !firstName || !lastName || !email) {
      return NextResponse.json({ error: "Nom, prénom, e-mail et offre sont obligatoires." }, { status: 400 });
    }
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: "Adresse e-mail invalide." }, { status: 400 });
    }
    // `job_id` est une colonne uuid : une valeur d'une autre forme ferait echouer les
    // comptages anti-spam au lieu de les faire repondre, et le plafond passerait a la trappe.
    if (!uuidRegex.test(jobId)) {
      return NextResponse.json({ error: "Offre inconnue." }, { status: 400 });
    }
    const salaryExpectation = Number(salaryRaw);
    if (!salaryRaw || !Number.isFinite(salaryExpectation) || salaryExpectation <= 0) {
      return NextResponse.json({ error: "La prétention salariale annuelle est obligatoire." }, { status: 400 });
    }
    if (!(cv instanceof File)) {
      return NextResponse.json({ error: "Le CV est obligatoire." }, { status: 400 });
    }

    const cvValidation = validateApplicationFile(cv);
    if (cvValidation) {
      return NextResponse.json({ error: `CV : ${cvValidation}` }, { status: 400 });
    }

    /*
     * Temps passe sur le formulaire : personne ne remplit cinq champs et ne choisit un
     * fichier en moins de trois secondes.
     */
    if (isSubmittedTooFast(formData.get(APPLICATION_GUARD.elapsedField))) {
      return NextResponse.json(
        { error: "Envoi trop rapide. Merci de réessayer." },
        { status: 429 },
      );
    }

    const client = getCvSupabaseClient();
    const applicationId = crypto.randomUUID();
    const ipHash = hashClientIp(getClientIp(request));

    // Plafonds AVANT l'upload, l'insertion et l'e-mail : c'est tout l'interet, ne rien
    // depenser pour un envoi qu'on refuse.
    const rejection = await checkApplicationLimits(client, { ipHash, email, jobId });
    if (rejection) {
      return NextResponse.json({ error: rejection.error }, { status: rejection.status });
    }

    // Titre de l'offre (best-effort — ne doit jamais bloquer la candidature).
    let jobTitle = "Offre d'emploi";
    try {
      const { data: offer } = await client
        .from("appels_offres")
        .select("title")
        .eq("id", jobId)
        .is("deleted_at", null)
        .maybeSingle();
      if (offer?.title) jobTitle = String(offer.title);
    } catch (offerError) {
      console.error("[applications] lookup offre échoué", offerError);
    }

    /*
     * Enregistrement AVANT l'upload, et non plus après.
     *
     * Cette ligne est le REGISTRE sur lequel s'appuient les plafonds anti-spam : tant
     * qu'elle n'existe pas, l'envoi suivant ne compte pas celui-ci et le plafond ne tient
     * plus. L'écrire d'abord évite aussi de dépenser un upload de 5 Mo pour une
     * candidature qu'on n'aurait pas su enregistrer, et lui laisse survivre à un échec de
     * l'upload — jusqu'ici, un Storage indisponible perdait le candidat.
     *
     * Best-effort inchangé : un échec ici ne bloque ni l'e-mail ni la réponse. Le plafond
     * par IP se relâche alors, l'e-mail reste le filet.
     */
    let stored = false;
    try {
      const { error: insertError } = await client.from(applicationsTable).insert({
        id: applicationId,
        job_id: jobId,
        job_title: jobTitle,
        first_name: firstName,
        last_name: lastName,
        email,
        phone: phone || null,
        salary_expectation: salaryExpectation,
        cv_filename: cv.name,
        ip_hash: ipHash,
        status: "submitted",
      });
      if (insertError) {
        console.error("[applications] enregistrement base échoué", insertError.message);
      } else {
        stored = true;
      }
    } catch (dbError) {
      console.error("[applications] enregistrement base échoué", dbError);
    }

    // Upload du CV dans le Storage du projet CV (best-effort).
    let cvPath: string | null = null;
    try {
      await ensureApplicationBucket(client);
      cvPath = await uploadApplicationFile(client, applicationId, "cv", cv);
    } catch (uploadError) {
      console.error("[applications] upload CV échoué", uploadError);
    }

    // Rattachement du CV à la ligne déjà écrite.
    if (stored && cvPath) {
      const { error: attachError } = await client
        .from(applicationsTable)
        .update({ cv_path: cvPath })
        .eq("id", applicationId);
      if (attachError) {
        console.error("[applications] rattachement du CV échoué", attachError.message);
      }
    }

    // Lien signé vers le CV pour l'e-mail (valable 7 jours).
    let cvLink: string | null = null;
    if (cvPath) {
      const { data: signed } = await client.storage
        .from(storageBucket)
        .createSignedUrl(cvPath, signedUrlTtlSeconds);
      cvLink = signed?.signedUrl ?? null;
    }

    // Notification e-mail — toujours envoyée à l'adresse de destination.
    const recipients = getApplicationRecipients();
    let emailed = false;
    if (recipients.length) {
      try {
        const result = await notifyAdminOfApplication({
          adminEmails: recipients,
          candidateName: `${firstName} ${lastName}`,
          candidateEmail: email,
          candidatePhone: phone || null,
          jobTitle,
          salaryExpectation,
          cvLink,
        });
        emailed = Boolean(result?.ok);
      } catch (emailError) {
        console.error("[applications] notification e-mail échouée", emailError);
      }
    }

    return NextResponse.json({ ok: true, applicationId, stored, emailed });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erreur serveur." },
      { status: 500 },
    );
  }
}

function validateApplicationFile(file: File) {
  const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (!allowedExtensions.has(extension)) {
    return "format non autorisé. Formats acceptés : PDF, DOC, DOCX.";
  }
  if (file.type && !allowedMimeTypes.has(file.type)) {
    return "type de fichier non autorisé.";
  }
  if (file.size > maxFileSize) {
    return "fichier trop volumineux. Taille maximale : 5 Mo.";
  }
  if (file.size === 0) {
    return "fichier vide.";
  }
  return null;
}

async function uploadApplicationFile(
  client: ReturnType<typeof getCvSupabaseClient>,
  applicationId: string,
  kind: string,
  file: File,
) {
  const safeFileName = sanitizeFileName(file.name);
  const storagePath = `${applicationId}/${kind}-${safeFileName}`;
  const fileBuffer = Buffer.from(await file.arrayBuffer());
  const { error } = await client.storage.from(storageBucket).upload(storagePath, fileBuffer, {
    contentType: file.type || undefined,
    upsert: false,
  });

  if (error) {
    throw new Error(error.message);
  }

  return storagePath;
}

async function ensureApplicationBucket(client: ReturnType<typeof getCvSupabaseClient>) {
  const { data: buckets, error: listError } = await client.storage.listBuckets();
  if (listError) {
    throw new Error(`Vérification du bucket impossible : ${listError.message}`);
  }

  if (buckets?.some((bucket) => bucket.id === storageBucket || bucket.name === storageBucket)) {
    return;
  }

  const { error: createError } = await client.storage.createBucket(storageBucket, {
    public: false,
    fileSizeLimit: maxFileSize,
    allowedMimeTypes: Array.from(allowedMimeTypes),
  });

  if (createError && !/already exists/i.test(createError.message)) {
    throw new Error(`Création du bucket impossible : ${createError.message}`);
  }
}

function getApplicationRecipients() {
  const raw = process.env.APPLICATIONS_TO_EMAIL || "am@jarvis-connect.fr";

  return raw
    .split(",")
    .map((email) => email.trim())
    .filter(Boolean);
}
