import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";

export async function POST(req: NextRequest) {
  try {
    const { userEmail, fileName, docId, plan, price, deliveryTime, docType } = await req.json();

    if (!userEmail || !docId) {
      return NextResponse.json({ error: "Puuttuvat kentät" }, { status: 400 });
    }

    const transporter = nodemailer.createTransport({
      host: "smtp.zoho.eu",
      port: 587,
      secure: false,
      auth: {
        user: process.env.ZOHO_FROM_EMAIL ?? "info@spinloop.app",
        pass: process.env.ZOHO_SMTP_PASS,
      },
    });

    const fromName = "CertusLex";
    const fromEmail = process.env.ZOHO_FROM_EMAIL ?? "info@spinloop.app";
    const statusUrl = `https://certuslex.fi/tilaus/${docId}`;

    const htmlBody = `
<!DOCTYPE html>
<html lang="fi">
<head><meta charset="UTF-8" /></head>
<body style="margin:0;padding:0;background:#F5F2EC;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F5F2EC;padding:40px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border:1px solid #E0D9CE;">
        <!-- Header -->
        <tr>
          <td style="background:#0F1F3D;padding:24px 32px;border-left:4px solid #C8A44A;">
            <span style="font-size:22px;font-weight:700;color:#fff;letter-spacing:0.02em;">
              Certus<span style="color:#C8A44A;">Lex</span>
            </span>
          </td>
        </tr>
        <!-- Body -->
        <tr>
          <td style="padding:32px;">
            <p style="font-size:15px;color:#0F1F3D;margin:0 0 6px;font-weight:600;">
              Tilausvahvistus — asiakirjanne on vastaanotettu
            </p>
            <p style="font-size:13px;color:#7A6E60;margin:0 0 28px;">
              Kiitos tilauksestanne. OTM-juristi aloittaa tarkastuksen pian.
            </p>

            <!-- Order details box -->
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#FAF7F2;border:1px solid #E0D9CE;margin-bottom:28px;">
              <tr><td style="padding:20px 24px;">
                <p style="font-size:11px;font-weight:700;letter-spacing:0.1em;color:#0F1F3D;margin:0 0 14px;">TILAUKSEN TIEDOT</p>
                <table width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="font-size:12px;color:#7A6E60;padding:5px 0;width:40%;">Asiakirja</td>
                    <td style="font-size:12px;color:#2C2416;font-weight:500;">${fileName ?? "—"}</td>
                  </tr>
                  <tr>
                    <td style="font-size:12px;color:#7A6E60;padding:5px 0;">Asiakirjatyyppi</td>
                    <td style="font-size:12px;color:#2C2416;font-weight:500;">${docType ?? "—"}</td>
                  </tr>
                  <tr>
                    <td style="font-size:12px;color:#7A6E60;padding:5px 0;">Paketti</td>
                    <td style="font-size:12px;color:#2C2416;font-weight:500;">${plan ?? "—"}</td>
                  </tr>
                  <tr>
                    <td style="font-size:12px;color:#7A6E60;padding:5px 0;">Toimitusaika</td>
                    <td style="font-size:12px;color:#2C2416;font-weight:500;">${deliveryTime ?? "—"}</td>
                  </tr>
                  <tr>
                    <td style="font-size:12px;color:#7A6E60;padding:5px 0;">Hinta</td>
                    <td style="font-size:12px;color:#2C2416;font-weight:500;">${price ?? "—"} €</td>
                  </tr>
                  <tr>
                    <td style="font-size:12px;color:#7A6E60;padding:5px 0;border-top:1px solid #E0D9CE;padding-top:10px;margin-top:5px;">Tilausnumero</td>
                    <td style="font-size:11px;color:#2C2416;font-family:monospace;border-top:1px solid #E0D9CE;padding-top:10px;">${docId}</td>
                  </tr>
                </table>
              </td></tr>
            </table>

            <!-- Status link -->
            <div style="border-left:3px solid #C8A44A;padding:14px 18px;background:#FAF7F2;margin-bottom:24px;">
              <p style="font-size:12px;font-weight:700;letter-spacing:0.08em;color:#0F1F3D;margin:0 0 6px;">SEURAA TILAUKSESI ETENEMISTÄ</p>
              <p style="font-size:13px;color:#2C2416;margin:0 0 12px;">Voit seurata asiakirjasi käsittelyvaihetta reaaliajassa alla olevasta linkistä.</p>
              <a href="${statusUrl}" style="display:inline-block;background:#0F1F3D;color:#C8A44A;padding:10px 20px;font-size:13px;font-weight:600;text-decoration:none;letter-spacing:0.05em;">
                Tarkasta tilauksen tila →
              </a>
            </div>

            <!-- Process steps -->
            <p style="font-size:11px;font-weight:700;letter-spacing:0.1em;color:#0F1F3D;margin:0 0 12px;">MITÄ TAPAHTUU SEURAAVAKSI?</p>
            <table width="100%" cellpadding="0" cellspacing="0">
              ${["OTM-juristi vastaanottaa asiakirjanne", "Juristi tarkastaa pykäläviittaukset ja argumentaation", `Saatte lausunnon sähköpostitse ${deliveryTime ?? "—"} kuluessa`].map((step, i) => `
              <tr>
                <td style="width:28px;vertical-align:top;padding:4px 0;">
                  <span style="display:inline-block;width:20px;height:20px;background:#C8A44A;color:#0F1F3D;font-size:11px;font-weight:700;text-align:center;line-height:20px;">${i + 1}</span>
                </td>
                <td style="font-size:12px;color:#4A4035;padding:4px 0 4px 8px;line-height:1.6;">${step}</td>
              </tr>`).join("")}
            </table>

            <p style="font-size:13px;color:#7A6E60;margin:24px 0 4px;">
              Mikäli teillä on kysyttävää, vastaamme mielellämme.
            </p>
            <p style="font-size:13px;color:#7A6E60;margin:0;">
              Terveisin,<br/><strong style="color:#0F1F3D;">CertusLex-tiimi</strong>
            </p>
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style="background:#F5F2EC;padding:16px 32px;border-top:1px solid #E0D9CE;">
            <p style="font-size:11px;color:#A09080;margin:0;">
              © 2026 CertusLex — DeepEnd Oy &nbsp;|&nbsp;
              <a href="https://certuslex.fi" style="color:#C8A44A;text-decoration:none;">certuslex.fi</a> &nbsp;|&nbsp;
              <a href="https://certuslex.fi/tietosuoja" style="color:#C8A44A;text-decoration:none;">Tietosuoja</a>
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

    await transporter.sendMail({
      from: `"${fromName}" <${fromEmail}>`,
      replyTo: fromEmail,
      to: userEmail,
      subject: `CertusLex — Tilausvahvistus (${fileName ?? "asiakirja"})`,
      html: htmlBody,
      text: `Hei,\n\nTilausvahvistus: asiakirjanne "${fileName}" on vastaanotettu.\n\nTilausnumero: ${docId}\nPaketti: ${plan} — ${price} €\nToimitusaika: ${deliveryTime}\n\nSeuraa tilauksen etenemistä:\n${statusUrl}\n\nTerveisin,\nCertusLex-tiimi`,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Confirmation email error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Tuntematon virhe" },
      { status: 500 }
    );
  }
}
