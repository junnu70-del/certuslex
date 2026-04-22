"use client";

import { useState, useRef } from "react";
import Image from "next/image";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { storage, db } from "@/lib/firebase";

type View = "landing" | "upload" | "processing" | "result";

const planDetails: Record<string, { time: string; price: string }> = {
  Perus: { time: "48h", price: "49" },
  Standard: { time: "24h", price: "79" },
  Premium: { time: "12h", price: "99" },
};

export default function Home() {
  const [view, setView] = useState<View>("landing");
  const [file, setFile] = useState<File | null>(null);
  const [userEmail, setUserEmail] = useState("");
  const [docType, setDocType] = useState<string | null>(null);
  const [plan, setPlan] = useState("Standard");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [docId, setDocId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function goTo(v: View) {
    setView(v);
    window.scrollTo(0, 0);
  }

  async function startProcessing() {
    if (!file || !docType || !userEmail) return;
    setUploadError(null);
    goTo("processing");

    try {
      // 1. Upload file to Firebase Storage
      const timestamp = Date.now();
      const storageRef = ref(storage, `documents/${timestamp}_${file.name}`);
      const uploadTask = uploadBytesResumable(storageRef, file);

      await new Promise<void>((resolve, reject) => {
        uploadTask.on(
          "state_changed",
          (snapshot) => {
            const progress = Math.round(
              (snapshot.bytesTransferred / snapshot.totalBytes) * 100
            );
            setUploadProgress(progress);
          },
          reject,
          resolve
        );
      });

      const downloadURL = await getDownloadURL(storageRef);

      // 2. Save metadata to Firestore
      const docRef = await addDoc(collection(db, "documents"), {
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
        storageUrl: downloadURL,
        storagePath: storageRef.fullPath,
        docType,
        plan,
        price: planDetails[plan].price,
        deliveryTime: planDetails[plan].time,
        userEmail,
        status: "pending_review",
        createdAt: serverTimestamp(),
      });

      setDocId(docRef.id);
      goTo("result");
    } catch (err) {
      console.error("Upload failed:", err);
      const msg = err instanceof Error ? err.message : String(err);
      setUploadError(`Virhe: ${msg}`);
      goTo("upload");
    }
  }

  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(userEmail);
  const canCheckout = file !== null && docType !== null && emailValid;
  const { time, price } = planDetails[plan];

  if (view === "processing") {
    return (
      <div id="processing-view">
        <div className="proc-inner">
          <div className="proc-spinner" />
          <h3>Lähetetään asiakirjaa</h3>
          <p>{uploadProgress < 100 ? `${uploadProgress}% ladattu...` : "Lähetetään juristille..."}</p>
          <div className="proc-steps">
            <div className={`ps${uploadProgress > 0 ? " done" : ""}`}>Asiakirja vastaanotettu</div>
            <div className={`ps${uploadProgress === 100 ? " done" : ""}`}>Tallennettu turvallisesti</div>
            <div className={`ps${docId ? " done" : ""}`}>Lähetetty juristille</div>
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

          {uploadError && (
            <div style={{ background: "#fff0f0", border: "1px solid var(--red)", padding: "0.8rem 1rem", marginBottom: "1rem", fontSize: "0.85rem", color: "var(--red)" }}>
              {uploadError}
            </div>
          )}

          <input
            type="file"
            ref={fileInputRef}
            accept=".pdf,.doc,.docx"
            style={{ display: "none" }}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) setFile(f);
            }}
          />

          {!file ? (
            <div className="dropzone" onClick={() => fileInputRef.current?.click()}>
              <div className="dz-icon">📄</div>
              <div className="dz-text">Vedä asiakirja tähän tai</div>
              <button className="dz-btn" type="button">Valitse tiedosto</button>
              <div style={{ fontSize: "0.75rem", color: "var(--muted)", marginTop: "0.5rem" }}>PDF, DOC, DOCX</div>
            </div>
          ) : (
            <div className="file-sel">
              <span className="fi-icon">📄</span>
              <span className="fi-name">{file.name}</span>
              <button className="fi-rm" onClick={() => { setFile(null); if (fileInputRef.current) fileInputRef.current.value = ""; }}>✕</button>
            </div>
          )}

          <div style={{ marginBottom: "1.5rem" }}>
            <p style={{ fontSize: "0.8rem", fontWeight: 500, letterSpacing: "0.06em", marginBottom: "0.5rem" }}>SÄHKÖPOSTIOSOITE</p>
            <p style={{ fontSize: "0.75rem", color: "var(--muted)", marginBottom: "0.6rem" }}>Lausunto toimitetaan tähän osoitteeseen.</p>
            <input
              type="email"
              value={userEmail}
              onChange={e => setUserEmail(e.target.value)}
              placeholder="nimi@esimerkki.fi"
              style={{
                width: "100%", border: `1px solid ${userEmail && !emailValid ? "var(--red)" : "var(--cream2)"}`,
                padding: "0.7rem 0.9rem", fontSize: "0.9rem", outline: "none",
                fontFamily: "var(--font-dm-sans), Arial, sans-serif", boxSizing: "border-box",
              }}
            />
            {userEmail && !emailValid && (
              <p style={{ color: "var(--red)", fontSize: "0.75rem", marginTop: "0.3rem" }}>Tarkista sähköpostiosoite</p>
            )}
          </div>

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
              <div className="sb-row"><span>Asiakirja</span><span>{file?.name}</span></div>
              <div className="sb-row"><span>Tyyppi</span><span>{docType}</span></div>
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
            <div className="rh-badge">VASTAANOTETTU</div>
            <div className="rh-info">
              <h3>{file?.name ?? "asiakirja"}</h3>
              <p>{plan}-paketti · Lähetetty {new Date().toLocaleDateString("fi-FI")}</p>
            </div>
            <div className="rh-status"><div className="dot-ok" />Jonossa</div>
          </div>

          <div className="seal">
            <div className="seal-icon">⚖</div>
            <div className="seal-text">
              <strong>Asiakirja vastaanotettu — CertusLex</strong>
              Asiakirjasi on tallennettu turvallisesti ja lähetetty OTM-juristille tarkastettavaksi. Saat lausunnon sähköpostitse {planDetails[plan].time} kuluessa.
            </div>
          </div>

          {docId && (
            <div style={{ fontSize: "0.78rem", color: "var(--muted)", marginBottom: "1.5rem" }}>
              Tilausnumero: <strong>{docId}</strong>
            </div>
          )}

          <div className="result-actions">
            <button className="btn-new" onClick={() => { setFile(null); setDocType(null); setPlan("Standard"); goTo("upload"); }}>
              Lähetä uusi asiakirja
            </button>
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

      <div style={{ background: "#fff", borderTop: "1px solid #EDE8DE", borderBottom: "1px solid #EDE8DE", padding: "6rem 3rem" }}>
        <div style={{ maxWidth: "1000px", margin: "0 auto", display: "grid", gridTemplateColumns: "340px 1fr", gap: "5rem", alignItems: "center" }}>
          <div style={{ position: "relative" }}>
            <div style={{ position: "absolute", inset: "-12px -12px 12px 12px", border: "1px solid rgba(200,164,74,.25)", zIndex: 0 }} />
            <Image src="/Risto.png" alt="Risto Kurki-Suonio" width={398} height={567} style={{ width: "100%", height: "auto", display: "block", position: "relative", zIndex: 1 }} />
          </div>
          <div>
            <div style={{ fontSize: "0.72rem", letterSpacing: "0.14em", color: "#C8A44A", marginBottom: "1rem" }}>PALVELUN TAKANA</div>
            <h2 style={{ fontFamily: "var(--font-cormorant), Georgia, serif", fontSize: "2.4rem", fontWeight: 700, color: "#0F1F3D", letterSpacing: "-0.02em", marginBottom: "0.3rem" }}>Risto Kurki-Suonio</h2>
            <div style={{ fontSize: "0.82rem", letterSpacing: "0.08em", color: "#C8A44A", fontWeight: 500, marginBottom: "1.5rem" }}>OTM · Osakas, CertusLex</div>
            <div style={{ width: "40px", height: "2px", background: "#C8A44A", marginBottom: "1.5rem" }} />
            <p style={{ fontSize: "0.9rem", color: "#4A4035", lineHeight: 1.8, marginBottom: "1rem" }}>
              Risto Kurki-Suonion oikeudellinen ja liikkeenjohdollinen kokemus ulottuu vuosikymmenien ajalle.
              Helsingin yliopistossa oikeustieteen opinnot suorittanut Risto on toiminut johtotehtävissä useissa
              suomalaisissa ja kansainvälisissä yhtiöissä — muun muassa Lars Krogius AB Oy:n hallituksen
              puheenjohtajana sekä Bauhaus Suomi Oy:n johtoryhmässä.
            </p>
            <p style={{ fontSize: "0.9rem", color: "#4A4035", lineHeight: 1.8, marginBottom: "1.8rem" }}>
              CertusLexissä Riston rooli on varmistaa, että palvelun juridinen laatu vastaa korkeinta
              ammattistandardia — tekoälyn nopeus yhdistettynä juristin vastuuseen.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              {["Helsingin yliopisto, OTM", "Lars Krogius AB Oy, hallituksen pj.", "Bauhaus Suomi Oy, johtoryhmä", "Tilgi Group"].map(item => (
                <div key={item} style={{ display: "flex", alignItems: "center", gap: "0.6rem", fontSize: "0.82rem", color: "#8A8070" }}>
                  <span style={{ width: "6px", height: "6px", background: "#C8A44A", borderRadius: "50%", flexShrink: 0, display: "inline-block" }} />
                  {item}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="trust-strip">
        <p>"Jokainen asiakirja tarkastetaan oikean juristin toimesta — ei algoritmien."</p>
        <div className="trust-items">
          <div className="trust-item"><span>🔒</span><span>Tietoturvallinen käsittely</span></div>
          <div className="trust-item"><span>⚖️</span><span>OTM-juristi jokaiseen toimeksiantoon</span></div>
          <div className="trust-item"><span>✅</span><span>Viranomaiskelpoinen lopputulos</span></div>
          <div className="trust-item"><span>🇫🇮</span><span>Suomen lainsäädäntö</span></div>
        </div>
      </div>

      <div className="footer">
        <div className="footer-logo">Certus<span>Lex</span></div>
        <p>© 2026 CertusLex — DeepEnd Oy</p>
        <div className="footer-links">
          <a href="#hinnoittelu">Hinnoittelu</a>
          <a href="#">Tietosuoja</a>
          <a href="mailto:info@certuslex.fi">info@certuslex.fi</a>
        </div>
      </div>
    </div>
  );
}
