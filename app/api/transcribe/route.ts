import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import OpenAI, { toFile } from "openai";
import Anthropic from "@anthropic-ai/sdk";

export const maxDuration = 300;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Credentials": "false",
};

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: corsHeaders });
}

function getOpenAIKey(): string {
  if (process.env.OPENAI_API_KEY) return process.env.OPENAI_API_KEY;
  try {
    const envPath = path.join(process.cwd(), ".env.local");
    const content = fs.readFileSync(envPath, "utf8");
    const match = content.match(/OPENAI_API_KEY=(.+)/);
    if (match) return match[1].trim();
  } catch {}
  return "";
}

function getAnthropicKey(): string {
  if (process.env.ANTHROPIC_API_KEY) return process.env.ANTHROPIC_API_KEY;
  try {
    const envPath = path.join(process.cwd(), ".env.local");
    const content = fs.readFileSync(envPath, "utf8");
    const match = content.match(/ANTHROPIC_API_KEY=(.+)/);
    if (match) return match[1].trim();
  } catch {}
  return "";
}

export async function POST(req: NextRequest) {
  try {
    // Metadata URL-parametreistä, ääni raakana octet-stream bodyna
    const sp = req.nextUrl.searchParams;
    const audioMimeType = sp.get("mimeType") || "audio/webm";
    const sessionId = sp.get("sessionId") || "—";
    const meetingType = sp.get("meetingType") || "Tapaaminen";
    const duration = sp.get("duration") || "—";
    const name = sp.get("name") || "—";
    const notes = sp.get("notes") || "";

    const arrayBuffer = await req.arrayBuffer();
    if (!arrayBuffer || arrayBuffer.byteLength < 100) {
      return NextResponse.json(
        { success: false, error: "Äänitiedosto puuttuu tai on tyhjä" },
        { status: 400 }
      );
    }

    const openaiKey = getOpenAIKey();
    const anthropicKey = getAnthropicKey();

    if (!openaiKey) {
      return NextResponse.json(
        { success: false, error: "OPENAI_API_KEY puuttuu .env.local-tiedostosta" },
        { status: 500 }
      );
    }
    if (!anthropicKey) {
      return NextResponse.json(
        { success: false, error: "ANTHROPIC_API_KEY puuttuu .env.local-tiedostosta" },
        { status: 500 }
      );
    }

    // Vaihe 1: Litterointi Whisperillä
    const openai = new OpenAI({ apiKey: openaiKey });
    const buffer = Buffer.from(arrayBuffer);
    const ext = audioMimeType.includes("mp4") ? "mp4"
      : audioMimeType.includes("ogg") ? "ogg"
      : "webm";

    const audioFile = await toFile(
      buffer,
      `audio.${ext}`,
      { type: audioMimeType }
    );

    const transcription = await openai.audio.transcriptions.create({
      file: audioFile,
      model: "whisper-1",
      language: "fi",
      response_format: "text",
    });
    const transcript = transcription as unknown as string;

    if (!transcript || transcript.trim().length < 5) {
      return NextResponse.json(
        {
          success: false,
          error: "Whisper ei tunnistanut puhetta. Tarkista mikrofonilupa ja että äänitys sisältää puhetta.",
        },
        { status: 422 }
      );
    }

    // Vaihe 2: Raportti Claude claude-haiku-4-5:lla
    const anthropic = new Anthropic({ apiKey: anthropicKey });

    const prompt = `Olet asiantuntija-assistentti Suomessa. Analysoi tämä yritystapaamisen litteraatti.

Tapaamistiedot:
- Tunniste: ${sessionId || "—"}
- Tyyppi: ${meetingType || "Tapaaminen"}
- Kesto: ${duration || "—"}
- Haastattelija: ${name || "—"}
${notes ? "- Pikamerkinnät: " + notes : ""}

LITTERAATTI:
${transcript}

Luo strukturoitu raportti TASAN näissä osioissa, erota osiot ---:

TILANTEEN KUVAUS:
(2-3 lausetta: yrityksen tilanne, tausta, toimiala)
---
TUNNISTETUT TARPEET:
(lista ranskalaisilla viivoilla • tarve1  • tarve2)
---
SOVITUT TOIMENPITEET:
(konkreettiset sovitut asiat)
---
SEURAAVAT ASKELEET:
(numeroitu lista jatkotoimista ja aikataulusta)`;

    const message = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1024,
      messages: [{ role: "user", content: prompt }],
    });

    const reportText = message.content[0].type === "text"
      ? message.content[0].text
      : "";

    const parts = reportText.split("---");
    const keys = ["tilanne", "tarpeet", "toimet", "askeleet"];
    const report: Record<string, string> = {};
    parts.forEach((part, i) => {
      // Poista otsikkorivi (ensimmäinen rivi) ja markdown-muotoilu
      const cleaned = part
        .replace(/^\s*\*{0,2}[A-ZÄÖÅ ]+:\*{0,2}\s*/m, "")
        .replace(/\*\*/g, "")
        .replace(/^#+\s*/gm, "")
        .trim();
      report[keys[i]] = cleaned || "—";
    });

    return NextResponse.json(
      { success: true, transcript, ...report },
      { headers: corsHeaders }
    );
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Tuntematon virhe";
    console.error("transcribe error:", msg);
    return NextResponse.json({ success: false, error: msg }, { status: 500, headers: corsHeaders });
  }
}
