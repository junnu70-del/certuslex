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

      // Lähetä tilausvahvistus sähköpostitse
      await fetch("/api/send-confirmation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userEmail,
          fileName: file.name,
          docId: docRef.id,
          plan,
          price: planDetails[plan].price,
          deliveryTime: planDetails[plan].time,
          docType,
        }),
      });

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
            <div style={{ marginBottom: "1.5rem" }}>
              <div style={{ fontSize: "0.78rem", color: "var(--muted)", marginBottom: "1rem" }}>
                Tilausnumero: <strong>{docId}</strong>
              </div>
              <a
                href={`/tilaus/${docId}`}
                style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", background: "var(--navy)", color: "var(--gold)", padding: "0.75rem 1.5rem", fontSize: "0.85rem", fontWeight: 600, textDecoration: "none", letterSpacing: "0.04em" }}
              >
                Seuraa tilauksen etenemistä →
              </a>
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
  // SVG diagonal stripe as data URI background
  const stripeStyle: React.CSSProperties = {
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='30' height='30'%3E%3Cline x1='0' y1='30' x2='30' y2='0' stroke='%23C8A44A' stroke-width='1' stroke-opacity='0.13'/%3E%3C/svg%3E")`,
    backgroundSize: "30px 30px",
    backgroundRepeat: "repeat",
  };

  return (
    <div id="landing" style={{ position: "relative", overflow: "hidden", background: "#0F1F3D", ...stripeStyle }}>
      {/* Radiaaliset valon häilyt päälle */}
      <div style={{
        position: "absolute", inset: 0, pointerEvents: "none", zIndex: 1,
        background: "radial-gradient(ellipse 60% 50% at 80% 20%, rgba(200,164,74,.18) 0%, transparent 60%), radial-gradient(ellipse 40% 40% at 10% 80%, rgba(15,31,61,0.95) 0%, transparent 70%)"
      }} />

      {/* Paksu kultalinja vasemmalla */}
      <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: "5px", background: "#C8A44A", zIndex: 20, pointerEvents: "none" }} />
      {/* Ohut sisäraita vasemmalla */}
      <div style={{ position: "absolute", left: "18px", top: 0, bottom: 0, width: "1px", background: "rgba(200,164,74,0.3)", zIndex: 20, pointerEvents: "none" }} />

      <nav>
        <div className="logo">Certus<span>Lex</span></div>
        <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
          <a href="#hinnoittelu" style={{ color: "var(--light)", fontSize: "0.85rem", textDecoration: "none" }}>Hinnoittelu</a>
          <a href="/tarjouskone" style={{ color: "var(--gold)", fontSize: "0.85rem", textDecoration: "none", fontWeight: 500 }}>Tarjouskone</a>
          <button className="nav-cta" onClick={() => goTo("upload")}>Lähetä asiakirja →</button>
        </div>
      </nav>

      <div className="hero">
        <div className="hero-tag">JURISTIVARMISTETTU ASIAKIRJATARKASTUS</div>
        <h1>Tiedätkö, onko asiakirjasi<br /><em>kunnossa?</em></h1>
        <p className="hero-sub">CertusLex tarkistuttaa asiakirjasi OTM-juristilla. Saat varmuuden siitä, että lakisisältö, viittaukset ja pykälät ovat oikein — ennen kuin asiakirja aiheuttaa ongelmia.<br /><span style={{ fontSize: "0.9em", opacity: 0.8 }}>Erityisen hyödyllinen tekoälyllä laadittujen asiakirjojen tarkistamiseen.</span></p>
        <div className="hero-btns">
          <button className="btn-primary" onClick={() => goTo("upload")}>Lähetä asiakirja tarkastukseen</button>
        </div>
        <div className="hero-stats">
          <div><div className="stat-n">✓</div><div className="stat-l">JURISTIN TARKASTAMA</div></div>
          <div><div className="stat-n">✓</div><div className="stat-l">PYKÄLÄT OIKEIN</div></div>
          <div><div className="stat-n">✓</div><div className="stat-l">MIELENRAUHA</div></div>
        </div>
      </div>

      {/* Kultainen erotinviiva hero/prosessi-rajalla */}
      <div style={{ height: "2px", background: "linear-gradient(90deg, #C8A44A 0%, #C8A44A 60%, transparent 100%)" }} />

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

      {/* ── KAKSI PALVELUA ── */}
      <div style={{ background: "#0F1F3D", padding: "5rem 3rem", borderTop: "1px solid rgba(200,164,74,.15)" }}>
        <div style={{ maxWidth: "1000px", margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: "3rem" }}>
            <div style={{ fontSize: "0.72rem", letterSpacing: "0.14em", color: "#C8A44A", marginBottom: "0.8rem" }}>ALUSTA</div>
            <h2 style={{ fontFamily: "var(--font-cormorant), Georgia, serif", fontSize: "clamp(1.8rem, 3vw, 2.6rem)", fontWeight: 700, color: "#fff" }}>Kaksi palvelua. Yksi ekosysteemi.</h2>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem" }}>
            {/* Juridinen tarkastus */}
            <div style={{ background: "#0A1828", border: "1px solid rgba(200,164,74,.2)", padding: "2.5rem", position: "relative" }}>
              <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "3px", background: "#C8A44A" }} />
              <div style={{ fontSize: "2rem", marginBottom: "1rem" }}>⚖️</div>
              <div style={{ fontSize: "0.7rem", letterSpacing: "0.12em", color: "#C8A44A", marginBottom: "0.5rem" }}>NYKYINEN PALVELU</div>
              <h3 style={{ fontFamily: "var(--font-cormorant), Georgia, serif", fontSize: "1.6rem", fontWeight: 700, color: "#fff", marginBottom: "0.8rem" }}>Juridinen tarkastus</h3>
              <p style={{ fontSize: "0.85rem", color: "#8899AA", lineHeight: 1.7, marginBottom: "1.5rem" }}>Lähetät tekoälyn kirjoittaman asiakirjan — OTM-juristi tarkastaa pykäläviittaukset, argumentaation ja oikeudellisen johdonmukaisuuden.</p>
              <div style={{ fontSize: "0.78rem", color: "#556678", marginBottom: "1.5rem" }}>
                <div style={{ marginBottom: "0.3rem" }}>✓ Juristi tarkastaa jokaisen asiakirjan</div>
                <div style={{ marginBottom: "0.3rem" }}>✓ Viranomaiskelpoinen lopputulos</div>
                <div>✓ 12–48h toimitusaika</div>
              </div>
              <button onClick={() => goTo("upload")} style={{ background: "transparent", border: "1px solid rgba(200,164,74,.4)", color: "#C8A44A", padding: "0.7rem 1.4rem", fontSize: "0.82rem", cursor: "pointer", letterSpacing: "0.05em" }}>
                Lähetä asiakirja →
              </button>
            </div>

            {/* Tarjouskone */}
            <div style={{ background: "#0A1828", border: "1px solid rgba(200,164,74,.5)", padding: "2.5rem", position: "relative" }}>
              <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "3px", background: "linear-gradient(90deg, #C8A44A, #E8C06A)" }} />
              <div style={{ position: "absolute", top: "1rem", right: "1rem", background: "#C8A44A", color: "#0F1F3D", fontSize: "0.6rem", fontWeight: 700, letterSpacing: "0.1em", padding: "0.2rem 0.6rem" }}>UUSI</div>
              <div style={{ fontSize: "2rem", marginBottom: "1rem" }}>🤖</div>
              <div style={{ fontSize: "0.7rem", letterSpacing: "0.12em", color: "#C8A44A", marginBottom: "0.5rem" }}>AI-PALVELU</div>
              <h3 style={{ fontFamily: "var(--font-cormorant), Georgia, serif", fontSize: "1.6rem", fontWeight: 700, color: "#fff", marginBottom: "0.8rem" }}>Tarjouskone</h3>
              <p style={{ fontSize: "0.85rem", color: "#8899AA", lineHeight: 1.7, marginBottom: "1.5rem" }}>Annat speksit — AI rakentaa ammattimaisen tarjouksen. Yritystietosi, hinnoittelusi ja brändisi valmiina pohjassa. Valmis PDF minuuteissa.</p>
              <div style={{ fontSize: "0.78rem", color: "#556678", marginBottom: "1.5rem" }}>
                <div style={{ marginBottom: "0.3rem" }}>✓ AI kirjoittaa tarjouksen spekseistä</div>
                <div style={{ marginBottom: "0.3rem" }}>✓ Yritysprofiili tallentuu kerran</div>
                <div>✓ Kilpailutukset juristin tarkastukseen</div>
              </div>
              <div style={{ display: "flex", gap: "0.8rem", flexWrap: "wrap" }}>
                <a href="/hinnoittelu" style={{ display: "inline-block", background: "#C8A44A", color: "#0F1F3D", padding: "0.7rem 1.4rem", fontSize: "0.82rem", fontWeight: 600, textDecoration: "none", letterSpacing: "0.05em" }}>
                  Aloita kokeilu →
                </a>
                <a href="/tarjouskone" style={{ display: "inline-block", background: "transparent", border: "1px solid rgba(200,164,74,.4)", color: "#C8A44A", padding: "0.7rem 1.4rem", fontSize: "0.82rem", textDecoration: "none", letterSpacing: "0.05em" }}>
                  Kokeile demo
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div style={{ height: "2px", background: "linear-gradient(90deg, #C8A44A 0%, #C8A44A 60%, transparent 100%)" }} />

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
          <a href="/tietosuoja">Tietosuoja</a>
          <a href="mailto:info@certuslex.fi">info@certuslex.fi</a>
        </div>
      </div>
    </div>
  );
}
