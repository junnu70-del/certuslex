import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Tietosuojaseloste — CertusLex",
  description: "CertusLex-palvelun tietosuojaseloste ja henkilötietojen käsittely.",
};

export default function Tietosuoja() {
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
          <h1 style={{ fontFamily: "var(--font-cormorant), Georgia, serif", fontSize: "2.4rem", fontWeight: 700, color: "#0F1F3D", marginBottom: "0.5rem" }}>Tietosuojaseloste</h1>
          <p style={{ fontSize: "0.82rem", color: "#8A8070" }}>Voimassa 1.1.2026 alkaen · Päivitetty 24.4.2026</p>
        </div>

        {/* Sections */}
        {[
          {
            num: "1",
            title: "Rekisterinpitäjä",
            content: (
              <>
                <p>DeepEnd Solutions Oy (CertusLex-palvelu)<br />
                Y-tunnus: 3620565-7<br />
                Sähköposti: <a href="mailto:info@certuslex.fi" style={{ color: "#C8A44A" }}>info@certuslex.fi</a><br />
                Verkkosivu: <a href="https://certuslex.fi" style={{ color: "#C8A44A" }}>certuslex.fi</a></p>
              </>
            )
          },
          {
            num: "2",
            title: "Henkilötietojen käsittelyn tarkoitus",
            content: (
              <>
                <p>Käsittelemme henkilötietoja seuraaviin tarkoituksiin:</p>
                <ul>
                  <li>Asiakirjojen tarkastuspalvelun toteuttaminen</li>
                  <li>Lausunnon toimittaminen asiakkaalle sähköpostitse</li>
                  <li>Asiakasviestintä ja palvelun kehittäminen</li>
                  <li>Laskutus ja maksujen käsittely</li>
                  <li>Lakisääteisten velvoitteiden täyttäminen</li>
                </ul>
              </>
            )
          },
          {
            num: "3",
            title: "Käsiteltävät henkilötiedot",
            content: (
              <>
                <p>Keräämme palvelun käytön yhteydessä seuraavat tiedot:</p>
                <ul>
                  <li>Sähköpostiosoite (lausunnon toimittamista varten)</li>
                  <li>Lähetetyn asiakirjan sisältö (tarkastusta varten)</li>
                  <li>Valittu palvelupaketti ja asiakirjatyyppi</li>
                  <li>Tilauksen aikaleima ja tilausnumero</li>
                </ul>
                <p style={{ marginTop: "1rem" }}>Emme kerää tarpeettomia tietoja emmekä pyydä tunnistetietoja kuten henkilötunnusta tai osoitetta.</p>
              </>
            )
          },
          {
            num: "4",
            title: "Käsittelyn oikeusperuste",
            content: (
              <p>Henkilötietojen käsittely perustuu <strong>sopimuksen täytäntöönpanoon</strong> (GDPR 6 art. 1 b-kohta) — käsittelemme tietoja palvelun tuottamiseksi asiakkaan tilauksesta. Lisäksi käsittely perustuu <strong>lakisääteisen velvoitteen noudattamiseen</strong> kirjanpito- ja arkistointivelvollisuuksien osalta.</p>
            )
          },
          {
            num: "5",
            title: "Tietojen säilytysaika",
            content: (
              <>
                <p>Säilytämme tietoja seuraavasti:</p>
                <ul>
                  <li><strong>Asiakirjat ja lausunnot:</strong> 2 vuotta palvelun toimittamisesta</li>
                  <li><strong>Sähköpostiosoite:</strong> 2 vuotta viimeisestä tilauksesta</li>
                  <li><strong>Kirjanpitoaineisto:</strong> 6 vuotta tilikauden päättymisestä (kirjanpitolaki)</li>
                </ul>
              </>
            )
          },
          {
            num: "6",
            title: "Tietojen luovutus ja vastaanottajat",
            content: (
              <>
                <p>Emme myy tai luovuta henkilötietoja kolmansille osapuolille markkinointitarkoituksiin. Tietoja voidaan luovuttaa:</p>
                <ul>
                  <li><strong>Palvelua tarkastava juristi</strong> — asiakirjan tarkastusta varten (vaitiolovelvollisuuden alainen)</li>
                  <li><strong>Google Firebase</strong> — tietojen tallennusalusta (EU:n tietosuojasääntelyä noudattava)</li>
                  <li><strong>Viranomaiset</strong> — lakisääteisen velvoitteen perusteella</li>
                </ul>
              </>
            )
          },
          {
            num: "7",
            title: "Tietojen siirto EU:n ulkopuolelle",
            content: (
              <p>Palvelun tekninen infrastruktuuri (Firebase, Vercel) voi siirtää tietoja EU/ETA-alueen ulkopuolelle. Siirrot tapahtuvat EU:n komission hyväksymien vakiosopimuslausekkeiden tai riittävyystoteamuksen nojalla. Google Firebase noudattaa GDPR:n vaatimuksia.</p>
            )
          },
          {
            num: "8",
            title: "Rekisteröidyn oikeudet",
            content: (
              <>
                <p>Sinulla on oikeus:</p>
                <ul>
                  <li><strong>Tarkastusoikeus</strong> — pyytää pääsy omiin tietoihisi</li>
                  <li><strong>Oikaisupyyntö</strong> — pyytää virheellisten tietojen korjaamista</li>
                  <li><strong>Poistopyyntö</strong> — pyytää tietojesi poistamista ("oikeus tulla unohdetuksi")</li>
                  <li><strong>Käsittelyn rajoittaminen</strong> — pyytää käsittelyn rajoittamista tietyissä tilanteissa</li>
                  <li><strong>Vastustamisoikeus</strong> — vastustaa tietojen käsittelyä</li>
                  <li><strong>Siirto-oikeus</strong> — saada tietosi koneluettavassa muodossa</li>
                </ul>
                <p style={{ marginTop: "1rem" }}>Oikeuksiasi voit käyttää ottamalla yhteyttä: <a href="mailto:info@certuslex.fi" style={{ color: "#C8A44A" }}>info@certuslex.fi</a></p>
                <p style={{ marginTop: "0.5rem" }}>Sinulla on myös oikeus tehdä valitus <strong>tietosuojavaltuutetulle</strong>: <a href="https://tietosuoja.fi" target="_blank" rel="noopener noreferrer" style={{ color: "#C8A44A" }}>tietosuoja.fi</a></p>
              </>
            )
          },
          {
            num: "9",
            title: "Tietoturva",
            content: (
              <p>Suojaamme henkilötiedot asianmukaisin teknisin ja organisatorisin toimenpitein. Tiedot tallennetaan salattuina Google Firebase -alustalle. Palveluun pääsy on rajoitettu vain asiakirjan käsittelyyn osallistuville henkilöille. Palvelun HTTPS-salaus varmistaa tiedonsiirron turvallisuuden.</p>
            )
          },
          {
            num: "10",
            title: "Evästeet ja seuranta",
            content: (
              <p>CertusLex ei käytä seurantaevästeitä eikä kolmansien osapuolten analytiikkatyökaluja. Palvelu ei seuraa käyttäjien toimintaa sivuston ulkopuolella.</p>
            )
          },
          {
            num: "11",
            title: "Tietosuojaselosteen päivittäminen",
            content: (
              <p>Pidätämme oikeuden päivittää tätä tietosuojaselostetta. Olennaisista muutoksista ilmoitetaan palvelun verkkosivulla. Suosittelemme tutustumaan tietosuojaselosteeseen säännöllisesti.</p>
            )
          },
          {
            num: "12",
            title: "Yhteydenotot",
            content: (
              <p>Tietosuojaan liittyvissä kysymyksissä ota yhteyttä:<br />
              <a href="mailto:info@certuslex.fi" style={{ color: "#C8A44A" }}>info@certuslex.fi</a><br />
              DeepEnd Solutions Oy / CertusLex</p>
            )
          },
        ].map((section) => (
          <div key={section.num} style={{ marginBottom: "2.5rem" }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: "1rem", marginBottom: "0.8rem" }}>
              <span style={{ fontFamily: "var(--font-cormorant), Georgia, serif", fontSize: "1.8rem", fontWeight: 700, color: "rgba(200,164,74,0.2)", lineHeight: 1, flexShrink: 0 }}>{section.num}</span>
              <h2 style={{ fontFamily: "var(--font-cormorant), Georgia, serif", fontSize: "1.3rem", fontWeight: 700, color: "#0F1F3D" }}>{section.title}</h2>
            </div>
            <div style={{ paddingLeft: "2.8rem", fontSize: "0.9rem", color: "#4A4035", lineHeight: 1.85 }}>
              {section.content}
            </div>
          </div>
        ))}

        {/* Bottom gold line */}
        <div style={{ height: "1px", background: "linear-gradient(90deg, #C8A44A, transparent)", margin: "3rem 0 2rem" }} />
        <p style={{ fontSize: "0.78rem", color: "#8A8070" }}>© 2026 CertusLex — DeepEnd Solutions Oy · <a href="mailto:info@certuslex.fi" style={{ color: "#C8A44A", textDecoration: "none" }}>info@certuslex.fi</a></p>
      </div>
    </div>
  );
}
