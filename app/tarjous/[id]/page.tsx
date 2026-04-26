"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";

interface QuoteData {
  quoteHtml: string;
  company: { name: string; contact: string; email: string; phone?: string };
  project: { projectName: string; clientName: string };
  clientName: string;
  status: "sent" | "commented" | "signed";
  signedName?: string;
  signedAt?: string;
  comments?: { name: string; message: string; createdAt: string }[];
}

type View = "quote" | "comment" | "sign" | "done-comment" | "done-sign";

export default function TarjousPage() {
  const { id } = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const [quote, setQuote] = useState<QuoteData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [view, setView] = useState<View>("quote");

  // Kommentointi
  const [commentName, setCommentName] = useState("");
  const [commentEmail, setCommentEmail] = useState("");
  const [commentMessage, setCommentMessage] = useState("");
  const [sending, setSending] = useState(false);

  // Allekirjoitus
  const [signerName, setSignerName] = useState("");
  const [signerEmail, setSignerEmail] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [signedAt, setSignedAt] = useState("");

  useEffect(() => {
    if (!id || !token) { setError("Virheellinen linkki"); setLoading(false); return; }
    fetch(`/api/quote/${id}?token=${token}`)
      .then(r => r.json())
      .then(d => {
        if (d.error) { setError(d.error); return; }
        // Korjaa tummat solut: lisää color:#C8A44A kaikkiin #0F1F3D-taustaväreihin
        if (d.quoteHtml) {
          d.quoteHtml = d.quoteHtml
            .replace(/style="([^"]*)background(-color)?:\s*#0[Ff]1[Ff]3[Dd]([^"]*)"/g,
              (_: string, b: string, _bc: string, a: string) => `style="${b}background-color:#0F1F3D;color:#C8A44A;${a}"`)
            .replace(/style="([^"]*)background(-color)?:\s*rgb\(15,\s*31,\s*61\)([^"]*)"/g,
              (_: string, b: string, _bc: string, a: string) => `style="${b}background-color:#0F1F3D;color:#C8A44A;${a}"`);
        }
        setQuote(d);
      })
      .catch(() => setError("Tarjousta ei voitu ladata"))
      .finally(() => setLoading(false));
  }, [id, token]);

  async function submitComment() {
    if (!commentMessage.trim()) return;
    setSending(true);
    try {
      const res = await fetch(`/api/quote/${id}/comment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, name: commentName, email: commentEmail, message: commentMessage }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error);
      setView("done-comment");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Virhe");
    } finally {
      setSending(false);
    }
  }

  async function submitSign() {
    if (!signerName.trim() || !agreed) return;
    setSending(true);
    try {
      const res = await fetch(`/api/quote/${id}/sign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, signerName, signerEmail }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error);
      setSignedAt(d.signedAt);
      setView("done-sign");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Virhe");
    } finally {
      setSending(false);
    }
  }

  if (loading) return (
    <div style={{ background: "#F7F4EE", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ width: "48px", height: "48px", border: "3px solid #EDE8DE", borderTopColor: "#C8A44A", borderRadius: "50%", animation: "spin 1s linear infinite", margin: "0 auto 1rem" }} />
        <p style={{ color: "#8A8070", fontSize: "0.9rem" }}>Ladataan tarjousta...</p>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    </div>
  );

  if (error || !quote) return (
    <div style={{ background: "#F7F4EE", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ textAlign: "center", padding: "2rem" }}>
        <p style={{ color: "#9b2335", fontSize: "1rem", marginBottom: "1rem" }}>{error || "Tarjousta ei löydy"}</p>
        <Link href="https://certuslex.fi" style={{ color: "#C8A44A", fontSize: "0.85rem" }}>certuslex.fi</Link>
      </div>
    </div>
  );

  const isSigned = quote.status === "signed";

  return (
    <div style={{ background: "#F7F4EE", minHeight: "100vh" }}>
      {/* Nav */}
      <nav style={{ background: "#0F1F3D", padding: "1rem 2rem", display: "flex", alignItems: "center", justifyContent: "space-between", borderLeft: "4px solid #C8A44A" }}>
        <span style={{ fontFamily: "Georgia, serif", fontSize: "1.4rem", fontWeight: 700, color: "#fff", letterSpacing: "-0.02em" }}>
          Certus<span style={{ color: "#C8A44A" }}>Lex</span>
          <span style={{ fontSize: "0.85rem", fontWeight: 400, color: "#C8A44A", marginLeft: "0.5rem" }}>/ Tarjous</span>
        </span>
        <span style={{ fontSize: "0.78rem", color: "#C8A44A" }}>{quote.company?.name}</span>
      </nav>

      <div style={{ maxWidth: "760px", margin: "0 auto", padding: "2.5rem 1.5rem 5rem" }}>

        {/* Allekirjoitettu -banner */}
        {isSigned && (
          <div style={{ background: "#f0fdf4", border: "1px solid #86efac", padding: "1rem 1.5rem", marginBottom: "1.5rem", display: "flex", alignItems: "center", gap: "0.8rem" }}>
            <span style={{ fontSize: "1.5rem" }}>✅</span>
            <div>
              <p style={{ fontWeight: 600, color: "#166534", margin: 0, fontSize: "0.9rem" }}>Tarjous on allekirjoitettu</p>
              <p style={{ color: "#4ade80", margin: 0, fontSize: "0.8rem" }}>Allekirjoittaja: {quote.signedName}</p>
            </div>
          </div>
        )}

        {/* Tarjouksen otsikko */}
        <div style={{ borderLeft: "4px solid #C8A44A", paddingLeft: "1.2rem", marginBottom: "2rem" }}>
          <div style={{ fontSize: "0.7rem", letterSpacing: "0.14em", color: "#C8A44A", marginBottom: "0.3rem" }}>TARJOUS</div>
          <h1 style={{ fontFamily: "Georgia, serif", fontSize: "1.8rem", fontWeight: 700, color: "#0F1F3D", margin: 0 }}>{quote.project?.projectName}</h1>
          <p style={{ fontSize: "0.85rem", color: "#8A8070", margin: "0.3rem 0 0" }}>Tarjoaja: {quote.company?.name} — Vastaanottaja: {quote.clientName || quote.project?.clientName}</p>
        </div>

        {/* Tarjoussivu */}
        {view === "quote" && (
          <>
            {/* Tarjousdokumentti — extra paddingBottom jotta sticky-palkki ei peitä */}
            <div style={{ background: "#fff", padding: "2.5rem", paddingBottom: "7rem", fontSize: "0.88rem", lineHeight: 1.8, color: "#2C2416", fontFamily: "Georgia, serif" }}
              dangerouslySetInnerHTML={{ __html: quote.quoteHtml }} />
          </>
        )}

        {/* Sticky toimintopalkki — vain quote-näkymässä */}
        {view === "quote" && !isSigned && (
          <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: "#0F1F3D", borderTop: "3px solid #C8A44A", padding: "1rem 1.5rem", display: "flex", gap: "1rem", zIndex: 100, justifyContent: "center" }}>
            <button onClick={() => setView("comment")}
              style={{ flex: 1, maxWidth: "300px", background: "transparent", border: "2px solid #C8A44A", color: "#C8A44A", padding: "0.85rem", fontSize: "0.9rem", fontWeight: 600, cursor: "pointer", letterSpacing: "0.03em" }}>
              💬 Kommentoi tarjousta
            </button>
            <button onClick={() => setView("sign")}
              style={{ flex: 1, maxWidth: "300px", background: "#C8A44A", border: "none", color: "#0F1F3D", padding: "0.85rem", fontSize: "0.9rem", fontWeight: 700, cursor: "pointer", letterSpacing: "0.03em" }}>
              ✍️ Hyväksy ja allekirjoita
            </button>
          </div>
        )}

        {/* Kommentointilomake */}
        {view === "comment" && (
          <div style={{ background: "#fff", border: "1px solid #EDE8DE", padding: "2.5rem" }}>
            <div style={{ borderLeft: "4px solid #C8A44A", paddingLeft: "1rem", marginBottom: "2rem" }}>
              <h2 style={{ fontFamily: "Georgia, serif", fontSize: "1.5rem", color: "#0F1F3D", margin: 0 }}>Kommentoi tarjousta</h2>
              <p style={{ fontSize: "0.85rem", color: "#8A8070", margin: "0.3rem 0 0" }}>Kirjoita kysymyksesi tai muutosehdotuksesi — tarjoaja saa ilmoituksen sähköpostiinsa.</p>
            </div>

            <div style={{ marginBottom: "1.2rem" }}>
              <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 600, letterSpacing: "0.08em", color: "#0F1F3D", marginBottom: "0.4rem" }}>NIMESI</label>
              <input value={commentName} onChange={e => setCommentName(e.target.value)} placeholder="Matti Meikäläinen"
                style={{ width: "100%", border: "1px solid #EDE8DE", padding: "0.7rem 0.9rem", fontSize: "0.9rem", outline: "none", boxSizing: "border-box" as const }} />
            </div>
            <div style={{ marginBottom: "1.2rem" }}>
              <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 600, letterSpacing: "0.08em", color: "#0F1F3D", marginBottom: "0.4rem" }}>SÄHKÖPOSTIOSOITE</label>
              <input value={commentEmail} onChange={e => setCommentEmail(e.target.value)} placeholder="matti@yritys.fi" type="email"
                style={{ width: "100%", border: "1px solid #EDE8DE", padding: "0.7rem 0.9rem", fontSize: "0.9rem", outline: "none", boxSizing: "border-box" as const }} />
            </div>
            <div style={{ marginBottom: "1.5rem" }}>
              <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 600, letterSpacing: "0.08em", color: "#0F1F3D", marginBottom: "0.4rem" }}>KOMMENTTI / KYSYMYS *</label>
              <textarea value={commentMessage} onChange={e => setCommentMessage(e.target.value)} rows={5}
                placeholder="Kirjoita kommenttisi tai kysymyksesi tähän..."
                style={{ width: "100%", border: "1px solid #EDE8DE", padding: "0.7rem 0.9rem", fontSize: "0.9rem", outline: "none", fontFamily: "inherit", resize: "vertical", boxSizing: "border-box" as const }} />
            </div>

            {error && <p style={{ color: "#9b2335", fontSize: "0.85rem", marginBottom: "1rem" }}>{error}</p>}

            <div style={{ display: "flex", gap: "1rem" }}>
              <button onClick={() => setView("quote")} style={{ background: "transparent", border: "1px solid #EDE8DE", color: "#8A8070", padding: "0.8rem 1.2rem", cursor: "pointer", fontSize: "0.85rem" }}>← Takaisin</button>
              <button onClick={submitComment} disabled={sending || !commentMessage.trim()}
                style={{ flex: 1, background: !commentMessage.trim() || sending ? "#EDE8DE" : "#0F1F3D", color: !commentMessage.trim() || sending ? "#8A8070" : "#C8A44A", border: "none", padding: "0.8rem", fontSize: "0.9rem", fontWeight: 600, cursor: !commentMessage.trim() || sending ? "not-allowed" : "pointer" }}>
                {sending ? "Lähetetään..." : "Lähetä kommentti →"}
              </button>
            </div>
          </div>
        )}

        {/* Allekirjoituslomake */}
        {view === "sign" && (
          <div style={{ background: "#fff", border: "1px solid #EDE8DE", padding: "2.5rem" }}>
            <div style={{ borderLeft: "4px solid #C8A44A", paddingLeft: "1rem", marginBottom: "2rem" }}>
              <h2 style={{ fontFamily: "Georgia, serif", fontSize: "1.5rem", color: "#0F1F3D", margin: 0 }}>Hyväksy tarjous sähköisesti</h2>
              <p style={{ fontSize: "0.85rem", color: "#8A8070", margin: "0.3rem 0 0" }}>Kirjoittamalla nimesi ja klikkaamalla hyväksy vahvistat sitoutuvasi tarjouksen ehtoihin.</p>
            </div>

            <div style={{ background: "#FAF7F2", border: "1px solid #EDE8DE", padding: "1rem 1.2rem", marginBottom: "1.5rem", fontSize: "0.82rem", color: "#4A4035" }}>
              ⚖️ <strong>Oikeudellinen huomio:</strong> Tämä sähköinen allekirjoitus on sitova EU:n eIDAS-asetuksen mukainen yksinkertainen sähköinen allekirjoitus. Allekirjoittaminen luo sitovan sopimuksen tarjoajan kanssa.
            </div>

            <div style={{ marginBottom: "1.2rem" }}>
              <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 600, letterSpacing: "0.08em", color: "#0F1F3D", marginBottom: "0.4rem" }}>KOKO NIMESI *</label>
              <input value={signerName} onChange={e => setSignerName(e.target.value)} placeholder="Matti Meikäläinen"
                style={{ width: "100%", border: "2px solid #C8A44A", padding: "0.8rem 1rem", fontSize: "1rem", outline: "none", boxSizing: "border-box" as const, fontFamily: "Georgia, serif" }} />
              <p style={{ fontSize: "0.75rem", color: "#8A8070", margin: "0.3rem 0 0" }}>Kirjoita nimesi täsmälleen niin kuin se virallisissa asiakirjoissa esiintyy</p>
            </div>
            <div style={{ marginBottom: "1.5rem" }}>
              <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 600, letterSpacing: "0.08em", color: "#0F1F3D", marginBottom: "0.4rem" }}>SÄHKÖPOSTIOSOITE</label>
              <input value={signerEmail} onChange={e => setSignerEmail(e.target.value)} placeholder="matti@yritys.fi" type="email"
                style={{ width: "100%", border: "1px solid #EDE8DE", padding: "0.7rem 0.9rem", fontSize: "0.9rem", outline: "none", boxSizing: "border-box" as const }} />
            </div>

            <label style={{ display: "flex", alignItems: "flex-start", gap: "0.8rem", cursor: "pointer", marginBottom: "1.5rem" }}>
              <input type="checkbox" checked={agreed} onChange={e => setAgreed(e.target.checked)} style={{ marginTop: "2px", width: "16px", height: "16px", flexShrink: 0 }} />
              <span style={{ fontSize: "0.85rem", color: "#4A4035", lineHeight: 1.5 }}>
                Olen lukenut tarjouksen ja hyväksyn sen ehdot. Ymmärrän, että tämä on sitova sähköinen allekirjoitus.
              </span>
            </label>

            {error && <p style={{ color: "#9b2335", fontSize: "0.85rem", marginBottom: "1rem" }}>{error}</p>}

            <div style={{ display: "flex", gap: "1rem" }}>
              <button onClick={() => setView("quote")} style={{ background: "transparent", border: "1px solid #EDE8DE", color: "#8A8070", padding: "0.8rem 1.2rem", cursor: "pointer", fontSize: "0.85rem" }}>← Takaisin</button>
              <button onClick={submitSign} disabled={sending || !signerName.trim() || !agreed}
                style={{ flex: 1, background: !signerName.trim() || !agreed || sending ? "#EDE8DE" : "#C8A44A", color: !signerName.trim() || !agreed || sending ? "#8A8070" : "#0F1F3D", border: "none", padding: "0.8rem", fontSize: "0.9rem", fontWeight: 700, cursor: !signerName.trim() || !agreed || sending ? "not-allowed" : "pointer" }}>
                {sending ? "Tallennetaan..." : "✍️ Allekirjoitan tarjouksen →"}
              </button>
            </div>
          </div>
        )}

        {/* Kommentti lähetetty */}
        {view === "done-comment" && (
          <div style={{ background: "#fff", border: "1px solid #EDE8DE", padding: "3rem", textAlign: "center" }}>
            <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>💬</div>
            <h2 style={{ fontFamily: "Georgia, serif", fontSize: "1.6rem", color: "#0F1F3D", marginBottom: "0.5rem" }}>Kommentti lähetetty!</h2>
            <p style={{ color: "#8A8070", fontSize: "0.9rem", marginBottom: "2rem" }}>
              {quote.company?.name} saa ilmoituksen sähköpostiinsa ja ottaa teihin yhteyttä.
            </p>
            <button onClick={() => setView("quote")} style={{ background: "#0F1F3D", color: "#C8A44A", border: "none", padding: "0.8rem 2rem", fontSize: "0.9rem", fontWeight: 600, cursor: "pointer" }}>
              Palaa tarjoukseen
            </button>
          </div>
        )}

        {/* Allekirjoitettu */}
        {view === "done-sign" && (
          <div style={{ background: "#fff", border: "1px solid #EDE8DE", padding: "3rem", textAlign: "center" }}>
            <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>✅</div>
            <h2 style={{ fontFamily: "Georgia, serif", fontSize: "1.6rem", color: "#0F1F3D", marginBottom: "0.5rem" }}>Tarjous hyväksytty!</h2>
            <p style={{ color: "#8A8070", fontSize: "0.9rem", marginBottom: "0.5rem" }}>
              Allekirjoittaja: <strong style={{ color: "#0F1F3D" }}>{signerName}</strong>
            </p>
            <p style={{ color: "#8A8070", fontSize: "0.85rem", marginBottom: "2rem" }}>
              {signedAt} — Vahvistus lähetetty molempien sähköposteihin.
            </p>
            <div style={{ background: "#FAF7F2", border: "1px solid #EDE8DE", padding: "1rem", fontSize: "0.8rem", color: "#4A4035" }}>
              Sopimustunniste: <code style={{ fontFamily: "monospace", fontSize: "0.75rem" }}>{id}</code>
            </div>
          </div>
        )}
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
