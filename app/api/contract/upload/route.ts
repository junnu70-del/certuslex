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

const DOC_TYPE_CONTEXT: Record<string, string> = {

  "Sopimus": `Kyseessä on sopimusasiakirja. Analysoi se kattavasti seuraavien oikeuslähteiden valossa:

SOVELLETTAVA SUOMEN LAINSÄÄDÄNTÖ:
- Laki varallisuusoikeudellisista oikeustoimista (OikTL 228/1929): pätemättömyysperusteet (26-33§), kohtuullistaminen (36§), kiskonta (31§), erehdys (32§)
- Kauppalaki (KL 355/1987): tavaran virhe (17-21§), viivästys (22-28§), reklamaatiovelvollisuus (32§), vahingonkorvaus (40-43§)
- Kuluttajansuojalaki (KSL 38/1978): kohtuuttomat sopimusehdot (4 luku), elinkeinonharjoittajan vastuu, peruuttamisoikeus
- Vahingonkorvauslaki (VahL 412/1974): tuottamusvastuu, ankara vastuu, myötävaikutus (6:1§)
- Laki elinkeinonharjoittajien välisten sopimusehtojen sääntelystä (1062/1993)
- Henkilötietolaki / GDPR (EU 2016/679): tietojenkäsittelylausekkeet, rekisterinpitäjän vastuu, tietoturva
- Tilaajavastuulaki (1233/2006): alihankkijasopimuksissa
- Laki yhteistoiminnasta yrityksissä (334/2007): henkilöstöasiat
- Korkolaki (633/1982): viivästyskorko, maksuehto

EU-OIKEUS JA KANSAINVÄLINEN:
- eIDAS-asetus (EU 910/2014): sähköiset allekirjoitukset ja niiden oikeudellinen sitovuus
- Rooma I -asetus (593/2008): sovellettava laki kansainvälisissä sopimuksissa
- CISG (YK:n kauppalaki): kansainvälisissä kauppasopimuksissa
- Hankintadirektiivi (2014/24/EU): julkiset hankinnat

TULKINTAPERIAATTEET:
- Epäselvyyssääntö (contra proferentem): epäselvä ehto tulkitaan laatijaansa vastaan
- Kohtuullistamisperiaate (OikTL 36§): kohtuuton ehto voidaan sovitella
- Heikkoa sopijapuolta suojaava tulkinta
- Lojaliteettiperiaate: osapuolten tiedonanto- ja myötävaikutusvelvollisuus
- Pacta sunt servanda vs. clausula rebus sic stantibus

KRIITTISET TARKISTUSPISTEET:
1. Osapuolten yksilöinti (y-tunnus, henkilötunnus, edustusoikeus)
2. Sopimuksen kohde ja laajuus — onko riittävän täsmällinen?
3. Hinta, maksuehdot, indeksikorotukset
4. Vastuunrajoituslausekkeet — ovatko kohtuulliset ja yksilöidyt?
5. Salassapitolauseke — kesto, laajuus, sanktiot
6. Immateriaalioikeudet — kuka omistaa sopimuksen aikana syntyvän?
7. Force majeure — onko määritelty riittävän kattavasti?
8. Sopimuksen irtisanominen ja purkaminen — erot ja seuraukset
9. Erimielisyyksien ratkaisu — välimiesmenettely vai tuomioistuin, toimipaikka
10. Sovellettava laki — erityisesti kansainvälisissä sopimuksissa
11. GDPR-lauseke — jos käsitellään henkilötietoja`,

  "Valitus": `Kyseessä on valituskirjelmä. Analysoi se kattavasti seuraavien oikeuslähteiden valossa:

SOVELLETTAVA SUOMEN LAINSÄÄDÄNTÖ:
- Hallintolainkäyttölaki (HLL 586/1996) / Laki oikeudenkäynnistä hallintoasioissa (808/2019, voimaan 1.1.2020): valitusoikeus (6-7§), valitusperusteet (107§), valitusaika (14§), muutoksenhakuohjeet
- Hallintolaki (HL 434/2003): hallintopäätöksen perusteluvelvollisuus (45§), kuuleminen (34§), esteellisyys (27-30§), oikaisuvaatimus (49a-49g§)
- Laki julkisista hankinnoista (1397/2016): markkinaoikeusvalitus, hankintaoikaisu, valitusaika (14 pv / 30 pv)
- Oikeudenkäymiskaari (OK 4/1734): muutoksenhaku hovioikeuteen, kassaatiovalitus KKO:hon
- Rikosasioiden oikeudenkäyntilaki (ROL 689/1997): muutoksenhaku rikosasioissa
- Verotusmenettelylaki (VML 1558/1995): verotuksen oikaisulautakunta, hallinto-oikeus, KHO
- Ulkomaalaislaki (301/2004): valitusoikeus maahanmuuttoasioissa
- Perustuslaki (PL 731/1999): perusoikeuksien suoja, oikeus oikeudenmukaiseen oikeudenkäyntiin (21§)

EU-OIKEUS:
- Euroopan ihmisoikeussopimus (EIS): oikeudenmukainen oikeudenkäynti (6 artikla), tehokkaiden oikeussuojakeinojen periaate (13 artikla)
- EU:n perusoikeuskirja: oikeus tehokkaaseen oikeussuojakeinoon (47 artikla)
- EU-tuomioistuimen oikeuskäytäntö: suhteellisuusperiaate, yhdenvertaisuusperiaate

KRIITTISET TARKISTUSPISTEET:
1. Toimivaltainen tuomioistuin — oikea tuomioistuin valitukselle
2. Valitusaika — onko noudatettu (yleensä 30 pv päätöksestä)
3. Valitusoikeus — onko valittajalla asianosaisasema
4. Valituskirjelmän muoto (HLL 23§ / VOHL 13§): vaatimukset, perusteet, todisteet
5. Vaatimusten täsmällisyys — mitä vaaditaan, millä perusteella
6. Oikeustosiasioiden ja oikeuskysymysten erottelu
7. Näyttökynnys hallinto- vs. siviiliprosessissa
8. Täytäntöönpanon keskeyttämispyyntö (HLL 32§)
9. Oikeudenkäyntikulujen korvausvaatimus
10. Euroopan ihmisoikeustuomioistuin — onko kotimainen muutoksenhakutie käytetty?`,

  "Kirjelmä": `Kyseessä on oikeudelle osoitettu kirjelmä. Analysoi se kattavasti seuraavien oikeuslähteiden valossa:

SOVELLETTAVA SUOMEN LAINSÄÄDÄNTÖ:
- Oikeudenkäymiskaari (OK 4/1734): kirjelmien muoto (5:1-2§), kannekirjelmä (5:2§), vastauskirjelmä (5:10§), prekluusio (5:17§), oikeudenkäyntikulut (21 luku)
- Laki riita-asioiden sovittelusta (663/2005): sovittelumahdollisuuden mainitseminen
- Todistelulaki (1.) / OK 17 luku: todistustaakka, todisteiden esittäminen, asiantuntijatodistelu
- Oikeusapulaki (257/2002): oikeusavun hakeminen
- Rikosasioiden oikeudenkäyntilaki (ROL 689/1997): rikosoikeudelliset kirjelmät
- Laki yksityishenkilön velkajärjestelystä (57/1993): maksukyvyttömyysasiat
- Ulosottokaari (705/2007): täytäntöönpano ja sen estäminen
- Konkurssilaki (120/2004): insolvenssioikeudelliset kirjelmät

EU-OIKEUS:
- Bryssel I bis -asetus (1215/2012): tuomioistuimen toimivalta, tuomion tunnustaminen
- Eurooppa-ohjeet siviiliprosessissa: rajat ylittävät riidat
- Euroopan maksamismääräysmenettely (861/2007)

KRIITTISET TARKISTUSPISTEET:
1. Asianosaisten yksilöinti täydellisesti (nimi, henkilö/y-tunnus, osoite, asiamies)
2. Kirjelmän osoittaminen oikealle tuomioistuimelle (toimivalta)
3. Vaatimusten täsmällisyys ja yksiselitteisyys — mitä tarkalleen vaaditaan
4. Oikeustosiasioiden (faktat) ja oikeusnormien (laki) selkeä erottelu
5. Todisteet ja niiden yksilöinti (OK 5:2.2§) — mitä näytetään toteen
6. Oikeudenkäyntikulujen korvausvaatimus
7. Prekluusion vaara — onko kaikki esitetty ajoissa
8. Väliaikaistoimenpidepyyntö (turvaamistoimi OK 7 luku)
9. Sovintoehdotuksen mahdollisuus / sovitteluhalukkuus
10. Asiamiehen valtakirja liitteenä`,

  "Hakemus": `Kyseessä on viranomaishakemus. Analysoi se kattavasti seuraavien oikeuslähteiden valossa:

SOVELLETTAVA SUOMEN LAINSÄÄDÄNTÖ:
- Hallintolaki (HL 434/2003): hakemuksen muoto (19§), täydentäminen (22§), kuuleminen (34§), perusteluvelvollisuus (45§), muutoksenhakuohjeet (47§)
- Julkisuuslaki (621/1999): asiakirjajulkisuus, salassapito, tiedonsaantioikeus
- Laki sähköisestä asioinnista viranomaistoiminnassa (13/2003): sähköinen hakemus
- Kuntalaki (410/2015): kunnallishallinnon hakemukset
- Maankäyttö- ja rakennuslaki (132/1999): rakennuslupa, poikkeuslupa
- Ympäristönsuojelulaki (527/2014): ympäristölupa
- Ulkomaalaislaki (301/2004): oleskelulupa, viisumihakemus
- Laki julkisesta työvoima- ja yrityspalvelusta (916/2012): te-palvelut
- Yritystukilaki: yritystuet, innovaatiorahoitus (Business Finland)
- Laki sosiaalihuollon asiakkaan asemasta (812/2000): sosiaalipalveluhakemukset
- Terveydenhuoltolaki (1326/2010): terveyspalveluhakemukset

EU-OIKEUS:
- GDPR (2016/679): hakemuksiin sisältyvä henkilötietojen käsittely
- Valtiontukisäädökset (SEUT 107-109 artikla): yritystukihakemukset
- EU:n rakennerahastot: tukihakemukset
- Direktiivi 2006/123/EY (palveludirektiivi): elinkeinolupahakemukset

KRIITTISET TARKISTUSPISTEET:
1. Hakijan yksilöinti ja toimivalta tehdä hakemus
2. Oikea viranomainen — onko hakemus osoitettu toimivaltaiselle viranomaiselle
3. Hakemuksen perustelut — oikeusperuste ja tosiasialliset perusteet
4. Liitteiden täydellisyys — vaaditut selvitykset ja todistukset
5. Määräaikojen noudattaminen
6. Lupa- ja maksukysymykset
7. Kuulemisvelvollisuus kolmansille osapuolille
8. Salassapitopyynnöt arkaluonteisissa tiedoissa
9. Muutoksenhakuohjeiden edellyttäminen päätökseen
10. Viranomaisyhteistyö — tarvitaanko lausuntoja muilta viranomaisilta`,

  "Vastine": `Kyseessä on vastine tai lausuma. Analysoi se kattavasti seuraavien oikeuslähteiden valossa:

SOVELLETTAVA SUOMEN LAINSÄÄDÄNTÖ:
- Oikeudenkäymiskaari (OK 4/1734): vastauksen sisältö (5:10§), myöntäminen ja kiistäminen (5:11§), väitteiden prekluusio (5:17§), todistustaakka (17:2§)
- Hallintolainkäyttölaki / VOAL (808/2019): lausuman antaminen (40-41§), selitys
- Hallintolaki (HL 434/2003): kuuleminen (34§), selvitysten antaminen (31§)
- Todistelulaki: OK 17 luku — todistustaakka, näyttökynnys (vahingonkorvaus: todennäköisyys, rikosasia: ei järkevää epäilystä)
- Laki riita-asioiden sovittelusta: vastineessa sovitteluhalukkuuden ilmaiseminen
- Rikosasioiden oikeudenkäyntilaki (ROL 689/1997): vastineet rikosasioissa, syyttäjän vastine
- Laki yksityishenkilön velkajärjestelystä (57/1993): velkojien lausumat
- Kuluttajariitalautakunta: lausumamenettely

EU-OIKEUS:
- Euroopan ihmisoikeussopimus (6 artikla): kontradiktorinen menettely, aseiden tasa-arvo
- Bryssel I bis -asetus: toimivaltaväite kansainvälisissä riidoissa
- EU-kilpailuoikeus (SEUT 101-102): vastineet kilpailuviranomaiselle

KRIITTISET TARKISTUSPISTEET:
1. Vaatimuksen yksiselitteinen myöntäminen TAI kiistäminen jokaiselta kohdalta
2. Kiistämisen perusteet — jokainen kiistetty väite perusteltava
3. Omat vaatimukset — vastaajan vaatimukset (esim. hylkääminen, oikeudenkäyntikulut)
4. Kuittausvaatimus — onko esitettävissä vastasaatavia
5. Prosessuaaliset väitteet: toimivalta, asianosaisasema, vanhentuminen, kanteen tutkittavuus
6. Todisteet ja todistajat — yksilöitävä heti, prekluusion vaara
7. Vanhentumisväite — onko saatava vanhentunut (VanhL 728/2003)
8. Sovintoneuvotteluhalukkuus
9. Täytäntöönpanon keskeyttämispyyntö tarvittaessa
10. Asiamiehen valtakirja ja yhteystiedot`,

  "Rikosasia": `Kyseessä on rikosoikeudellinen asiakirja (rikosilmoitus, vastine syytteeseen, asianomistajan vaatimukset, syyttäjäkirjelmä tai muu rikosprosessuaalinen asiakirja). Analysoi se kattavasti seuraavien oikeuslähteiden valossa:

SUOMEN RIKOSOIKEUDEN YDINSÄÄDÖKSET:
- Rikoslaki (RL 39/1889) — koko rikosvastuun perusta:
  • 3 luku: rikosvastuun edellytykset (tahallisuus, tuottamus, tietoisuus)
  • 4 luku: vastuuvapausperusteet (hätävarjelu 4§, pakkotila 5§, erehdys 1-4§)
  • 5 luku: osallisuus (tekijäkumppanuus 3§, yllytys 5§, avunanto 6§)
  • 6 luku: rangaistuksen määrääminen, lieventämis- ja koventamisperusteet
  • 7 luku: yhtenäisrangaistus, yhtyminen
  • 8 luku: vanhentuminen (1§ yleinen, erityissäännökset)
  Keskeisiä rikostyyppejä:
  • 21 luku: henkeen ja terveyteen kohdistuvat rikokset (tappo, murha, pahoinpitely, vammantuottamus)
  • 28 luku: varkaus, törkeä varkaus, kavallus, petos (36 luku)
  • 29 luku: veropetos, avustuspetos
  • 30 luku: elinkeinorikokset
  • 35 luku: vahingonteko
  • 36 luku: petos ja luottamusrikos
  • 38 luku: tieto- ja viestintärikokset
  • 40 luku: virkarikokset
  • 47 luku: työrikokset
  • 48 luku: ympäristörikokset
  • 49 luku: arvopaperimarkkinoita koskevat rikokset

RIKOSPROSESSIOIKEUS:
- Laki oikeudenkäynnistä rikosasioissa (ROL 689/1997):
  • Syyteoikeus ja syytteen nostaminen (1 luku)
  • Haastehakemus ja syytteen sisältö (5 luku)
  • Asianomistajan syyteoikeus ja rikosvaatimus (7 luku)
  • Vastaajan oikeudet, puolustautuminen (8 luku)
  • Tuomion sisältö, näyttökynnys (11 luku)
  • Muutoksenhaku hovioikeuteen, KKO (25-30 luku)
- Esitutkintalaki (ETL 805/2011):
  • Ilmoittamisvelvollisuus (2:1§)
  • Tutkinnanjohtaja, poliisi vs. syyttäjä
  • Esitutkintaperiaatteet: tasapuolisuus (4:1§), suhteellisuus (4:4§), hienotunteisuus (4:6§)
  • Epäillyn oikeudet: vaiti olo (7:5§), avustaja (4:10§)
  • Rikoksesta ilmoittajan suoja
- Pakkokeinolaki (PKL 806/2011):
  • Pidättäminen (2 luku), vangitseminen (3 luku)
  • Matkustuskielto (5 luku)
  • Takavarikko (7 luku), etsintä (8 luku)
  • Telekuuntelu (10 luku)
- Laki syyttäjälaitoksesta (32/2019): syyttäjän rooli, syyttämättäjättämispäätös

VAHINGONKORVAUS RIKOSASIASSA:
- Vahingonkorvauslaki (VahL 412/1974): tuottamusvastuu (2:1§), ankara vastuu, yhteisvastuullisuus
- Rikosperusteiset vahingonkorvaukset: esinevahinko, henkilövahinko, kärsimyskorvaus (5:6§)
- Valtion korvausvastuu rikosvahingoista (Rikosvahinkolaki 1204/2005)
- Korvauksen sovittelu (VahL 2:1§, 6:1§)

KANSAINVÄLINEN RIKOSOIKEUS:
- Euroopan ihmisoikeussopimus (EIS):
  • 6 artikla: oikeus oikeudenmukaiseen oikeudenkäyntiin rikosasioissa
    — Syyttömyysolettama (6:2)
    — Puolustautumisen minimioikeudet (6:3): tiedonsaanti syytteestä, aika valmistautua, avustaja, todistajien kuuleminen, tulkki
  • 7 artikla: nulla poena sine lege (ei rangaistusta ilman lakia)
  • 8 artikla: yksityiselämän suoja (pakkokeinot)
- EU-rikosoikeus:
  • Direktiivi 2012/29/EU: rikoksen uhrin oikeudet
  • Direktiivi 2013/48/EU: oikeus asianajajaan
  • Direktiivi 2016/343/EU: syyttömyysolettama
  • Eurooppalainen pidätysmääräys (puitepäätös 2002/584/YOS)
  • Europol ja Eurojust: kansainvälinen rikostutkintatyö
- Rooman perussääntö (ICC, 60/2002): sotarikokset, rikokset ihmisyyttä vastaan (kansainvälinen ulottuvuus)
- Strasbourgin tuomioistuin (EIT): yksilövalitus Suomea vastaan rikosasioissa

KRIITTISET TARKISTUSPISTEET:
1. Rikoksen tunnusmerkistö — täyttyykö jokainen elementti (objektiivinen + subjektiivinen puoli)
2. Tahallisuus vs. tuottamus — oikea rikosnimike
3. Vanhentuminen (RL 8 luku) — onko syyte/ilmoitus tehty ajoissa
4. Syyttömyysolettama — ei loukkauksia asiakirjassa
5. Epäillyn/vastaajan oikeudet — itsekriminointisuoja, avustajan oikeus
6. Asianomistajan asema ja oikeudet — oikeus olla läsnä, tutkintatoimet
7. Vahingonkorvausvaatimukset — kaikki vahinkolajit katettu
8. Prosessuaaliset määräajat — syyteoikeus, muutoksenhaku
9. Todistelu — näyttökynnys rikosasiassa ("ei järkevää epäilystä")
10. Kansainvälinen ulottuvuus — onko rikos tehty ulkomailla tai onko ulkomainen tekijä`,

  "Rikosasia": `Kyseessä on rikosoikeudellinen asiakirja. Analysoi se kattavasti. Tunnista ensin onko kyse rikosilmoituksesta, vastineesta syytteeseen, asianomistajan vaatimuksista vai muutoksenhakukirjelmästä.

SOVELLETTAVA LAINSÄÄDÄNTÖ:
- Rikoslaki (RL 39/1889): tunnusmerkistöt, vastuuvapausperusteet (3-4 luku), vanhentuminen (8 luku), rangaistuksen määrääminen (6 luku)
- Laki oikeudenkäynnistä rikosasioissa (ROL 689/1997): syyteoikeus, näyttökynnys, muutoksenhaku
- Esitutkintalaki (ETL 805/2011): tutkintavelvollisuus, epäillyn oikeudet (7:5§ vaiti-oikeus, 4:10§ avustaja)
- Pakkokeinolaki (PKL 806/2011): pidättäminen, vangitseminen, takavarikko
- Vahingonkorvauslaki (VahL 412/1974): rikosperusteinen korvausvastuu, kärsimyskorvaus (5:6§)
- Rikosvahinkolaki (1204/2005): valtion korvausvastuu
- Euroopan ihmisoikeussopimus: 6 artikla (oikeudenmukainen oikeudenkäynti, syyttömyysolettama 6:2, puolustautumisoikeudet 6:3), 7 artikla (nulla poena sine lege)
- EU-direktiivit: uhrin oikeudet (2012/29/EU), syyttömyysolettama (2016/343/EU), oikeus asianajajaan (2013/48/EU)

KRIITTISET TARKISTUSPISTEET:
1. Rikoksen tunnusmerkistön täyttyminen — objektiivinen ja subjektiivinen puoli
2. Tahallisuus (dolus) vs. tuottamus (culpa) — oikea rikosnimike
3. Vanhentuminen (RL 8 luku) — onko ilmoitus/syyte tehty ajoissa
4. Vastuuvapausperusteet — hätävarjelu, pakkotila, erehdys
5. Syyttömyysolettama ja itsekriminointisuoja
6. Asianomistajan kaikki vahingonkorvausvaatimukset
7. Todistelu ja näyttökynnys ("ei järkevää epäilystä")
8. Prosessuaaliset määräajat ja muutoksenhakuoikeus
9. Kansainvälinen ulottuvuus (Eurooppalainen pidätysmääräys, ICC)`,

  "Oikaisu": `Kyseessä on oikaisupyyntö tai oikaisuvaatimus. Analysoi se kattavasti seuraavien oikeuslähteiden valossa:

SOVELLETTAVA SUOMEN LAINSÄÄDÄNTÖ:
- Hallintolaki (HL 434/2003): oikaisuvaatimusmenettely (49a-49g§), oikaisuvaatimusaika (30 pv), oikaisuvaatimusviranomainen, päätöksen korjaaminen (50§, asiavirhe; 51§, kirjoitusvirhe)
- Laki verotusmenettelystä (VML 1558/1995): verotuksen oikaisu verovelvollisen hyväksi (27§) ja vahingoksi (26§), oikaisulautakuntamenettely
- Arvonlisäverolaki (AVL 1501/1993): ALV-oikaisu
- Laki julkisista hankinnoista (1397/2016): hankintaoikaisu (132-135§) — 14 pv määräaika
- Kuntalaki (410/2015): kunnallisvalitus vs. oikaisuvaatimus, oikaisuvaatimusaika (14 pv)
- Sosiaalihuoltolaki (1301/2014): oikaisupyyntö sosiaalipalvelupäätöksestä
- Koulutuslainsäädäntö: oikaisu arvosanaan (Yliopistolaki 558/2009, 44§; AMK-laki 932/2014, 57§)
- Vakuutussopimuslaki (543/1994): muutoksenhaku vakuutusyhtiön päätökseen
- Potilasvahinkolaki (585/1986): potilasvahinkolautakunta
- Kuluttajansuojalaki (KSL): kuluttajariitalautakunta

EU-OIKEUS:
- GDPR (2016/679): oikeus saada virheelliset tiedot oikaistuksi (16 artikla), tietosuojavaltuutettu
- EU:n valtiontukisäädökset: tukipäätöksen oikaisu
- Euroopan oikeusasiamies: EU-toimielinten päätösten oikaisu

KRIITTISET TARKISTUSPISTEET:
1. Oikaisuvaatimusviranomainen — kenelle osoitetaan (sama vai ylempi viranomainen)
2. Määräaika — yleensä 14-30 pv päätöksestä (tiedoksisaannista)
3. Oikaisuvaatimuksen muoto: kirjallinen, asianosaisen allekirjoittama
4. Yksilöity päätös johon haetaan oikaisua (päätösnumero, päivämäärä)
5. Oikaisuvaatimuksen perusteet — oikeudellinen virhe vs. harkintavallan väärinkäyttö
6. Vaadittava muutos — täsmällinen vaatimus
7. Uudet selvitykset ja todisteet — voidaanko esittää oikaisuvaiheessa
8. Oikaisun vaikutus mahdolliseen valitukseen — onko oikaisuvaatimus tehtävä ensin
9. Täytäntöönpanon keskeyttämispyyntö oikaisun ajaksi
10. Korvausvaatimus virheellisestä päätöksestä aiheutuneista kuluista`,
};

