"use client";

export const dynamic = "force-dynamic";

import { useState, useEffect } from "react";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged, signOut, User } from "firebase/auth";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { t, type Lang } from "@/lib/translations";

interface Quote {
  id: string;
  token: string;
  project: { projectName?: string; clientName?: string };
  clientName?: string;
  clientEmail: string;
  status: "sent" | "commented" | "signed";
  createdAt: string | null;
  comments: { author?: string; text?: string; createdAt?: unknown }[];
  senderEmail: string;
}

function formatDate(ts: Quote["createdAt"]): string {
  if (!ts) return "—";
  return new Date(ts).toLocaleDateString("fi-FI", { day: "numeric", month: "numeric", year: "numeric" });
}

function defaultDueDate(days = 14): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

const VAT_RATES = [0, 10, 14, 24, 25.5];

const INP: React.CSSProperties = {
  width: "100%", border: "1px solid #EDE8DE", padding: "0.65rem 0.85rem",
  fontSize: "0.9rem", outline: "none", boxSizing: "border-box",
  fontFamily: "inherit", background: "#fff", color: "#2C2416",
};
const LBL: React.CSSProperties = {
  display: "block", fontSize: "0.68rem", fontWeight: 700,
  letterSpacing: "0.1em", color: "#0F1F3D", marginBottom: "0.35rem",
};

