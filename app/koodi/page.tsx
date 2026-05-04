"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/firebase";
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from "firebase/auth";

type Step = "code" | "register" | "expired";

export default function KoodiPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("code");
  const [digits, setDigits] = useState(["", "", "", "", "", ""]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const inputs = useRef<(HTMLInputElement | null)[]>([]);

  // Koodi-data validoinnista
  const [validCode, setValidCode] = useState("");
  const [codeLabel, setCodeLabel] = useState("");
  const [usesLeft, setUsesLeft] = useState(0);

  // Rekisteröintilomake — esitäytetty koodidatasta
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [contactName, setContactName] = useState("");

  // Jos koodi jo tallennettu selaimessa, ohjaa suoraan
  useEffect(() => {
    const saved = localStorage.getItem("certuslex_code");
    if (saved) {
      fetch(`/api/verify-code?code=${saved}`)
        .then(r => r.json())
        .then(d => { if (d.valid) router.push("/tarjouskone"); });
    }
  }, [router]);

  function handleDigit(i: number, val: string) {
    if (!/^\d*$/.test(val)) return;
    const next = [...digits];
    next[i] = val.slice(-1);
    setDigits(next);
    setError("");
    if (val && i < 5) inputs.current[i + 1]?.focus();
    if (val && i === 5 && next.every(d => d)) submitCode(next.join(""));
  }

  function handleKeyDown(i: number, e: React.KeyboardEvent) {
    if (e.key === "Backspace" && !digits[i] && i > 0) inputs.current[i - 1]?.focus();
  }

  function handlePaste(e: React.ClipboardEvent) {
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (pasted.length === 6) { setDigits(pasted.split("")); submitCode(pasted); }
  }

  async function submitCode(code: string) {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/verify-code?code=${code}`);
      const data = await res.json();
      if (data.valid) {
        setValidCode(code);
        setCodeLabel(data.label ?? "");
        setUsesLeft(data.usesLeft);
        setEmail(data.recipientEmail ?? "");
        setContactName(data.recipientName ?? "");
        setCompanyName(data.label ?? "");
        setStep("register");
      } else if (data.error === "Koodin käyttökerrat on käytetty") {
        setStep("expired");
      } else {
        setError(data.error ?? "Virheellinen koodi");
        setDigits(["", "", "", "", "", ""]);
        inputs.current[0]?.focus();
      }
    } catch {
      setError("Verkkovirhe — yritä uudelleen");
    } finally {
      setLoading(false);
    }
  }

  async function handleRegister() {
    if (!email || !password || !companyName || !contactName) {
      setError("Täytä kaikki kentät"); return;
    }
    if (password.length < 6) { setError("Salasanan tulee olla vähintään 6 merkkiä"); return; }
    if (password !== password2) { setError("Salasanat eivät täsmää"); return; }
    if (!auth) { setError("Kirjautuminen ei ole käytettävissä"); return; }

    setLoading(true);
    setError("");
    try {
      // Luo Firebase-tili tai kirjaudu sisään jos tili on jo
      let idToken: string;
      try {
        const cred = await createUserWithEmailAndPassword(auth, email, password);
        idToken = await cred.user.getIdToken();
      } catch (e: unknown) {
        const code = (e as { code?: string }).code;
        if (code === "auth/email-already-in-use") {
          // Yritä kirjautua sisään olemassa olevalla tilillä
          try {
            const cred = await signInWithEmailAndPassword(auth, email, password);
            idToken = await cred.user.getIdToken();
          } catch {
            setError("Sähköposti on jo käytössä — tarkista salasana tai kirjaudu kirjaudu-sivulta");
            setLoading(false);
            return;
          }
        } else {
          throw e;
        }
      }

      // Kirjaa koodin käyttö
      await fetch("/api/verify-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: validCode, action: "register" }),
      });

      // Tallenna yritysprofiili esitäytetyillä tiedoilla
      await fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` },
        body: JSON.stringify({ name: companyName, contact: contactName, email }),
      });

      localStorage.setItem("certuslex_code", validCode);
      localStorage.setItem("certuslex_code_uses", String(usesLeft - 1));
      router.push("/tarjouskone");
    } catch (e: unknown) {
      const code = (e as { code?: string }).code;
      if (code === "auth/invalid-email") setError("Virheellinen sähköpostiosoite");
      else if (code === "auth/weak-password") setError("Salasana on liian heikko");
      else setError("Virhe: " + (code ?? String(e)));
    } finally {
      setLoading(false);
    }
  }

  const INP: React.CSSProperties = {
    width: "100%", border: "1px solid #EDE8DE", padding: "0.75rem 1rem",
    fontSize: "0.9rem", outline: "none", fontFamily: "inherit",
    boxSizing: "border-box", background: "#fff", color: "#2C2416",
  };
  const LBL: React.CSSProperties = {
    display: "block", fontSize: "0.7rem", fontWeight: 700,
    letterSpacing: "0.1em", color: "#0F1F3D", marginBottom: "0.35rem",
  };

  return (
    <div style={{ background: "#F7F4EE", minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <nav style={{ background: "#0F1F3D", padding: "1rem 2rem", borderLeft: "4px solid #C8A44A", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <Link href="/" style={{ fontFamily: "var(--font-cormorant), Georgia, serif", fontSize: "1.6rem", fontWeight: 700, color: "#fff", textDecoration: "none" }}>
          Certus<span style={{ color: "#C8A44A" }}>Lex</span>
        </Link>
        <Link href="/kirjaudu" style={{ fontSize: "0.8rem", color: "#C8A44A", textDecoration: "none" }}>
          Kirjaudu sisään →
        </Link>
      </nav>

      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "2rem" }}>

        {/* VAIHE 1: Koodi */}
        {step === "code" && (
          <div style={{ width: "100%", maxWidth: "420px", textAlign: "center" }}>
            <div style={{ width: "64px", height: "64px", background: "#0F1F3D", borderLeft: "3px solid #C8A44A", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 2rem", fontSize: "1.8rem" }}>🔑</div>
            <div style={{ fontSize: "0.72rem", fontWeight: 700, letterSpacing: "0.14em", color: "#C8A44A", marginBottom: "0.8rem" }}>TARJOUSKONE — KÄYTTÖKOODI</div>
            <h1 style={{ fontFamily: "var(--font-cormorant), Georgia, serif", fontSize: "2.2rem", fontWeight: 700, color: "#0F1F3D", margin: "0 0 0.6rem", lineHeight: 1.15 }}>Syötä käyttökoodi</h1>
            <p style={{ fontSize: "0.88rem", color: "#8A8070", margin: "0 0 2.5rem", lineHeight: 1.6 }}>
              Sait henkilökohtaisen koodin sähköpostitse.<br />Syötä 6-numeroinen koodi päästäksesi sisään.
            </p>

            <div style={{ display: "flex", gap: "0.6rem", justifyContent: "center", marginBottom: "0.8rem" }} onPaste={handlePaste}>
              {digits.map((d, i) => (
                <input key={i} ref={el => { inputs.current[i] = el; }} type="text" inputMode="numeric"
                  maxLength={1} value={d} onChange={e => handleDigit(i, e.target.value)}
                  onKeyDown={e => handleKeyDown(i, e)} autoFocus={i === 0}
                  style={{ width: "52px", height: "64px", textAlign: "center", fontSize: "1.8rem", fontWeight: 700, fontFamily: "monospace", border: `2px solid ${error ? "#9b2335" : d ? "#C8A44A" : "#EDE8DE"}`, background: d ? "#fff" : "#FAF7F2", color: "#0F1F3D", outline: "none", marginLeft: i === 3 ? "1rem" : 0 }} />
              ))}
            </div>

            {error && <div style={{ background: "#fff0f0", border: "1px solid #f5c6cb", padding: "0.7rem 1rem", marginBottom: "1rem", fontSize: "0.85rem", color: "#9b2335" }}>{error}</div>}

            <button onClick={() => { const c = digits.join(""); if (c.length === 6) submitCode(c); }} disabled={digits.join("").length !== 6 || loading}
              style={{ width: "100%", background: digits.join("").length !== 6 || loading ? "#EDE8DE" : "#C8A44A", color: digits.join("").length !== 6 || loading ? "#8A8070" : "#0F1F3D", border: "none", padding: "1rem", fontSize: "0.95rem", fontWeight: 700, cursor: digits.join("").length !== 6 || loading ? "not-allowed" : "pointer", letterSpacing: "0.05em", marginTop: "0.5rem" }}>
              {loading ? "Tarkistetaan..." : "Jatka →"}
            </button>
            <p style={{ fontSize: "0.78rem", color: "#8A8070", marginTop: "1.5rem" }}>
              Ei koodia? <a href="mailto:info@certuslex.fi" style={{ color: "#C8A44A" }}>info@certuslex.fi</a>
            </p>
          </div>
        )}

        {/* VAIHE 2: Rekisteröinti */}
        {step === "register" && (
          <div style={{ width: "100%", maxWidth: "460px" }}>
            <div style={{ borderLeft: "4px solid #C8A44A", paddingLeft: "1rem", marginBottom: "2rem" }}>
              <div style={{ fontSize: "0.68rem", letterSpacing: "0.12em", color: "#C8A44A", marginBottom: "0.3rem" }}>KOODI HYVÄKSYTTY — {usesLeft} KÄYTTÖÄ JÄLJELLÄ</div>
              <h1 style={{ fontFamily: "var(--font-cormorant), Georgia, serif", fontSize: "2rem", fontWeight: 700, color: "#0F1F3D", margin: 0 }}>Luo tunnukset</h1>
              <p style={{ fontSize: "0.85rem", color: "#8A8070", margin: "0.3rem 0 0" }}>Tiedot on esitäytetty — tarkista ja aseta salasana.</p>
            </div>

            <div style={{ background: "#fff", border: "1px solid #EDE8DE", padding: "2rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                <div>
                  <label style={LBL}>YRITYS</label>
                  <input style={INP} value={companyName} onChange={e => setCompanyName(e.target.value)} placeholder="Yritys Oy" />
                </div>
                <div>
                  <label style={LBL}>YHTEYSHENKILÖ</label>
                  <input style={INP} value={contactName} onChange={e => setContactName(e.target.value)} placeholder="Etunimi Sukunimi" />
                </div>
              </div>
              <div>
                <label style={LBL}>SÄHKÖPOSTI</label>
                <input style={INP} type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="nimi@yritys.fi" />
              </div>
              <div>
                <label style={LBL}>SALASANA</label>
                <input style={INP} type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Vähintään 6 merkkiä" />
              </div>
              <div>
                <label style={LBL}>SALASANA UUDELLEEN</label>
                <input style={INP} type="password" value={password2} onChange={e => setPassword2(e.target.value)} placeholder="Toista salasana" />
              </div>

              {error && <div style={{ background: "#fff0f0", border: "1px solid #f5c6cb", padding: "0.7rem 1rem", fontSize: "0.85rem", color: "#9b2335" }}>{error}</div>}

              <button onClick={handleRegister} disabled={loading}
                style={{ background: loading ? "#EDE8DE" : "#0F1F3D", color: loading ? "#8A8070" : "#C8A44A", border: "none", padding: "1rem", fontSize: "0.9rem", fontWeight: 700, cursor: loading ? "not-allowed" : "pointer", letterSpacing: "0.05em" }}>
                {loading ? "Luodaan tunnuksia..." : "Luo tunnukset ja aloita →"}
              </button>

              <p style={{ fontSize: "0.78rem", color: "#8A8070", textAlign: "center", margin: 0 }}>
                Onko sinulla jo tunnukset?{" "}
                <Link href="/kirjaudu" style={{ color: "#C8A44A" }}>Kirjaudu sisään</Link>
              </p>
            </div>
          </div>
        )}

        {/* VAIHE 3: Kerrat loppu */}
        {step === "expired" && (
          <div style={{ width: "100%", maxWidth: "420px", textAlign: "center" }}>
            <div style={{ width: "64px", height: "64px", background: "#0F1F3D", borderLeft: "3px solid #C8A44A", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 2rem", fontSize: "1.8rem" }}>📦</div>
            <div style={{ fontSize: "0.72rem", fontWeight: 700, letterSpacing: "0.14em", color: "#C8A44A", marginBottom: "0.8rem" }}>KÄYTTÖKERRAT KÄYTETTY</div>
            <h1 style={{ fontFamily: "var(--font-cormorant), Georgia, serif", fontSize: "2rem", fontWeight: 700, color: "#0F1F3D", margin: "0 0 1rem" }}>Koodi on käytetty</h1>
            <p style={{ fontSize: "0.9rem", color: "#8A8070", margin: "0 0 2rem", lineHeight: 1.7 }}>
              Tämän koodin käyttökerrat on käytetty.<br />
              Osta lisää käyttökertoja tai siirry tilauspalveluun.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.8rem" }}>
              <Link href="/hinnoittelu"
                style={{ background: "#0F1F3D", color: "#C8A44A", padding: "1rem", fontSize: "0.9rem", fontWeight: 700, textDecoration: "none", letterSpacing: "0.05em", display: "block" }}>
                Katso tilausvaihtoehdot →
              </Link>
              <a href="mailto:info@certuslex.fi?subject=Lisää käyttökertoja"
                style={{ background: "none", border: "1px solid #C8A44A", color: "#0F1F3D", padding: "0.9rem", fontSize: "0.85rem", fontWeight: 600, textDecoration: "none", display: "block" }}>
                Pyydä lisää kertoja — info@certuslex.fi
              </a>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
