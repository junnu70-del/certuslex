import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";

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

function buildWordDoc(html: string): Buffer {
  // Strip markdown fences
  let clean = html
    .replace(/^```(?:html)?\s*/i, "").replace(/\s*```\s*$/, "")
    .replace(/<img[^>]*\/?>/gi, "");

  // Jos on täysi HTML-dokumentti, poimii vain body-sisältö + head-tyylit
  let headStyles = "";
  const styleMatch = clean.match(/<style[^>]*>([\s\S]*?)<\/style>/i);
  if (styleMatch) headStyles = `<style>${styleMatch[1]}</style>`;

  const bodyMatch = clean.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  const bodyContent = bodyMatch ? bodyMatch[1] : clean;

  const doc = `<!DOCTYPE html>
<html xmlns:o="urn:schemas-microsoft-com:office:office"
      xmlns:w="urn:schemas-microsoft-com:office:word"
      xmlns="http://www.w3.org/TR/REC-html40">
<head>
  <meta charset="UTF-8">
  <meta name=ProgId content=Word.Document>
  <meta name=Generator content="Microsoft Word 15">
  <!--[if gte mso 9]>
  <xml><w:WordDocument><w:View>Print</w:View><w:Zoom>100</w:Zoom></w:WordDocument></xml>
  <![endif]-->
  ${headStyles}
  <style>
    @page WordSection1 { size:21cm 29.7cm; margin:2cm 2.5cm 2cm 2.5cm; mso-page-orientation:portrait; }
    div.WordSection1 { page: WordSection1; }
    body { font-family: Georgia, serif; font-size: 12pt; }
  </style>
</head>
<body><div class="WordSection1">${bodyContent}</div></body>
</html>`;
  return Buffer.from("﻿" + doc, "utf-8");
}

