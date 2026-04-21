import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";

export async function POST(req: NextRequest) {
  try {
    const { userEmail, fileName, docId, plan, review, correctedUrl, correctedFileName } = await req.json();

    if (!userEmail || !review) {
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
          <td style="background:#0F1F3D;padding:24px 32px;">
            <span style="font-size:22px;font-weight:700;color:#fff;letter-spacing:0.02em;">
              Certus<span style="color:#C8A44A;">Lex</span>
            </span>
          </td>
        </tr>
        <!-- Body -->
        <tr>
          <td style="padding:32px;">
            <p style="font-size:15px;color:#0F1F3D;margin:0 0 8px;font-weight:600;">
              Lausuntonne on valmis
            </p>
            <p style="font-size:13px;color:#7A6E60;margin:0 0 24px;">
              Asiakirja: <strong>${fileName ?? "—"}</strong> &nbsp;|&nbsp;
              Paketti: ${plan ?? "—"} &nbsp;|&nbsp;
              Tilausnro: <code style="font-size:11px;">${docId ?? "—"}</code>
            </p>

            <div style="border-left:3px solid #C8A44A;padding:16px 20px;background:#FAF7F2;margin-bottom:24px;">
              <p style="font-size:12px;font-weight:700;letter-spacing:0.08em;color:#0F1F3D;margin:0 0 10px;">
                JURIDINEN LAUSUNTO
              </p>
              <p style="font-size:14px;color:#2C2416;line-height:1.75;white-space:pre-wrap;margin:0;">${review}</p>
            </div>

            ${correctedUrl ? `
            <div style="margin-bottom:20px;">
              <a href="${correctedUrl}"
                style="display:inline-block;background:#0F1F3D;color:#C8A44A;padding:10px 20px;font-size:13px;font-weight:600;text-decoration:none;letter-spacing:0.05em;">
                ⬇ Lataa korjattu asiakirja (${correctedFileName ?? "asiakirja"})
              </a>
            </div>` : ""}

            <p style="font-size:13px;color:#7A6E60;margin:0 0 4px;">
              Mikäli teillä on kysyttävää lausunnosta, vastaamme mielellämme.
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
      from: `"${fromName}" <${fromEmail}>`,
      replyTo: fromEmail,
      to: userEmail,
      subject: `CertusLex — Lausuntonne on valmis (${fileName ?? "asiakirja"})`,
      html: htmlBody,
      text: `Hei,\n\nLausuntonne asiakirjalle "${fileName}" on valmis.\n\n---\n${review}\n---\n${correctedUrl ? `\nKorjattu asiakirja: ${correctedUrl}\n` : ""}\nTerveisin,\nCertusLex-tiimi\ninfo@certuslex.fi`,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Email error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Tuntematon virhe" },
      { status: 500 }
    );
  }
}