async function analyzeContract(text: string, docType = ""): Promise<string> {
  const typeContext = DOC_TYPE_CONTEXT[docType] ?? "Analysoi asiakirja huolellisesti sen tyypistä riippumatta.";

  const msg = await anthropic.messages.create({
    model: "claude-opus-4-5",
    max_tokens: 2000,
    messages: [
      {
        role: "user",
        content: `Olet senior-tason suomalainen juristi ja asianajaja, jolla on 20 vuoden kokemus. Analysoi seuraava asiakirja ja laadi kattava esianalyysi juristia varten. Viittaa konkreettisiin lakipykäliin ja oikeuskäytäntöön.

Asiakirjatyyppi: ${docType || "Ei määritelty"}

ANALYYSIKEHYS:
${typeContext}

Muoto (suomenkielinen HTML, ei markdown — käytä h3, p, ul, li tageja):

<h3>Asiakirjatyyppi ja tarkoitus</h3>
<p>Tarkka kuvaus asiakirjatyypistä, sen oikeudellisesta luonteesta ja tarkoituksesta.</p>

<h3>Oikeudelliset riskit ja puutteet</h3>
<ul><li>Jokainen riski <strong>lakiviitteineen</strong> (esim. OikTL 36§, KL 17§)</li></ul>

<h3>Puuttuvat pakolliset elementit</h3>
<ul><li>Mitä asiakirjasta puuttuu oikeudellisen pätevyyden kannalta</li></ul>

<h3>Vastuukysymykset ja seuraukset</h3>
<p>Konkreettiset seuraukset jos asiakirjaa ei korjata — vahingonkorvausvastuu, pätemättömyys, prosessuaaliset sanktiot.</p>

<h3>Relevantti oikeuskäytäntö</h3>
<ul><li>KKO/KHO-ennakkopäätökset tai EUT-tuomiot jotka ovat relevantteja</li></ul>

<h3>Prioriteettijärjestyksessä: suositukset juristille</h3>
<ul><li>1. Kriittinen (korjattava heti)...</li><li>2. Tärkeä...</li><li>3. Suositeltava...</li></ul>

Ole täsmällinen, viittaa lakipykäliin ja käytä ammatillista oikeudellista kieltä.

ASIAKIRJA:
${text.slice(0, 8000)}`,
      },
    ],
  });

  const block = msg.content[0];
  return block.type === "text" ? block.text : "";
}

