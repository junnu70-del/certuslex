import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

function getAdminDb() {
  if (!getApps().length) {
    initializeApp({
      credential: cert({
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
      }),
    });
  }
  return getFirestore();
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { token, name, email, message } = await req.json();
    const { id } = params;

    if (!token || !message) {
      return NextResponse.json({ error: "Puuttuvat kentät" }, { status: 400 });
    }

    const db = getAdminDb();
    const snap = await db.collection("quotes").doc(id).get();
    if (!snap.exists) return NextResponse.json({ error: "Tarjousta ei löydy" }, { status: 404 });

    const data = snap.data()!;
    if (data.token !== token) return NextResponse.json({ error: "Virheellinen linkki" }, { status: 403 });

    const comment = { name: name || "Asiakas", email: email || "", message, createdAt: new Date() };
    await db.collection("quotes").doc(id).update({
      comments: FieldValue.arrayUnion(comment),
      status: "commented",
    });

    // Ilmoitus tarjoajalle
    const transporter = nodemailer.createTransport({
      host: "smtp.zoho.eu",
      port: 587,
      secure: false,
      auth: {
        user: process.env.ZOHO_FROM_EMAIL ?? "info@spinloop.app",
        pass: process.env.ZOHO_SMTP_PASS,
      },
    });

    const fromEmail = process.env.ZOHO_FROM_EMAIL ?? "info@spinloop.app";
    const quoteUrl = `https://certuslex.fi/tarjous/${id}?token=${token}`;

    await transporter.sendMail({
      from: `"CertusLex Tarjouskone" <${fromEmail}>`,
      to: data.senderEmail,
      subject: `💬 Uusi kommentti tarjoukseen — ${data.project?.projectName ?? ""}`,
      html: `
<!DOCTYPE html><html lang="fi"><head><meta charset="UTF-8"/></head>
<body style="margin:0;padding:0;background:#F5F2EC;font-family:Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#F5F2EC;padding:40px 0;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border:1px solid #E0D9CE;">
<tr><td style="background:#0F1F3D;padding:24px 32px;border-left:4px solid #C8A44A;">
  <span style="font-size:22px;font-weight:700;color:#fff;">Certus<span style="color:#C8A44A;">Lex</span></span>
</td></tr>
<tr><td style="padding:32px;">
  <p style="font-size:15px;font-weight:600;color:#0F1F3D;margin:0 0 8px;">Asiakas kommentoi tarjousta</p>
  <p style="font-size:13px;color:#7A6E60;margin:0 0 24px;">Projekti: <strong>${data.project?.projectName ?? "—"}</strong> → ${data.clientName ?? data.clientEmail}</p>
  <div style="border-left:3px solid #C8A44A;padding:14px 18px;background:#FAF7F2;margin-bottom:24px;">
    <p style="font-size:12px;font-weight:700;letter-spacing:0.08em;color:#0F1F3D;margin:0 0 6px;">KOMMENTTI</p>
    <p style="font-size:13px;color:#2C2416;margin:0;">${message}</p>
    <p style="font-size:11px;color:#A09080;margin:8px 0 0;">— ${name || "Asiakas"}${email ? ` (${email})` : ""}</p>
  </div>
  <a href="${quoteUrl}" style="display:inline-block;background:#0F1F3D;color:#C8A44A;padding:10px 20px;font-size:13px;font-weight:600;text-decoration:none;">Avaa tarjous →</a>
</td></tr>
<tr><td style="background:#F5F2EC;padding:16px 32px;border-top:1px solid #E0D9CE;">
  <p style="font-size:11px;color:#A09080;margin:0;">© 2026 CertusLex — <a href="https://certuslex.fi" style="color:#C8A44A;text-decoration:none;">certuslex.fi</a></p>
</td></tr>
</table>
</td></tr>
</table>
</body></html>`,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Comment error:", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "Virhe" }, { status: 500 });
  }
}
