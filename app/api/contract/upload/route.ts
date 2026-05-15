import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";
import Anthropic from "@anthropic-ai/sdk";
// eslint-disable-next-line @typescript-eslint/no-require-imports
const mammoth = require("mammoth") as { extractRawText: (opts: { buffer: Buffer }) => Promise<{ value: string }> };
import { extractText } from "unpdf";

export const maxDuration = 120; // 2 min — kaksi Claude-kutsua vie aikaa
import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";
import { getAuth } from "firebase-admin/auth";

const STORAGE_BUCKET = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ?? "verifylexfi.firebasestorage.app";

function initAdmin() {
  if (!getApps().length) {
    initializeApp({
      credential: cert({
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
      }),
      storageBucket: STORAGE_BUCKET,
    });
  }
}

function getAdminDb() {
  initAdmin();
  return getFirestore();
}

async function uploadToStorage(fileBuffer: Buffer, contractId: string, fileName: string, mimeType: string): Promise<string> {
  initAdmin();
  const bucket = getStorage().bucket(STORAGE_BUCKET);
  const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
  const filePath = `contracts/${contractId}/${safeName}`;
  const file = bucket.file(filePath);
  await file.save(fileBuffer, { contentType: mimeType, resumable: false });
  // Tee julkinen URL (signed, 10 vuotta)
  const [url] = await file.getSignedUrl({
    action: "read",
    expires: "01-01-2035",
  });
  return url;
}

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

async function analyzeContract(text: string): Promise<string> {
  const msg = await anthropic.messages.create({
    model: "claude-opus-4-5",
    max_tokens: 2000,
    messages: [
      {
        role: "user",
        content: `Olet kokenut suomalainen juristi. Analysoi seuraava asiakirja ja laadi lyhyt esianalyysi juristia varten.

Muoto (käytä suomenkielistä HTML:ää, ei markdown):
<h3>Asiakirjatyyppi</h3>
<p>Lyhyt kuvaus asiakirjasta ja sen pääasiallisesta tarkoituksesta.</p>

<h3>Riskit ja huomiot</h3>
<ul>
  <li>...</li>
</ul>

<h3>Puuttuvat tai epäselvät kohdat</h3>
<ul>
  <li>...</li>
</ul>

<h3>Vastuukysymykset</h3>
<p>...</p>

<h3>Suositukset juristille</h3>
<ul>
  <li>...</li>
</ul>

Ole täsmällinen ja käytä ammatillista oikeudellista kieltä. Keskity olennaisiin riskeihin. ÄLÄ kirjoita koko sopimusta uudelleen.

ASIAKIRJA:
${text.slice(0, 8000)}`,
      },
    ],
  });

  const block = msg.content[0];
  return block.type === "text" ? block.text : "";
}

async function generateKorjattuAsiakirja(text: string, fileName: string): Promise<string> {
  const msg = await anthropic.messages.create({
    model: "claude-opus-4-5",
    max_tokens: 4000,
    messages: [
      {
        role: "user",
        content: `Olet kokenut suomalainen juristi. Tehtäväsi on kirjoittaa oheinen asiakirja uudelleen oikeudellisesti päteväksi ja kattavaksi — ei listata muutoksia, vaan tuotetaan VALMIS KORJATTU ASIAKIRJA.

Kirjoita koko asiakirja uudelleen HTML-muodossa, joka on painovalmis Word-dokumenttia varten. Noudata seuraavaa rakennetta:

<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
  body { font-family: Georgia, serif; font-size: 12pt; line-height: 1.6; color: #1a1a1a; max-width: 16cm; margin: 0 auto; }
  h1 { font-size: 16pt; font-weight: bold; text-align: center; margin-bottom: 6pt; }
  h2 { font-size: 13pt; font-weight: bold; margin-top: 18pt; margin-bottom: 6pt; border-bottom: 1px solid #ccc; padding-bottom: 3pt; }
  h3 { font-size: 12pt; font-weight: bold; margin-top: 12pt; }
  p { margin: 6pt 0; text-align: justify; }
  .header-info { text-align: center; margin-bottom: 24pt; color: #444; font-size: 10pt; }
  .osapuolet { background: #f9f9f9; border: 1px solid #ddd; padding: 12pt; margin: 12pt 0; }
  .allekirjoitus { margin-top: 36pt; display: grid; grid-template-columns: 1fr 1fr; gap: 24pt; }
  .allekirjoitus-block { border-top: 1px solid #333; padding-top: 6pt; font-size: 10pt; }
  .juristivarmistettu { background: #f0f4ff; border-left: 3px solid #2a4a8a; padding: 8pt 12pt; margin: 12pt 0; font-size: 10pt; color: #2a4a8a; }
</style>
</head>
<body>

[KIRJOITA TÄHÄN KOKO KORJATTU ASIAKIRJA]

<div class="juristivarmistettu">
  ✓ Tämä asiakirja on tarkistettu ja hyväksytty CertusLex-juristin toimesta. Päivämäärä: ${new Date().toLocaleDateString("fi-FI")}
</div>

</body>
</html>

Ohjeet:
- Säilytä asiakirjan alkuperäinen tarkoitus ja osapuolten tiedot
- Korjaa kaikki oikeudelliset puutteet, epäselvyydet ja riskit
- Lisää puuttuvat standardilausekkeet (vastuunrajoitus, salassapito, erimielisyyksien ratkaisu, irtisanomisehdot jne.) jos ne puuttuvat
- Kirjoita täsmällisellä suomen oikeuskielellä
- Tiedoston nimi: ${fileName}
- ÄLÄ lisää selityksiä tai kommentteja — pelkkä valmis asiakirja

ALKUPERÄINEN ASIAKIRJA:
${text.slice(0, 7000)}`,
      },
    ],
  });

  const block = msg.content[0];
  return block.type === "text" ? block.text : "";
}

