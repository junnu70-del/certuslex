import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

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

export async function POST(req: NextRequest) {
  try {
    const { token, signerName, signerEmail } = await req.json();
    const id = req.nextUrl.pathname.split("/").at(-2)!;

    if (!token || !signerName) {
      return NextResponse.json({ error: "Puuttuvat kentät" }, { status: 400 });
    }

    const db = getAdminDb();
    const snap = await db.collection("quotes").doc(id).get();
    if (!snap.exists) return NextResponse.json({ error: "Tarjousta ei löydy" }, { status: 404 });

    const data = snap.data()!;
    if (data.token !== token) return NextResponse.json({ error: "Virheellinen linkki" }, { status: 403 });
    if (data.status === "signed") return NextResponse.json({ error: "Jo allekirjoitettu" }, { status: 409 });

    const signedAt = new Date();
    const ip = req.headers.get("x-forwarded-for") ?? req.headers.get("x-real-ip") ?? "tuntematon";

    await db.collection("quotes").doc(id).update({
      status: "signed",
      signedName: signerName,
      signedEmail: signerEmail || data.clientEmail,
      signedAt,
      signedIp: ip,
    });

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
    const signedDateStr = signedAt.toLocaleString("fi-FI", { day: "numeric", month: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" });

    const confirmHtml = (recipientName: string) => `
<!DOCTYPE html><html lang="fi"><head><meta charset="UTF-8"/></head>
<body style="margin:0;padding:0;background:#F5F2EC;font-family:Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#F5F2EC;padding:40px 0;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border:1px solid #E0D9CE;">
<tr><td style="background:#0F1F3D;padding:24px 32px;border-left:4px solid #C8A44A;">
  <span style="font-size:22px;font-weight:700;color:#fff;">Certus<span style="color:#C8A44A;">Lex</span></span>
</td></tr>
<tr><td style="padding:32px;">
  <p style="font-size:15px;font-weight:600;color:#0F1F3D;margin:0 0 8px;">✅ Tarjous hyväksytty sähköisesti</p>
  <p style="font-size:13px;color:#7A6E60;margin:0 0 24px;">Hei ${recipientName}, tarjous on allekirjoitettu ja sopimus on voimassa.</p>

  <table width="100%" cellpadding="0" cellspacing="0" style="background:#FAF7F2;border:1px solid #E0D9CE;margin-bottom:24px;">
  <tr><td style="padding:20px 24px;">
    <p style="font-size:11px;font-weight:700;letter-spacing:0.1em;color:#0F1F3D;margin:0 0 12px;">ALLEKIRJOITUKSEN TIEDOT</p>
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td style="font-size:12px;color:#7A6E60;padding:4px 0;width:40%;">Projekti</td>
        <td style="font-size:12px;color:#2C2416;font-weight:500;">${data.project?.projectName ?? "—"}</td>
      </tr>
      <tr>
        <td style="font-size:12px;color:#7A6E60;padding:4px 0;">Tarjoaja</td>
        <td style="font-size:12px;color:#2C2416;font-weight:500;">${data.company?.name ?? "—"}</td>
      </tr>
      <tr>
        <td style="font-size:12px;color:#7A6E60;padding:4px 0;">Allekirjoittaja</td>
        <td style="font-size:12px;color:#2C2416;font-weight:500;">${signerName}</td>
      </tr>
      <tr>
        <td style="font-size:12px;color:#7A6E60;padding:4px 0;">Päivämäärä</td>
        <td style="font-size:12px;color:#2C2416;font-weight:500;">${signedDateStr}</td>
      </tr>
      <tr>
        <td style="font-size:12px;color:#7A6E60;padding:4px 0;">Tunniste</td>
        <td style="font-size:11px;color:#2C2416;font-family:monospace;">${id}</td>
      </tr>
    </table>
  </td></tr>
  </table>

  <p style="font-size:12px;color:#A09080;margin:0;">
    Tämä sähköinen allekirjoitus on juridisesti sitova EU:n sähköisen allekirjoituksen asetuksen (eIDAS) mukaisesti yksinkertaisena sähköisenä allekirjoituksena.
  </p>
</td></tr>
<tr><td style="background:#F5F2EC;padding:16px 32px;border-top:1px solid #E0D9CE;">
  <p style="font-size:11px;color:#A09080;margin:0;">© 2026 CertusLex — <a href="https://certuslex.fi" style="color:#C8A44A;text-decoration:none;">certuslex.fi</a></p>
</td></tr>
</table>
</td></tr>
</table>
</body></html>`;

    // Lähetä molemmille
    await Promise.all([
      transporter.sendMail({
        from: `"CertusLex Tarjouskone" <${fromEmail}>`,
        to: data.senderEmail,
        subject: `✅ Tarjous hyväksytty — ${data.project?.projectName ?? ""}`,
        html: confirmHtml(data.company?.contact ?? data.company?.name ?? ""),
      }),
      transporter.sendMail({
        from: `"CertusLex Tarjouskone" <${fromEmail}>`,
        to: signerEmail || data.clientEmail,
        subject: `✅ Tarjous hyväksytty — ${data.project?.projectName ?? ""}`,
        html: confirmHtml(signerName),
      }),
    ]);

    return NextResponse.json({ ok: true, signedAt: signedDateStr });
  } catch (err) {
    console.error("Sign error:", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "Virhe" }, { status: 500 });
  }
}