async function sendCustomerNotification(
  customerEmail: string,
  customerName: string,
  fileName: string,
  status: string,
  juristiComment: string,
  contractId: string,
  korjattuAsiakirja?: string
) {
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
  const statusUrl = `https://www.certuslex.fi/sopimustarkistus/${contractId}`;

  const isApproved = status === "approved";
  const isChanges = status === "changes_requested";

  const subject = isApproved
    ? `✓ Sopimuksesi on tarkistettu — ${fileName}`
    : isChanges
    ? `Sopimuksesi vaatii muutoksia — ${fileName}`
    : `Sopimuksesi käsittely — ${fileName}`;

  const statusText = isApproved
    ? `<span style="color: #2a7a2a; font-weight: 700;">✓ HYVÄKSYTTY</span>`
    : isChanges
    ? `<span style="color: #b86c00; font-weight: 700;">⚠ MUUTOKSIA TARVITAAN</span>`
    : `<span style="color: #8B0000; font-weight: 700;">✗ HYLÄTTY</span>`;

  await transporter.sendMail({
    from: `"CertusLex" <${fromEmail}>`,
    to: customerEmail,
    subject,
    html: `
      <div style="font-family: Georgia, serif; max-width: 600px; margin: 0 auto; background: #F7F4EE; padding: 32px;">
        <div style="background: #0F1F3D; padding: 20px 28px; border-left: 4px solid #C8A44A; margin-bottom: 24px;">
          <span style="font-size: 22px; font-weight: 700; color: #fff;">Certus<span style="color: #C8A44A;">Lex</span></span>
        </div>
        <h2 style="color: #0F1F3D; font-size: 18px; margin-bottom: 8px;">Sopimuksesi on käsitelty</h2>
        <p style="color: #2C2416; font-size: 14px; line-height: 1.6;">
          Hei ${customerName || "asiakasemme"},
        </p>
        <p style="color: #2C2416; font-size: 14px; line-height: 1.6;">
          Asiakirjasi <strong>${fileName}</strong> on tarkistettu.
        </p>
        <div style="background: #fff; border: 1px solid #EDE8DE; padding: 16px 20px; margin: 16px 0;">
          <div style="font-size: 13px; color: #8A8070; letter-spacing: 0.08em; margin-bottom: 6px;">TARKISTUKSEN TULOS</div>
          <div style="font-size: 16px;">${statusText}</div>
        </div>
        ${juristiComment ? `
        <div style="background: #fff; border-left: 3px solid #C8A44A; padding: 16px 20px; margin: 16px 0;">
          <div style="font-size: 13px; color: #8A8070; letter-spacing: 0.08em; margin-bottom: 8px;">JURISTIN KOMMENTTI</div>
          <div style="font-size: 14px; color: #2C2416; line-height: 1.7;">${juristiComment.replace(/\n/g, "<br>")}</div>
        </div>
        ` : ""}
        ${isApproved && korjattuAsiakirja ? `
        <div style="background: #f0f4ff; border-left: 3px solid #2a4a8a; padding: 14px 20px; margin: 16px 0;">
          <div style="font-size: 13px; color: #2a4a8a; font-weight: 700;">📎 Korjattu asiakirja on liitetty tähän viestiin Word-tiedostona (.doc)</div>
          <div style="font-size: 12px; color: #555; margin-top: 4px;">Juristivarmistettu versio — avaa ja tallenna Word-ohjelmalla</div>
        </div>
        ` : ""}
        <a href="${statusUrl}" style="display: inline-block; margin-top: 16px; background: #C8A44A; color: #0F1F3D; padding: 12px 28px; font-weight: 700; font-size: 14px; text-decoration: none; letter-spacing: 0.05em;">
          AVAA TARKISTUS →
        </a>
        <p style="margin-top: 32px; font-size: 12px; color: #8A8070; line-height: 1.6;">
          Jos sinulla on kysyttävää, vastaa tähän sähköpostiin tai ota yhteyttä osoitteeseen info@certuslex.fi
        </p>
        <p style="margin-top: 16px; font-size: 11px; color: #8A8070;">© 2026 CertusLex — certuslex.fi</p>
      </div>
    `,
    attachments: isApproved && korjattuAsiakirja ? [
      {
        filename: `Juristivarmistettu_${fileName.replace(/\.[^.]+$/, "")}.doc`,
        content: buildWordDoc(korjattuAsiakirja),
        contentType: "application/msword",
      }
    ] : [],
  });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const authHeader = req.headers.get("authorization") ?? "";
    const idToken = authHeader.replace("Bearer ", "");

    if (!idToken) {
      return NextResponse.json({ error: "Kirjautuminen vaaditaan" }, { status: 401 });
    }

    const db = getAdminDb();
    const auth = getAuth();

    // Only admins (certuslex.fi email or admin claim)
    let isAdmin = false;
    try {
      const decoded = await auth.verifyIdToken(idToken);
      const email = decoded.email ?? "";
      const adminEmails = ["junnu70@gmail.com", "risto@kurkilaw.com"];
      isAdmin = decoded.admin === true || email.endsWith("@certuslex.fi") || adminEmails.includes(email);
    } catch {
      return NextResponse.json({ error: "Kirjautuminen vaaditaan" }, { status: 401 });
    }

    if (!isAdmin) {
      return NextResponse.json({ error: "Ei oikeuksia" }, { status: 403 });
    }

    const { status, juristiComment } = await req.json();
    const validStatuses = ["approved", "rejected", "changes_requested"];
    if (!validStatuses.includes(status)) {
      return NextResponse.json({ error: "Virheellinen tila" }, { status: 400 });
    }

    const docRef = db.collection("contract_reviews").doc(id);
    const snap = await docRef.get();
    if (!snap.exists) {
      return NextResponse.json({ error: "Sopimusta ei löydy" }, { status: 404 });
    }

    const data = snap.data()!;

    await docRef.update({
      status,
      juristiComment: juristiComment ?? "",
      updatedAt: FieldValue.serverTimestamp(),
    });

    // Notify customer
    if (data.customerEmail) {
      try {
        await sendCustomerNotification(
          data.customerEmail,
          data.customerName ?? "",
          data.fileName ?? "asiakirja",
          status,
          juristiComment ?? "",
          id,
          data.claudeKorjattuAsiakirja ?? ""
        );
      } catch (err) {
        console.error("[contract/approve] Email error:", err);
      }
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[contract/approve] Error:", err);
    return NextResponse.json({ error: "Virhe" }, { status: 500 });
  }
}
