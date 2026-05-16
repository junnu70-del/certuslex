"use client";

import { useEffect, useState } from "react";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";

const GOLD = "#C8A44A";
const NAVY = "#0F1F3D";
const CREAM = "#F7F4EE";
const BORDER = "#EDE8DE";

function injectDocStyle(html: string): string {
  const css = `<style>
    body,p,div,h1,h2,h3,h4,h5,h6,li,td,th,span {
      text-align: left !important;
      font-family: Georgia, 'Times New Roman', serif;
      font-size: 13px;
      line-height: 1.8;
      color: #1a1a1a;
    }
    body { margin: 2rem 2.5rem; max-width: 800px; }
    h1,h2,h3 { margin-top: 1.4em; margin-bottom: 0.4em; }
    p { margin: 0.5em 0; }
    table { border-collapse: collapse; width: 100%; }
    td, th { border: 1px solid #ccc; padding: 6px 10px; text-align: left !important; }
  </style>`;
  if (html.includes("</head>")) return html.replace("</head>", css + "</head>");
  if (html.includes("<body")) return css + html;
  return css + html;
}

interface Contract {
  contractId: string;
  fileName: string;
  customerEmail: string;
  customerName: string;
  notes: string;
  claudeAnalysis: string;
  claudeKorjattuAsiakirja: string;
  storageUrl?: string;
  docType?: string;
  status: "pending_review" | "approved" | "rejected" | "changes_requested";
  juristiComment: string;
  createdAt: { _seconds: number } | null;
}

const STATUS_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  pending_review: { label: "Odottaa tarkistusta", color: "#b86c00", bg: "#FFF8E6" },
  approved: { label: "Hyväksytty", color: "#2a7a2a", bg: "#F0FAF0" },
  rejected: { label: "Hylätty", color: "#8B0000", bg: "#FFF0F0" },
  changes_requested: { label: "Muutoksia pyydetty", color: "#0F1F3D", bg: "#F0F4FF" },
};

