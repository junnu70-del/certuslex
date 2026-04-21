"use client";

import { useState, useEffect } from "react";
import { collection, query, orderBy, onSnapshot, doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";

const ADMIN_PASSWORD = "certuslex2026";

interface Document {
  id: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  storageUrl: string;
  docType: string;
  plan: string;
  price: string;
  deliveryTime: string;
  status: "pending_review" | "in_review" | "completed";
  createdAt: { seconds: number } | null;
  review?: string;
  reviewedAt?: { seconds: number };
}

const statusLabel: Record<string, { text: string; color: string }> = {
  pending_review: { text: "Odottaa", color: "#C8862A" },
  in_review: { text: "Käsittelyssä", color: "#1A2F52" },
  completed: { text: "Valmis", color: "#2D6A4F" },
};

function formatDate(ts: { seconds: number } | null) {
  if (!ts) return "—";
  return new Date(ts.seconds * 1000).toLocaleDateString("fi-FI", {
    day: "numeric", month: "numeric", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function formatSize(bytes: number) {
  return (bytes / 1024).toFixed(0) + " KB";
}

export default function AdminPage() {
  const [authed, setAuthed] = useState(false);
  const [password, setPassword] = useState("");
  const [pwError, setPwError] = useState(false);
  const [docs, setDocs] = useState<Document[]>([]);
  const [selected, setSelected] = useState<Document | null>(null);
  const [review, setReview] = useState("");
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState<"all" | "pending_review" | "in_review" | "completed">("all");

  useEffect(() => {
    if (!authed) return;
    const q = query(collection(db, "documents"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      setDocs(snap.docs.map(d => ({ id: d.id, ...d.data() } as Document)));
    });
    return unsub;
  }, [authed]);

  function login() {
    if (password === ADMIN_PASSWORD) {
      setAuthed(true);
      setPwError(false);
    } else {
      setPwError(true);
    }
  }

  async function openDoc(d: Document) {
    setSelected(d);
    setReview(d.review ?? "");
    if (d.status === "pending_review") {
      await updateDoc(doc(db, "documents", d.id), { status: "in_review" });
    }
  }

  async function saveReview() {
    if (!selected) return;
    setSaving(true);
    await updateDoc(doc(db, "documents", selected.id), {
      review,
      status: "completed",
      reviewedAt: serverTimestamp(),
    });
    setSaving(false);
    setSelected(null);
  }

  const filtered = filter === "all" ? docs : docs.filter(d => d.status === filter);
  const pendingCount = docs.filter(d => d.status === "pending_review").length;

  if (!authed) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--navy)" }}>
        <div style={{ background: "#fff", padding: "2.5rem", width: "360px" }}>
          <div style={{ fontFamily: "var(--font-cormorant), Georgia, serif", fontSize: "1.8rem", fontWeight: 700, marginBottom: "0.3rem", color: "var(--navy)" }}>
            Certus<span style={{ color: "var(--gold)" }}>Lex</span>
          </div>
          <p style={{ fontSize: "0.8rem", color: "var(--muted)", marginBottom: "2rem", letterSpacing: "0.08em" }}>JURISTI-PORTAALI</p>
          <label style={{ fontSize: "0.78rem", fontWeight: 500, letterSpacing: "0.06em", display: "block", marginBottom: "0.5rem" }}>SALASANA</label>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            onKeyDown={e => e.key === "Enter" && login()}
            style={{ width: "100%", border: `1px solid ${pwError ? "var(--red)" : "var(--cream2)"}`, padding: "0.7rem", fontSize: "0.9rem", marginBottom: "0.5rem", outline: "none" }}
            placeholder="••••••••"
            autoFocus
          />
          {pwError && <p style={{ color: "var(--red)", fontSize: "0.78rem", marginBottom: "0.8rem" }}>Väärä salasana</p>}
          <button
            onClick={login}
            style={{ width: "100%", background: "var(--navy)", color: "#fff", border: "none", padding: "0.85rem", fontSize: "0.88rem", fontWeight: 500, cursor: "pointer", letterSpacing: "0.05em" }}
          >
            Kirjaudu →
          </button>
        </div>
      </div>
    );
  }

  if (selected) {
    const st = statusLabel[selected.status];
    return (
      <div style={{ minHeight: "100vh", background: "var(--cream)", fontFamily: "var(--font-dm-sans), Arial, sans-serif" }}>
        <nav style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "1rem 2rem", background: "var(--navy)", borderBottom: "1px solid rgba(200,164,74,.15)" }}>
          <div style={{ fontFamily: "var(--font-cormorant), Georgia, serif", fontSize: "1.5rem", fontWeight: 700, color: "#fff" }}>
            Certus<span style={{ color: "var(--gold)" }}>Lex</span>
            <span style={{ fontSize: "0.7rem", letterSpacing: "0.1em", color: "var(--muted)", marginLeft: "0.8rem" }}>ADMIN</span>
          </div>
          <button onClick={() => setSelected(null)} style={{ background: "transparent", border: "1px solid rgba(255,255,255,.2)", color: "var(--light)", padding: "0.4rem 1rem", cursor: "pointer", fontSize: "0.82rem" }}>
            ← Takaisin jonoon
          </button>
        </nav>

        <div style={{ maxWidth: "760px", margin: "0 auto", padding: "2.5rem 2rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "2rem", paddingBottom: "1.5rem", borderBottom: "1px solid var(--cream2)" }}>
            <div style={{ background: "var(--navy)", color: "var(--gold)", fontSize: "0.7rem", letterSpacing: "0.1em", padding: "0.4rem 0.8rem" }}>
              {selected.docType.toUpperCase()}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: "var(--font-cormorant), Georgia, serif", fontSize: "1.3rem", fontWeight: 700, color: "var(--navy)" }}>{selected.fileName}</div>
              <div style={{ fontSize: "0.78rem", color: "var(--muted)", marginTop: "0.2rem" }}>
                {selected.plan}-paketti · {formatSize(selected.fileSize)} · Saapunut {formatDate(selected.createdAt)}
              </div>
            </div>
            <div style={{ fontSize: "0.78rem", fontWeight: 500, color: st.color }}>⬤ {st.text}</div>
          </div>

          <div style={{ display: "flex", gap: "1rem", marginBottom: "2rem" }}>
            <a
              href={selected.storageUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{ background: "var(--gold)", color: "var(--navy)", fontSize: "0.85rem", fontWeight: 500, padding: "0.7rem 1.5rem", textDecoration: "none", display: "inline-block" }}
            >
              ⬇ Avaa asiakirja
            </a>
            <div style={{ fontSize: "0.78rem", color: "var(--muted)", alignSelf: "center" }}>
              Tilausnumero: <strong>{selected.id}</strong>
            </div>
          </div>

          <div style={{ marginBottom: "1rem" }}>
            <label style={{ fontSize: "0.78rem", fontWeight: 500, letterSpacing: "0.08em", display: "block", marginBottom: "0.6rem", color: "var(--navy)" }}>
              LAUSUNTO
            </label>
            <textarea
              value={review}
              onChange={e => setReview(e.target.value)}
              placeholder="Kirjoita juridinen lausunto tähän. Merkitse löydökset selkeästi: VIRHE, HUOMIO tai OK."
              style={{
                width: "100%", minHeight: "280px", border: "1px solid var(--cream2)", background: "#fff",
                padding: "1rem", fontSize: "0.88rem", lineHeight: 1.7, resize: "vertical", outline: "none",
                fontFamily: "var(--font-dm-sans), Arial, sans-serif", color: "var(--navy)"
              }}
            />
          </div>

          <div style={{ display: "flex", gap: "1rem" }}>
            <button
              onClick={saveReview}
              disabled={saving || !review.trim()}
              style={{
                background: saving || !review.trim() ? "var(--muted)" : "var(--navy)",
                color: "#fff", border: "none", padding: "0.9rem 2rem",
                fontSize: "0.9rem", fontWeight: 500, cursor: saving || !review.trim() ? "default" : "pointer",
                letterSpacing: "0.05em"
              }}
            >
              {saving ? "Tallennetaan..." : "Tallenna lausunto ✓"}
            </button>
            <button onClick={() => setSelected(null)} style={{ background: "transparent", border: "1px solid var(--cream2)", color: "var(--navy)", padding: "0.9rem 1.5rem", cursor: "pointer", fontSize: "0.85rem" }}>
              Peruuta
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "var(--cream)", fontFamily: "var(--font-dm-sans), Arial, sans-serif" }}>
      <nav style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "1rem 2rem", background: "var(--navy)", borderBottom: "1px solid rgba(200,164,74,.15)" }}>
        <div style={{ fontFamily: "var(--font-cormorant), Georgia, serif", fontSize: "1.5rem", fontWeight: 700, color: "#fff" }}>
          Certus<span style={{ color: "var(--gold)" }}>Lex</span>
          <span style={{ fontSize: "0.7rem", letterSpacing: "0.1em", color: "var(--muted)", marginLeft: "0.8rem" }}>ADMIN</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "1.5rem" }}>
          {pendingCount > 0 && (
            <div style={{ background: "var(--gold)", color: "var(--navy)", fontSize: "0.72rem", fontWeight: 600, padding: "0.25rem 0.7rem", borderRadius: "99px" }}>
              {pendingCount} odottaa
            </div>
          )}
          <button onClick={() => setAuthed(false)} style={{ background: "transparent", border: "none", color: "var(--muted)", fontSize: "0.82rem", cursor: "pointer" }}>
            Kirjaudu ulos
          </button>
        </div>
      </nav>

      <div style={{ maxWidth: "900px", margin: "0 auto", padding: "2rem" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.5rem" }}>
          <h2 style={{ fontFamily: "var(--font-cormorant), Georgia, serif", fontSize: "1.8rem", fontWeight: 700, color: "var(--navy)" }}>
            Dokumenttijono
          </h2>
          <div style={{ display: "flex", gap: "0.4rem" }}>
            {(["all", "pending_review", "in_review", "completed"] as const).map(f => (
              <button key={f} onClick={() => setFilter(f)} style={{
                padding: "0.35rem 0.9rem", fontSize: "0.75rem", letterSpacing: "0.05em",
                border: "1px solid var(--cream2)", cursor: "pointer",
                background: filter === f ? "var(--navy)" : "#fff",
                color: filter === f ? "#fff" : "var(--navy)"
              }}>
                {f === "all" ? "Kaikki" : f === "pending_review" ? "Odottaa" : f === "in_review" ? "Käsittelyssä" : "Valmis"}
              </button>
            ))}
          </div>
        </div>

        {filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: "4rem", color: "var(--muted)", fontSize: "0.9rem" }}>
            Ei asiakirjoja
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            {filtered.map(d => {
              const st = statusLabel[d.status];
              return (
                <div
                  key={d.id}
                  onClick={() => openDoc(d)}
                  style={{
                    background: "#fff", border: `1px solid ${d.status === "pending_review" ? "rgba(200,164,74,.4)" : "var(--cream2)"}`,
                    padding: "1rem 1.5rem", cursor: "pointer", display: "flex", alignItems: "center", gap: "1rem",
                    transition: "border-color .15s"
                  }}
                >
                  <div style={{ fontSize: "1.4rem" }}>📄</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 500, fontSize: "0.9rem", color: "var(--navy)" }}>{d.fileName}</div>
                    <div style={{ fontSize: "0.75rem", color: "var(--muted)", marginTop: "0.2rem" }}>
                      {d.docType} · {d.plan} ({d.price}€) · {formatDate(d.createdAt)}
                    </div>
                  </div>
                  <div style={{ fontSize: "0.75rem", fontWeight: 500, color: st.color, whiteSpace: "nowrap" }}>
                    ⬤ {st.text}
                  </div>
                  <div style={{ color: "var(--muted)", fontSize: "0.9rem" }}>→</div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
