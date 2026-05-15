import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";
import Anthropic from "@anthropic-ai/sdk";
// eslint-disable-next-line @typescript-eslint/no-require-imports
const mammoth = require("mammoth") as { extractRawText: (opts: { buffer: Buffer }) => Promise<{ value: string }> };

export const maxDuration = 120; // 2 min — kaksi Claude-kutsua vie aikaa
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

async function generateMuutosuunnitelma(text: string): Promise<string> {
  const msg = await anthropic.messages.create({
    model: "claude-opus-4-5",
    max_tokens: 3000,
    messages: [
      {
        role: "user",
        content: `Olet kokenut suomalainen juristi. Laadi seuraavaan asiakirjaan konkreettinen muutosuunnitelma, jonka toinen juristi voi hyväksyä tai hylätä sellaisenaan.

Muoto (suomenkielinen HTML, ei markdown):

<h3>Muutosuunnitelma</h3>
<p>Lyhyt yhteenveto: mitä ja miksi muutetaan.</p>

<h3>Ehdotetut muutokset</h3>

Listaa jokainen muutos seuraavassa muodossa:
<div class="muutos">
  <div class="muutos-kohta">Kohta / otsikko johon muutos kohdistuu</div>
  <div class="muutos-nykyinen"><strong>Nykyinen teksti:</strong> "..."</div>
  <div class="muutos-ehdotus"><strong>Ehdotettu teksti:</strong> "..."</div>
  <div class="muutos-perustelu"><strong>Perustelu:</strong> Miksi tämä muutos on tarpeen oikeudellisesti.</div>
</div>

Jos kohtaa ei ole olemassa lainkaan, merkitse:
<div class="muutos">
  <div class="muutos-kohta">LISÄTTÄVÄ KOHTA: [otsikko]</div>
  <div class="muutos-nykyinen"><strong>Nykyinen teksti:</strong> (ei olemassa)</div>
  <div class="muutos-ehdotus"><strong>Ehdotettu teksti:</strong> "..."</div>
  <div class="muutos-perustelu"><strong>Perustelu:</strong> ...</div>
</div>

<h3>Muutosten vaikutus</h3>
<p>Lyhyt arvio siitä, miten ehdotetut muutokset parantavat asiakirjan oikeudellista kestävyyttä.</p>

Ole täsmällinen — kirjoita konkreettinen, valmis teksti joka voidaan lähettää asiakkaalle sellaisenaan juristin hyväksynnän jälkeen. ÄLÄ käytä epämääräisiä ilmaisuja kuten "tarkenna" tai "harkitse" — kirjoita valmis ehdotus.

ASIAKIRJA:
${text.slice(0, 8000)}`,
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
        // Allow unauthenticated uploads (customer may not be logged in)
      }
    }

    const body = await req.json();
    const { fileName, mimeType, base64Content, customerEmail, customerName, notes } = body;

    if (!base64Content || !fileName) {
      return NextResponse.json({ error: "Tiedosto puuttuu" }, { status: 400 });
    }

    // Decode base64 → Buffer
    const fileBuffer = Buffer.from(base64Content, "base64");

    // Extract text based on file type
    let contractText = "";
    const lowerName = (fileName ?? "").toLowerCase();
    const lowerMime = (mimeType ?? "").toLowerCase();

    try {
      if (lowerMime.includes("pdf") || lowerName.endsWith(".pdf")) {
        // PDF: yritä poimia tekstiä suoraan binääristä (toimii text-based PDF:ille)
        const raw = fileBuffer.toString("latin1");
        const matches = raw.match(/\(([^\)]{2,200})\)/g) ?? [];
        const extracted = matches
          .map((m) => m.slice(1, -1))
          .filter((s) => /[a-zA-ZäöåÄÖÅ]{3,}/.test(s))
          .join(" ");
        contractText = extracted.length > 200
          ? extracted
          : "[PDF-tiedosto — teksti ei ole suoraan luettavissa. Juristi voi ladata alkuperäisen tiedoston.]";
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

    // Claude analysis + muutosuunnitelma (parallel)
    let analysis = "";
    let muutosuunnitelma = "";
    try {
      [analysis, muutosuunnitelma] = await Promise.all([
        analyzeContract(contractText),
        generateMuutosuunnitelma(contractText),
      ]);
    } catch (err) {
      console.error("[contract/upload] Claude error:", err);
      analysis = "<p>Esianalyysi ei onnistunut. Tarkista asiakirja manuaalisesti.</p>";
      muutosuunnitelma = "<p>Muutosuunnitelma ei onnistunut.</p>";
    }

    // Save to Firestore
    const docRef = db.collection("contract_reviews").doc();
    const contractId = docRef.id;

    await docRef.set({
      contractId,
      fileName,
      mimeType: mimeType ?? "application/octet-stream",
      base64Content, // store for download by juristi
      customerEmail: customerEmail ?? email,
      customerName: customerName ?? "",
      customerUid: uid,
      notes: notes ?? "",
      claudeAnalysis: analysis,
      claudeMuutosuunnitelma: muutosuunnitelma,
      status: "pending_review", // pending_review | approved | rejected | changes_requested
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