export default function AdminSopimuksetPage() {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<Contract | null>(null);
  const [juristiComment, setJuristiComment] = useState("");
  const [saving, setSaving] = useState(false);
  const [idToken, setIdToken] = useState("");
  const [filter, setFilter] = useState<"all" | "pending_review">("pending_review");
  const [activeTab, setActiveTab] = useState<"analyysi" | "korjattu">("analyysi");

  useEffect(() => {
    if (!auth) { setError("Kirjautuminen vaaditaan"); setLoading(false); return; }
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (!u) { setError("Kirjaudu sisään"); setLoading(false); return; }
      const token = await u.getIdToken();
      setIdToken(token);
      await loadContracts(token);
    });
    return () => unsub();
  }, []);

  async function loadContracts(token: string) {
    try {
      const res = await fetch("/api/contract/list", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.error) { setError(data.error); return; }
      setContracts(data.contracts ?? []);
    } catch {
      setError("Sopimuksia ei voitu ladata");
    } finally {
      setLoading(false);
    }
  }

  async function handleApprove(status: "approved" | "rejected" | "changes_requested") {
    if (!selected) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/contract/${selected.contractId}/approve`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({ status, juristiComment }),
      });
      const data = await res.json();
      if (data.ok) {
        setContracts((prev) =>
          prev.map((c) =>
            c.contractId === selected.contractId
              ? { ...c, status, juristiComment }
              : c
          )
        );
        setSelected(null);
        setJuristiComment("");
      }
    } catch {
      alert("Virhe tallennetessa");
    } finally {
      setSaving(false);
    }
  }

  function downloadDoc(contract: Contract) {
    if (!contract?.storageUrl) return;
    const a = document.createElement("a");
    a.href = contract.storageUrl;
    a.download = contract.fileName;
    a.target = "_blank";
    document.body.appendChild(a);
    a.click();
    setTimeout(() => document.body.removeChild(a), 1000);
  }

  const filtered = filter === "all" ? contracts : contracts.filter((c) => c.status === filter);

  if (loading) return (
    <div style={{ background: CREAM, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ width: "40px", height: "40px", border: `3px solid ${BORDER}`, borderTopColor: GOLD, borderRadius: "50%", animation: "spin 1s linear infinite" }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  if (error) return (
    <div style={{ background: CREAM, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <p style={{ color: "#8B0000" }}>{error}</p>
    </div>
  );

  return (
    <div style={{ background: CREAM, minHeight: "100vh" }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}} * { box-sizing: border-box; }`}</style>

      {/* Header */}
      <div style={{ background: NAVY, borderBottom: `3px solid ${GOLD}`, padding: "16px 28px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontFamily: "Georgia, serif", fontSize: "20px", fontWeight: 700, color: "#fff" }}>
          Certus<span style={{ color: GOLD }}>Lex</span>
          <span style={{ fontSize: "13px", color: "rgba(255,255,255,0.5)", marginLeft: "16px", fontFamily: "inherit", fontWeight: 400 }}>Sopimustarkistukset</span>
        </span>
        <div style={{ display: "flex", gap: "8px" }}>
          {["pending_review", "all"].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f as typeof filter)}
              style={{
                background: filter === f ? GOLD : "transparent",
                border: `1px solid ${filter === f ? GOLD : "rgba(200,164,74,0.4)"}`,
                color: filter === f ? NAVY : GOLD,
                padding: "6px 14px",
                fontSize: "12px",
                fontWeight: 600,
                cursor: "pointer",
                letterSpacing: "0.05em",
              }}
            >
              {f === "pending_review" ? "ODOTTAVAT" : "KAIKKI"}
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: selected ? "360px 1fr" : "1fr", gap: "0", minHeight: "calc(100vh - 64px)" }}>

        {/* List */}
        <div style={{ borderRight: selected ? `1px solid ${BORDER}` : "none", overflowY: "auto", maxHeight: "calc(100vh - 64px)" }}>
          {filtered.length === 0 ? (
            <div style={{ padding: "48px 28px", textAlign: "center" }}>
              <div style={{ fontSize: "32px", marginBottom: "12px" }}>✓</div>
              <p style={{ color: "#8A8070", fontSize: "14px" }}>Ei odottavia tarkistuksia</p>
            </div>
          ) : (
            filtered.map((c) => {
              const st = STATUS_LABELS[c.status] ?? STATUS_LABELS.pending_review;
              const date = c.createdAt ? new Date(c.createdAt._seconds * 1000).toLocaleDateString("fi-FI") : "—";
              const isSelected = selected?.contractId === c.contractId;
              return (
                <div
                  key={c.contractId}
                  onClick={() => { setSelected(c); setJuristiComment(c.juristiComment ?? ""); setActiveTab("analyysi" as const); }}
                  style={{
                    padding: "16px 20px",
                    borderBottom: `1px solid ${BORDER}`,
                    cursor: "pointer",
                    background: isSelected ? "#FDF8EE" : "#fff",
                    borderLeft: isSelected ? `4px solid ${GOLD}` : "4px solid transparent",
                    transition: "all 0.1s",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "6px" }}>
                    <div style={{ fontWeight: 700, fontSize: "13px", color: NAVY, flex: 1, marginRight: "8px", wordBreak: "break-word" }}>{c.fileName}</div>
                    <div style={{ background: st.bg, color: st.color, fontSize: "10px", fontWeight: 700, padding: "3px 8px", letterSpacing: "0.05em", whiteSpace: "nowrap", flexShrink: 0 }}>
                      {st.label.toUpperCase()}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: "6px", alignItems: "center", marginBottom: "4px" }}>
                    {c.docType && (
                      <span style={{ background: NAVY, color: GOLD, fontSize: "10px", fontWeight: 700, padding: "2px 7px", letterSpacing: "0.06em" }}>
                        {c.docType.toUpperCase()}
                      </span>
                    )}
                    <span style={{ fontSize: "12px", color: "#8A8070" }}>{c.customerEmail}</span>
                  </div>
                  <div style={{ fontSize: "11px", color: "#AAAAAA" }}>{date}</div>
                </div>
              );
            })
          )}
        </div>

        {/* Detail panel */}
        {selected && (
          <div style={{ padding: "28px 32px", overflowY: "auto", maxHeight: "calc(100vh - 64px)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "20px" }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "6px" }}>
                  <h2 style={{ color: NAVY, fontFamily: "Georgia, serif", fontSize: "20px", margin: 0 }}>{selected.fileName}</h2>
                  {selected.docType && (
                    <span style={{ background: NAVY, color: GOLD, fontSize: "11px", fontWeight: 700, padding: "3px 10px", letterSpacing: "0.08em", flexShrink: 0 }}>
                      {selected.docType.toUpperCase()}
                    </span>
                  )}
                </div>
                <div style={{ fontSize: "13px", color: "#8A8070" }}>
                  {selected.customerName && <span style={{ marginRight: "12px", fontWeight: 600, color: NAVY }}>{selected.customerName}</span>}
                  {selected.customerEmail}
                </div>
              </div>
              <button
                onClick={() => { setSelected(null); setJuristiComment(""); }}
                style={{ background: "none", border: "none", color: "#8A8070", fontSize: "20px", cursor: "pointer", lineHeight: 1 }}
              >
                ×
              </button>
            </div>

            {/* Download */}
            <button
              onClick={() => downloadDoc(selected)}
              style={{ background: NAVY, color: GOLD, border: "none", padding: "10px 20px", fontSize: "13px", fontWeight: 700, cursor: "pointer", marginBottom: "24px", letterSpacing: "0.05em" }}
            >
              ⬇ Lataa asiakirja
            </button>

            {/* Customer notes */}
            {selected.notes && (
              <div style={{ background: "#fff", border: `1px solid ${BORDER}`, borderLeft: `3px solid ${NAVY}`, padding: "16px 18px", marginBottom: "20px" }}>
                <div style={{ fontSize: "11px", letterSpacing: "0.1em", fontWeight: 700, color: "#8A8070", marginBottom: "8px" }}>ASIAKKAAN LISÄTIEDOT</div>
                <p style={{ fontSize: "13px", color: "#2C2416", lineHeight: "1.7", margin: 0 }}>{selected.notes}</p>
              </div>
            )}

            {/* Claude tabs */}
            <div style={{ marginBottom: "24px" }}>
              <div style={{ display: "flex", borderBottom: `2px solid ${BORDER}`, marginBottom: "0" }}>
                {([["analyysi", "✦ Esianalyysi"], ["korjattu", "✎ Korjattu asiakirja"]] as const).map(([tab, label]) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    style={{
                      background: "none",
                      border: "none",
                      borderBottom: activeTab === tab ? `2px solid ${GOLD}` : "2px solid transparent",
                      marginBottom: "-2px",
                      padding: "10px 16px",
                      fontSize: "12px",
                      fontWeight: 700,
                      color: activeTab === tab ? NAVY : "#8A8070",
                      cursor: "pointer",
                      letterSpacing: "0.05em",
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <div style={{ background: "#fff", border: `1px solid ${BORDER}`, borderTop: "none", borderLeft: `3px solid ${GOLD}`, padding: "16px 18px" }}>
                {activeTab === "analyysi" ? (
                  <div
                    style={{ fontSize: "13px", color: "#2C2416", lineHeight: "1.7" }}
                    dangerouslySetInnerHTML={{ __html: selected.claudeAnalysis || "<p style='color:#8A8070'>Ei esianalyysia</p>" }}
                  />
                ) : selected.claudeKorjattuAsiakirja ? (
                  <iframe
                    srcDoc={injectDocStyle(selected.claudeKorjattuAsiakirja)}
                    style={{ width: "100%", height: "420px", border: "none", display: "block" }}
                    title="Korjattu asiakirja"
                  />
                ) : (
                  <p style={{ color: "#8A8070", fontSize: "13px" }}>Ei korjattua asiakirjaa</p>
                )}
              </div>
            </div>

            {/* Juristi comment */}
            <div style={{ marginBottom: "16px" }}>
              <label style={{ display: "block", fontSize: "11px", letterSpacing: "0.1em", fontWeight: 700, color: "#8A8070", marginBottom: "8px" }}>
                JURISTIN KOMMENTTI ASIAKKAALLE
              </label>
              <textarea
                value={juristiComment}
                onChange={(e) => setJuristiComment(e.target.value)}
                rows={5}
                placeholder="Kirjoita asiakkaalle lähetettävä kommentti. Tämä näkyy asiakkaalle sähköpostissa."
                style={{ width: "100%", border: `1px solid ${BORDER}`, padding: "12px 14px", fontSize: "13px", color: NAVY, resize: "vertical", fontFamily: "inherit", outline: "none" }}
              />
            </div>

            {/* Action buttons */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px" }}>
              <button
                onClick={() => handleApprove("approved")}
                disabled={saving}
                style={{ background: "#2a7a2a", color: "#fff", border: "none", padding: "12px", fontSize: "13px", fontWeight: 700, cursor: saving ? "not-allowed" : "pointer", letterSpacing: "0.05em" }}
              >
                {saving ? "…" : "✓ HYVÄKSY"}
              </button>
              <button
                onClick={() => handleApprove("changes_requested")}
                disabled={saving}
                style={{ background: "#b86c00", color: "#fff", border: "none", padding: "12px", fontSize: "13px", fontWeight: 700, cursor: saving ? "not-allowed" : "pointer", letterSpacing: "0.05em" }}
              >
                {saving ? "…" : "⚠ MUUTOKSIA"}
              </button>
              <button
                onClick={() => handleApprove("rejected")}
                disabled={saving}
                style={{ background: "#8B0000", color: "#fff", border: "none", padding: "12px", fontSize: "13px", fontWeight: 700, cursor: saving ? "not-allowed" : "pointer", letterSpacing: "0.05em" }}
              >
                {saving ? "…" : "✗ HYLKÄÄ"}
              </button>
            </div>

            <p style={{ marginTop: "10px", fontSize: "11px", color: "#8A8070" }}>
              Asiakas saa sähköposti-ilmoituksen päätöksestäsi välittömästi.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
