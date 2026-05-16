import { NextRequest, NextResponse } from "next/server";
import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

export const maxDuration = 120;

function initAdmin() {
  if (!getApps().length) {
    initializeApp({
      credential: cert({
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
      }),
    });
  }
}

export async function POST(req: NextRequest) {
  try {
    initAdmin();
    const db = getFirestore();

    const { docId, storageUrl, fileName, docType, userEmail, plan } = await req.json();

    if (!docId || !storageUrl) {
      return NextResponse.json({ error: "docId ja storageUrl vaaditaan" }, { status: 400 });
    }

    // Lataa tiedosto Firebase Storagesta
    const fileRes = await fetch(storageUrl);
    if (!fileRes.ok) throw new Error("Tiedoston lataus epäonnistui");
    const arrayBuffer = await fileRes.arrayBuffer();
    const fileBuffer = Buffer.from(arrayBuffer);

    // Ekstraktoi teksti
    const { extractText } = await import("unpdf");
    const mammoth = require("mammoth") as { extractRawText: (opts: { buffer: Buffer }) => Promise<{ value: string }> };

    let contractText = "";
    const lowerName = (fileName ?? "").toLowerCase();
    try {
      if (lowerName.endsWith(".pdf")) {
        const { text } = await extractText(new Uint8Array(fileBuffer), { mergePages: true });
        contractText = text
          .replace(/([a-zA-ZäöåÄÖÅ]) ([a-zA-ZäöåÄÖÅ])/g, "$1$2")
          .replace(/([a-zA-ZäöåÄÖÅ]) ([a-zA-ZäöåÄÖÅ])/g, "$1$2")
          .replace(/([a-zA-ZäöåÄÖÅ]) ([a-zA-ZäöåÄÖÅ])/g, "$1$2")
          .replace(/ {2,}/g, " ").replace(/\n{3,}/g, "\n\n").trim();
      } else if (lowerName.endsWith(".docx") || lowerName.endsWith(".doc")) {
        const result = await mammoth.extractRawText({ buffer: fileBuffer });
        contractText = result.value;
      } else {
        contractText = fileBuffer.toString("utf-8");
      }
    } catch {
      contractText = fileBuffer.toString("utf-8");
    }

    // Claude-analyysi (sama logiikka kuin upload/route.ts:ssa)
    const Anthropic = (await import("@anthropic-ai/sdk")).default;
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const [analysisMsg, korjattuMsg] = await Promise.all([
      anthropic.messages.create({
        model: "claude-opus-4-5",
        max_tokens: 4096,
        messages: [{
          role: "user",
          content: `Olet kokenut suomalainen juristi. Analysoi seuraava asiakirja (tyyppi: ${docType || "Sopimus"}) ja anna kattava esianalyysi HTML-muodossa. Merkitse ongelmat <strong>-tagilla.\n\nASIAKIRJA:\n${contractText.slice(0, 8000)}`,
        }],
      }),
      anthropic.messages.create({
        model: "claude-opus-4-5",
        max_tokens: 8192,
        messages: [{
          role: "user",
          content: `Olet kokenut suomalainen juristi. Kirjoita tästä asiakirjasta (tyyppi: ${docType || "Sopimus"}) juridisesti pätevä, korjattu versio täydellisessä HTML-muodossa (koko HTML-dokumentti DOCTYPE:sta alkaen). Säilytä rakenne mutta korjaa kaikki puutteet.\n\nASIAKIRJA:\n${contractText.slice(0, 8000)}`,
        }],
      }),
    ]);

    const analysis = analysisMsg.content[0].type === "text" ? analysisMsg.content[0].text : "";
    const korjattuAsiakirja = korjattuMsg.content[0].type === "text" ? korjattuMsg.content[0].text : "";

    // Päivitä documents-kokoelma
    await db.collection("documents").doc(docId).update({
      claudeAnalysis: analysis,
      claudeKorjattuAsiakirja: korjattuAsiakirja,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[reanalyze] Error:", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "Virhe" }, { status: 500 });
  }
}