async function sendJuristiNotification(contractId: string, fileName: string, customerEmail: string) {
  const transporter = nodemailer.createTransport({
    host: "smtp.zoho.eu",
    port: 587,
    secure: false,
    auth: {
      user: process.env.ZOHO_FROM_EMAIL ?? "info@certuslex.fi",
      pass: process.env.ZOHO_SMTP_PASS,
    },
  });

  const adminUrl = `https://www.certuslex.fi/admin/sopimukset/${contractId}`;

  await transporter.sendMail({
    from: `"CertusLex Järjestelmä" <${process.env.ZOHO_FROM_EMAIL ?? "info@certuslex.fi"}>`,
    to: "info@certuslex.fi",
    subject: `Uusi sopimustarkistus odottaa — ${fileName}`,
    html: `
      <div style="font-family: Georgia, serif; max-width: 600px; margin: 0 auto; background: #F7F4EE; padding: 32px;">
        <div style="background: #0F1F3D; padding: 20px 28px; border-left: 4px solid #C8A44A; margin-bottom: 24px;">
          <span style="font-size: 22px; font-weight: 700; color: #fff;">Certus<span style="color: #C8A44A;">Lex</span></span>
        </div>
        <h2 style="color: #0F1F3D; font-size: 18px; margin-bottom: 12px;">Uusi sopimustarkistuspyyntö</h2>
        <p style="color: #2C2416; font-size: 14px; line-height: 1.6;">
          Asiakas <strong>${customerEmail}</strong> on lähettänyt asiakirjan tarkistettavaksi.<br>
          Tiedostonimi: <strong>${fileName}</strong>
        </p>
        <p style="color: #2C2416; font-size: 14px; line-height: 1.6;">
          Claude on tehnyt esianalyysin. Tarkastele ja hyväksy tai hylkää alla olevasta linkistä.
        </p>
        <a href="${adminUrl}" style="display: inline-block; margin-top: 16px; background: #C8A44A; color: #0F1F3D; padding: 12px 28px; font-weight: 700; font-size: 14px; text-decoration: none; letter-spacing: 0.05em;">
          AVAA TARKISTUS →
        </a>
        <p style="margin-top: 32px; font-size: 11px; color: #8A8070;">CertusLex — certuslex.fi</p>
      </div>
    `,
  });
}

