import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import crypto from "crypto";

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
    const { quoteHtml, company, project, clientEmail, clientName, senderUid, senderAuthEmail } = await req.json();

    if (!quoteHtml || !clientEmail) {
      return NextResponse.json({ error: "Puuttuvat kentät" }, { status: 400 });
    }

    const token = crypto.randomBytes(32).toString("hex");

    const db = getAdminDb();
    const ref = await db.collection("quotes").add({
      quoteHtml,
      company,
      project,
      clientEmail,
      clientName: clientName || project.clientName,
      senderEmail: company.email,
      senderAuthEmail: senderAuthEmail ?? null,
      senderUid: senderUid ?? null,
      token,
      status: "sent",
      comments: [],
      createdAt: new Date(),
    });

    const quoteUrl = `https://certuslex.fi/tarjous/${ref.id}?token=${token}`;

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

    const htmlBody = `
<!DOCTYPE html>
<html lang="fi">
<head><meta charset="UTF-8" /></head>
<body style="margin:0;padding:0;background:#F5F2EC;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F5F2EC;padding:40px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border:1px solid #E0D9CE;">
        <tr>
          <td style="background:#0F1F3D;padding:24px 32px;border-left:4px solid #C8A44A;">
            <span style="font-size:22px;font-weight:700;color:#fff;letter-spacing:0.02em;">
              Certus<span style="color:#C8A44A;">Lex</span>
            </span>
            <span style="font-size:13px;color:#C8A44A;margin-left:12px;">/ Tarjouskone</span>
          </td>
        </tr>
        <tr>
          <td style="padding:32px;">
            <p style="font-size:16px;color:#0F1F3D;margin:0 0 8px;font-weight:600;">
              Tarjous: ${project?.projectName ?? "Projekti"}
            </p>
            <p style="font-size:13px;color:#7A6E60;margin:0 0 28px;">
              ${company?.name ?? ""} on lähettänyt teille tarjouksen. Voitte tarkastella, kommentoida tai allekirjoittaa sen alla olevasta linkistä.
            </p>

            <div style="border-left:3px solid #C8A44A;padding:16px 20px;background:#FAF7F2;margin-bottom:28px;">
              <p style="font-size:12px;font-weight:700;letter-spacing:0.08em;color:#0F1F3D;margin:0 0 8px;">TARJOUS ODOTTAA VASTAUSTANNE</p>
              <p style="font-size:13px;color:#2C2416;margin:0 0 14px;">Voitte joko kommentoida tarjousta tai hyväksyä sen sähköisesti.</p>
              <a href="${quoteUrl}" style="display:inline-block;background:#0F1F3D;color:#C8A44A;padding:12px 24px;font-size:13px;font-weight:600;text-decoration:none;letter-spacing:0.05em;">
                Avaa tarjous ja vastaa →
              </a>
            </div>

            <table width="100%" cellpadding="0" cellspacing="0" style="background:#FAF7F2;border:1px solid #E0D9CE;margin-bottom:24px;">
              <tr><td style="padding:18px 24px;">
                <p style="font-size:11px;font-weight:700;letter-spacing:0.1em;color:#0F1F3D;margin:0 0 12px;">TARJOUKSEN TIEDOT</p>
                <table width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="font-size:12px;color:#7A6E60;padding:4px 0;width:40%;">Tarjoaja</td>
                    <td style="font-size:12px;color:#2C2416;font-weight:500;">${company?.name ?? "—"}</td>
                  </tr>
                  <tr>
                    <td style="font-size:12px;color:#7A6E60;padding:4px 0;">Projekti</td>
                    <td style="font-size:12px;color:#2C2416;font-weight:500;">${project?.projectName ?? "—"}</td>
                  </tr>
                  <tr>
                    <td style="font-size:12px;color:#7A6E60;padding:4px 0;">Yhteyshenkilö</td>
                    <td style="font-size:12px;color:#2C2416;font-weight:500;">${company?.contact ?? "—"}</td>
                  </tr>
                  <tr>
                    <td style="font-size:12px;color:#7A6E60;padding:4px 0;">Sähköposti</td>
                    <td style="font-size:12px;color:#2C2416;font-weight:500;">${company?.email ?? "—"}</td>
                  </tr>
                </table>
              </td></tr>
            </table>

            <p style="font-size:12px;color:#A09080;margin:0;">
              Tämä tarjous on lähetetty CertusLex Tarjouskone-palvelun kautta.
              Linkki on henkilökohtainen — älä jaa sitä muille.
            </p>
          </td>
        </tr>
        <tr>
          <td style="background:#F5F2EC;padding:16px 32px;border-top:1px solid #E0D9CE;">
            <p style="font-size:11px;color:#A09080;margin:0;">
              © 2026 CertusLex — DeepEnd Solutions Oy &nbsp;|&nbsp;
              <a href="https://certuslex.fi" style="color:#C8A44A;text-decoration:none;">certuslex.fi</a>
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

    await transporter.sendMail({
      from: `"${company?.name ?? "CertusLex"}" <${fromEmail}>`,
      replyTo: company?.email ?? fromEmail,
      to: clientEmail,
      subject: `Tarjous: ${project?.projectName ?? "Projekti"} — ${company?.name ?? ""}`,
      html: htmlBody,
      text: `Hei,\n\n${company?.name ?? ""} on lähettänyt teille tarjouksen projektista "${project?.projectName ?? ""}".\n\nAvaa tarjous ja vastaa:\n${quoteUrl}\n\nTerveisin,\n${company?.name ?? "CertusLex"}`,
    });

    return NextResponse.json({ ok: true, quoteId: ref.id, token });
  } catch (err) {
    console.error("Send quote error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Tuntematon virhe" },
      { status: 500 }
    );
  }
}