const DOC_TYPE_KORJAUS: Record<string, string> = {

  "Sopimus": `Kirjoita sopimus oikeudellisesti täydelliseksi ja tasapainoiseksi. Varmista seuraavat:

RAKENNE JA SISÄLTÖ:
1. Johdanto: osapuolten täydellinen yksilöinti (nimi, y-tunnus/hetu, osoite, edustaja ja edustusoikeus)
2. Sopimuksen kohde: täsmällinen, yksiselitteinen kuvaus toimitettavasta/suoritettavasta
3. Hinta ja maksuehdot: maksutapa, eräpäivä, viivästyskorko (Korkolaki 633/1982 mukainen), laskutusmenettely
4. Toimitusaika ja -tapa: täsmälliset päivämäärät, force majeure (ylivoimainen este)
5. Vastuunrajoituslauseke: kohtuullinen, yksilöity, molemminpuolinen — ei OikTL 36§:n vastainen
6. Salassapitolauseke: laajuus, kesto (min. 2 v sopimusajan jälkeen), poikkeukset, sanktiot
7. Immateriaalioikeudet: omistus, käyttöoikeudet, luovutus
8. Sopimuksen voimassaolo, irtisanominen (aika + muoto) ja purkaminen (perusteet)
9. Force majeure: määritelmä, ilmoitusvelvollisuus, kesto ennen oikeutta purkaa
10. Erimielisyyksien ratkaisu: neuvottelu → sovittelu → välimiesmenettely/käräjäoikeus, toimipaikka
11. Sovellettava laki: Suomen laki (tai perusteltu muu valinta)
12. Muutokset sopimukseen: kirjallinen muutosmenettely
13. GDPR-lauseke jos käsitellään henkilötietoja: roolit, käsittelyn peruste, tietoturva
14. Allekirjoitukset: paikka, päiväys, asema

KIELELLINEN STANDARDI: Täsmällinen suomen sopimusoikeudellinen kieli. Vältä epämääräisiä ilmaisuja ("kohtuullinen aika", "tarpeen mukaan"). Käytä definitiivisiä termejä.`,

  "Valitus": `Kirjoita valitus prosessuaalisesti täydelliseen ja vakuuttavaan muotoon:

RAKENNE:
1. Otsikko: VALITUS [tuomioistuin], Dnro/viite
2. Asianosaiset: valittaja ja vastapuoli täydellisine yhteystietoineen, asiamies
3. Valituksenalainen päätös: viranomainen, päätösnumero, päivämäärä
4. VAATIMUKSET (täsmälliset, numeroidut):
   — Päävaatimus: mitä päätökseltä vaaditaan (kumottavaksi/muutettavaksi)
   — Toissijaiset vaatimukset
   — Oikeudenkäyntikulujen korvausvaatimus
   — Täytäntöönpanon keskeyttämispyyntö tarvittaessa
5. PERUSTEET (juridisesti argumentoitu):
   a) Menettelyvirheet (onko kuulemisvelvollisuus täytetty? HL 34§)
   b) Lainvastaisuus (mikä säännös on rikottu, miten)
   c) Harkintavallan väärinkäyttö tai ylitys
   d) Suhteellisuusperiaatteen loukkaaminen
   e) Perusoikeuksien loukkaaminen (PL 21§, EIS 6 artikla)
6. TODISTEET: numeroitu luettelo, mitä kukin todistaa
7. Oikeuslähteet: lakipykälät, KHO/KKO-ennakkopäätökset, EUT-tuomiot
8. Allekirjoitus ja päiväys

ARGUMENTAATIOTEKNIIKKA: IRAC-menetelmä (Issue → Rule → Application → Conclusion) jokaiselle perusteelle.`,

  "Kirjelmä": `Kirjoita kirjelmä prosessuaalisesti täydelliseen ja vakuuttavaan muotoon:

RAKENNE (OK 5:2§ mukaan):
1. Otsikko: HAASTEHAKEMUS/VASTAUS/KIRJELMÄ, tuomioistuin, asia
2. Asianosaiset: kantaja/hakija ja vastaaja/vastapuoli, asiamiehen tiedot, valtakirja
3. VAATIMUKSET (täsmälliset, numeroituina):
   — Päävaatimus euroineen ja korkoineen
   — Turvaamistoimivaatimus tarvittaessa (OK 7 luku)
   — Oikeudenkäyntikulujen korvausvaatimus
4. TOSIASIAT (kronologisesti):
   — Selkeä tapahtumakulku
   — Jokainen oikeudellisesti relevantti fakta
5. OIKEUDELLINEN ARVIOINTI:
   — Sovellettavat oikeusnormit (pykälät ja momentit)
   — Oikeuskäytäntö (KKO-ennakkopäätökset, hovioikeuspäätökset)
   — Oikeuskirjallisuus
   — Subsumptio: faktat + normi = johtopäätös
6. TODISTELU (OK 5:2.2§ — on esitettävä heti):
   — Kirjalliset todisteet numeroidusti (K1, K2...)
   — Todistajat ja mitä todistavat
   — Asiantuntijatodistelu
7. Sovintovalmiuden ilmaiseminen (tarvittaessa)
8. Allekirjoitus, päiväys, asiamiehen tiedot`,

  "Hakemus": `Kirjoita hakemus viranomaisvaatimusten mukaiseen täydelliseen muotoon:

RAKENNE:
1. Otsikko: HAKEMUS + hakemuksen kohde
2. Hakija: täydellinen yksilöinti, yhteystiedot, asiamies tarvittaessa
3. Toimivaltainen viranomainen: oikea viranomainen (tarkista organisaatio)
4. HAKEMUKSEN KOHDE: täsmällinen kuvaus mitä haetaan
5. PERUSTELUT:
   a) Oikeusperuste: mihin lakipykälään hakemus perustuu
   b) Tosiasialliset perusteet: faktat jotka tukevat myöntämistä
   c) Intressivertailu: haettavan luvan hyödyt vs. mahdolliset haitat
   d) Vastaavat tapaukset / viranomaisohjeistus
6. LIITTEET (yksilöitynä):
   — Pakolliset liitteet lain mukaan
   — Hakemusta tukevat selvitykset
   — Lausunnot (naapurit, asiantuntijat tms.)
7. Hakemuksen käsittely:
   — Pyyntö kiireellisestä käsittelystä tarvittaessa
   — Lupaukset tietojen oikeellisuudesta
   — Salassapitopyyntö arkaluonteisille tiedoille (JulkL 621/1999)
8. GDPR: suostumus henkilötietojen käsittelyyn viranomaisessa
9. Päiväys, allekirjoitus, arvonimi/asema`,

  "Vastine": `Kirjoita vastine kattavaksi, juridisesti täsmälliseksi ja strategisesti vahvaksi:

RAKENNE (OK 5:10§ mukaan):
1. Otsikko: VASTAUS/VASTINE, tuomioistuin, asia/dnro
2. Asianosaiset: vastaaja täydellisine tietoineen, asiamies
3. VAATIMUKSET (yksiselitteiset):
   — Päävaatimus: kanteen/hakemuksen hylkääminen
   — Prosessuaaliset väitteet: toimivalta, asianosaisasema, kanteen tutkittavuus, vanhentuminen
   — Kuittausvaatimus jos soveltuu
   — Oikeudenkäyntikulujen korvausvaatimus
4. KANTAJAN VÄITTEIDEN KÄSITTELY (systemaattisesti):
   — Jokainen väite MYÖNNETÄÄN tai KIISTETÄÄN (ei yleistä kiistämistä)
   — Kiistämisen perusteet täsmällisesti
   — Oma vaihtoehtoinen tosiasiakuvaus
5. OIKEUDELLINEN ARVIOINTI:
   — Todistustaakka: kenellä taakka, täyttyykö se
   — Sovellettavat oikeusnormit
   — KKO-ennakkopäätökset vastaajan tueksi
   — Vahingon määrä / oikeudellinen seuraus
6. TODISTEET (on esitettävä heti — OK 5:17§ prekluusio):
   — Kirjalliset todisteet (V1, V2...)
   — Todistajat ja mitä todistavat
7. Vanhentumisväite (VanhL 728/2003): onko saatava vanhentunut
8. Sovintovalmiuden ilmaiseminen
9. Allekirjoitus, päiväys`,

  "Rikosasia": `Kirjoita rikosoikeudellinen asiakirja täydelliseen, juridisesti pätevään ja strategisesti vahvaan muotoon. Tunnista ensin asiakirjatyyppi (rikosilmoitus / vastine syytteeseen / asianomistajan vaatimukset / syyttäjäkirjelmä / muutoksenhaku) ja noudata sen erityisvaatimuksia.

RIKOSILMOITUS (jos kyseessä):
1. Otsikko: RIKOSILMOITUS, poliisilaitos, päivämäärä
2. Ilmoittaja: täydellinen yksilöinti, yhteystiedot
3. Epäilty: nimi ja muut tunnetut tiedot (ei pakollinen)
4. TAPAHTUMAKUVAUS:
   — Tarkka aika ja paikka
   — Tapahtumakulku kronologisesti
   — Todistajat ja muut asianosaiset
5. RIKOSNIMIKE-EHDOTUS (lakipykälineen):
   — Päärikosepäily (esim. "Petos, RL 36:1§")
   — Mahdolliset lisärikokset
6. VAHINGONKORVAUSVAATIMUKSET:
   — Esinevahinko (dokumentoitu)
   — Henkilövahinko
   — Kärsimys (VahL 5:6§)
   — Oikeudenkäyntikulut
7. Todisteet: luettelo (dokumentit, kuitit, viestit, todistajat)
8. Pyyntö: esitutkinnan toimittamisesta, takavarikosta tms.

VASTINE SYYTTEESEEN / PUOLUSTAUTUMISKIRJELMÄ:
1. KIISTÄMINEN: selkeä, täsmällinen — myönnetäänkö vai kiistetäänkö syyte
2. VASTUUVAPAUSPERUSTEET: hätävarjelu (RL 4:4§), pakkotila (4:5§), erehdys (4:1-4§)
3. TUNNUSMERKISTÖN PUUTTUMINEN: mikä elementti ei täyty
4. TAHALLISUUDEN / TUOTTAMUKSEN PUUTTUMINEN
5. VANHENTUMISVÄITE (RL 8 luku)
6. TODISTELU: alibi, vastanäyttö, asiantuntijat
7. RANGAISTUKSEN LIEVENTÄMISPERUSTEET (RL 6:6§): tunnustaminen, myötävaikutus, nuoruus
8. VAHINGONKORVAUSVAATIMUKSEN KIISTÄMINEN
9. Oikeudenkäyntikulujen korvausvaatimus

STRATEGISET PERIAATTEET:
- Syyttömyysolettama (EIS 6:2): vastaajan ei tarvitse todistaa innocence
- Itsekriminointisuoja: ei velvollisuutta myötävaikuttaa oman syyllisyyden selvittämiseen
- Näyttökynnys: syyttäjällä todistustaakka — "ei järkevää epäilystä jää"
- In dubio pro reo: epäselvä tilanne tulkitaan syytetyn eduksi`,

  "Oikaisu": `Kirjoita oikaisupyyntö/-vaatimus muodollisesti oikeaan ja sisällöllisesti vahvaan muotoon:

RAKENNE:
1. Otsikko: OIKAISUVAATIMUS / OIKAISUPYYNTÖ
2. Oikaisuvaatimusviranomainen: oikea viranomainen (sama vai ylempi, tarkista laki)
3. Oikaisun hakija: täydellinen yksilöinti, yhteystiedot, asiamies
4. OIKAISTAVANA OLEVA PÄÄTÖS:
   — Päätöksentekijä, päätösnumero, päivämäärä
   — Päätöksen sisältö lyhyesti
   — Tiedoksisaantipäivä (määräajan laskemiseksi)
5. VAATIMUKSET (täsmälliset):
   — Päävaatimus: mitä päätökselle vaaditaan
   — Toissijaiset vaatimukset
   — Täytäntöönpanon keskeyttämispyyntö
   — Kulujen korvausvaatimus
6. OIKAISUPERUSTEET:
   a) Asiavirhe (HL 50§): virheellinen tosiseikaston arviointi, selvitysvelvollisuuden laiminlyönti
   b) Kirjoitusvirhe (HL 51§): laskuvirhe, kirjoitusvirhe
   c) Lainvastaisuus: mikä säännös rikottu
   d) Harkintavallan väärinkäyttö tai tarkoitussidonnaisuuden periaatteen loukkaus
   e) Yhdenvertaisuusperiaatteen loukkaus (PL 6§): erilainen kohtelu ilman hyväksyttävää syytä
   f) Suhteellisuusperiaatteen loukkaus
7. UUDET SELVITYKSET: voidaan esittää oikaisuvaiheessa
8. Liitteet: alkuperäinen päätös, uudet todisteet
9. Päiväys, allekirjoitus
10. HUOM: Mainitse selvästi jos oikaisuvaatimus on tehtävä ennen valitusta (moniportainen muutoksenhaku)`,
};

async function generateKorjattuAsiakirja(text: string, fileName: string, docType = ""): Promise<string> {
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

Asiakirjatyyppi: ${docType || "Ei määritelty"}
Erityisohjeet tyypin mukaan: ${DOC_TYPE_KORJAUS[docType] ?? "Korjaa asiakirja oikeudellisesti päteväksi ja kattavaksi."}

Yleisohjeet:
- Säilytä alkuperäinen tarkoitus ja osapuolten tiedot
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
    const docType = sp.get("docType") ?? "";
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
        analyzeContract(contractText, docType),
        generateKorjattuAsiakirja(contractText, fileName, docType),
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
      docType: docType,
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
