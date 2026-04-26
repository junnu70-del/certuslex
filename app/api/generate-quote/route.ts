import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import * as XLSX from "xlsx";

// Suurten liitteiden (base64) tuki — App Router käyttää tätä
export const maxDuration = 60; // sekuntia, pitkä AI-kutsu liitteen kanssa

function getApiKey(): string {
  // Kokeile ensin normaalin env:n kautta
  if (process.env.ANTHROPIC_API_KEY) return process.env.ANTHROPIC_API_KEY;
  // Fallback: lue .env.local suoraan tiedostosta (Turbopack-workaround)
  try {
    const envPath = path.join(process.cwd(), ".env.local");
    const content = fs.readFileSync(envPath, "utf8");
    const match = content.match(/ANTHROPIC_API_KEY=(.+)/);
    if (match) return match[1].trim();
  } catch {}
  return "";
}

interface Attachment {
  base64: string;
  mimeType: string;
  name: string;
}

export async function POST(req: NextRequest) {
  try {
    const { company, project, specs, attachment } = await req.json() as {
      company: Record<string, string>;
      project: Record<string, string>;
      specs: string;
      attachment?: Attachment;
    };

    const apiKey = getApiKey();
    if (!apiKey) {
      return NextResponse.json({ error: "API-avain puuttuu" }, { status: 500 });
    }

    const today = new Date().toLocaleDateString("fi-FI", { day: "numeric", month: "numeric", year: "numeric" });
    const quoteNumber = `TAR-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 900) + 100)}`;

    const prompt = `Olet ammattimainen tarjouskirjoittaja. Laadi alla olevien tietojen pohjalta täydellinen, ammattimainen tarjousdokumentti suomeksi.

YRITYKSEN TIEDOT:
- Yritys: ${company.name}
- Y-tunnus: ${company.businessId || "—"}
- Osoite: ${company.address || "—"}
- Yhteyshenkilö: ${company.contact}
- Puhelin: ${company.phone || "—"}
- Sähköposti: ${company.email}
- Maksuehdot: ${company.paymentTerms || "14 päivää netto"}
- Tuntihinta: ${company.hourlyRate ? company.hourlyRate + " €/h" : "ei määritelty"}

PROJEKTIN TIEDOT:
- Asiakas: ${project.clientName}
- Projektin nimi: ${project.projectName}
- Tyyppi: ${project.type}
- Arvioitu aloitus: ${project.startDate || "sovittavissa"}
- Voimassaolo: ${project.validUntil || "30 päivää"}
- Tarjouksen numero: ${quoteNumber}
- Tänään: ${today}

SPESIFIKAATIOT JA LAAJUUS:
${specs}

Luo tästä ammattimainen tarjousdokumentti HTML-muodossa. Palauta VAIN HTML-koodi ilman \`\`\`html tai muita koodimerkkejä.

Käytä näitä inline-tyylejä dokumentissa:
- Taustaväri: #F7F4EE
- Otsikkoväri (h1, h2): #0F1F3D, fonttiperhe Georgia serif
- Korostusväri (reunaviivat, otsikkopalkki): #C8A44A
- Tekstiväri: #2C2416
- Taulukon reunat: #EDE8DE

Dokumentin rakenne:
1. Yläpalkki: yrityksen nimi vasemmalla (iso, Georgia-fontti, #0F1F3D), tarjousnumero + päivämäärä oikealla
2. Kultainen vaakaviiva erottimena
3. Vastaanottajan tiedot (asiakas)
4. Projektin tiivistelmä
5. Tekninen erittely
6. Hintalaskelma HTML-taulukkona (työ, materiaalit, muut, ALV 25,5%, yhteensä). Taulukon tyylit:
   - Otsikkorivi: background:#0F1F3D, color:#C8A44A, font-weight:bold
   - Datarivit: vuorotellen background:#fff ja background:#F7F4EE, color:#2C2416
   - ALV-rivi: background:#F7F4EE, color:#2C2416, font-style:italic
   - YHTEENSÄ ALV sisältyy -rivi: background:#0F1F3D, color:#C8A44A, font-weight:bold, font-size:1.05em — KAIKKI teksti tällä rivillä PAKOSTI color:#C8A44A
7. Toimitusaikataulu taulukkona
8. Maksuehdot ja maksuaikataulu
9. Takuuehdot
10. Allekirjoitusosio kahdelle osapuolelle

TÄRKEÄÄ:
- Älä käytä hakasulkupaikanvarauksia [näin] missään kohdassa
- Käytä oikeaa päivämäärää: ${today}
- Käytä tarjousnumeroa: ${quoteNumber}
- Jos pankkitiedot puuttuvat, jätä tyhjä allekirjoitusviiva ilman hakasulkuja
- Käytä järkeviä arvioita numeroille jos tarkkoja ei ole annettu, merkitse arviot tekstillä "(arvio)"
- Tee dokumentista A4-tulostuskelpoinen, padding 40px`;

    // Parsitaan Excel/CSV tekstiksi — Claude ei tue niitä natiivisti
    function parseExcelToText(base64: string, fileName: string): string {
      const buffer = Buffer.from(base64, "base64");
      const workbook = XLSX.read(buffer, { type: "buffer" });
      const lines: string[] = [`=== Liitetiedosto: ${fileName} ===`];
      for (const sheetName of workbook.SheetNames) {
        const sheet = workbook.Sheets[sheetName];
        const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });
        if (rows.length === 0) continue;
        lines.push(`\n--- Taulukko: ${sheetName} ---`);
        // Otsikkorivi
        const headers = Object.keys(rows[0]);
        lines.push(headers.join(" | "));
        lines.push(headers.map(() => "---").join(" | "));
        // Datarivit (max 200 riviä)
        for (const row of rows.slice(0, 200)) {
          lines.push(headers.map(h => String(row[h] ?? "")).join(" | "));
        }
        if (rows.length > 200) lines.push(`... ja ${rows.length - 200} riviä lisää`);
      }
      return lines.join("\n");
    }

    // Build message content — text only or multimodal with attachment
    type ContentBlock =
      | { type: "text"; text: string }
      | { type: "image"; source: { type: "base64"; media_type: string; data: string } }
      | { type: "document"; source: { type: "base64"; media_type: string; data: string }; title?: string };

    let messageContent: string | ContentBlock[];

    if (attachment?.base64) {
      const mime = attachment.mimeType;
      const isImage = mime.startsWith("image/");
      const isExcel = mime.includes("spreadsheet") || mime.includes("excel") || mime === "text/csv" || attachment.name.match(/\.(xlsx|xls|csv)$/i);

      if (isExcel) {
        // Excel/CSV → teksti joka lisätään promptiin
        const excelText = parseExcelToText(attachment.base64, attachment.name);
        messageContent = prompt + `\n\nLIITETTY TAULUKKO (Excel/CSV):\nAnalysoi alla oleva taulukko ja hyödynnä kaikki hinnat, määrät, materiaalit ja työvaiheet tarjouksen laadinnassa.\n\n${excelText}`;
      } else if (isImage) {
        messageContent = [
          { type: "text", text: prompt + "\n\nLiitetty kuva/piirustus: Analysoi se huolellisesti ja hyödynnä kaikki löytyvä tieto tarjouksen laadinnassa." },
          { type: "image", source: { type: "base64", media_type: mime, data: attachment.base64 } },
        ];
      } else {
        // PDF tai muu dokumentti
        messageContent = [
          { type: "text", text: prompt + "\n\nLiitetty asiakirja: Analysoi se huolellisesti ja hyödynnä kaikki siitä löytyvä tieto (mitat, materiaalit, työvaiheet, hinnat jne.) tarjouksen laadinnassa." },
          { type: "document", source: { type: "base64", media_type: "application/pdf", data: attachment.base64 }, title: attachment.name },
        ];
      }
    } else {
      messageContent = prompt;
    }

    // Tekstipohjainen → haiku (nopea), kuva/PDF → sonnet (vision-tuki)
    const model =
      !attachment?.base64 ? "claude-3-5-haiku-20241022"
      : attachment.mimeType.startsWith("image/") || attachment.mimeType === "application/pdf"
        ? "claude-3-5-sonnet-20241022"
        : "claude-3-5-haiku-20241022";

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model,
        max_tokens: 8000,
        messages: [{ role: "user", content: messageContent }],
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Anthropic API virhe: ${err}`);
    }

    const data = await response.json();
    const quote = data.content?.[0]?.text;
    if (!quote) throw new Error("Tyhjä vastaus AI:lta");

    return NextResponse.json({ quote });
  } catch (err) {
    console.error("Quote generation error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Tuntematon virhe" },
      { status: 500 }
    );
  }
}
