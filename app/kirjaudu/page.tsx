"use client";

export const dynamic = "force-dynamic";

import { useState, Suspense } from "react";
import { auth } from "@/lib/firebase";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
} from "firebase/auth";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

const PLAN_NAMES: Record<string, string> = {
  starter: "Starter — 49 €/kk",
  pro: "Pro — 99 €/kk",
  yritys: "Yritys — 249 €/kk",
};

const inp: React.CSSProperties = {
  width: "100%", border: "1px solid #EDE8DE", padding: "0.75rem 1rem",
  fontSize: "0.95rem", outline: "none", boxSizing: "border-box",
  fontFamily: "inherit", background: "#fff", marginBottom: "1rem",
};
const lbl: React.CSSProperties = {
  display: "block", fontSize: "0.72rem", fontWeight: 700,
  letterSpacing: "0.1em", color: "#0F1F3D", marginBottom: "0.4rem",
};

// useSearchParams vaatii Suspense-rajan — erotettu omaksi komponentiksi
function KirjauduForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const planId = searchParams.get("plan");
  const isTrial = searchParams.get("trial") === "1";
  const [mode, setMode] = useState<"login" | "register">(planId ? "register" : "login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  async function handleForgotPassword() {
    if (!email) { setError("Syötä sähköpostiosoite ensin"); return; }
    if (!auth) return;
    try {
      await sendPasswordResetEmail(auth, email);
      setResetSent(true);
      setError("");
    } catch {
      setError("Salasanan nollaus epäonnistui — tarkista sähköpostiosoite");
    }
  }

  async function handleSubmit() {
    setError("");
    if (!email || !password) { setError("Täytä kaikki kentät"); return; }
    if (mode === "register" && password !== password2) { setError("Salasanat eivät täsmää"); return; }
    if (password.length < 6) { setError("Salasanan tulee olla vähintään 6 merkkiä"); return; }

    setLoading(true);
    try {
      if (mode === "register") {
        await createUserWithEmailAndPassword(auth, email, password);
        router.push("/profiili");
      } else {
        await signInWithEmailAndPassword(auth, email, password);
        router.push("/tarjouskone");
      }
    } catch (e: unknown) {
      const code = (e as { code?: string }).code;
      if (code === "auth/email-already-in-use") setError("Sähköposti on jo käytössä");
      else if (code === "auth/user-not-found" || code === "auth/wrong-password" || code === "auth/invalid-credential") setError("Virheellinen sähköposti tai salasana");
      else if (code === "auth/invalid-email") setError("Virheellinen sähköpostiosoite");
      else setError("Virhe: " + code);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ width: "100%", maxWidth: "420px" }}>
      {/* Plan banner */}
      {planId && isTrial && PLAN_NAMES[planId] && (
        <div style={{ background: "#0F1F3D", borderLeft: "4px solid #C8A44A", padding: "1rem 1.2rem", marginBottom: "1.5rem", display: "flex", alignItems: "center", gap: "0.8rem" }}>
          <span style={{ fontSize: "1.2rem" }}>🎉</span>
          <div>
            <p style={{ fontSize: "0.72rem", fontWeight: 700, letterSpacing: "0.1em", color: "#C8A44A", margin: "0 0 0.2rem" }}>VALITSIT PAKETIN</p>
            <p style={{ fontSize: "0.88rem", color: "#fff", margin: "0 0 0.2rem", fontWeight: 600 }}>{PLAN_NAMES[planId]}</p>
            <p style={{ fontSize: "0.75rem", color: "#B0A898", margin: 0 }}>30 päivää ilmaiseksi — ei luottokorttia</p>
          </div>
        </div>
      )}

      {/* Toggle */}
      <div style={{ display: "flex", marginBottom: "2rem", border: "1px solid #EDE8DE", background: "#fff" }}>
        {(["login", "register"] as const).map(m => (
          <button key={m} onClick={() => { setMode(m); setError(""); }}
            style={{ flex: 1, padding: "0.8rem", border: "none", background: mode === m ? "#0F1F3D" : "#fff", color: mode === m ? "#C8A44A" : "#8A8070", fontWeight: 600, fontSize: "0.85rem", cursor: "pointer", letterSpacing: "0.05em" }}>
            {m === "login" ? "Kirjaudu sisään" : "Luo tili"}
          </button>
        ))}
      </div>

      <div style={{ background: "#fff", border: "1px solid #EDE8DE", padding: "2rem" }}>
        <div style={{ borderLeft: "4px solid #C8A44A", paddingLeft: "1rem", marginBottom: "2rem" }}>
          <h1 style={{ fontFamily: "var(--font-cormorant), Georgia, serif", fontSize: "1.8rem", fontWeight: 700, color: "#0F1F3D", margin: 0 }}>
            {mode === "login" ? "Kirjaudu sisään" : "Luo uusi tili"}
          </h1>
          <p style={{ fontSize: "0.82rem", color: "#8A8070", margin: "0.3rem 0 0" }}>
            {mode === "login" ? "Pääset yritysprofiiliisi ja tarjouskoneeseen" : "Tallenna yritystietosi ja käytä tarjouskoneetta"}
          </p>
        </div>

        <label style={lbl}>SÄHKÖPOSTIOSOITE</label>
        <input type="email" value={email} onChange={e => setEmail(e.target.value)}
          placeholder="yritys@esimerkki.fi" style={inp}
          onKeyDown={e => e.key === "Enter" && handleSubmit()} />

        <label style={lbl}>SALASANA</label>
        <input type="password" value={email && mode === "login" ? password : password} onChange={e => setPassword(e.target.value)}
          placeholder="••••••••" style={inp}
          onKeyDown={e => e.key === "Enter" && handleSubmit()} />

        {mode === "login" && (
          <div style={{ textAlign: "right", marginTop: "-0.8rem", marginBottom: "1rem" }}>
            {resetSent
              ? <span style={{ fontSize: "0.78rem", color: "#166534" }}>✓ Linkki lähetetty sähköpostiisi</span>
              : <button onClick={handleForgotPassword} style={{ background: "none", border: "none", color: "#C8A44A", fontSize: "0.78rem", cursor: "pointer", padding: 0, textDecoration: "underline" }}>Unohditko salasanan?</button>
            }
          </div>
        )}

        {mode === "register" && (
          <>
            <label style={lbl}>SALASANA UUDELLEEN</label>
            <input type="password" value={password2} onChange={e => setPassword2(e.target.value)}
              placeholder="••••••••" style={{ ...inp, marginBottom: "1.5rem" }}
              onKeyDown={e => e.key === "Enter" && handleSubmit()} />
          </>
        )}

        {error && (
          <div style={{ background: "#fff0f0", border: "1px solid #f5c6cb", padding: "0.7rem 1rem", marginBottom: "1rem", fontSize: "0.85rem", color: "#9b2335" }}>
            {error}
          </div>
        )}

        <button onClick={handleSubmit} disabled={loading}
          style={{ width: "100%", background: loading ? "#EDE8DE" : "#0F1F3D", color: loading ? "#8A8070" : "#C8A44A", border: "none", padding: "0.9rem", fontSize: "0.9rem", fontWeight: 700, cursor: loading ? "not-allowed" : "pointer", letterSpacing: "0.05em" }}>
          {loading ? "Odota..." : mode === "login" ? "Kirjaudu →" : "Luo tili →"}
        </button>

        <div style={{ marginTop: "1.5rem", borderTop: "1px solid #EDE8DE", paddingTop: "1.2rem", textAlign: "center" }}>
          <p style={{ fontSize: "0.8rem", color: "#8A8070", margin: "0 0 0.6rem" }}>Onko sinulla käyttökoodi?</p>
          <Link href="/koodi"
            style={{ display: "inline-block", border: "1px solid #C8A44A", color: "#0F1F3D", padding: "0.6rem 1.4rem", fontSize: "0.82rem", fontWeight: 600, textDecoration: "none", letterSpacing: "0.04em" }}>
            Syötä käyttökoodi →
          </Link>
        </div>
      </div>
    </div>
  );
}

// Suspense-raja pakollinen useSearchParams():lle Next.js App Routerissa
export default function KirjauduPage() {
  return (
    <div style={{ background: "#F7F4EE", minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <nav style={{ background: "#0F1F3D", padding: "1rem 2rem", borderLeft: "4px solid #C8A44A" }}>
        <Link href="/" style={{ fontFamily: "var(--font-cormorant), Georgia, serif", fontSize: "1.6rem", fontWeight: 700, color: "#fff", textDecoration: "none" }}>
          Certus<span style={{ color: "#C8A44A" }}>Lex</span>
        </Link>
      </nav>
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "3rem 1rem" }}>
        <Suspense fallback={<div style={{ color: "#8A8070" }}>Ladataan...</div>}>
          <KirjauduForm />
        </Suspense>
      </div>
    </div>
  );
}
