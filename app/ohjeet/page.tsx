"use client";
export const dynamic = "force-dynamic";
import Link from "next/link";
import { useState } from "react";

const STEPS = [
  { num: "01", title: "Rekisteröidy ilmaiseksi", desc: "Luo tili sähköpostilla ja salasanalla. 30 päivän kokeilu käynnistyy automaattisesti — ei luottokorttia." },
  { num: "02", title: "Täytä yritysprofiili", desc: "Syötä yritystietosi kerran: nimi, Y-tunnus, osoite, logo, tuntihinta ja maksuehdot. Tiedot täyttyvät automaattisesti jokaiseen tarjoukseen." },
  { num: "03", title: "Avaa Tarjouskone", desc: "Siirry Tarjouskoneeseen ja käy läpi kolme vaihetta: yritystiedot (esitäytetty), projektin tiedot ja spesifikaatiot." },
  { num: "04", title: "Kuvaa projekti", desc: "Kirjoita vapaamuotoisesti mitä projekti sisältää — materiaalit, työvaiheet, arviot. Voit myös liittää PDF-piirustuksia, Excel-laskelmia tai kuvia." },
  { num: "05", title: "Generoi tarjous AI:lla", desc: "Paina nappia ja odota 15–30 sekuntia. AI tuottaa ammattimaisen tarjousdokumentin hintalaskelmineen ja aikatauluineen." },
  { num: "06", title: "Lähetä asiakkaalle", desc: "Syötä asiakkaan sähköposti ja lähetä. Asiakas saa henkilökohtaisen linkin josta voi kommentoida tai allekirjoittaa tarjouksen sähköisesti." },
];

const FAQ = [
  {
    q: "Tarvitseeko luottokorttia kokeilun aloittamiseen?",
    a: "Ei tarvitse. Kokeile 30 päivää täysin ilmaiseksi — maksukortti kysytään vasta kun kokeilu päättyy ja haluat jatkaa.",
  },
  {
    q: "Mitä tiedostomuotoja voin liittää tarjoukseen?",
    a: "Tarjouskone tukee PDF-dokumentteja, Excel- ja CSV-taulukoita sekä kuvia (PNG, JPG, WebP). Maksimikoko on 15 Mt. AI analysoi liitteen ja hyödyntää tietoja automaattisesti hintalaskelmassa.",
  },
  {
    q: "Miten sähköinen allekirjoitus toimii?",
    a: "Asiakas saa sähköpostiin henkilökohtaisen linkin tarjoukseen. Linkistä voi kommentoida tai hyväksyä tarjouksen sähköisesti kirjoittamalla nimensä. Allekirjoitus on eIDAS-yhteensopiva yksinkertainen sähköinen allekirjoitus.",
  },
  {
    q: "Voinko muokata AI:n tuottamaa tarjousta?",
    a: "Tällä hetkellä tarjouksen voi tulostaa tai kopioida tekstinä muokattavaksi. Suora muokkaus selaimessa on tulossa myöhemmässä versiossa. Voit myös säätää speksejä ja generoida uudelleen.",
  },
  {
    q: "Mitä kate-% kenttä tekee?",
    a: "Kun syötät esimerkiksi 20, AI lisää 20% katteen kaikkiin kustannuksiin automaattisesti. Kateprosentti ei näy asiakkaalle — se sisällytetään suoraan yksikköhintoihin.",
  },
  {
    q: "Näkyykö tarjous arkistossa heti lähetyksen jälkeen?",
    a: "Kyllä. Jokainen lähetetty tarjous tallentuu automaattisesti Tarjousarkistoon statuksella 'Lähetetty'. Kun asiakas kommentoi tai allekirjoittaa, status päivittyy.",
  },
  {
    q: "Voinko vaihtaa pakettia myöhemmin?",
    a: "Kyllä. Voit päivittää tai laskea pakettiasi milloin tahansa — muutos astuu voimaan seuraavasta laskutuskaudesta.",
  },
  {
    q: "Mihin otan yhteyttä jos ilmenee ongelmia?",
    a: "Lähetä sähköpostia osoitteeseen info@certuslex.fi — vastaamme yleensä saman päivän aikana.",
  },
];

