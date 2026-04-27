"use client";

import { useState } from "react";

const PIN = "kentta2026";

export default function KenttamuistioPage() {
  const [entered, setEntered] = useState("");
  const [authed, setAuthed] = useState(false);
  const [error, setError] = useState(false);

  function login() {
    if (entered === PIN) {
      setAuthed(true);
      setError(false);
    } else {
      setError(true);
    }
  }

  if (!authed) {
    return (
      <div style={{
        minHeight: "100vh", display: "flex", alignItems: "center",
        justifyContent: "center", background: "#0a0f1e",
      }}>
        <div style={{ background: "#111827", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "16px", padding: "2.5rem", width: "320px" }}>
          <div style={{ fontFamily: "Georgia, serif", fontSize: "1.4rem", fontWeight: 700, color: "#fff", marginBottom: "0.2rem" }}>
            Kenttä<span style={{ color: "#60a5fa" }}>muistio</span>
          </div>
          <p style={{ fontSize: "0.75rem", color: "#6b7280", letterSpacing: "0.08em", marginBottom: "2rem" }}>CERTUSLEX — KENTTÄTYÖKALU</p>
          <label style={{ fontSize: "0.72rem", fontWeight: 600, letterSpacing: "0.08em", color: "#9ca3af", display: "block", marginBottom: "0.5rem" }}>PIN-KOODI</label>
          <input
            type="password"
            value={entered}
            onChange={e => setEntered(e.target.value)}
            onKeyDown={e => e.key === "Enter" && login()}
            placeholder="••••••••••"
            autoFocus
            style={{
              width: "100%", background: "#1a2235", border: `1px solid ${error ? "#ef4444" : "rgba(255,255,255,0.08)"}`,
              borderRadius: "8px", color: "#e8eaf0", padding: "0.75rem 1rem",
              fontSize: "1rem", outline: "none", marginBottom: "0.5rem", boxSizing: "border-box",
            }}
          />
          {error && <p style={{ color: "#ef4444", fontSize: "0.75rem", marginBottom: "0.8rem" }}>Väärä PIN-koodi</p>}
          <button
            onClick={login}
            style={{
              width: "100%", background: "#3b82f6", color: "#fff", border: "none",
              borderRadius: "10px", padding: "0.85rem", fontSize: "0.88rem",
              fontWeight: 700, cursor: "pointer", letterSpacing: "0.05em",
            }}
          >
            Kirjaudu →
          </button>
        </div>
      </div>
    );
  }

  return (
    <iframe
      src="/kenttamuistio.html"
      style={{ width: "100%", height: "100vh", border: "none", display: "block" }}
      allow="microphone"
    />
  );
}
