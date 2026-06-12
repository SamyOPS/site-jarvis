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

export async function POST(request: Request) {
  const uploadedPaths: string[] = [];

  try {
    const formData = await request.formData();
    const jobId = String(formData.get("jobId") ?? "").trim();
    const firstName = String(formData.get("firstName") ?? "").trim();
    const lastName = String(formData.get("lastName") ?? "").trim();
    const email = String(formData.get("email") ?? "").trim().toLowerCase();
    const phone = String(formData.get("phone") ?? "").trim();
    const message = String(formData.get("message") ?? "").trim();
    const cv = formData.get("cv");
    const coverLetter = formData.get("coverLetter");

    if (!jobId || !firstName || !lastName || !email) {
      return NextResponse.json({ error: "Nom, prÃ©nom, e-mail et offre sont obligatoires." }, { status: 400 });
    }
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: "Adresse e-mail invalide." }, { status: 400 });
    }
    if (!(cv instanceof File)) {
      return NextResponse.json({ error: "Le CV est obligatoire." }, { status: 400 });
    }

    const cvValidation = validateApplicationFile(cv);
    if (cvValidation) {
      return NextResponse.json({ error: `CV : ${cvValidation}` }, { status: 400 });
    }

    if (coverLetter instanceof File) {
      const coverLetterValidation = validateApplicationFile(coverLetter);
      if (coverLetterValidation) {
        return NextResponse.json({ error: `Lettre de motivation : ${coverLetterValidation}` }, { status: 400 });
      }
    }

    const client = getCvSupabaseClient();
    const { data: offer, error: offerError } = await client
      .from("appels_offres")
      .select("id,title,status")
      .eq("id", jobId)
      .eq("status", "published")
      .is("deleted_at", null)
      .maybeSingle();

    if (offerError || !offer) {
      return NextResponse.json({ error: "Offre introuvable ou non publiÃ©e." }, { status: 404 });
    }

    await ensureApplicationBucket(client);

    const applicationId = crypto.randomUUID();
    const cvPath = await uploadApplicationFile(client, applicationId, "cv", cv);
    uploadedPaths.push(cvPath);

    const coverLetterPath =
      coverLetter instanceof File
        ? await uploadApplicationFile(client, applicationId, "lettre-motivation", coverLetter)
        : null;
    if (coverLetterPath) uploadedPaths.push(coverLetterPath);

    const { data: insertedApplication, error: insertError } = await insertApplicationWithSchemaFallback(client, {
      id: applicationId,
      job_id: jobId,
      first_name: firstName,
      last_name: lastName,
      email,
      phone: phone || null,
      message: message || null,
      cv_url: cvPath,
      cover_letter_url: coverLetterPath,
      status: "submitted",
    });

    const databaseInsertIsBlockedByLegacySchema = insertError
      ? isLegacyApplicationSchemaError(insertError.message)
      : false;

    if ((insertError || !insertedApplication) && !databaseInsertIsBlockedByLegacySchema) {
      await client.storage.from(storageBucket).remove(uploadedPaths);
      return NextResponse.json(
        { error: insertError?.message ?? "Impossible d'enregistrer la candidature." },
        { status: 400 },
      );
    }

    const [cvSigned, coverLetterSigned] = await Promise.all([
      client.storage.from(storageBucket).createSignedUrl(cvPath, 60 * 60 * 24 * 7),
      coverLetterPath
        ? client.storage.from(storageBucket).createSignedUrl(coverLetterPath, 60 * 60 * 24 * 7)
        : Promise.resolve({ data: null, error: null }),
    ]);

    const recipients = getApplicationRecipients();
    if (recipients.length) {
      try {
        await notifyAdminOfApplication({
          adminEmails: recipients,
          candidateName: `${firstName} ${lastName}`,
          candidateEmail: email,
          candidatePhone: phone || null,
          jobTitle: String(offer.title ?? "Offre d'emploi"),
          message: message || null,
          cvLink: cvSigned.data?.signedUrl ?? null,
          coverLetterLink: coverLetterSigned.data?.signedUrl ?? null,
        });
      } catch (emailError) {
        console.error("[applications] notification email failed", emailError);
      }
    }

    return NextResponse.json({
      ok: true,
      applicationId: insertedApplication?.id ?? applicationId,
      stored: Boolean(insertedApplication),
    });
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
    return "format non autorisÃ©. Formats acceptÃ©s : PDF, DOC, DOCX.";
  }
  if (file.type && !allowedMimeTypes.has(file.type)) {
    return "type de fichier non autorisÃ©.";
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

async function insertApplicationWithSchemaFallback(
  client: ReturnType<typeof getCvSupabaseClient>,
  payload: Record<string, string | null>,
) {
  const nextPayload = { ...payload };
  const removedColumns = new Set<string>();

  for (let attempt = 0; attempt < 8; attempt += 1) {
    const result = await client
      .from("applications")
      .insert(nextPayload)
      .select("id")
      .single();

    if (!result.error) {
      return result;
    }

    const missingColumn = getMissingSchemaColumn(result.error.message);
    if (!missingColumn || removedColumns.has(missingColumn) || !(missingColumn in nextPayload)) {
      return result;
    }

    removedColumns.add(missingColumn);
    delete nextPayload[missingColumn];
  }

  return client
    .from("applications")
    .insert(nextPayload)
    .select("id")
    .single();
}

function getMissingSchemaColumn(message: string) {
  const match = /Could not find the '([^']+)' column/i.exec(message);
  return match?.[1] ?? null;
}

function isLegacyApplicationSchemaError(message: string) {
  return /null value in column "cv_id"/i.test(message);
}

function getApplicationRecipients() {
  const raw =
    process.env.APPLICATIONS_TO_EMAIL ||
    "am@jarvis-connect.fr";

  return raw
    .split(",")
    .map((email) => email.trim())
    .filter(Boolean);
}
