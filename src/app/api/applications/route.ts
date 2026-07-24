import { NextResponse } from "next/server";

import { sanitizeFileName } from "@/lib/document-storage";
import { notifyAdminOfApplication } from "@/lib/email";
import { getCvSupabaseClient } from "@/lib/cv-supabase";

export const runtime = "nodejs";

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
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

    if (!jobId || !firstName || !lastName || !email) {
      return NextResponse.json({ error: "Nom, prénom, e-mail et offre sont obligatoires." }, { status: 400 });
    }
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: "Adresse e-mail invalide." }, { status: 400 });
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

    const client = getCvSupabaseClient();
    const applicationId = crypto.randomUUID();

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

    // Upload du CV dans le Storage du projet CV (best-effort).
    let cvPath: string | null = null;
    try {
      await ensureApplicationBucket(client);
      cvPath = await uploadApplicationFile(client, applicationId, "cv", cv);
    } catch (uploadError) {
      console.error("[applications] upload CV échoué", uploadError);
    }

    // Lien signé vers le CV pour l'e-mail (valable 7 jours).
    let cvLink: string | null = null;
    if (cvPath) {
      const { data: signed } = await client.storage
        .from(storageBucket)
        .createSignedUrl(cvPath, signedUrlTtlSeconds);
      cvLink = signed?.signedUrl ?? null;
    }

    // Enregistrement en base (best-effort — un échec ne bloque ni l'e-mail
    // ni la réponse au candidat, et ne supprime pas le CV uploadé).
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
        cv_path: cvPath,
        cv_filename: cv.name,
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
