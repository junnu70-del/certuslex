import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import * as XLSX from "xlsx";
import Anthropic from "@anthropic-ai/sdk";

export const maxDuration = 120;

function getApiKey(): string {
  if (process.env.ANTHROPIC_API_KEY) return process.env.ANTHROPIC_API_KEY;
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
    const body = await req.json() as {
      company: Record<string, string>;
      project: Record<string, string>;
      specs: string;
      attachment?: Attachment;
      attachments?: Attachment[];
    };
    const { company, project, specs } = body;
    // Tue sekä vanhaa yksittäistä attachment- että uutta attachments-taulukkoa
    const attachments: Attachment[] = body.attachments ?? (body.attachment ? [body.attachment] : []);

    const apiKey = getApiKey();
    if (!apiKey) {
      return NextResponse.json({ error: "API-avain puuttuu" }, { status: 500 });
    }

    const today = new Date().toLocaleDateString("fi-FI", { day: "numeric", month: "numeric", year: "numeric" });
    const quoteNumber = `TAR-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 900) + 100)}`;

    const isProductSale = project.type === "Tuotemyynti" || project.type === "Product sale";

    const INDUSTRY_PROMPTS: Record<string, string> = {
      lvi: "Olet LVI- ja putkiurakointiin erikoistunut tarjousasiantuntija. Huomioi: materiaalikustannukset (putket, venttiilit, liittimet, eristeet), asennustyötunnit LVI-asentajille, mahdolliset kaivuu- ja rakennustyöt, tarkastukset ja dokumentointi, takuuehdot YSE 1998 mukaisesti, tarvittavat luvat ja viranomaistarkastukset.",
      rakenne: "Olet rakennusurakointiin erikoistunut tarjousasiantuntija. Huomioi: YSE 1998 sopimusehdot, rakennusluvat ja viranomaismaksut, materiaalit ja tarvikkeet, alihankkijakustannukset, työmaan logistiikka, vakuutukset ja vastuut, takuuaika 2 vuotta, rakennusaikainen valvonta.",
      sahko: "Olet sähköurakointiin erikoistunut tarjousasiantuntija. Huomioi: sähköasennusmateriaalit (kaapelit, jakokeskukset, pistorasiat), sähköasentajien työtunnit, tarkastusmittaukset ja käyttöönottotarkastus, ST-korttivaatimukset, takuuehdot, mahdolliset rakennuslupa-asiat.",
      it: "Olet IT-konsultointiin ja ohjelmistokehitykseen erikoistunut tarjousasiantuntija. Huomioi: projektin vaiheistus (vaatimusmäärittely, suunnittelu, toteutus, testaus, käyttöönotto, koulutus), tuntiperusteisuus tai kiinteähintainen sopimus, ylläpito- ja tukisopimukset jatkoksi, lisenssikustannukset, tietoturva ja GDPR-vaatimukset.",
      markkinointi: "Olet markkinointi- ja viestintäalaan erikoistunut tarjousasiantuntija. Huomioi: suunnittelutyötunnit, mainosmateriaalien tuotantokustannukset, mediaostot ja kanavakustannukset, raportointi ja analytiikka, tekijänoikeudet ja käyttöoikeudet, kampanjakohtaiset vs. kuukausisopimukset.",
      kiinteisto: "Olet kiinteistöpalveluihin ja isännöintiin erikoistunut tarjousasiantuntija. Huomioi: kiinteistönhoitohenkilöstön työtunnit, huolto- ja kunnossapitokustannukset, isännöintipalkkiot, lakisääteiset tarkastukset, vakuutusasiat, energiatehokkuus ja ympäristövaatimukset.",
      taloushallinto: "Olet taloushallintoon ja kirjanpitoon erikoistunut tarjousasiantuntija. Huomioi: kuukausipalkkioperusteisuus vs. toimenpidehinnoittelu, kirjanpito, palkanlaskenta, tilinpäätös, veroneuvojen erillisveloitus, ohjelmistolisenssit (esim. Procountor, Netvisor), KLT-vaatimukset.",
      juridiikka: "Olet lakipalveluihin erikoistunut tarjousasiantuntija. Huomioi: tuntilaskutus, toimenpidepalkkiot, kulut (käräjämaksut, haastemiehet), asiakirjakulut, mahdollinen onnistumispalkkio, salassapitovelvollisuus, toimeksiantosopimus.",
      kuljetus: "Olet kuljetus- ja logistiikka-alaan erikoistunut tarjousasiantuntija. Huomioi: ajomatkat ja aikaveloitukset, kuormakirjat ja dokumentointi, polttoainelisä, paluukuorman mahdollisuus, vakuutukset ja vastuut, ADR-kuljetukset tarvittaessa, kaluston soveltuvuus.",
      teollisuus: "Olet teollisuuteen ja valmistukseen erikoistunut tarjousasiantuntija. Huomioi: raaka-aineet ja materiaalit, koneistus- ja valmistustyötunnit, laadunvarmistus ja tarkastukset, CE-merkinnät ja standardit, pakkaus ja toimitus, sarjavalmistuksen vs. yksittäiskappaleiden hinnoittelu.",
      siivous: "Olet siivous- ja puhdistuspalveluihin erikoistunut tarjousasiantuntija. Huomioi: siivoustuntien määrä ja tiheys, pesuaineet ja tarvikkeet, koneet ja laitteet, kertaluonteiset vs. sopimushinnat, henkilöstökulut, vakuutukset.",
      maisemointi: "Olet maisemointiin ja pihatöihin erikoistunut tarjousasiantuntija. Huomioi: kasvit ja materiaalit, konetyöt (kaivinkone, traktori), käsityötunnit, istutussuunnittelu, kastelujärjestelmät, jätehuolto ja poiskuljetukset, takuu istutuksille.",
    };

    const industryPrompt = company.industry && INDUSTRY_PROMPTS[company.industry]
      ? `\nTOIMIALAKOHTAINEN OHJEISTUS:\n${INDUSTRY_PROMPTS[company.industry]}\n`
      : "";

    const prompt = `Olet ammattimainen tarjouskirjoittaja. Laadi alla olevien tietojen pohjalta täydellinen, ammattimainen tarjousdokumentti suomeksi.${industryPrompt}

YRITYKSEN TIEDOT:
- Yritys: ${company.name}
- Y-tunnus: ${company.businessId || "—"}
- Osoite: ${company.address || "—"}
- Yhteyshenkilö: ${company.contact}
- Puhelin: ${company.phone || "—"}
- Sähköposti: ${company.email}
- Maksuehdot: ${company.paymentTerms || "14 päivää netto"}
${isProductSale ? "" : `- Tuntihinta: ${company.hourlyRate ? company.hourlyRate + " €/h" : "ei määritelty"}`}

PROJEKTIN TIEDOT:
- Asiakas: ${project.clientName}
- Projektin nimi / tuote: ${project.projectName}
- Tyyppi: ${project.type}
- Toimitusaika: ${project.startDate || "sovittavissa"}
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

${isProductSale ? `Dokumentin rakenne (TUOTEMYYNTI — EI tuntihinnoittelua):
1. Yläpalkki: yrityksen nimi vasemmalla (iso, Georgia-fontti, #0F1F3D), tarjousnumero + päivämäärä oikealla
2. Kultainen vaakaviiva erottimena
3. Vastaanottajan tiedot (asiakas)
4. Tuotteen / ratkaisun kuvaus
5. Tuoteluettelo HTML-taulukkona (tuote/nimike, määrä, yksikköhinta, yhteensä ALV 0%). Taulukon tyylit:
   - Otsikkorivi: background:#0F1F3D, color:#C8A44A, font-weight:bold
   - Datarivit: vuorotellen background:#fff ja background:#F7F4EE, color:#2C2416
   - ALV-rivi (ALV 25,5%): background:#F7F4EE, color:#2C2416, font-style:italic
   - YHTEENSÄ ALV sisältyy -rivi: background:#0F1F3D, color:#C8A44A, font-weight:bold, font-size:1.05em — KAIKKI teksti tällä rivillä PAKOSTI color:#C8A44A
   - ÄLÄ lisää tuntirivejä, työkustannuksia tai tuntihintoja taulukkoon
6. Toimitustiedot ja toimitusaika
7. Maksuehdot
8. Takuu- ja palautusehdot (tuotteelle sopivat)
9. Allekirjoitusosio kahdelle osapuolelle` : `Dokumentin rakenne:
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
10. Allekirjoitusosio kahdelle osapuolelle`}

TÄRKEÄÄ:
- ALV-KANTA: Käytä AINA 25,5 % (Suomen yleinen ALV-kanta 1.9.2024 alkaen). ÄLÄ käytä 24 % tai muuta prosenttia.
- Älä käytä hakasulkupaikanvarauksia [näin] missään kohdassa
- Käytä oikeaa päivämäärää: ${today}
- Käytä tarjousnumeroa: ${quoteNumber}
- Jos pankkitiedot puuttuvat, jätä tyhjä allekirjoitusviiva ilman hakasulkuja
- Käytä järkeviä arvioita numeroille jos tarkkoja ei ole annettu, merkitse arviot tekstillä "(arvio)"
- Tee dokumentista A4-tulostuskelpoinen, padding 40px

MATERIAALIMÄÄRÄT JA HINNOITTELU — KRIITTISTÄ:
- ÄLÄ ylispesifioi materiaaleja — käytä realistisia, konservatiivisia määriä
- Ruuvit, naulat, kiinnikkeet: laske järkevästi projektin koon mukaan, älä keksi suuria kg-määriä
- Jos käyttäjä antaa tarkat määrät, käytä niitä SELLAISENAAN — älä lisää tai muuta
- Jos määrät puuttuvat, arvioi alakanttiin ja merkitse "(arvio)" — asiakkaan on helpompi hyväksyä konservatiivinen tarjous
- Tarkista looginen koherenssi: yksittäiset rivit eivät saa olla ristiriidassa projektin laajuuden kanssa
- Älä keksi lisärivejä joita ei ole mainittu spekseissä`;

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

    // Build message content — text only or multimodal with attachments
    type ContentBlock =
      | { type: "text"; text: string }
      | { type: "image"; source: { type: "base64"; media_type: string; data: string } }
      | { type: "document"; source: { type: "base64"; media_type: string; data: string }; title?: string };

    // Erota Excel/CSV-liitteet (→ teksti) ja binäärit (→ content blocks)
    let extraText = "";
    const binaryBlocks: ContentBlock[] = [];
    let hasVision = false;

    for (const att of attachments) {
      const mime = att.mimeType;
      const isExcel = mime.includes("spreadsheet") || mime.includes("excel") || mime === "text/csv" || att.name.match(/\.(xlsx|xls|csv)$/i);
      const isImage = mime.startsWith("image/");

      if (isExcel) {
        const excelText = parseExcelToText(att.base64, att.name);
        extraText += `\n\nLIITETTY TAULUKKO (${att.name}):\n${excelText}`;
      } else if (isImage) {
        hasVision = true;
        binaryBlocks.push({ type: "image", source: { type: "base64", media_type: mime, data: att.base64 } });
      } else {
        // PDF tai muu → document block
        hasVision = true;
        binaryBlocks.push({ type: "document", source: { type: "base64", media_type: "application/pdf", data: att.base64 }, title: att.name });
      }
    }

    let messageContent: string | ContentBlock[];

    if (binaryBlocks.length > 0) {
      const countTxt = binaryBlocks.length > 1
        ? `\n\nLiitetty ${binaryBlocks.length} tiedostoa (kuvat/piirustukset/asiakirjat): Analysoi ne huolellisesti ja hyödynnä kaikki löytyvä tieto (mitat, materiaalit, työvaiheet, hinnat jne.) tarjouksen laadinnassa.`
        : "\n\nLiitetty kuva/piirustus/asiakirja: Analysoi se huolellisesti ja hyödynnä kaikki löytyvä tieto tarjouksen laadinnassa.";
      messageContent = [
        { type: "text", text: prompt + countTxt + (extraText ? `\n\nLIITETTY TAULUKKODATA:${extraText}` : "") },
        ...binaryBlocks,
      ];
    } else if (extraText) {
      messageContent = prompt + `\n\nLIITETTY TAULUKKO (Excel/CSV):\nAnalysoi alla oleva taulukko ja hyödynnä kaikki hinnat, määrät, materiaalit ja työvaiheet tarjouksen laadinnassa.${extraText}`;
    } else {
      messageContent = prompt;
    }

    // Sonnet kaikille — haiku hallusinoi materiaalimääriä ja hintoja liikaa
    const model = "claude-sonnet-4-5";

    const anthropic = new Anthropic({ apiKey });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const aiResponse = await anthropic.messages.create({
      model,
      max_tokens: 8000,
      messages: [{ role: "user", content: messageContent as any }],
    });

    let quote = aiResponse.content?.[0]?.type === "text" ? aiResponse.content[0].text : null;
    if (!quote) throw new Error("Tyhjä vastaus AI:lta");

    // Poistetaan markdown-koodiaidat jos AI lisäsi ne ohjeiden vastaisesti
    quote = quote.trim();
    if (quote.startsWith("```")) {
      quote = quote.replace(/^```(?:html)?\s*/i, "").replace(/\s*```\s*$/, "").trim();
    }

    return NextResponse.json({ quote });
  } catch (err) {
    console.error("Quote generation error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Tuntematon virhe" },
      { status: 500 }
    );
  }
}
