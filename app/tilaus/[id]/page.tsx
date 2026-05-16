"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

interface OrderDoc {
  fileName: string;
  docType: string;
  plan: string;
  price: string;
  deliveryTime: string;
  status: string;
  createdAt: number | null;
  inReviewAt?: number | null;
  reviewedAt?: number | null;
  correctedUrl?: string;
  review?: string;
  claudeAnalysis?: string;
}

function fmt(seconds: number | null | undefined) {
  if (!seconds) return null;
  return new Date(seconds * 1000).toLocaleString("fi-FI", {
    day: "numeric", month: "numeric", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

const STATUS_STEPS = [
  { key: "pending_review", label: "Vastaanotettu",   sub: "Asiakirja on turvallisesti tallennettuna" },
  { key: "in_review",      label: "Käsittelyssä",    sub: "OTM-juristi tarkastaa asiakirjaanne" },
  { key: "done",           label: "Lausunto valmis", sub: "Lausunto on lähetetty sähköpostiinne" },
];

function getStepIndex(status: string) {
  if (status === "done" || status === "completed") return 2;
  if (status === "in_review") return 1;
  return 0;
}

export default function TilausPage() {
  const { id } = useParams<{ id: string }>();
  const [order, setOrder] = useState<OrderDoc | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!id) return;
    fetch(`/api/tilaus/${id}`)
      .then(r => r.json())
      .then(data => {
        if (data.error) { setNotFound(true); }
        else { setOrder(data); }
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [id]);

  const stepIdx = order ? getStepIndex(order.status) : 0;

  return (
    <div style={{ background: "#F7F4EE", minHeight: "100vh" }}>
      <nav style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "1.2rem 3rem", borderBottom: "1px solid #EDE8DE", background: "#fff" }}>
        <Link href="/" style={{ fontFamily: "var(--font-cormorant), Georgia, serif", fontSize: "1.8rem", fontWeight: 700, textDecoration: "none", color: "#0F1F3D", letterSpacing: "-0.02em" }}>
          Certus<span style={{ color: "#C8A44A" }}>Lex</span>
        </Link>
        <span style={{ fontSize: "0.78rem", color: "#8A8070" }}>Tilauksen seuranta</span>
      </nav>

      <div style={{ maxWidth: "680px", margin: "0 auto", padding: "3rem 2rem 5rem" }}>

        {loading && (
          <div style={{ textAlign: "center", padding: "4rem", color: "#8A8070" }}>
            <div style={{ width: "36px", height: "36px", border: "2px solid #EDE8DE", borderTopColor: "#C8A44A", borderRadius: "50%", animation: "spin 1s linear infinite", margin: "0 auto 1rem" }} />
            Ladataan tilauksen tietoja...
          </div>
        )}

        {notFound && (
          <div style={{ textAlign: "center", padding: "4rem" }}>
            <p style={{ fontSize: "1.1rem", color: "#0F1F3D", marginBottom: "0.5rem", fontWeight: 600 }}>Tilausta ei löydy</p>
            <p style={{ fontSize: "0.85rem", color: "#8A8070", marginBottom: "2rem" }}>Tarkista tilausnumero sähköpostistanne.</p>
            <Link href="/" style={{ fontSize: "0.85rem", color: "#C8A44A" }}>← Etusivu</Link>
          </div>
        )}

        {order && (
          <>
            {/* Header */}
            <div style={{ marginBottom: "2rem" }}>
              <div style={{ fontSize: "0.72rem", letterSpacing: "0.14em", color: "#C8A44A", marginBottom: "0.5rem" }}>TILAUKSEN SEURANTA</div>
              <h1 style={{ fontFamily: "var(--font-cormorant), Georgia, serif", fontSize: "1.8rem", fontWeight: 700, color: "#0F1F3D", marginBottom: "0.3rem" }}>{order.fileName}</h1>
              <p style={{ fontSize: "0.82rem", color: "#8A8070" }}>{order.plan}-paketti · {order.docType} · {order.price} €</p>
            </div>

            {/* Status steps */}
            <div style={{ background: "#fff", border: "1px solid #EDE8DE", padding: "2rem", marginBottom: "1.5rem" }}>
              <p style={{ fontSize: "0.72rem", letterSpacing: "0.12em", color: "#8A8070", marginBottom: "1.5rem" }}>KÄSITTELYVAIHE</p>
              <div style={{ position: "relative" }}>
                <div style={{ position: "absolute", left: "13px", top: "14px", bottom: "14px", width: "2px", background: "#EDE8DE", zIndex: 0 }} />
                <div style={{ position: "absolute", left: "13px", top: "14px", width: "2px", background: "#C8A44A", zIndex: 1, height: `${(stepIdx / 2) * 100}%`, transition: "height 0.6s ease" }} />

                {STATUS_STEPS.map((step, i) => {
                  const done = i < stepIdx;
                  const active = i === stepIdx;
                  return (
                    <div key={step.key} style={{ display: "flex", alignItems: "flex-start", gap: "1.2rem", marginBottom: i < 2 ? "1.5rem" : 0, position: "relative", zIndex: 2 }}>
                      <div style={{
                        width: "28px", height: "28px", borderRadius: "50%", flexShrink: 0,
                        background: done ? "#C8A44A" : active ? "#0F1F3D" : "#fff",
                        border: `2px solid ${done || active ? "#C8A44A" : "#EDE8DE"}`,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        transition: "all 0.3s",
                      }}>
                        {done ? (
                          <span style={{ color: "#fff", fontSize: "12px", fontWeight: 700 }}>✓</span>
                        ) : active ? (
                          <span style={{ width: "8px", height: "8px", background: "#C8A44A", borderRadius: "50%", display: "block" }} />
                        ) : null}
                      </div>
                      <div style={{ paddingTop: "3px" }}>
                        <div style={{ fontSize: "0.9rem", fontWeight: done || active ? 600 : 400, color: done || active ? "#0F1F3D" : "#8A8070" }}>{step.label}</div>
                        <div style={{ fontSize: "0.78rem", color: "#8A8070", marginTop: "2px" }}>{step.sub}</div>
                        {i === 0 && fmt(order.createdAt) && (
                          <div style={{ fontSize: "0.72rem", color: "#C8A44A", marginTop: "4px" }}>{fmt(order.createdAt)}</div>
                        )}
                        {i === 1 && fmt(order.inReviewAt) && (
                          <div style={{ fontSize: "0.72rem", color: "#C8A44A", marginTop: "4px" }}>{fmt(order.inReviewAt)}</div>
                        )}
                        {i === 2 && fmt(order.reviewedAt) && (
                          <div style={{ fontSize: "0.72rem", color: "#C8A44A", marginTop: "4px" }}>{fmt(order.reviewedAt)}</div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Juristin lausunto */}
            {(order.status === "done" || order.status === "completed") && order.review && (
              <div style={{ background: "#0F1F3D", padding: "1.8rem 2rem", marginBottom: "1.5rem", borderLeft: "4px solid #C8A44A" }}>
                <p style={{ fontSize: "0.7rem", letterSpacing: "0.14em", color: "#C8A44A", marginBottom: "0.8rem" }}>JURISTIN LAUSUNTO</p>
                <p style={{ fontSize: "0.88rem", color: "#D8D0C0", lineHeight: 1.8, whiteSpace: "pre-wrap", margin: 0 }}>{order.review}</p>
                {order.correctedUrl && (
                  <a href={order.correctedUrl} target="_blank" rel="noopener noreferrer"
                    style={{ display: "inline-block", marginTop: "1.2rem", background: "#C8A44A", color: "#0F1F3D", padding: "0.7rem 1.4rem", fontSize: "0.82rem", fontWeight: 600, textDecoration: "none", letterSpacing: "0.04em" }}>
                    ⬇ Lataa korjattu asiakirja
                  </a>
                )}
              </div>
            )}

            {/* AI-esianalyysi */}
            {order.claudeAnalysis && (
              <div style={{ background: "#fff", border: "1px solid #EDE8DE", marginBottom: "1.5rem" }}>
                <div style={{ padding: "1rem 1.5rem", borderBottom: "1px solid #EDE8DE", display: "flex", alignItems: "center", gap: "0.6rem" }}>
                  <span style={{ fontSize: "0.7rem", letterSpacing: "0.12em", fontWeight: 700, color: "#8A8070" }}>AI-ESIANALYYSI</span>
                  <span style={{ fontSize: "0.68rem", background: "#F7F4EE", color: "#C8A44A", padding: "2px 8px", fontWeight: 600 }}>🤖 Claude AI</span>
                  <span style={{ fontSize: "0.7rem", color: "#8A8070", marginLeft: "auto" }}>Alustava — juristi vahvistaa lopullisen lausunnon</span>
                </div>
                <div style={{ padding: "1.2rem 1.5rem", borderLeft: "3px solid #C8A44A" }}>
                  <style>{`
                    .order-analysis h3{font-size:0.88rem;font-weight:700;color:#0F1F3D;margin:1rem 0 0.3rem;padding-bottom:3px;border-bottom:1px solid #EDE8DE}
                    .order-analysis h4{font-size:0.82rem;font-weight:700;color:#0F1F3D;margin:0.8rem 0 0.25rem}
                    .order-analysis p{font-size:0.82rem;color:#2C2416;line-height:1.75;margin:0.25rem 0}
                    .order-analysis ul{margin:0.3rem 0 0.3rem 1.1rem;padding:0}
                    .order-analysis li{font-size:0.82rem;color:#2C2416;line-height:1.7;margin-bottom:0.2rem}
                    .order-analysis strong{color:#0F1F3D;font-weight:700}
                    .order-analysis table{width:100%;border-collapse:collapse;font-size:0.78rem;margin:0.5rem 0}
                    .order-analysis td,.order-analysis th{border:1px solid #EDE8DE;padding:5px 8px;color:#2C2416}
                    .order-analysis th{background:#F7F4EE;font-weight:700;color:#0F1F3D}
                    .order-analysis hr{border:none;border-top:1px solid #EDE8DE;margin:0.8rem 0}
                  `}</style>
                  <div className="order-analysis" dangerouslySetInnerHTML={{ __html: order.claudeAnalysis }} />
                </div>
              </div>
            )}

            {/* Tilauksen tiedot */}
            <div style={{ background: "#fff", border: "1px solid #EDE8DE", padding: "1.5rem 2rem", marginBottom: "1.5rem" }}>
              <p style={{ fontSize: "0.72rem", letterSpacing: "0.12em", color: "#8A8070", marginBottom: "1rem" }}>TILAUKSEN TIEDOT</p>
              {([
                ["Asiakirja", order.fileName],
                ["Tyyppi", order.docType],
                ["Paketti", order.plan],
                ["Toimitusaika", order.deliveryTime],
                ["Hinta", `${order.price} €`],
                ["Tilausnumero", id],
              ] as [string, string][]).map(([label, value]) => (
                <div key={label} style={{ display: "flex", justifyContent: "space-between", padding: "0.4rem 0", borderBottom: "1px solid #F5F2EC", fontSize: "0.83rem" }}>
                  <span style={{ color: "#8A8070" }}>{label}</span>
                  <span style={{ color: "#0F1F3D", fontWeight: label === "Tilausnumero" ? 400 : 500, fontFamily: label === "Tilausnumero" ? "monospace" : "inherit", fontSize: label === "Tilausnumero" ? "0.72rem" : "0.83rem" }}>{value}</span>
                </div>
              ))}
            </div>

            <p style={{ fontSize: "0.78rem", color: "#8A8070", textAlign: "center" }}>
              Kysyttävää? <a href="mailto:info@certuslex.fi" style={{ color: "#C8A44A" }}>info@certuslex.fi</a>
            </p>
          </>
        )}
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