export default function TarjouksetPage() {
  const router = useRouter();
  const [lang, setLang] = useState<Lang>("fi");
  const [user, setUser] = useState<User | null>(null);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "sent" | "commented" | "signed">("all");

  // Invoice modal
  const [invoiceQuote, setInvoiceQuote] = useState<Quote | null>(null);
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [invoiceDescription, setInvoiceDescription] = useState("");
  const [amountExVat, setAmountExVat] = useState("");
  const [vatRate, setVatRate] = useState(25.5);
  const [dueDate, setDueDate] = useState(defaultDueDate(14));
  const [creating, setCreating] = useState(false);
  const [loadingQuote, setLoadingQuote] = useState(false);
  const [invoiceError, setInvoiceError] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Edit modal
  const [editingQuote, setEditingQuote] = useState<Quote | null>(null);
  const [editHtml, setEditHtml] = useState("");
  const [loadingEdit, setLoadingEdit] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [editError, setEditError] = useState("");

  const T = t[lang].tarjoukset;
  const TI = t[lang].invoice;

  useEffect(() => {
    const saved = localStorage.getItem("certuslex_lang") as Lang | null;
    if (saved === "en" || saved === "fi") setLang(saved);
  }, []);

  function toggleLang() {
    const next: Lang = lang === "fi" ? "en" : "fi";
    setLang(next);
    localStorage.setItem("certuslex_lang", next);
  }

  useEffect(() => {
    if (!auth) { router.push("/kirjaudu"); return; }
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (!u) { router.push("/kirjaudu"); return; }
      setUser(u);
      try {
        const token = await u.getIdToken();
        const res = await fetch("/api/quotes", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setQuotes(data.quotes ?? []);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    });
    return () => unsub();
  }, [router]);

  async function openEditModal(q: Quote) {
    setEditingQuote(q);
    setEditHtml("");
    setEditError("");
    setLoadingEdit(true);
    try {
      const token = await user!.getIdToken();
      const res = await fetch(`/api/quote-owner/${q.id}`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      setEditHtml(data.quoteHtml ?? "");
    } catch {
      setEditError("Tarjouksen lataus epäonnistui");
    } finally {
      setLoadingEdit(false);
    }
  }

  async function saveEditedQuote() {
    if (!editingQuote || !user) return;
    setSavingEdit(true);
    setEditError("");
    try {
      const token = await user.getIdToken();
      const res = await fetch(`/api/quote-owner/${editingQuote.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ quoteHtml: editHtml }),
      });
      if (!res.ok) throw new Error("Tallennus epäonnistui");
      setEditingQuote(null);
    } catch (e: unknown) {
      setEditError(e instanceof Error ? e.message : "Tallennus epäonnistui");
    } finally {
      setSavingEdit(false);
    }
  }

  async function openInvoiceModal(q: Quote) {
    setInvoiceQuote(q);
    setInvoiceNumber("");
    setInvoiceDescription(q.project?.projectName || "");
    setAmountExVat("");
    setVatRate(25.5);
    setDueDate(defaultDueDate(14));
    setInvoiceError("");

    // Hae tarjouksen HTML ja yritä parsia summa
    if (!user) return;
    setLoadingQuote(true);
    try {
      const token = await user.getIdToken();
      const res = await fetch(`/api/quote-owner/${q.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        // Käytä tallennettua arvoa jos saatavilla
        if (data.totalAmountExVat && data.totalAmountExVat > 0) {
          setAmountExVat(data.totalAmountExVat.toString());
        } else {
          // Fallback: parsitaan HTML:stä
          const html: string = data.quoteHtml ?? "";
          const stripped = html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
          const vatMatch = stripped.match(/alv\s+([\d,]+)\s*%/i);
          const vat = vatMatch ? parseFloat(vatMatch[1].replace(",", ".")) : 25.5;
          const parseEuro = (s: string) => parseFloat(s.replace(/\s/g, "").replace(",", "."));

          // Strategia 1: kaikki "yhteensä"-esiintymät + lähin luku, viimeisin = grand total
          const allTotals = [...stripped.matchAll(/yhteensä[^0-9]{0,40}(\d[\d\s]*[,.]\d{1,2})/gi)];
          if (allTotals.length > 0) {
            const incVat = parseEuro(allTotals[allTotals.length - 1][1]);
            const exVat = Math.round((incVat / (1 + vat / 100)) * 100) / 100;
            if (!isNaN(exVat) && exVat > 0) { setAmountExVat(exVat.toString()); return; }
          }

          // Strategia 2: suurin €-merkillinen luku dokumentissa
          const allEuros = [...stripped.matchAll(/(\d[\d\s]*[,.]\d{1,2})\s*€/g)]
            .map(m => parseEuro(m[1])).filter(n => !isNaN(n) && n > 99);
          if (allEuros.length > 0) {
            const maxIncVat = Math.max(...allEuros);
            const exVat = Math.round((maxIncVat / (1 + vat / 100)) * 100) / 100;
            if (!isNaN(exVat) && exVat > 0) setAmountExVat(exVat.toString());
          }
        }
      }
    } catch { /* käyttäjä voi syöttää summan manuaalisesti */ }
    finally { setLoadingQuote(false); }
  }

  async function handleCreateInvoice() {
    if (!invoiceQuote || !invoiceNumber.trim() || !amountExVat || !dueDate) {
      setInvoiceError(TI.errorFields);
      return;
    }
    if (!user) return;
    setCreating(true);
    setInvoiceError("");
    try {
      const idToken = await user.getIdToken();
      const dueDateFi = new Date(dueDate).toLocaleDateString("fi-FI", { day: "numeric", month: "numeric", year: "numeric" });
      const res = await fetch("/api/create-invoice", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` },
        body: JSON.stringify({
          quoteId: invoiceQuote.id,
          invoiceNumber: invoiceNumber.trim(),
          description: invoiceDescription.trim(),
          amountExVat: parseFloat(amountExVat),
          vatRate,
          dueDate: dueDateFi,
        }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error ?? "Virhe");
      setInvoiceQuote(null);
      router.push(`/laskut/${d.invoiceId}`);
    } catch (err) {
      setInvoiceError(err instanceof Error ? err.message : "Virhe");
    } finally {
      setCreating(false);
    }
  }

  async function handleDeleteQuote(id: string) {
    if (!user) return;
    if (!window.confirm(lang === "fi" ? "Poistetaanko tarjous pysyvästi?" : "Delete this quote permanently?")) return;
    setDeletingId(id);
    try {
      const token = await user.getIdToken();
      await fetch(`/api/quotes?id=${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
      setQuotes(prev => prev.filter(q => q.id !== id));
    } catch (err) {
      console.error(err);
    } finally {
      setDeletingId(null);
    }
  }

  const filtered = filter === "all" ? quotes : quotes.filter(q => q.status === filter);

  const counts = {
    all: quotes.length,
    sent: quotes.filter(q => q.status === "sent").length,
    commented: quotes.filter(q => q.status === "commented").length,
    signed: quotes.filter(q => q.status === "signed").length,
  };

  const STATUS_LABEL: Record<string, { label: string; color: string; bg: string }> = {
    sent:      { label: T.status.sent,      color: "#0F1F3D", bg: "#EDE8DE" },
    commented: { label: T.status.commented, color: "#7A4F00", bg: "#FFF3CC" },
    signed:    { label: T.status.signed,    color: "#166534", bg: "#DCFCE7" },
  };

  if (loading) return (
    <div style={{ background: "#F7F4EE", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ width: "40px", height: "40px", border: "3px solid #EDE8DE", borderTopColor: "#C8A44A", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  const vatAmount = amountExVat ? Math.round(parseFloat(amountExVat) * (vatRate / 100) * 100) / 100 : 0;
  const totalAmount = amountExVat ? Math.round((parseFloat(amountExVat) + vatAmount) * 100) / 100 : 0;
  const fmt = (n: number) => n.toLocaleString("fi-FI", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <div style={{ background: "#F7F4EE", minHeight: "100vh" }}>
      {/* Invoice modal */}
      {invoiceQuote && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(15,31,61,0.55)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}
          onClick={e => { if (e.target === e.currentTarget) setInvoiceQuote(null); }}>
          <div style={{ background: "#fff", border: "1px solid #EDE8DE", width: "100%", maxWidth: "480px", boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}>
            {/* Modal header */}
            <div style={{ background: "#0F1F3D", padding: "18px 24px", borderLeft: "4px solid #C8A44A", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontSize: "0.68rem", letterSpacing: "0.12em", color: "#C8A44A", marginBottom: "2px" }}>TARJOUSKONE</div>
                <div style={{ color: "#fff", fontWeight: 600, fontSize: "1rem" }}>{TI.modalTitle}</div>
              </div>
              <button onClick={() => setInvoiceQuote(null)} style={{ background: "none", border: "none", color: "#C8A44A", fontSize: "1.4rem", cursor: "pointer", lineHeight: 1 }}>×</button>
            </div>

            <div style={{ padding: "24px" }}>
              {/* Project info */}
              <div style={{ background: "#FAF7F2", border: "1px solid #EDE8DE", padding: "12px 16px", marginBottom: "20px" }}>
                <div style={{ fontSize: "0.68rem", letterSpacing: "0.1em", color: "#8A8070", marginBottom: "4px" }}>PROJEKTI</div>
                <div style={{ fontSize: "0.95rem", fontWeight: 600, color: "#0F1F3D" }}>{invoiceQuote.project?.projectName || "—"}</div>
                <div style={{ fontSize: "0.8rem", color: "#8A8070" }}>{invoiceQuote.clientName || invoiceQuote.project?.clientName || invoiceQuote.clientEmail}</div>
              </div>

              {loadingQuote && (
                <div style={{ fontSize: "0.78rem", color: "#8A8070", marginBottom: "12px" }}>
                  ⏳ {lang === "fi" ? "Haetaan tarjouksen tiedot..." : "Loading quote details..."}
                </div>
              )}

              <div style={{ display: "grid", gap: "14px" }}>
                <div>
                  <label style={LBL}>{TI.invoiceNumber}</label>
                  <input style={INP} value={invoiceNumber} onChange={e => setInvoiceNumber(e.target.value)}
                    placeholder={TI.invoiceNumberPlaceholder} autoFocus />
                </div>

                <div>
                  <label style={LBL}>{lang === "fi" ? "LASKUN KUVAUS" : "INVOICE DESCRIPTION"}</label>
                  <input style={INP} value={invoiceDescription} onChange={e => setInvoiceDescription(e.target.value)}
                    placeholder={lang === "fi" ? "Projektin nimi tai palvelun kuvaus" : "Project or service description"} />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                  <div>
                    <label style={LBL}>{TI.amountExVat} (€)</label>
                    <input style={INP} type="number" min="0" step="0.01" value={amountExVat}
                      onChange={e => setAmountExVat(e.target.value)} placeholder="0,00" />
                  </div>
                  <div>
                    <label style={LBL}>{TI.vatRate}</label>
                    <select style={{ ...INP, cursor: "pointer" }} value={vatRate} onChange={e => setVatRate(parseFloat(e.target.value))}>
                      {VAT_RATES.map(r => <option key={r} value={r}>{r} %</option>)}
                    </select>
                  </div>
                </div>

                <div>
                  <label style={LBL}>{TI.dueDate}</label>
                  <input style={INP} type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} />
                </div>
              </div>

              {/* Summary */}
              {amountExVat && parseFloat(amountExVat) > 0 && (
                <div style={{ marginTop: "16px", background: "#FAF7F2", border: "1px solid #EDE8DE", padding: "12px 16px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem", color: "#8A8070", marginBottom: "4px" }}>
                    <span>ALV 0%</span><span>{fmt(parseFloat(amountExVat))} €</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem", color: "#8A8070", marginBottom: "6px" }}>
                    <span>ALV {vatRate} %</span><span>{fmt(vatAmount)} €</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.95rem", fontWeight: 700, color: "#0F1F3D", borderTop: "1px solid #EDE8DE", paddingTop: "6px" }}>
                    <span>Yhteensä</span><span>{fmt(totalAmount)} €</span>
                  </div>
                </div>
              )}

              {invoiceError && (
                <div style={{ marginTop: "12px", background: "#FEF2F2", border: "1px solid #FECACA", padding: "10px 14px", fontSize: "0.82rem", color: "#991B1B" }}>
                  {invoiceError}
                </div>
              )}

              <div style={{ display: "flex", gap: "10px", marginTop: "20px" }}>
                <button onClick={handleCreateInvoice} disabled={creating}
                  style={{ flex: 1, background: creating ? "#8A8070" : "#0F1F3D", color: "#C8A44A", border: "none", padding: "0.8rem", fontSize: "0.85rem", fontWeight: 700, cursor: creating ? "not-allowed" : "pointer", letterSpacing: "0.04em" }}>
                  {creating ? TI.creating : TI.create}
                </button>
                <button onClick={() => setInvoiceQuote(null)}
                  style={{ background: "none", border: "1px solid #EDE8DE", color: "#8A8070", padding: "0.8rem 1.2rem", fontSize: "0.85rem", cursor: "pointer" }}>
                  {TI.cancel}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Nav */}
      <nav style={{ background: "#0F1F3D", padding: "1rem 2rem", borderLeft: "4px solid #C8A44A", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <Link href="/" style={{ fontFamily: "var(--font-cormorant), Georgia, serif", fontSize: "1.6rem", fontWeight: 700, color: "#fff", textDecoration: "none" }}>
          Certus<span style={{ color: "#C8A44A" }}>Lex</span>
          <span style={{ fontSize: "0.85rem", color: "#C8A44A", marginLeft: "0.5rem" }}>/ {T.archive}</span>
        </Link>
        <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
          <Link href="/tarjouskone" style={{ color: "#C8A44A", fontSize: "0.82rem", textDecoration: "none" }}>
            {T.newQuote}
          </Link>
          <Link href="/profiili" style={{ color: "#fff", fontSize: "0.82rem", textDecoration: "none", opacity: 0.7 }}>
            {t[lang].nav.profile}
          </Link>
          <button onClick={() => signOut(auth).then(() => router.push("/"))}
            style={{ background: "transparent", border: "1px solid #C8A44A", color: "#C8A44A", padding: "0.4rem 0.9rem", fontSize: "0.78rem", cursor: "pointer" }}>
            {t[lang].nav.logout}
          </button>
          <button onClick={toggleLang}
            style={{ background: "none", border: "1px solid rgba(200,164,74,.4)", color: "#C8A44A", fontSize: "0.75rem", cursor: "pointer", padding: "0.25rem 0.6rem", borderRadius: "3px" }}>
            {lang === "fi" ? "🇬🇧 EN" : "🇫🇮 FI"}
          </button>
        </div>
      </nav>

      <div style={{ maxWidth: "960px", margin: "0 auto", padding: "3rem 1.5rem 6rem" }}>

        {/* Header */}
        <div style={{ borderLeft: "4px solid #C8A44A", paddingLeft: "1.2rem", marginBottom: "2rem" }}>
          <div style={{ fontSize: "0.7rem", letterSpacing: "0.14em", color: "#C8A44A", marginBottom: "0.3rem" }}>{T.archive}</div>
          <h1 style={{ fontFamily: "var(--font-cormorant), Georgia, serif", fontSize: "2rem", fontWeight: 700, color: "#0F1F3D", margin: 0 }}>{T.title}</h1>
          <p style={{ fontSize: "0.85rem", color: "#8A8070", margin: "0.3rem 0 0" }}>
            {quotes.length === 0
              ? (lang === "en" ? "No sent quotes yet." : "Ei vielä lähetettyjä tarjouksia.")
              : lang === "en"
                ? `${quotes.length} quote${quotes.length !== 1 ? "s" : ""} total`
                : `${quotes.length} tarjous${quotes.length !== 1 ? "ta" : ""} yhteensä`}
          </p>
        </div>

        {/* Stats */}
        {quotes.length > 0 && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "1rem", marginBottom: "2rem" }}>
            {(["all", "sent", "commented", "signed"] as const).map(s => {
              const label = T.status[s];
              const colors = { all: "#C8A44A", sent: "#0F1F3D", commented: "#7A4F00", signed: "#166534" };
              return (
                <button key={s} onClick={() => setFilter(s)}
                  style={{ background: filter === s ? "#0F1F3D" : "#fff", border: `1px solid ${filter === s ? "#0F1F3D" : "#EDE8DE"}`, padding: "1rem", cursor: "pointer", textAlign: "left", transition: "all 0.2s" }}>
                  <div style={{ fontSize: "1.6rem", fontWeight: 700, color: filter === s ? "#C8A44A" : colors[s], fontFamily: "var(--font-cormorant), Georgia, serif" }}>{counts[s]}</div>
                  <div style={{ fontSize: "0.72rem", letterSpacing: "0.08em", color: filter === s ? "#C8A44A" : "#8A8070", marginTop: "0.2rem" }}>{label.toUpperCase()}</div>
                </button>
              );
            })}
          </div>
        )}

        {/* Table */}
        {quotes.length === 0 ? (
          <div style={{ background: "#fff", border: "1px solid #EDE8DE", padding: "4rem 2rem", textAlign: "center" }}>
            <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>📋</div>
            <p style={{ fontSize: "1rem", color: "#0F1F3D", fontWeight: 600, margin: "0 0 0.5rem" }}>{T.empty}</p>
            <p style={{ fontSize: "0.85rem", color: "#8A8070", margin: "0 0 1.5rem" }}>{T.emptyDesc}</p>
            <Link href="/tarjouskone"
              style={{ background: "#0F1F3D", color: "#C8A44A", padding: "0.8rem 1.6rem", fontSize: "0.85rem", fontWeight: 700, textDecoration: "none", letterSpacing: "0.05em", display: "inline-block" }}>
              {T.openBtn}
            </Link>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ background: "#fff", border: "1px solid #EDE8DE", padding: "3rem", textAlign: "center", color: "#8A8070" }}>
            {lang === "en" ? "No quotes in this category." : "Ei tarjouksia tässä kategoriassa."}
          </div>
        ) : (
          <div style={{ background: "#fff", border: "1px solid #EDE8DE" }}>
            {/* Table header */}
            <div style={{ display: "grid", gridTemplateColumns: "2fr 2fr 1.2fr 1.4fr 1.2fr", gap: "0", padding: "0.7rem 1.2rem", background: "#F7F4EE", borderBottom: "1px solid #EDE8DE" }}>
              {[T.cols.project, T.cols.client, T.cols.sent, T.cols.status, ""].map((h, i) => (
                <div key={i} style={{ fontSize: "0.65rem", fontWeight: 700, letterSpacing: "0.1em", color: "#0F1F3D" }}>{h}</div>
              ))}
            </div>

            {/* Rows */}
            {filtered.map((q, i) => {
              const st = STATUS_LABEL[q.status] ?? STATUS_LABEL.sent;
              const clientName = q.clientName || q.project?.clientName || q.clientEmail;
              const projectName = q.project?.projectName || "—";
              return (
                <div key={q.id} style={{ display: "grid", gridTemplateColumns: "2fr 2fr 1.2fr 1.4fr 1.2fr", gap: "0", padding: "1rem 1.2rem", borderBottom: i < filtered.length - 1 ? "1px solid #EDE8DE" : "none", alignItems: "center" }}>
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
                        {q.comments.length} {lang === "en" ? `comment${q.comments.length !== 1 ? "s" : ""}` : `kommentti${q.comments.length !== 1 ? "a" : ""}`}
                      </div>
                    )}
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                    <a href={`/tarjous/${q.id}?owner=1`} target="_blank" rel="noopener noreferrer"
                      style={{ fontSize: "0.8rem", color: "#C8A44A", textDecoration: "none", fontWeight: 600, whiteSpace: "nowrap" }}>
                      {T.open}
                    </a>
                    {q.status === "signed" && (
                      <button onClick={() => openInvoiceModal(q)}
                        style={{ background: "none", border: "1px solid #C8A44A", color: "#0F1F3D", fontSize: "0.72rem", fontWeight: 600, padding: "0.2rem 0.5rem", cursor: "pointer", textAlign: "left", whiteSpace: "nowrap", letterSpacing: "0.03em" }}>
                        📄 {T.createInvoice}
                      </button>
                    )}
                    <button onClick={() => openEditModal(q)}
                      style={{ background: "none", border: "1px solid #EDE8DE", color: "#0F1F3D", fontSize: "0.72rem", fontWeight: 600, padding: "0.2rem 0.5rem", cursor: "pointer", textAlign: "left", whiteSpace: "nowrap" }}>
                      ✏️ {lang === "fi" ? "Muokkaa" : "Edit"}
                    </button>
                    <button onClick={() => handleDeleteQuote(q.id)} disabled={deletingId === q.id}
                      style={{ background: "none", border: "none", color: deletingId === q.id ? "#ccc" : "#9b2335", fontSize: "0.72rem", cursor: deletingId === q.id ? "not-allowed" : "pointer", padding: "0", textAlign: "left", whiteSpace: "nowrap" }}>
                      {deletingId === q.id ? "..." : (lang === "fi" ? "🗑 Poista" : "🗑 Delete")}
                    </button>
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

      {/* ── MUOKKAA-MODAALI ── */}
      {editingQuote && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(15,31,61,0.7)", zIndex: 1000, display: "flex", flexDirection: "column" }}>
          {/* Otsikkopalkki */}
          <div style={{ background: "#0F1F3D", borderBottom: "4px solid #C8A44A", padding: "1rem 2rem", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
            <div>
              <div style={{ fontSize: "0.7rem", letterSpacing: "0.12em", color: "#C8A44A", fontWeight: 700 }}>MUOKKAA TARJOUSTA</div>
              <div style={{ color: "#fff", fontFamily: "Georgia, serif", fontSize: "1rem", marginTop: "0.2rem" }}>
                {editingQuote.project?.projectName} → {editingQuote.project?.clientName || editingQuote.clientName}
              </div>
            </div>
            <div style={{ display: "flex", gap: "0.8rem", alignItems: "center" }}>
              {editError && <span style={{ color: "#f5c6cb", fontSize: "0.8rem" }}>{editError}</span>}
              <button onClick={saveEditedQuote} disabled={savingEdit || loadingEdit}
                style={{ background: savingEdit ? "#8A8070" : "#C8A44A", color: "#0F1F3D", border: "none", padding: "0.6rem 1.4rem", fontSize: "0.85rem", fontWeight: 700, cursor: savingEdit ? "not-allowed" : "pointer" }}>
                {savingEdit ? "Tallennetaan..." : "💾 Tallenna"}
              </button>
              <button onClick={() => setEditingQuote(null)}
                style={{ background: "none", border: "1px solid rgba(255,255,255,0.3)", color: "#fff", padding: "0.6rem 1rem", fontSize: "0.85rem", cursor: "pointer" }}>
                ✕ Sulje
              </button>
            </div>
          </div>

          {/* Muokattava sisältö */}
          <div style={{ flex: 1, overflow: "auto", background: "#F7F4EE", padding: "2rem" }}>
            {loadingEdit ? (
              <div style={{ textAlign: "center", padding: "4rem", color: "#8A8070" }}>Ladataan...</div>
            ) : (
              <div
                contentEditable
                suppressContentEditableWarning
                onInput={e => setEditHtml((e.target as HTMLDivElement).innerHTML)}
                style={{ background: "#fff", padding: "2.5rem", maxWidth: "820px", margin: "0 auto", boxShadow: "0 8px 48px rgba(15,31,61,0.13)", borderTop: "4px solid #C8A44A", outline: "none", minHeight: "60vh", fontFamily: "Georgia, serif", fontSize: "0.88rem", lineHeight: 1.8, color: "#2C2416" }}
                dangerouslySetInnerHTML={{ __html: editHtml }}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
