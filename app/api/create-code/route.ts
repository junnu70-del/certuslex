import { NextRequest, NextResponse } from "next/server";
import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import nodemailer from "nodemailer";

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

function generateCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export async function POST(req: NextRequest) {
  try {
    const { adminPassword, recipientEmail, recipientName, label, maxUses } = await req.json() as {
      adminPassword: string;
      recipientEmail: string;
      recipientName: string;
      label: string;
      maxUses: number;
    };

    if (adminPassword !== "certuslex2026") {
      return NextResponse.json({ error: "Ei oikeutta" }, { status: 403 });
    }
    if (!recipientEmail || !maxUses) {
      return NextResponse.json({ error: "Puuttuvat kentät" }, { status: 400 });
    }

    const db = getAdminDb();
    const code = generateCode();

    await db.collection("access_codes").add({
      code,
      label: label || recipientEmail,
      recipientEmail,
      recipientName: recipientName || "",
      maxUses: Number(maxUses),
      usedCount: 0,
      uses: [],
      active: true,
      createdAt: Timestamp.now(),
    });

    // Lähetä sähköposti
    const transporter = nodemailer.createTransport({
      host: "smtp.zoho.eu",
      port: 587,
      secure: false,
      auth: {
        user: process.env.ZOHO_FROM_EMAIL ?? "info@certuslex.fi",
        pass: process.env.ZOHO_SMTP_PASS,
      },
    });

    const fromEmail = process.env.ZOHO_FROM_EMAIL ?? "info@certuslex.fi";
    const codeFormatted = `${code.slice(0, 3)} ${code.slice(3)}`;
    const url = "https://certuslex.fi/koodi";

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
            <span style="font-size:22px;font-weight:700;color:#fff;">Certus<span style="color:#C8A44A;">Lex</span></span>
          </td>
        </tr>
        <tr>
          <td style="padding:32px;">
            <p style="font-size:15px;color:#0F1F3D;margin:0 0 8px;font-weight:600;">
              Hei${recipientName ? " " + recipientName : ""},
            </p>
            <p style="font-size:13px;color:#7A6E60;margin:0 0 28px;line-height:1.6;">
              Teille on luotu henkilökohtainen käyttöoikeus CertusLex-tarjouskoneeseen.
              Alla oleva koodi oikeuttaa <strong style="color:#0F1F3D;">${maxUses} tarjouksen</strong> luomiseen.
            </p>

            <!-- Koodi -->
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#0F1F3D;margin-bottom:28px;">
              <tr><td style="padding:28px;text-align:center;">
                <p style="font-size:11px;font-weight:700;letter-spacing:0.14em;color:#C8A44A;margin:0 0 12px;">HENKILÖKOHTAINEN KÄYTTÖKOODI</p>
                <p style="font-size:42px;font-weight:700;color:#fff;letter-spacing:0.18em;margin:0 0 12px;font-family:monospace;">${codeFormatted}</p>
                <p style="font-size:12px;color:#8A9BB5;margin:0;">${maxUses} käyttökertaa</p>
              </td></tr>
            </table>

            <!-- Ohje -->
            <div style="border-left:3px solid #C8A44A;padding:16px 20px;background:#FAF7F2;margin-bottom:24px;">
              <p style="font-size:12px;font-weight:700;letter-spacing:0.08em;color:#0F1F3D;margin:0 0 10px;">NÄIN PÄÄSET ALKUUN</p>
              <table width="100%" cellpadding="0" cellspacing="0">
                ${[
                  `Siirry osoitteeseen <a href="${url}" style="color:#C8A44A;">${url}</a>`,
                  `Syötä koodi: <strong>${codeFormatted}</strong>`,
                  "Täytä yritystietosi kerran — ne tallentuvat automaattisesti",
                  "Kuvaile projekti → AI generoi ammattimaisen tarjouksen alle minuutissa",
                  "Lähetä tarjous asiakkaalle sähköisesti suoraan järjestelmästä",
                ].map((step, i) => `
                <tr>
                  <td style="width:24px;vertical-align:top;padding:4px 0;">
                    <span style="display:inline-block;width:18px;height:18px;background:#C8A44A;color:#0F1F3D;font-size:10px;font-weight:700;text-align:center;line-height:18px;">${i + 1}</span>
                  </td>
                  <td style="font-size:12px;color:#4A4035;padding:4px 0 4px 8px;line-height:1.6;">${step}</td>
                </tr>`).join("")}
              </table>
            </div>

            <a href="${url}" style="display:inline-block;background:#C8A44A;color:#0F1F3D;padding:12px 28px;font-size:14px;font-weight:700;text-decoration:none;letter-spacing:0.05em;margin-bottom:24px;">
              Aloita tarjouskoneen käyttö →
            </a>

            <p style="font-size:13px;color:#7A6E60;margin:0;">
              Kysymyksiä? Vastaatte mielellämme.<br/>
              Terveisin,<br/><strong style="color:#0F1F3D;">CertusLex-tiimi</strong>
            </p>
          </td>
        </tr>
        <tr>
          <td style="background:#F5F2EC;padding:16px 32px;border-top:1px solid #E0D9CE;">
            <p style="font-size:11px;color:#A09080;margin:0;">
              © 2026 CertusLex &nbsp;|&nbsp;
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
      from: `"CertusLex" <${fromEmail}>`,
      replyTo: fromEmail,
      to: recipientEmail,
      subject: `CertusLex — käyttökoodi: ${codeFormatted}`,
      html: htmlBody,
      text: `Hei${recipientName ? " " + recipientName : ""},\n\nKäyttökoodi CertusLex-tarjouskoneeseen: ${codeFormatted}\n\nKäyttökerrat: ${maxUses}\n\nSiirry osoitteeseen: ${url}\n\nTerveisin,\nCertusLex-tiimi`,
    });

    return NextResponse.json({ ok: true, code, codeFormatted });
  } catch (err) {
    console.error("Create code error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Tuntematon virhe" },
      { status: 500 }
    );
  }
}
