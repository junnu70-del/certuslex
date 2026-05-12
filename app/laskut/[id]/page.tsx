"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";

interface InvoiceData {
  invoiceNumber: string;
  invoiceDate: string;
  dueDate: string;
  company: Record<string, string>;
  client: { name: string; email: string };
  projectName: string;
  amountExVat: number;
  vatRate: number;
  vatAmount: number;
  totalAmount: number;
  status: string;
  invoiceHtml?: string;
}

function downloadAsWord(html: string, fileName: string) {
  const cleanedHtml = html
    .replace(/^```(?:html)?\s*/i, "").replace(/\s*```\s*$/, "")
    .replace(/<img[^>]*\/?>/gi, "")
    .replace(/<div[^>]*overflow\s*:\s*hidden[^>]*>\s*<\/div>/gi, "");
  const doc = `<!DOCTYPE html>
<html xmlns:o="urn:schemas-microsoft-com:office:office"
      xmlns:w="urn:schemas-microsoft-com:office:word"
      xmlns="http://www.w3.org/TR/REC-html40">
<head>
  <meta charset="UTF-8">
  <meta name=ProgId content=Word.Document>
  <meta name=Generator content="Microsoft Word 15">
  <!--[if gte mso 9]>
  <xml><w:WordDocument><w:View>Print</w:View><w:Zoom>100</w:Zoom><w:DoNotOptimizeForBrowser/></w:WordDocument></xml>
  <![endif]-->
  <style>
    @page WordSection1 { size:21cm 29.7cm; margin:2cm 2.5cm 2cm 2.5cm; mso-page-orientation:portrait; }
    body { font-family: Georgia, serif; }
    div.WordSection1 { page: WordSection1; }
    img { max-width: 16cm !important; max-height: 8cm !important; height: auto !important; width: auto !important; }
  </style>
</head>
<body><div class="WordSection1">${cleanedHtml}</div></body>
</html>`;
  const blob = new Blob(['﻿', doc], { type: "application/msword;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = fileName;
  document.body.appendChild(a); a.click();
  setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 1000);
}

export default function LaskuPage() {
  const { id } = useParams<{ id: string }>();
  const [invoice, setInvoice] = useState<InvoiceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!auth) { setError("Kirjautuminen vaaditaan"); setLoading(false); return; }
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (!u) { setError("Kirjaudu sisään nähdäksesi laskun"); setLoading(false); return; }
      try {
        const idToken = await u.getIdToken();
        const res = await fetch(`/api/invoice/${id}`, {
          headers: { Authorization: `Bearer ${idToken}` },
        });
        const d = await res.json();
        if (d.error) { setError(d.error); return; }
        setInvoice(d);
      } catch {
        setError("Laskua ei voitu ladata");
      } finally {
        setLoading(false);
      }
    });
    return () => unsub();
  }, [id]);

  if (loading) return (
    <div style={{ background: "#F7F4EE", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ width: "40px", height: "40px", border: "3px solid #EDE8DE", borderTopColor: "#C8A44A", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  if (error || !invoice) return (
    <div style={{ background: "#F7F4EE", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: "1rem" }}>
      <p style={{ color: "#0F1F3D", fontWeight: 600 }}>{error || "Laskua ei löydy"}</p>
      <button onClick={() => window.history.back()} style={{ background: "none", border: "1px solid #C8A44A", color: "#0F1F3D", padding: "0.5rem 1.2rem", cursor: "pointer" }}>← Takaisin</button>
    </div>
  );

  if (invoice.invoiceHtml) {
    const fname = `Lasku_${(invoice.client?.name || "asiakas").replace(/[^a-zA-Z0-9äöåÄÖÅ]/g,"_")}_${invoice.invoiceNumber || id.slice(0,8)}.doc`;
    return (
      <div style={{ display: "flex", flexDirection: "column", height: "100vh" }}>
        <div style={{ background: "#0F1F3D", borderBottom: "2px solid #C8A44A", padding: "0.5rem 1.2rem", display: "flex", gap: "0.6rem", alignItems: "center" }}>
          <button onClick={() => window.print()}
            style={{ background: "transparent", border: "1px solid rgba(200,164,74,.5)", color: "#C8A44A", padding: "0.4rem 1rem", fontSize: "0.78rem", fontWeight: 600, cursor: "pointer" }}>
            🖨️ Tulosta / PDF
          </button>
          <button onClick={() => downloadAsWord(invoice.invoiceHtml!, fname)}
            style={{ background: "transparent", border: "1px solid #C8A44A", color: "#C8A44A", padding: "0.4rem 1rem", fontSize: "0.78rem", fontWeight: 600, cursor: "pointer" }}>
            ⬇ Word (.doc)
          </button>
          <button onClick={() => window.history.back()}
            style={{ background: "none", border: "none", color: "rgba(255,255,255,0.5)", padding: "0.4rem 0.8rem", fontSize: "0.78rem", cursor: "pointer" }}>
            ← Takaisin
          </button>
        </div>
        <iframe
          srcDoc={invoice.invoiceHtml}
          style={{ flex: 1, width: "100%", border: "none", display: "block" }}
          title="Lasku"
        />
      </div>
    );
  }

  // Fallback: render from structured data
  const fmt = (n: number) => n.toLocaleString("fi-FI", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const { invoiceNumber, invoiceDate, dueDate, company, client, projectName, amountExVat, vatRate, vatAmount, totalAmount } = invoice;

  return (
    <div style={{ background: "#F7F4EE", minHeight: "100vh", padding: "2rem 1rem" }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}} @media print{.no-print{display:none!important} body{background:#fff}}`}</style>

      <div className="no-print" style={{ maxWidth: "780px", margin: "0 auto 1rem", display: "flex", gap: "0.6rem" }}>
        <button onClick={() => window.print()}
          style={{ background: "#0F1F3D", color: "#C8A44A", border: "none", padding: "0.6rem 1.4rem", fontSize: "0.85rem", fontWeight: 600, cursor: "pointer", letterSpacing: "0.05em" }}>
          🖨️ Tulosta / PDF
        </button>
        <button onClick={() => {
          const el = document.querySelector<HTMLElement>(".invoice-body");
          const html = el ? el.innerHTML : document.body.innerHTML;
          const fname = `Lasku_${(client.name || "asiakas").replace(/[^a-zA-Z0-9äöåÄÖÅ]/g,"_")}_${invoiceNumber}.doc`;
          downloadAsWord(html, fname);
        }}
          style={{ background: "transparent", border: "1px solid #C8A44A", color: "#C8A44A", padding: "0.6rem 1.2rem", fontSize: "0.85rem", fontWeight: 600, cursor: "pointer" }}>
          ⬇ Word (.doc)
        </button>
        <button onClick={() => window.history.back()}
          style={{ background: "none", border: "1px solid #EDE8DE", color: "#0F1F3D", padding: "0.6rem 1.2rem", fontSize: "0.85rem", cursor: "pointer" }}>
          ← Takaisin
        </button>
      </div>

      <div className="invoice-body" style={{ maxWidth: "780px", margin: "0 auto", background: "#fff", border: "1px solid #E0D9CE" }}>
        {/* Header */}
        <div style={{ background: "#0F1F3D", padding: "24px 36px", borderLeft: "4px solid #C8A44A", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontFamily: "var(--font-cormorant), Georgia, serif", fontSize: "26px", fontWeight: 700, color: "#fff" }}>
            Certus<span style={{ color: "#C8A44A" }}>Lex</span>
          </span>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: "11px", letterSpacing: "0.12em", color: "#C8A44A", fontWeight: 600 }}>LASKU</div>
            <div style={{ fontSize: "20px", fontWeight: 700, color: "#fff", fontFamily: "var(--font-cormorant), Georgia, serif" }}>{invoiceNumber}</div>
          </div>
        </div>

        <div style={{ padding: "36px" }}>
          {/* Dates */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "16px", marginBottom: "32px" }}>
            {[["LASKUPÄIVÄ", invoiceDate], ["ERÄPÄIVÄ", dueDate], ["TUNNISTE", id.slice(0, 8).toUpperCase()]].map(([lbl, val]) => (
              <div key={lbl} style={{ borderLeft: "3px solid #C8A44A", padding: "10px 14px", background: "#FAF7F2" }}>
                <div style={{ fontSize: "10px", letterSpacing: "0.1em", color: "#8A8070", marginBottom: "3px", fontWeight: 600 }}>{lbl}</div>
                <div style={{ fontSize: lbl === "TUNNISTE" ? "11px" : "14px", fontWeight: 600, color: "#0F1F3D", fontFamily: lbl === "TUNNISTE" ? "monospace" : "inherit" }}>{val}</div>
              </div>
            ))}
          </div>

          {/* Parties */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px", marginBottom: "32px" }}>
            {[
              { title: "LASKUTTAJA", lines: [company.name, company.businessId ? `Y-tunnus: ${company.businessId}` : null, company.address, [company.zip, company.city].filter(Boolean).join(" ") || null, company.phone, company.email].filter(Boolean) as string[] },
              { title: "LASKUTETTAVA", lines: [client.name, client.email].filter(Boolean) as string[] },
            ].map(({ title, lines }) => (
              <div key={title} style={{ background: "#FAF7F2", border: "1px solid #EDE8DE", padding: "18px 20px" }}>
                <div style={{ fontSize: "10px", letterSpacing: "0.12em", fontWeight: 700, color: "#C8A44A", marginBottom: "10px" }}>{title}</div>
                {lines.map((l, i) => <div key={i} style={{ fontSize: "13px", color: "#2C2416", lineHeight: "1.7", fontWeight: i === 0 ? 600 : 400 }}>{l}</div>)}
              </div>
            ))}
          </div>

          {/* Items table */}
          <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "24px" }}>
            <thead>
              <tr style={{ background: "#0F1F3D" }}>
                {["KUVAUS", "MÄÄRÄ", "ALV %", "YHTEENSÄ (ALV 0%)"].map((h, i) => (
                  <th key={h} style={{ color: "#C8A44A", fontSize: "10px", letterSpacing: "0.1em", fontWeight: 700, padding: "10px 14px", textAlign: i === 0 ? "left" : "right" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr style={{ borderBottom: "1px solid #EDE8DE" }}>
                <td style={{ padding: "12px 14px", fontSize: "13px" }}>{projectName}</td>
                <td style={{ padding: "12px 14px", fontSize: "13px", textAlign: "right" }}>1</td>
                <td style={{ padding: "12px 14px", fontSize: "13px", textAlign: "right" }}>{vatRate} %</td>
                <td style={{ padding: "12px 14px", fontSize: "13px", textAlign: "right" }}>{fmt(amountExVat)} €</td>
              </tr>
            </tbody>
          </table>

          {/* Totals */}
          <div style={{ marginLeft: "auto", width: "280px", border: "1px solid #EDE8DE" }}>
            {[
              { label: "Veroton hinta", value: `${fmt(amountExVat)} €`, bold: false },
              { label: `ALV ${vatRate} %`, value: `${fmt(vatAmount)} €`, bold: false },
              { label: "YHTEENSÄ", value: `${fmt(totalAmount)} €`, bold: true },
            ].map(({ label, value, bold }) => (
              <div key={label} style={{ display: "flex", justifyContent: "space-between", padding: bold ? "12px 16px" : "8px 16px", fontSize: bold ? "14px" : "13px", fontWeight: bold ? 700 : 400, background: bold ? "#0F1F3D" : "transparent", color: bold ? "#fff" : "#2C2416", borderBottom: bold ? "none" : "1px solid #EDE8DE" }}>
                <span>{label}</span>
                <span style={{ color: bold ? "#C8A44A" : "inherit" }}>{value}</span>
              </div>
            ))}
          </div>

          {/* Payment info */}
          <div style={{ marginTop: "32px", background: "#FAF7F2", border: "1px solid #EDE8DE", padding: "20px 24px" }}>
            <div style={{ fontSize: "10px", letterSpacing: "0.12em", fontWeight: 700, color: "#0F1F3D", marginBottom: "12px" }}>MAKSUTIEDOT</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
              {[
                { lbl: "TILINUMERO (IBAN)", val: company.iban || "—", mono: true },
                { lbl: "VIITENUMERO", val: invoiceNumber, mono: true },
                { lbl: "ERÄPÄIVÄ", val: dueDate, mono: false },
                { lbl: "MAKSETTAVA YHTEENSÄ", val: `${fmt(totalAmount)} €`, mono: false, bold: true },
              ].map(({ lbl, val, mono, bold }) => (
                <div key={lbl}>
                  <div style={{ fontSize: "10px", color: "#8A8070", letterSpacing: "0.08em", fontWeight: 600, display: "block", marginBottom: "2px" }}>{lbl}</div>
                  <span style={{ fontFamily: mono ? "monospace" : "inherit", fontSize: mono ? "13px" : "14px", color: "#0F1F3D", fontWeight: bold ? 700 : 600 }}>{val}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ background: "#0F1F3D", borderTop: "4px solid #C8A44A", padding: "14px 36px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: "11px", color: "rgba(255,255,255,0.5)" }}>© 2026 CertusLex — certuslex.fi</span>
          <span style={{ fontSize: "11px", color: "#C8A44A" }}>Kiitos yhteistyöstä!</span>
        </div>
      </div>
    </div>
  );
}