export async function POST(req: NextRequest) {
  try {
    // Auth
    const authHeader = req.headers.get("authorization") ?? "";
    const idToken = authHeader.replace("Bearer ", "");
    const db = getAdminDb();
    const auth = getAuth();

    let uid = "";
    let email = "";
    if (idToken) {
      try {
        const decoded = await auth.verifyIdToken(idToken);
        uid = decoded.uid;
        email = decoded.email ?? "";
      } catch {
        // Allow unauthenticated uploads
      }
    }

    // Lue metadata query parameista, tiedosto binäärinä
    const sp = req.nextUrl.searchParams;
    const fileName = sp.get("fileName") ?? "";
    const mimeType = sp.get("mimeType") ?? "application/octet-stream";
    const customerEmail = sp.get("customerEmail") ?? email;
    const customerName = sp.get("customerName") ?? "";
    const notes = sp.get("notes") ?? "";

    if (!fileName) {
      return NextResponse.json({ error: "Tiedosto puuttuu" }, { status: 400 });
    }

    // Lue tiedosto suoraan binäärinä
    const arrayBuffer = await req.arrayBuffer();
    const fileBuffer = Buffer.from(arrayBuffer);

    if (fileBuffer.length === 0) {
      return NextResponse.json({ error: "Tiedosto on tyhjä" }, { status: 400 });
    }


    // Extract text based on file type
    let contractText = "";
    const lowerName = (fileName ?? "").toLowerCase();
    const lowerMime = (mimeType ?? "").toLowerCase();

    try {
      if (lowerMime.includes("pdf") || lowerName.endsWith(".pdf")) {
        // PDF → unpdf (serverless-compatible pdfjs-dist)
        const { text } = await extractText(new Uint8Array(fileBuffer), { mergePages: true });
        // Siivoa PDF-purun tuottamat ylimääräiset välit
        const cleaned = text
          .replace(/([a-zA-ZäöåÄÖÅ]) ([a-zA-ZäöåÄÖÅ])/g, "$1$2") // "t e k s t i" → "teksti"
          .replace(/([a-zA-ZäöåÄÖÅ]) ([a-zA-ZäöåÄÖÅ])/g, "$1$2") // toinen kierros
          .replace(/([a-zA-ZäöåÄÖÅ]) ([a-zA-ZäöåÄÖÅ])/g, "$1$2") // kolmas kierros
          .replace(/ {2,}/g, " ")   // monta väliä → yksi
          .replace(/\n{3,}/g, "\n\n") // monta tyhjää riviä → kaksi
          .trim();
        contractText = cleaned.length > 100
          ? cleaned
          : "[PDF-tiedosto — tekstin purku ei onnistunut. Juristi voi ladata alkuperäisen tiedoston.]";
      } else if (
        lowerMime.includes("wordprocessingml") ||
        lowerMime.includes("msword") ||
        lowerName.endsWith(".docx") ||
        lowerName.endsWith(".doc")
      ) {
        // Word → extract text via mammoth
        const result = await mammoth.extractRawText({ buffer: fileBuffer });
        contractText = result.value;
      } else {
        // Plain text / fallback
        contractText = fileBuffer.toString("utf-8");
      }
    } catch (parseErr) {
      console.error("[contract/upload] Text extraction error:", parseErr);
      contractText = fileBuffer.toString("utf-8").replace(/[^\x20-\x7EäöåÄÖÅ\n\r\t]/g, " ");
    }

    // Claude analysis + korjattu asiakirja (parallel)
    let analysis = "";
    let korjattuAsiakirja = "";
    try {
      [analysis, korjattuAsiakirja] = await Promise.all([
        analyzeContract(contractText),
        generateKorjattuAsiakirja(contractText, fileName),
      ]);
    } catch (err) {
      console.error("[contract/upload] Claude error:", err);
      analysis = "<p>Esianalyysi ei onnistunut. Tarkista asiakirja manuaalisesti.</p>";
      korjattuAsiakirja = "";
    }

    // Tallenna tiedosto Firebase Storageen
    const docRef = db.collection("contract_reviews").doc();
    const contractId = docRef.id;

    let storageUrl = "";
    try {
      storageUrl = await uploadToStorage(fileBuffer, contractId, fileName, mimeType);
    } catch (err) {
      console.error("[contract/upload] Storage error:", err);
    }

    await docRef.set({
      contractId,
      fileName,
      mimeType: mimeType ?? "application/octet-stream",
      storageUrl, // Firebase Storage URL lataamista varten
      customerEmail: customerEmail ?? email,
      customerName: customerName ?? "",
      customerUid: uid,
      notes: notes ?? "",
      claudeAnalysis: analysis,
      claudeKorjattuAsiakirja: korjattuAsiakirja,
      status: "pending_review",
      juristiComment: "",
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    // Notify juristi
    try {
      await sendJuristiNotification(contractId, fileName, customerEmail ?? email);
    } catch (err) {
      console.error("[contract/upload] Email error:", err);
    }

    return NextResponse.json({ ok: true, contractId });
  } catch (err) {
    console.error("[contract/upload] Error:", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "Virhe" }, { status: 500 });
  }
}
