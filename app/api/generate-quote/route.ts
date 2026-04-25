import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

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

export async function POST(req: NextRequest) {
  try {
    const { company, project, specs } = await req.json();

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
6. Hintalaskelma HTML-taulukkona (työ, materiaalit, muut, ALV 25,5%, yhteensä)
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

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 8000,
        messages: [{ role: "user", content: prompt }],
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
