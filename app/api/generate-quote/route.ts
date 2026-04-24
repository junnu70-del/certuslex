import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(req: NextRequest) {
  try {
    const { company, project, specs } = await req.json();

    const prompt = `Olet ammattimainen tarjouskirjoittaja. Laadi alla olevien tietojen pohjalta täydellinen, ammattimainen tarjousdokumentti suomeksi.

YRITYKSEN TIEDOT:
- Yritys: ${company.name}
- Y-tunnus: ${company.businessId}
- Osoite: ${company.address}
- Yhteyshenkilö: ${company.contact}
- Puhelin: ${company.phone}
- Sähköposti: ${company.email}
- Maksuehdot: ${company.paymentTerms || "14 päivää netto"}
- Tuntihinta: ${company.hourlyRate ? company.hourlyRate + " €/h" : "ei määritelty"}

PROJEKTIN TIEDOT:
- Asiakas: ${project.clientName}
- Projektin nimi: ${project.projectName}
- Tyyppi: ${project.type}
- Arvioitu aloitus: ${project.startDate || "sovittavissa"}
- Voimassaolo: ${project.validUntil || "30 päivää"}

SPESIFIKAATIOT JA LAAJUUS:
${specs}

Luo tästä ammattimainen tarjousdokumentti joka sisältää:
1. Otsikkosivun tiedot (tarjouksen numero, päivämäärä, voimassaoloaika)
2. Tiivistelmä projektista
3. Tekninen erittely ja toimituslauseke
4. Hintalaskelma eriteltynä (työ, materiaalit, muut kulut, alv)
5. Toimitusaikataulu
6. Maksuehdot ja -aikataulu
7. Takuuehdot
8. Yleiset sopimusehdot (lyhyt)
9. Allekirjoitusosio

Kirjoita dokumentti selkeästi, ammattimaisesti ja asiallisesti. Käytä euromäärissä järkeviä arvioita jos tarkkoja lukuja ei ole annettu — merkitse arviot selkeästi. Muotoile dokumentti niin että se voidaan suoraan tulostaa ja lähettää asiakkaalle.`;

    const message = await client.messages.create({
      model: "claude-opus-4-5",
      max_tokens: 4000,
      messages: [{ role: "user", content: prompt }],
    });

    const content = message.content[0];
    if (content.type !== "text") throw new Error("Unexpected response type");

    return NextResponse.json({ quote: content.text });
  } catch (err) {
    console.error("Quote generation error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Tuntematon virhe" },
      { status: 500 }
    );
  }
}
