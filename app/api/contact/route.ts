import { NextResponse } from "next/server";

interface ContactPayload {
  email?: string;
  firstName?: string;
  lastName?: string;
  subject?: string;
  message?: string;
}

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const nameRegex = /^[A-Za-z\u00C0-\u024F' -]{2,50}$/;

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as ContactPayload;

    const email = String(body.email ?? "").trim();
    const firstName = String(body.firstName ?? "").trim();
    const lastName = String(body.lastName ?? "").trim();
    const subject = String(body.subject ?? "").trim();
    const message = String(body.message ?? "").trim();

    if (!email || !firstName || !lastName || !subject || !message) {
      return NextResponse.json({ error: "Tous les champs sont obligatoires." }, { status: 400 });
    }

    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: "Adresse email invalide." }, { status: 400 });
    }

    if (!nameRegex.test(firstName) || !nameRegex.test(lastName)) {
      return NextResponse.json({ error: "Nom ou pr?nom invalide." }, { status: 400 });
    }

    if (subject.length < 3 || subject.length > 120) {
      return NextResponse.json({ error: "Objet invalide." }, { status: 400 });
    }

    const resendApiKey = process.env.RESEND_API_KEY;
    const toEmail = process.env.CONTACT_TO_EMAIL;
    const fromEmail = process.env.CONTACT_FROM_EMAIL || "onboarding@resend.dev";

    if (!resendApiKey || !toEmail) {
      return NextResponse.json(
        { error: "Configuration email manquante (RESEND_API_KEY / CONTACT_TO_EMAIL)." },
        { status: 500 }
      );
    }

    const html = `
      <div style="font-family:Arial,sans-serif;line-height:1.5;color:#111">
        <h2>Nouveau message - formulaire contact</h2>
        <p><strong>Nom :</strong> ${escapeHtml(firstName)} ${escapeHtml(lastName)}</p>
        <p><strong>Email :</strong> ${escapeHtml(email)}</p>
        <p><strong>Objet :</strong> ${escapeHtml(subject)}</p>
        <hr />
        <p style="white-space:pre-wrap">${escapeHtml(message)}</p>
      </div>
    `;

    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [toEmail],
        reply_to: email,
        subject: `[Contact] ${subject}`,
        html,
      }),
      cache: "no-store",
    });

    if (!resendResponse.ok) {
      const details = await safeJson(resendResponse);
      return NextResponse.json(
        { error: "Erreur envoi email", details },
        { status: 502 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Requ?te invalide." }, { status: 400 });
  }
}

async function safeJson(response: Response) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
