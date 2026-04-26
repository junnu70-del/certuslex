"use client";

export const dynamic = "force-dynamic";

import { useState, useEffect } from "react";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged, signOut, User } from "firebase/auth";
import { collection, query, where, orderBy, getDocs } from "firebase/firestore";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface Quote {
  id: string;
  project: { projectName?: string; clientName?: string };
  clientName?: string;
  clientEmail: string;
  status: "sent" | "commented" | "signed";
  createdAt: { seconds: number; nanoseconds: number } | Date;
  comments: { author?: string; text?: string; createdAt?: unknown }[];
  senderEmail: string;
}

const STATUS_LABEL: Record<string, { label: string; color: string; bg: string }> = {
  sent:      { label: "Lähetetty",    color: "#0F1F3D", bg: "#EDE8DE" },
  commented: { label: "Kommentoitu",  color: "#7A4F00", bg: "#FFF3CC" },
  signed:    { label: "Allekirjoitettu", color: "#166534", bg: "#DCFCE7" },
};

function formatDate(ts: Quote["createdAt"]): string {
  if (!ts) return "—";
  const d = ts instanceof Date ? ts : new Date((ts as { seconds: number }).seconds * 1000);
  return d.toLocaleDateString("fi-FI", { day: "numeric", month: "numeric", year: "numeric" });
}