export default function OhjeetPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  return (
    <div style={{ background: "#F7F4EE", minHeight: "100vh", fontFamily: "var(--font-dm-sans), Arial, sans-serif" }}>
      {/* Nav */}
      <nav style={{ background: "#0F1F3D", padding: "1rem 2rem", borderLeft: "4px solid #C8A44A", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <Link href="/" style={{ fontFamily: "var(--font-cormorant), Georgia, serif", fontSize: "1.6rem", fontWeight: 700, color: "#fff", textDecoration: "none" }}>
          Certus<span style={{ color: "#C8A44A" }}>Lex</span>
        </Link>
        <div style={{ display: "flex", gap: "1.5rem", alignItems: "center" }}>
          <Link href="/tarjouskone" style={{ color: "#C8A44A", fontSize: "0.82rem", textDecoration: "none" }}>Tarjouskone</Link>
          <Link href="/hinnoittelu" style={{ color: "#fff", fontSize: "0.82rem", textDecoration: "none", opacity: 0.75 }}>Hinnoittelu</Link>
          <Link href="/en/help" style={{ color: "#fff", fontSize: "0.82rem", textDecoration: "none", opacity: 0.6 }}>🇬🇧 EN</Link>
        </div>
      </nav>

      {/* Hero */}
      <div style={{ textAlign: "center", padding: "4rem 1.5rem 2rem" }}>
        <div style={{ display: "inline-block", background: "rgba(200,164,74,.12)", border: "1px solid rgba(200,164,74,.4)", color: "#C8A44A", fontSize: "0.68rem", fontWeight: 700, letterSpacing: "0.14em", padding: "0.35rem 1rem", marginBottom: "1.5rem" }}>
          KÄYTTÖOHJEET
        </div>
        <h1 style={{ fontFamily: "var(--font-cormorant), Georgia, serif", fontSize: "clamp(2rem,5vw,3rem)", fontWeight: 700, color: "#0F1F3D", margin: "0 0 1rem", lineHeight: 1.15 }}>
          Näin CertusLex toimii
        </h1>
        <p style={{ fontSize: "1rem", color: "#8A8070", maxWidth: "500px", margin: "0 auto", lineHeight: 1.6 }}>
          Ammattimainen tarjous asiakkaalle alle viidessä minuutissa — seuraa alla olevaa ohjetta.
        </p>
      </div>

      {/* Steps */}
      <div style={{ maxWidth: "780px", margin: "3rem auto 0", padding: "0 1.5rem" }}>
        <p style={{ fontSize: "0.72rem", fontWeight: 700, letterSpacing: "0.12em", color: "#0F1F3D", marginBottom: "1.5rem", textAlign: "center" }}>PIKAOPAS — 6 VAIHETTA</p>
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {STEPS.map((s) => (
            <div key={s.num} style={{ background: "#fff", border: "1px solid #EDE8DE", padding: "1.5rem 2rem", display: "flex", gap: "1.5rem", alignItems: "flex-start" }}>
              <div style={{ fontFamily: "var(--font-cormorant), Georgia, serif", fontSize: "2rem", fontWeight: 700, color: "#C8A44A", lineHeight: 1, flexShrink: 0 }}>{s.num}</div>
              <div>
                <p style={{ fontSize: "0.95rem", fontWeight: 700, color: "#0F1F3D", margin: "0 0 0.4rem" }}>{s.title}</p>
                <p style={{ fontSize: "0.85rem", color: "#8A8070", margin: 0, lineHeight: 1.6 }}>{s.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Tips */}
      <div style={{ maxWidth: "780px", margin: "3rem auto 0", padding: "0 1.5rem" }}>
        <div style={{ background: "#0F1F3D", padding: "2rem 2.5rem", borderLeft: "4px solid #C8A44A" }}>
          <p style={{ fontSize: "0.72rem", fontWeight: 700, letterSpacing: "0.12em", color: "#C8A44A", margin: "0 0 1rem" }}>💡 VINKKEJÄ PARHAAN TULOKSEN SAAVUTTAMISEEN</p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px,1fr))", gap: "1.2rem" }}>
            {[
              { t: "Yksityiskohtaisemmat speksit → parempi tarjous", d: "Mitä tarkemmin kuvaat materiaalit, työvaiheet ja määrät, sitä tarkemman hintalaskelman AI tuottaa." },
              { t: "Liitä tarjouspyyntö mukaan", d: "Jos asiakkaalta on tullut kirjallinen tarjouspyyntö tai tekniset piirustukset, liitä ne — AI lukee ne automaattisesti." },
              { t: "Käytä kate-% kenttää", d: "Syötä haluamasi kateprosentti ennen generointia. Se sisällytetään hintoihin eikä näy asiakkaalle." },
              { t: "Generoi uudelleen tarvittaessa", d: "Jos tulos ei miellytä, paina 'Generoi uudelleen' ja tarkenna ohjeita tai säädä speksejä." },
            ].map(v => (
              <div key={v.t}>
                <p style={{ fontSize: "0.85rem", fontWeight: 700, color: "#C8A44A", margin: "0 0 0.3rem" }}>{v.t}</p>
                <p style={{ fontSize: "0.78rem", color: "#B0A898", margin: 0, lineHeight: 1.5 }}>{v.d}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* FAQ */}
      <div style={{ maxWidth: "640px", margin: "3rem auto 0", padding: "0 1.5rem" }}>
        <p style={{ fontSize: "0.72rem", fontWeight: 700, letterSpacing: "0.12em", color: "#0F1F3D", textAlign: "center", marginBottom: "1.5rem" }}>USEIN KYSYTTYÄ</p>
        {FAQ.map((item, i) => (
          <div key={i} style={{ background: "#fff", border: "1px solid #EDE8DE", marginBottom: "0.5rem" }}>
            <button onClick={() => setOpenFaq(openFaq === i ? null : i)}
              style={{ width: "100%", background: "none", border: "none", padding: "1.1rem 1.4rem", textAlign: "left", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "1rem" }}>
              <span style={{ fontSize: "0.88rem", fontWeight: 600, color: "#0F1F3D" }}>{item.q}</span>
              <span style={{ color: "#C8A44A", fontSize: "1.2rem", flexShrink: 0, transition: "transform 0.2s", display: "inline-block", transform: openFaq === i ? "rotate(45deg)" : "none" }}>+</span>
            </button>
            {openFaq === i && (
              <div style={{ padding: "0 1.4rem 1.1rem", fontSize: "0.83rem", color: "#8A8070", lineHeight: 1.7 }}>{item.a}</div>
            )}
          </div>
        ))}
      </div>

      {/* CTA */}
      <div style={{ textAlign: "center", padding: "4rem 1.5rem 5rem" }}>
        <div style={{ background: "#0F1F3D", display: "inline-block", padding: "2.5rem 3.5rem", borderLeft: "4px solid #C8A44A", maxWidth: "460px" }}>
          <p style={{ fontFamily: "var(--font-cormorant), Georgia, serif", fontSize: "1.6rem", fontWeight: 700, color: "#fff", margin: "0 0 0.5rem" }}>Valmis kokeilemaan?</p>
          <p style={{ fontSize: "0.85rem", color: "#B0A898", margin: "0 0 1.5rem" }}>30 päivää ilmaiseksi — ei luottokorttia tarvita.</p>
          <Link href="/kirjaudu?plan=pro&trial=1"
            style={{ display: "inline-block", background: "#C8A44A", color: "#0F1F3D", padding: "0.9rem 2.5rem", fontSize: "0.9rem", fontWeight: 700, textDecoration: "none", letterSpacing: "0.05em" }}>
            Aloita ilmainen kokeilu →
          </Link>
        </div>
      </div>
    </div>
  );
}
