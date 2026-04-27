"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function KoodiPage() {
  const router = useRouter();
  const [digits, setDigits] = useState(["", "", "", "", "", ""]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const inputs = useRef<(HTMLInputElement | null)[]>([]);

  // Jos koodi jo tallennettu, ohjaa suoraan
  useEffect(() => {
    const saved = localStorage.getItem("certuslex_code");
    if (saved) {
      // Tarkista että vielä voimassa
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
    // Auto-submit kun kaikki täynnä
    if (val && i === 5 && next.every(d => d)) {
      submitCode(next.join(""));
    }
  }

  function handleKeyDown(i: number, e: React.KeyboardEvent) {
    if (e.key === "Backspace" && !digits[i] && i > 0) {
      inputs.current[i - 1]?.focus();
    }
  }

  function handlePaste(e: React.ClipboardEvent) {
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (pasted.length === 6) {
      setDigits(pasted.split(""));
      submitCode(pasted);
    }
  }

  async function submitCode(code: string) {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/verify-code?code=${code}`);
      const data = await res.json();
      if (data.valid) {
        localStorage.setItem("certuslex_code", code);
        localStorage.setItem("certuslex_code_uses", String(data.usesLeft));
        router.push("/tarjouskone");
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

  const code = digits.join("");
  const canSubmit = code.length === 6 && !loading;

  return (
    <div style={{ background: "#F7F4EE", minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <nav style={{ background: "#0F1F3D", padding: "1rem 2rem", borderLeft: "4px solid #C8A44A", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <Link href="/" style={{ fontFamily: "var(--font-cormorant), Georgia, serif", fontSize: "1.6rem", fontWeight: 700, color: "#fff", textDecoration: "none" }}>
          Certus<span style={{ color: "#C8A44A" }}>Lex</span>
        </Link>
      </nav>

      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "2rem" }}>
        <div style={{ width: "100%", maxWidth: "420px", textAlign: "center" }}>

          {/* Logo / ikoni */}
          <div style={{ width: "64px", height: "64px", background: "#0F1F3D", borderLeft: "3px solid #C8A44A", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 2rem", fontSize: "1.8rem" }}>
            🔑
          </div>

          <div style={{ fontSize: "0.72rem", fontWeight: 700, letterSpacing: "0.14em", color: "#C8A44A", marginBottom: "0.8rem" }}>
            TARJOUSKONE — KÄYTTÖKOODI
          </div>
          <h1 style={{ fontFamily: "var(--font-cormorant), Georgia, serif", fontSize: "2.2rem", fontWeight: 700, color: "#0F1F3D", margin: "0 0 0.6rem", lineHeight: 1.15 }}>
            Syötä käyttökoodi
          </h1>
          <p style={{ fontSize: "0.88rem", color: "#8A8070", margin: "0 0 2.5rem", lineHeight: 1.6 }}>
            Sait henkilökohtaisen koodin sähköpostitse.<br />
            Syötä 6-numeroinen koodi päästäksesi tarjouskoneeseen.
          </p>

          {/* Digit inputs */}
          <div style={{ display: "flex", gap: "0.6rem", justifyContent: "center", marginBottom: "0.8rem" }} onPaste={handlePaste}>
            {digits.map((d, i) => (
              <input
                key={i}
                ref={el => { inputs.current[i] = el; }}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={d}
                onChange={e => handleDigit(i, e.target.value)}
                onKeyDown={e => handleKeyDown(i, e)}
                autoFocus={i === 0}
                style={{
                  width: "52px",
                  height: "64px",
                  textAlign: "center",
                  fontSize: "1.8rem",
                  fontWeight: 700,
                  fontFamily: "monospace",
                  border: `2px solid ${error ? "#9b2335" : d ? "#C8A44A" : "#EDE8DE"}`,
                  background: d ? "#fff" : "#FAF7F2",
                  color: "#0F1F3D",
                  outline: "none",
                  transition: "border-color 0.15s",
                  // Visuaalinen väli 3 ja 4 välillä
                  marginLeft: i === 3 ? "1rem" : 0,
                }}
              />
            ))}
          </div>

          {error && (
            <div style={{ background: "#fff0f0", border: "1px solid #f5c6cb", padding: "0.7rem 1rem", marginBottom: "1rem", fontSize: "0.85rem", color: "#9b2335" }}>
              {error}
            </div>
          )}

          <button
            onClick={() => canSubmit && submitCode(code)}
            disabled={!canSubmit}
            style={{
              width: "100%",
              background: !canSubmit ? "#EDE8DE" : "#C8A44A",
              color: !canSubmit ? "#8A8070" : "#0F1F3D",
              border: "none",
              padding: "1rem",
              fontSize: "0.95rem",
              fontWeight: 700,
              cursor: !canSubmit ? "not-allowed" : "pointer",
              letterSpacing: "0.05em",
              marginTop: "0.5rem",
              transition: "background 0.2s",
            }}>
            {loading ? "Tarkistetaan..." : "Jatka tarjouskoneeseen →"}
          </button>

          <p style={{ fontSize: "0.78rem", color: "#8A8070", marginTop: "1.5rem" }}>
            Ei koodia? Ota yhteyttä{" "}
            <a href="mailto:info@certuslex.fi" style={{ color: "#C8A44A" }}>info@certuslex.fi</a>
          </p>

        </div>
      </div>
    </div>
  );
}
