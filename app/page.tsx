"use client";

import { useState, useEffect } from "react";

type View = "landing" | "upload" | "processing" | "result";

const planDetails: Record<string, { time: string; price: string }> = {
  Perus: { time: "48h", price: "49" },
  Standard: { time: "24h", price: "79" },
  Premium: { time: "12h", price: "99" },
};

export default function Home() {
  const [view, setView] = useState<View>("landing");
  const [hasFile, setHasFile] = useState(false);
  const [docType, setDocType] = useState<string | null>(null);
  const [plan, setPlan] = useState("Standard");
  const [step3Done, setStep3Done] = useState(false);

  function goTo(v: View) {
    setView(v);
    window.scrollTo(0, 0);
  }

  function startProcessing() {
    setStep3Done(false);
    goTo("processing");
    setTimeout(() => setStep3Done(true), 1200);
    setTimeout(() => goTo("result"), 2800);
  }

  const canCheckout = hasFile && docType !== null;
  const { time, price } = planDetails[plan];

  if (view === "processing") {
    return (
      <div id="processing-view">
        <div className="proc-inner">
          <div className="proc-spinner" />
          <h3>Analysoidaan asiakirjaa</h3>
          <p>Tämä kestää hetken...</p>
          <div className="proc-steps">
            <div className="ps done">Asiakirja vastaanotettu</div>
            <div className="ps done">Pykäläviittaukset tunnistettu</div>
            <div className={`ps${step3Done ? " done" : ""}`}>Lähetetään juristille</div>
          </div>
        </div>
      </div>
    );
  }

  if (view === "upload") {
    return (
      <div id="upload-view">
        <nav style={{ background: "var(--cream)" }}>
          <div className="logo" style={{ color: "var(--navy)" }}>Certus<span>Lex</span></div>
          <button
            className="btn-ghost"
            style={{ fontSize: "0.82rem", padding: "0.4rem 1rem", border: "1px solid var(--cream2)", color: "var(--navy)" }}
            onClick={() => goTo("landing")}
          >
            ← Takaisin
          </button>
        </nav>
        <div className="upload-wrap">
          <h2>Lähetä asiakirja</h2>
          <p className="sub">Juristi tarkastaa asiakirjasi ja toimittaa lausunnon valitun paketin mukaisessa ajassa.</p>

          {!hasFile ? (
            <div className="dropzone" onClick={() => setHasFile(true)}>
              <div className="dz-icon">📄</div>
              <div className="dz-text">Vedä asiakirja tähän tai</div>
              <button className="dz-btn">Valitse tiedosto</button>
            </div>
          ) : (
            <div className="file-sel">
              <span className="fi-icon">📄</span>
              <span className="fi-name">valitus_hallinto_oikeus.pdf</span>
              <button className="fi-rm" onClick={() => { setHasFile(false); setDocType(null); }}>✕</button>
            </div>
          )}

          <p style={{ fontSize: "0.8rem", fontWeight: 500, letterSpacing: "0.06em", marginBottom: "0.8rem" }}>ASIAKIRJATYYPPI</p>
          <div className="doc-types">
            {[
              { icon: "⚖️", name: "Valitus", desc: "Hallinto-oikeus, markkinaoikeus" },
              { icon: "📋", name: "Kirjelmä", desc: "Oikeudelle osoitettu kirjelmä" },
              { icon: "📝", name: "Hakemus", desc: "Viranomaishakemus" },
              { icon: "🔄", name: "Vastine", desc: "Vastine tai lausuma" },
            ].map((t) => (
              <div key={t.name} className={`dt${docType === t.name ? " sel" : ""}`} onClick={() => setDocType(t.name)}>
                <div className="dt-icon">{t.icon}</div>
                <div className="dt-name">{t.name}</div>
                <div className="dt-desc">{t.desc}</div>
              </div>
            ))}
          </div>

          <div className="plan-sel">
            <label>PALVELUPAKETTI</label>
            <div className="plan-opts">
              {[
                { name: "Perus", label: "PERUS / 48h", price: "49€" },
                { name: "Standard", label: "STANDARD / 24h", price: "79€" },
                { name: "Premium", label: "PREMIUM / 12h", price: "99€" },
              ].map((p) => (
                <div key={p.name} className={`po${plan === p.name ? " sel" : ""}`} onClick={() => setPlan(p.name)}>
                  <div className="po-price">{p.price}</div>
                  <div className="po-name">{p.label}</div>
                </div>
              ))}
            </div>
          </div>

          {canCheckout && (
            <div className="summary-box">
              <div className="sb-row"><span>Asiakirja</span><span>{docType}</span></div>
              <div className="sb-row"><span>Paketti</span><span>{plan}</span></div>
              <div className="sb-row"><span>Toimitusaika</span><span>{time}</span></div>
              <div className="sb-row"><span>Yhteensä</span><span>{price} €</span></div>
            </div>
          )}

          <button className="checkout-btn" disabled={!canCheckout} onClick={startProcessing}>
            Jatka maksuun →
          </button>
        </div>
      </div>
    );
  }

  if (view === "result") {
    return (
      <div id="result-view">
        <nav style={{ background: "var(--cream)" }}>
          <div className="logo" style={{ color: "var(--navy)" }}>Certus<span>Lex</span></div>
          <button
            style={{ fontSize: "0.82rem", padding: "0.4rem 1rem", border: "1px solid var(--cream2)", background: "transparent", cursor: "pointer" }}
            onClick={() => goTo("landing")}
          >
            ← Etusivu
          </button>
        </nav>
        <div className="result-wrap">
          <div className="result-header">
            <div className="rh-badge">LAUSUNTO</div>
            <div className="rh-info">
              <h3>valitus_hallinto_oikeus.pdf</h3>
              <p>Standard-paketti · Tarkastettu 20.4.2026</p>
            </div>
            <div className="rh-status"><div className="dot-ok" />Valmis</div>
          </div>

          <div className="findings">
            <h4>LÖYDÖKSET (5)</h4>
            <div className="fi"><div className="fd err" /><div className="ft"><strong>VIRHE — s. 3:</strong> HLL 586/1996 § 51a ei ole olemassa. Tekoäly on keksinyt tämän viittauksen. <em>Korvaa: hallintolaki 49 § (oikaisupyyntöoikeus).</em></div></div>
            <div className="fi"><div className="fd err" /><div className="ft"><strong>VIRHE — s. 5:</strong> JulkL 621/1999 § 12a ei ole olemassa. <em>Korvaa: JulkL 12 § 1 mom.</em></div></div>
            <div className="fi"><div className="fd warn" /><div className="ft"><strong>HUOMIO — s. 2:</strong> Oikeuspaikan perustelu puutteellinen. Suositellaan lisäämään viittaus HLL 586/1996 12 §:ään.</div></div>
            <div className="fi"><div className="fd ok" /><div className="ft"><strong>OK — Määräaika:</strong> Valitusaika laskettu oikein, 30 pv tiedoksisaannista.</div></div>
            <div className="fi"><div className="fd ok" /><div className="ft"><strong>OK — Muutoksenhakupyyntö:</strong> Muotoiltu asianmukaisesti, vaatimukset esitetty selkeästi.</div></div>
          </div>

          <div className="seal">
            <div className="seal-icon">⚖</div>
            <div className="seal-text">
              <strong>Juristivarmistettu — CertusLex OTM-juristi</strong>
              Olen tarkastanut asiakirjan pykäläviittaukset, argumentaation rakenteen ja oikeudellisen johdonmukaisuuden. Asiakirja voidaan jättää hallinto-oikeudelle, kun mainitut kaksi virheellistä pykäläviittausta on korjattu.
            </div>
          </div>

          <div className="result-actions">
            <button className="btn-dl">⬇ Lataa PDF-lausunto</button>
            <button className="btn-new" onClick={() => goTo("upload")}>Lähetä uusi asiakirja</button>
          </div>
        </div>
      </div>
    );
  }

  // Landing
  return (
    <div id="landing">
      <div className="hero-bg" />
      <div className="gold-line" />
      <nav>
        <div className="logo">Certus<span>Lex</span></div>
        <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
          <a href="#hinnoittelu" style={{ color: "var(--light)", fontSize: "0.85rem", textDecoration: "none" }}>Hinnoittelu</a>
          <a href="#" style={{ color: "var(--light)", fontSize: "0.85rem", textDecoration: "none" }}>Juristit</a>
          <button className="nav-cta" onClick={() => goTo("upload")}>Lähetä asiakirja →</button>
        </div>
      </nav>

      <div className="hero">
        <div className="hero-tag">JURISTIVARMISTETTU AI-ASIAKIRJA</div>
        <h1>Tekoälyn kirjoittama.<br /><em>Juristin vahvistama.</em><br />Viranomaiskelpoinen.</h1>
        <p className="hero-sub">CertusLex ratkaisee tekoälyasiakirjojen suurimman ongelman: hallusinoidut lakipykälät. Jokaisen asiakirjan tarkastaa oikea OTM-juristi ennen toimittamista.</p>
        <div className="hero-btns">
          <button className="btn-primary" onClick={() => goTo("upload")}>Lähetä asiakirja tarkastukseen</button>
          <button className="btn-ghost" onClick={() => goTo("result")}>Katso esimerkkilausunto</button>
        </div>
        <div className="hero-stats">
          <div><div className="stat-n">98%</div><div className="stat-l">TARKKUUS</div></div>
          <div><div className="stat-n">24h</div><div className="stat-l">TOIMITUSAIKA</div></div>
          <div><div className="stat-n">49€</div><div className="stat-l">ALK. HINTA</div></div>
        </div>
      </div>

      <div className="section" style={{ background: "var(--cream)" }}>
        <div className="section-label">PROSESSI</div>
        <h2>Kolme vaihetta. Yksi varmuus.</h2>
        <p className="section-sub">Yksinkertainen prosessi joka muuttaa epävarman tekoälyasiakirjan luotettavaksi juridiseksi dokumentiksi.</p>
        <div className="steps">
          <div className="step">
            <div className="step-num">01</div>
            <h3>Lähetä asiakirja</h3>
            <p>Lataa tekoälyn kirjoittama asiakirja. Valitse asiakirjatyyppi ja palvelupaketti.</p>
          </div>
          <div className="step">
            <div className="step-num">02</div>
            <h3>Juristi tarkastaa</h3>
            <p>OTM-juristi tarkastaa pykäläviittaukset, argumentaation ja oikeudellisen johdonmukaisuuden.</p>
          </div>
          <div className="step">
            <div className="step-num">03</div>
            <h3>Saat lausunnon</h3>
            <p>Saat kirjallisen lausunnon ja korjatun asiakirjan. Valmis toimitettavaksi viranomaiselle.</p>
          </div>
        </div>
      </div>

      <div className="pricing-section" id="hinnoittelu">
        <div className="section-label">HINNOITTELU</div>
        <h2 style={{ color: "#fff", fontFamily: "var(--font-cormorant), Georgia, serif", fontSize: "2.4rem", fontWeight: 700, marginBottom: "0.5rem" }}>
          Selkeät hinnat. Ei yllätyksiä.
        </h2>
        <p style={{ color: "var(--light)", fontSize: "0.95rem", marginBottom: "2.5rem" }}>Valitse tarpeidesi mukainen paketti.</p>
        <div className="plans">
          <div className="plan">
            <div className="plan-name">PERUS</div>
            <div className="plan-price"><sup>€</sup>49<sub>/asiakirja</sub></div>
            <div className="plan-desc">Nopea tarkastus yksinkertaisille asiakirjoille</div>
            <ul className="plan-features">
              <li>Pykäläviittausten tarkastus</li>
              <li>Kirjallinen lausunto</li>
              <li>48h toimitusaika</li>
            </ul>
            <button className="plan-btn" onClick={() => goTo("upload")}>Valitse Perus</button>
          </div>
          <div className="plan featured">
            <div className="plan-name">STANDARD</div>
            <div className="plan-price"><sup>€</sup>79<sub>/asiakirja</sub></div>
            <div className="plan-desc">Kattava tarkastus vaativammille asiakirjoille</div>
            <ul className="plan-features">
              <li>Kaikki Perus-paketin sisältö</li>
              <li>Argumentaation arviointi</li>
              <li>Korjausehdotukset</li>
              <li>24h toimitusaika</li>
            </ul>
            <button className="plan-btn" onClick={() => goTo("upload")}>Valitse Standard</button>
          </div>
          <div className="plan">
            <div className="plan-name">PREMIUM</div>
            <div className="plan-price"><sup>€</sup>99<sub>/asiakirja</sub></div>
            <div className="plan-desc">Täysi palvelu kiireellisiin ja monimutkaisiin tapauksiin</div>
            <ul className="plan-features">
              <li>Kaikki Standard-paketin sisältö</li>
              <li>Puhelinkonsultaatio</li>
              <li>Korjattu asiakirja</li>
              <li>12h toimitusaika</li>
            </ul>
            <button className="plan-btn" onClick={() => goTo("upload")}>Valitse Premium</button>
          </div>
        </div>
      </div>

      <div className="footer">
        <p>© 2026 CertusLex — DeepEnd Oy | Kaikki oikeudet pidätetään</p>
      </div>
    </div>
  );
}
