"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

const GOLD = "#C8A44A";
const NAVY = "#0F1F3D";
const CREAM = "#F7F4EE";
const BORDER = "#EDE8DE";

const STATUS_MAP: Record<string, { label: string; icon: string; color: string; bg: string; desc: string }> = {
  pending_review: {
    label: "Odottaa juristin tarkistusta",
    icon: "⏳",
    color: "#b86c00",
    bg: "#FFF8E6",
    desc: "Asiakirjasi on vastaanotettu ja se odottaa juristin käsittelyä. Saat sähköpostiviestin kun tarkistus on valmis.",
  },
  approved: {
    label: "Hyväksytty",
    icon: "✓",
    color: "#2a7a2a",
    bg: "#F0FAF0",
    desc: "Juristi on tarkistanut asiakirjasi ja hyväksynyt sen.",
  },
  rejected: {
    label: "Hylätty",
    icon: "✗",
    color: "#8B0000",
    bg: "#FFF0F0",
    desc: "Juristi on tarkistanut asiakirjasi. Katso juristin kommentti alta.",
  },
  changes_requested: {
    label: "Muutoksia tarvitaan",
    icon: "⚠",
    color: "#b86c00",
    bg: "#FFF8E6",
    desc: "Juristi on tarkistanut asiakirjasi ja pyytää muutoksia. Katso kommentti alta.",
  },
};

export default function SopimustarkistusStatusPage() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<Record<string, string> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    // Public status check — pass token if logged in, otherwise just show status
    async function load() {
      try {
        const res = await fetch(`/api/contract/${id}`, {
          headers: { Authorization: "Bearer public" },
        });
        const json = await res.json();
        if (json.error) {
          setError("Tarkistusta ei löydy tai sinulla ei ole oikeutta nähdä sitä.");
          return;
        }
        setData(json);
      } catch {
        setError("Tietoja ei voitu ladata.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  if (loading) return (
    <div style={{ background: CREAM, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ width: "36px", height: "36px", border: `3px solid ${BORDER}`, borderTopColor: GOLD, borderRadius: "50%", animation: "spin 1s linear infinite" }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  const status = data?.status ?? "pending_review";
  const st = STATUS_MAP[status] ?? STATUS_MAP.pending_review;

  return (
    <div style={{ background: CREAM, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "2rem 1rem" }}>
      <div style={{ maxWidth: "520px", width: "100%", background: "#fff", border: `1px solid ${BORDER}` }}>
        <div style={{ background: NAVY, padding: "20px 28px", borderLeft: `4px solid ${GOLD}` }}>
          <span style={{ fontFamily: "Georgia, serif", fontSize: "22px", fontWeight: 700, color: "#fff" }}>
            Certus<span style={{ color: GOLD }}>Lex</span>
          </span>
        </div>

        <div style={{ padding: "36px" }}>
          {error ? (
            <p style={{ color: "#8B0000", fontSize: "14px" }}>{error}</p>
          ) : (
            <>
              <div style={{ background: st.bg, border: `1px solid ${BORDER}`, borderLeft: `4px solid ${st.color}`, padding: "20px 24px", marginBottom: "24px", display: "flex", alignItems: "center", gap: "16px" }}>
                <div style={{ fontSize: "32px" }}>{st.icon}</div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: "15px", color: st.color, marginBottom: "4px" }}>{st.label}</div>
                  <div style={{ fontSize: "13px", color: "#2C2416", lineHeight: "1.6" }}>{st.desc}</div>
                </div>
              </div>

              <div style={{ marginBottom: "20px" }}>
                <div style={{ fontSize: "11px", letterSpacing: "0.1em", color: "#8A8070", fontWeight: 600, marginBottom: "4px" }}>TIEDOSTO</div>
                <div style={{ fontWeight: 600, color: NAVY, fontSize: "14px" }}>{data?.fileName ?? "—"}</div>
              </div>

              {data?.juristiComment && (
                <div style={{ background: "#FAF7F2", border: `1px solid ${BORDER}`, borderLeft: `3px solid ${GOLD}`, padding: "16px 18px", marginBottom: "20px" }}>
                  <div style={{ fontSize: "11px", letterSpacing: "0.1em", fontWeight: 700, color: "#8A8070", marginBottom: "10px" }}>JURISTIN KOMMENTTI</div>
                  <div style={{ fontSize: "14px", color: "#2C2416", lineHeight: "1.7", whiteSpace: "pre-wrap" }}>{data.juristiComment}</div>
                </div>
              )}

              <div style={{ borderLeft: `3px solid ${BORDER}`, padding: "10px 14px", background: "#FAF7F2" }}>
                <div style={{ fontSize: "10px", letterSpacing: "0.1em", color: "#8A8070", fontWeight: 600, marginBottom: "4px" }}>TUNNISTE</div>
                <div style={{ fontFamily: "monospace", fontSize: "12px", color: NAVY }}>{id.slice(0, 16).toUpperCase()}</div>
              </div>

              <p style={{ marginTop: "24px", fontSize: "12px", color: "#8A8070", lineHeight: "1.6" }}>
                Kysyttävää? Ota yhteyttä{" "}
                <a href="mailto:info@certuslex.fi" style={{ color: GOLD }}>info@certuslex.fi</a>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
