"use client";

import { useEffect, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import Link from "next/link";
import { useParams } from "next/navigation";

interface OrderDoc {
  fileName: string;
  docType: string;
  plan: string;
  price: string;
  deliveryTime: string;
  userEmail: string;
  status: string;
  createdAt: { toDate: () => Date } | null;
  inReviewAt?: { toDate: () => Date } | null;
  reviewedAt?: { toDate: () => Date } | null;
  correctedUrl?: string;
  correctedFileName?: string;
}

function fmt(ts: { toDate: () => Date } | null | undefined) {
  if (!ts) return null;
  return ts.toDate().toLocaleString("fi-FI", { day: "numeric", month: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

const STATUS_STEPS = [
  { key: "pending_review",  label: "Vastaanotettu",   sub: "Asiakirja on turvallisesti tallennettuna" },
  { key: "in_review",       label: "Käsittelyssä",    sub: "OTM-juristi tarkastaa asiakirjaanne" },
  { key: "done",            label: "Lausunto valmis", sub: "Lausunto on lähetetty sähköpostiinne" },
];

function getStepIndex(status: string) {
  if (status === "done") return 2;
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
    const unsub = onSnapshot(doc(db, "documents", id), (snap) => {
      setLoading(false);
      if (!snap.exists()) { setNotFound(true); return; }
      setOrder(snap.data() as OrderDoc);
    });
    return () => unsub();
  }, [id]);

  const stepIdx = order ? getStepIndex(order.status) : 0;

  return (
    <div style={{ background: "#F7F4EE", minHeight: "100vh" }}>
      {/* Nav */}
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
                {/* Progress line */}
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
                        {/* Timestamp */}
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

            {/* Corrected doc download if done */}
            {order.status === "done" && order.correctedUrl && (
              <div style={{ background: "#0F1F3D", padding: "1.5rem 2rem", marginBottom: "1.5rem", borderLeft: "4px solid #C8A44A" }}>
                <p style={{ fontSize: "0.72rem", letterSpacing: "0.12em", color: "#C8A44A", marginBottom: "0.6rem" }}>LAUSUNTO TOIMITETTU</p>
                <p style={{ fontSize: "0.85rem", color: "#D8D0C0", marginBottom: "1rem" }}>Lausunto on lähetetty sähköpostiinne. Voit myös ladata korjatun asiakirjan alla.</p>
                <a href={order.correctedUrl} target="_blank" rel="noopener noreferrer"
                  style={{ display: "inline-block", background: "#C8A44A", color: "#0F1F3D", padding: "0.7rem 1.4rem", fontSize: "0.82rem", fontWeight: 600, textDecoration: "none", letterSpacing: "0.04em" }}>
                  ⬇ Lataa korjattu asiakirja
                </a>
              </div>
            )}

            {/* Order info */}
            <div style={{ background: "#fff", border: "1px solid #EDE8DE", padding: "1.5rem 2rem", marginBottom: "1.5rem" }}>
              <p style={{ fontSize: "0.72rem", letterSpacing: "0.12em", color: "#8A8070", marginBottom: "1rem" }}>TILAUKSEN TIEDOT</p>
              {[
                ["Asiakirja", order.fileName],
                ["Tyyppi", order.docType],
                ["Paketti", order.plan],
                ["Toimitusaika", order.deliveryTime],
                ["Hinta", `${order.price} €`],
                ["Tilausnumero", id],
              ].map(([label, value]) => (
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