export default function TarjouksetPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "sent" | "commented" | "signed">("all");

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (!u) { router.push("/kirjaudu"); return; }
      setUser(u);
      try {
        const q = query(
          collection(db, "quotes"),
          where("senderEmail", "==", u.email),
          orderBy("createdAt", "desc")
        );
        const snap = await getDocs(q);
        const data: Quote[] = snap.docs.map(d => ({ id: d.id, ...d.data() } as Quote));
        setQuotes(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    });
    return () => unsub();
  }, [router]);

  const filtered = filter === "all" ? quotes : quotes.filter(q => q.status === filter);

  const counts = {
    all: quotes.length,
    sent: quotes.filter(q => q.status === "sent").length,
    commented: quotes.filter(q => q.status === "commented").length,
    signed: quotes.filter(q => q.status === "signed").length,
  };

  if (loading) return (
    <div style={{ background: "#F7F4EE", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ width: "40px", height: "40px", border: "3px solid #EDE8DE", borderTopColor: "#C8A44A", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  return (
    <div style={{ background: "#F7F4EE", minHeight: "100vh" }}>
      {/* Nav */}
      <nav style={{ background: "#0F1F3D", padding: "1rem 2rem", borderLeft: "4px solid #C8A44A", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <Link href="/" style={{ fontFamily: "var(--font-cormorant), Georgia, serif", fontSize: "1.6rem", fontWeight: 700, color: "#fff", textDecoration: "none" }}>
          Certus<span style={{ color: "#C8A44A" }}>Lex</span>
          <span style={{ fontSize: "0.85rem", color: "#C8A44A", marginLeft: "0.5rem" }}>/ Tarjousarkisto</span>
        </Link>
        <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
          <Link href="/tarjouskone" style={{ color: "#C8A44A", fontSize: "0.82rem", textDecoration: "none" }}>
            + Uusi tarjous
          </Link>
          <Link href="/profiili" style={{ color: "#fff", fontSize: "0.82rem", textDecoration: "none", opacity: 0.7 }}>
            ⚙️ Profiili
          </Link>
          <button onClick={() => signOut(auth).then(() => router.push("/"))}
            style={{ background: "transparent", border: "1px solid #C8A44A", color: "#C8A44A", padding: "0.4rem 0.9rem", fontSize: "0.78rem", cursor: "pointer" }}>
            Kirjaudu ulos
          </button>
        </div>
      </nav>

      <div style={{ maxWidth: "900px", margin: "0 auto", padding: "3rem 1.5rem 6rem" }}>

        {/* Header */}
        <div style={{ borderLeft: "4px solid #C8A44A", paddingLeft: "1.2rem", marginBottom: "2rem" }}>
          <div style={{ fontSize: "0.7rem", letterSpacing: "0.14em", color: "#C8A44A", marginBottom: "0.3rem" }}>TARJOUSARKISTO</div>
          <h1 style={{ fontFamily: "var(--font-cormorant), Georgia, serif", fontSize: "2rem", fontWeight: 700, color: "#0F1F3D", margin: 0 }}>Lähetetyt tarjoukset</h1>
          <p style={{ fontSize: "0.85rem", color: "#8A8070", margin: "0.3rem 0 0" }}>
            {quotes.length === 0 ? "Ei vielä lähetettyjä tarjouksia." : `${quotes.length} tarjous${quotes.length !== 1 ? "ta" : ""} yhteensä`}
          </p>
        </div>

        {/* Stats */}
        {quotes.length > 0 && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "1rem", marginBottom: "2rem" }}>
            {(["all", "sent", "commented", "signed"] as const).map(s => {
              const labels = { all: "Kaikki", sent: "Lähetetty", commented: "Kommentoitu", signed: "Allekirjoitettu" };
              const colors = { all: "#C8A44A", sent: "#0F1F3D", commented: "#7A4F00", signed: "#166534" };
              const bgs = { all: "#FFF8E7", sent: "#EDE8DE", commented: "#FFF3CC", signed: "#DCFCE7" };
              return (
                <button key={s} onClick={() => setFilter(s)}
                  style={{ background: filter === s ? "#0F1F3D" : "#fff", border: `1px solid ${filter === s ? "#0F1F3D" : "#EDE8DE"}`, padding: "1rem", cursor: "pointer", textAlign: "left", transition: "all 0.2s" }}>
                  <div style={{ fontSize: "1.6rem", fontWeight: 700, color: filter === s ? "#C8A44A" : colors[s], fontFamily: "var(--font-cormorant), Georgia, serif" }}>{counts[s]}</div>
                  <div style={{ fontSize: "0.72rem", letterSpacing: "0.08em", color: filter === s ? "#C8A44A" : "#8A8070", marginTop: "0.2rem" }}>{labels[s].toUpperCase()}</div>
                </button>
              );
            })}
          </div>
        )}

        {/* Table */}
        {quotes.length === 0 ? (
          <div style={{ background: "#fff", border: "1px solid #EDE8DE", padding: "4rem 2rem", textAlign: "center" }}>
            <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>📋</div>
            <p style={{ fontSize: "1rem", color: "#0F1F3D", fontWeight: 600, margin: "0 0 0.5rem" }}>Ei vielä tarjouksia</p>
            <p style={{ fontSize: "0.85rem", color: "#8A8070", margin: "0 0 1.5rem" }}>Luo ensimmäinen tarjouksesi tarjouskoneella.</p>
            <Link href="/tarjouskone"
              style={{ background: "#0F1F3D", color: "#C8A44A", padding: "0.8rem 1.6rem", fontSize: "0.85rem", fontWeight: 700, textDecoration: "none", letterSpacing: "0.05em", display: "inline-block" }}>
              Avaa Tarjouskone →
            </Link>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ background: "#fff", border: "1px solid #EDE8DE", padding: "3rem", textAlign: "center", color: "#8A8070" }}>
            Ei tarjouksia tässä kategoriassa.
          </div>
        ) : (
          <div style={{ background: "#fff", border: "1px solid #EDE8DE" }}>
            {/* Table header */}
            <div style={{ display: "grid", gridTemplateColumns: "2fr 2fr 1.2fr 1.2fr 0.8fr", gap: "0", padding: "0.7rem 1.2rem", background: "#F7F4EE", borderBottom: "1px solid #EDE8DE" }}>
              {["PROJEKTI", "ASIAKAS", "LÄHETETTY", "TILA", ""].map((h, i) => (
                <div key={i} style={{ fontSize: "0.65rem", fontWeight: 700, letterSpacing: "0.1em", color: "#0F1F3D" }}>{h}</div>
              ))}
            </div>

            {/* Rows */}
            {filtered.map((q, i) => {
              const st = STATUS_LABEL[q.status] ?? STATUS_LABEL.sent;
              const clientName = q.clientName || q.project?.clientName || q.clientEmail;
              const projectName = q.project?.projectName || "—";
              return (
                <div key={q.id} style={{ display: "grid", gridTemplateColumns: "2fr 2fr 1.2fr 1.2fr 0.8fr", gap: "0", padding: "1rem 1.2rem", borderBottom: i < filtered.length - 1 ? "1px solid #EDE8DE" : "none", alignItems: "center" }}>
                  <div>
                    <div style={{ fontSize: "0.9rem", fontWeight: 600, color: "#0F1F3D" }}>{projectName}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: "0.85rem", color: "#0F1F3D" }}>{clientName}</div>
                    <div style={{ fontSize: "0.75rem", color: "#8A8070" }}>{q.clientEmail}</div>
                  </div>
                  <div style={{ fontSize: "0.82rem", color: "#8A8070" }}>{formatDate(q.createdAt)}</div>
                  <div>
                    <span style={{ background: st.bg, color: st.color, padding: "0.25rem 0.6rem", fontSize: "0.72rem", fontWeight: 700, letterSpacing: "0.06em" }}>
                      {st.label.toUpperCase()}
                    </span>
                    {q.comments?.length > 0 && (
                      <div style={{ fontSize: "0.7rem", color: "#8A8070", marginTop: "0.3rem" }}>
                        {q.comments.length} kommentti{q.comments.length !== 1 ? "a" : ""}
                      </div>
                    )}
                  </div>
                  <div>
                    <a href={`/tarjous/${q.id}`} target="_blank" rel="noopener noreferrer"
                      style={{ fontSize: "0.8rem", color: "#C8A44A", textDecoration: "none", fontWeight: 600, whiteSpace: "nowrap" }}>
                      Avaa →
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {user && (
          <p style={{ fontSize: "0.75rem", color: "#8A8070", textAlign: "center", marginTop: "2rem" }}>
            {user.email}
          </p>
        )}
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
