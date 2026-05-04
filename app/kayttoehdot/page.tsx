import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Käyttöehdot — CertusLex",
  description: "CertusLex-palvelun käyttöehdot ja vastuunrajoitukset.",
};

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div style={{ marginBottom: "2.5rem" }}>
    <h2 style={{ fontFamily: "var(--font-cormorant), Georgia, serif", fontSize: "1.35rem", fontWeight: 700, color: "#0F1F3D", marginBottom: "0.9rem", borderBottom: "1px solid #EDE8DE", paddingBottom: "0.5rem" }}>{title}</h2>
    <div style={{ fontSize: "0.88rem", color: "#4A4438", lineHeight: 1.85 }}>{children}</div>
  </div>
);

const P = ({ children }: { children: React.ReactNode }) => (
  <p style={{ margin: "0 0 0.8rem" }}>{children}</p>
);

const Highlight = ({ children }: { children: React.ReactNode }) => (
  <div style={{ background: "#0F1F3D", borderLeft: "4px solid #C8A44A", padding: "1.2rem 1.6rem", margin: "1.2rem 0", color: "#F7F4EE", fontSize: "0.86rem", lineHeight: 1.75 }}>
    {children}
  </div>
);

export default function Kayttoehdot() {
  return (
    <div style={{ background: "#F7F4EE", minHeight: "100vh" }}>
      {/* Nav */}
      <nav style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "1.4rem 3rem", borderBottom: "1px solid #EDE8DE", background: "#fff" }}>
        <Link href="/" style={{ fontFamily: "var(--font-cormorant), Georgia, serif", fontSize: "1.9rem", fontWeight: 700, letterSpacing: "-0.02em", textDecoration: "none", color: "#0F1F3D" }}>
          Certus<span style={{ color: "#C8A44A" }}>Lex</span>
        </Link>
        <Link href="/" style={{ fontSize: "0.82rem", color: "#8A8070", textDecoration: "none" }}>← Etusivu</Link>
      </nav>

      {/* Content */}
      <div style={{ maxWidth: "780px", margin: "0 auto", padding: "4rem 2rem 6rem" }}>

        {/* Header */}
        <div style={{ borderLeft: "4px solid #C8A44A", paddingLeft: "1.5rem", marginBottom: "3rem" }}>
          <div style={{ fontSize: "0.72rem", letterSpacing: "0.14em", color: "#C8A44A", marginBottom: "0.5rem" }}>JURIDINEN DOKUMENTTI</div>
          <h1 style={{ fontFamily: "var(--font-cormorant), Georgia, serif", fontSize: "2.4rem", fontWeight: 700, color: "#0F1F3D", marginBottom: "0.5rem" }}>Käyttöehdot</h1>
          <p style={{ fontSize: "0.82rem", color: "#8A8070" }}>Voimassa 1.5.2026 alkaen · Päivitetty 4.5.2026</p>
        </div>

        <Highlight>
          <strong>Tärkeää ennen palvelun käyttöä:</strong> CertusLex on tarjousten laadinnan apuväline, ei automaattinen tarjousjärjestelmä. Palvelu tuottaa suuntaa-antavia hinta-arvioita yleisesti saatavilla olevien tietojen ja käyttäjän syöttämien tietojen perusteella. Käyttäjä vastaa aina itse lopullisesta tarjouksesta ja sen taloudellisista seurauksista.
        </Highlight>

        <Section title="1. Palveluntarjoaja">
          <P>CertusLex-palvelun tarjoaa <strong>DeepEnd Solutions Oy</strong> (Y-tunnus 3620565-7), jäljempänä "palveluntarjoaja". Palvelun yhteystieto on info@certuslex.fi.</P>
        </Section>

        <Section title="2. Palvelun luonne ja tarkoitus">
          <P>CertusLex on digitaalinen työkalu, jonka tarkoituksena on <strong>helpottaa ja nopeuttaa tarjousten laadintaa</strong>. Palvelu hyödyntää tekoälyä (AI) tarjousehdotusten tuottamisessa käyttäjän syöttämien tietojen sekä yleisesti saatavilla olevien markkina- ja hintainformaatioiden perusteella.</P>
          <P>Palvelu <strong>ei ole</strong>:</P>
          <ul style={{ paddingLeft: "1.4rem", margin: "0 0 0.8rem" }}>
            <li style={{ marginBottom: "0.4rem" }}>taloudellinen tai liiketoiminnallinen neuvontapalvelu</li>
            <li style={{ marginBottom: "0.4rem" }}>sitovien tarjousten automaattinen tuottamisjärjestelmä</li>
            <li style={{ marginBottom: "0.4rem" }}>oikeudellinen palvelu tai asiamiespalvelu</li>
            <li style={{ marginBottom: "0.4rem" }}>takuu oikein hinnoitelluista tai lainmukaisista tarjouksista</li>
          </ul>
          <P>Palvelun tuottamat hinta-arviot ovat <strong>suuntaa-antavia</strong>. Ne perustuvat yleisesti saatavilla olevaan tietoon, eikä palveluntarjoaja varmista tietojen ajantasaisuutta tai paikkansapitävyyttä yksittäisen käyttäjän toimialan tai projektin osalta.</P>
        </Section>

        <Section title="3. Käyttäjän vastuut">
          <P>Käyttäjä on yksin vastuussa:</P>
          <ul style={{ paddingLeft: "1.4rem", margin: "0 0 0.8rem" }}>
            <li style={{ marginBottom: "0.4rem" }}>palvelun tuottaman tarjouksen tarkistamisesta ennen sen lähettämistä asiakkaalle</li>
            <li style={{ marginBottom: "0.4rem" }}>hintojen, materiaalikustannusten ja työmäärän oikeellisuuden varmistamisesta</li>
            <li style={{ marginBottom: "0.4rem" }}>tarjouksen soveltuvuudesta kulloisenkin projektin erityispiirteisiin</li>
            <li style={{ marginBottom: "0.4rem" }}>tarjouksen lainmukaisuudesta omalla toimialallaan</li>
            <li style={{ marginBottom: "0.4rem" }}>kaikista taloudellisista seurauksista, jotka johtuvat asiakkaalle lähetetystä tarjouksesta</li>
          </ul>
          <P>Palveluun syötettyjen tietojen oikeellisuudesta ja täydellisyydestä vastaa käyttäjä itse. Palveluntarjoajalla ei ole velvollisuutta tarkistaa käyttäjän syöttämiä tietoja.</P>
        </Section>

        <Section title="4. Vastuunrajoitus">
          <Highlight>
            <strong>Palveluntarjoaja ei vastaa mistään välittömistä tai välillisistä vahingoista,</strong> mukaan lukien mutta ei rajoittuen: saamatta jäänyt tulo, liiketoimintatappio, sopimussakot tai muut taloudelliset menetykset, jotka aiheutuvat palvelun käytöstä tai siinä esiintyvistä puutteista, virheistä tai katkoksista.
          </Highlight>
          <P>Vastuunrajoitus kattaa erityisesti tilanteet, joissa:</P>
          <ul style={{ paddingLeft: "1.4rem", margin: "0 0 0.8rem" }}>
            <li style={{ marginBottom: "0.4rem" }}>AI:n tuottama hinta-arvio poikkeaa projektin todellisista kustannuksista</li>
            <li style={{ marginBottom: "0.4rem" }}>tarjous ei kata kaikkia projektin kustannuksia tai työvaiheita</li>
            <li style={{ marginBottom: "0.4rem" }}>käyttäjä on lähettänyt tarjouksen tarkistamatta sitä asianmukaisesti</li>
            <li style={{ marginBottom: "0.4rem" }}>palvelu on tilapäisesti poissa käytöstä tai toimii virheellisesti</li>
            <li style={{ marginBottom: "0.4rem" }}>tekoälymalli tuottaa epätarkan tai virheellisen tuloksen</li>
          </ul>
          <P>Palveluntarjoajan enimmäisvastuu rajoittuu kaikissa tilanteissa käyttäjän palvelusta maksamaan tilausmaksuun edeltävältä 12 kuukaudelta.</P>
        </Section>

        <Section title="5. Tietolähteet ja tietojen ajantasaisuus">
          <P>Palvelun AI-malli hyödyntää yleisesti saatavilla olevia tietoja, kuten toimialakohtaisia hintatasoja, materiaalikustannuksia ja lainsäädäntöä. Nämä tiedot voivat olla <strong>puutteellisia, vanhentuneita tai alueellisesti epätarkkoja</strong>.</P>
          <P>Palveluntarjoaja ei takaa tietojen ajantasaisuutta eikä vastaa tietojen perusteella tehdyistä päätöksistä tai niiden seurauksista.</P>
        </Section>

        <Section title="6. Tilaus, hinnoittelu ja peruutus">
          <P>Palvelu tarjotaan kuukausitilauspohjaisena. Hinnoittelu on nähtävillä osoitteessa certuslex.fi/hinnoittelu. Kokeilu alkaa rekisteröinnin yhteydessä ja kestää 30 päivää ilman maksusitoumusta.</P>
          <P>Tilaajan tulee peruuttaa tilaus ennen kokeilujakson päättymistä välttääkseen veloituksen. Peruutus tapahtuu palvelun asetuksista tai ottamalla yhteyttä info@certuslex.fi.</P>
        </Section>

        <Section title="7. Immateriaalioikeudet">
          <P>Palvelu, sen rakenne, käyttöliittymä ja toiminnallisuudet ovat palveluntarjoajan omaisuutta. Käyttäjälle myönnetään rajoitettu, ei-yksinomainen käyttöoikeus palveluun tilauksen voimassaoloaikana. Palvelun kopioiminen, jäljentäminen tai jälleenmyyminen ilman lupaa on kielletty.</P>
          <P>Käyttäjän palveluun syöttämät tiedot pysyvät käyttäjän omaisuutena. Palveluntarjoaja käyttää niitä vain palvelun tuottamiseen eikä luovuta niitä kolmansille osapuolille.</P>
        </Section>

        <Section title="8. Muutokset käyttöehtoihin">
          <P>Palveluntarjoajalla on oikeus muuttaa näitä käyttöehtoja. Oleellisista muutoksista ilmoitetaan käyttäjälle sähköpostitse vähintään 14 päivää ennen muutoksen voimaantuloa. Jatkamalla palvelun käyttöä muutoksen jälkeen käyttäjä hyväksyy uudet ehdot.</P>
        </Section>

        <Section title="9. Sovellettava laki ja riitojen ratkaisu">
          <P>Näihin käyttöehtoihin sovelletaan Suomen lakia. Palveluntarjoajan ja käyttäjän väliset riidat pyritään ratkaisemaan ensisijaisesti neuvotteluteitse. Mikäli neuvottelut eivät johda tulokseen, riidat ratkaistaan Helsingin käräjäoikeudessa.</P>
        </Section>

        <Section title="10. Yhteystiedot">
          <P>Käyttöehtoja koskevat kysymykset ja reklamaatiot osoitetaan osoitteeseen <strong>info@certuslex.fi</strong>. Pyrimme vastaamaan kaikkiin yhteydenottoihin kahden arkipäivän kuluessa.</P>
        </Section>

        {/* Footer */}
        <div style={{ borderTop: "1px solid #EDE8DE", paddingTop: "2rem", marginTop: "1rem", display: "flex", gap: "2rem", flexWrap: "wrap" as const }}>
          <Link href="/tietosuoja" style={{ fontSize: "0.82rem", color: "#8A8070", textDecoration: "none" }}>Tietosuojaseloste</Link>
          <Link href="/hinnoittelu" style={{ fontSize: "0.82rem", color: "#8A8070", textDecoration: "none" }}>Hinnoittelu</Link>
          <Link href="/ohjeet" style={{ fontSize: "0.82rem", color: "#8A8070", textDecoration: "none" }}>Ohjeet</Link>
        </div>
      </div>
    </div>
  );
}
