import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";

export async function POST(req: NextRequest) {
  try {
    const { to, sessionId, meetingType, date, duration, interviewer, org,
            tilanne, tarpeet, toimet, askeleet, transcript } = await req.json();

    if (!to || !to.includes("@")) {
      return NextResponse.json({ error: "Virheellinen sähköpostiosoite" }, { status: 400 });
    }

    const transporter = nodemailer.createTransport({
      host: "smtp.zoho.eu",
      port: 587,
      secure: false,
      auth: {
        user: process.env.ZOHO_FROM_EMAIL ?? "info@certuslex.fi",
        pass: process.env.ZOHO_SMTP_PASS,
      },
    });

    const from = process.env.ZOHO_FROM_EMAIL ?? "info@certuslex.fi";

    const html = `<!DOCTYPE html>
<html lang="fi">
<head><meta charset="UTF-8"/></head>
<body style="margin:0;padding:0;background:#0a0f1e;font-family:Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0f1e;padding:32px 0;">
  <tr><td align="center">
    <table width="600" cellpadding="0" cellspacing="0" style="background:#111827;border:1px solid rgba(255,255,255,0.08);border-radius:12px;overflow:hidden;">

      <!-- Header -->
      <tr>
        <td style="padding:24px 32px;border-bottom:1px solid rgba(255,255,255,0.08);">
          <span style="font-size:20px;font-weight:700;color:#e8eaf0;">Kenttä<span style="color:#60a5fa;">muistio</span></span>
          <span style="font-size:11px;color:#6b7280;letter-spacing:0.1em;margin-left:12px;">CERTUSLEX</span>
        </td>
      </tr>

      <!-- Meta -->
      <tr>
        <td style="padding:24px 32px 0;">
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td style="width:50%;padding-bottom:12px;">
                <div style="font-size:10px;font-weight:700;letter-spacing:0.1em;color:#6b7280;margin-bottom:4px;">SESSIO-ID</div>
                <div style="font-size:13px;color:#60a5fa;font-family:monospace;">${sessionId}</div>
              </td>
              <td style="width:50%;padding-bottom:12px;">
                <div style="font-size:10px;font-weight:700;letter-spacing:0.1em;color:#6b7280;margin-bottom:4px;">TYYPPI</div>
                <div style="font-size:13px;color:#e8eaf0;">${meetingType}</div>
              </td>
            </tr>
            <tr>
              <td style="padding-bottom:12px;">
                <div style="font-size:10px;font-weight:700;letter-spacing:0.1em;color:#6b7280;margin-bottom:4px;">PÄIVÄMÄÄRÄ</div>
                <div style="font-size:13px;color:#e8eaf0;">${date}</div>
              </td>
              <td style="padding-bottom:12px;">
                <div style="font-size:10px;font-weight:700;letter-spacing:0.1em;color:#6b7280;margin-bottom:4px;">KESTO</div>
                <div style="font-size:13px;color:#e8eaf0;">${duration}</div>
              </td>
            </tr>
            <tr>
              <td colspan="2" style="padding-bottom:20px;">
                <div style="font-size:10px;font-weight:700;letter-spacing:0.1em;color:#6b7280;margin-bottom:4px;">HAASTATTELIJA</div>
                <div style="font-size:13px;color:#e8eaf0;">${interviewer}${org ? " — " + org : ""}</div>
              </td>
            </tr>
          </table>
        </td>
      </tr>

      <!-- Report sections -->
      ${[
        ["TILANTEEN KUVAUS", tilanne],
        ["TUNNISTETUT TARPEET", tarpeet],
        ["SOVITUT TOIMENPITEET", toimet],
        ["SEURAAVAT ASKELEET", askeleet],
      ].map(([label, value]) => `
      <tr>
        <td style="padding:0 32px 16px;">
          <div style="background:#1a2235;border:1px solid rgba(255,255,255,0.08);border-radius:8px;padding:16px 20px;">
            <div style="font-size:10px;font-weight:700;letter-spacing:0.1em;color:#6b7280;margin-bottom:8px;">${label}</div>
            <div style="font-size:13px;color:#e8eaf0;line-height:1.7;white-space:pre-wrap;">${value || "—"}</div>
          </div>
        </td>
      </tr>`).join("")}

      <!-- Transcript -->
      <tr>
        <td style="padding:0 32px 24px;">
          <div style="font-size:10px;font-weight:700;letter-spacing:0.1em;color:#6b7280;margin-bottom:8px;">LITTERAATTI</div>
          <div style="font-size:12px;color:#9ca3af;line-height:1.7;white-space:pre-wrap;border-left:2px solid rgba(255,255,255,0.1);padding-left:12px;">${transcript || "—"}</div>
        </td>
      </tr>

      <!-- Footer -->
      <tr>
        <td style="padding:16px 32px;border-top:1px solid rgba(255,255,255,0.08);">
          <p style="font-size:11px;color:#6b7280;margin:0;">Kenttämuistio — CertusLex &nbsp;|&nbsp; certuslex.fi</p>
        </td>
      </tr>

    </table>
  </td></tr>
</table>
</body>
</html>`;

    await transporter.sendMail({
      from: `"Kenttämuistio" <${from}>`,
      replyTo: from,
      to,
      subject: `Kenttämuistio — ${meetingType} — ${date}`,
      html,
      text: `KENTTÄMUISTIO — ${sessionId}\n\n${meetingType} | ${date} | ${duration}\nHaastattelija: ${interviewer}\n\nTILANNEEN KUVAUS:\n${tilanne}\n\nTUNNISTETUT TARPEET:\n${tarpeet}\n\nSOVITUT TOIMENPITEET:\n${toimet}\n\nSEURAVAT ASKELEET:\n${askeleet}\n\nLITTERAAITTI:\n${transcript}`,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Tuntematon virhe";
    console.error("send-km-report error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
