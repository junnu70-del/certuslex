"use client";

import { useState, useRef } from "react";

const GOLD = "#C8A44A";
const NAVY = "#0F1F3D";
const CREAM = "#F7F4EE";
const BORDER = "#EDE8DE";

export default function SopimustarkistusPage() {
  const [step, setStep] = useState<"form" | "uploading" | "done" | "error">("form");
  const [file, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [notes, setNotes] = useState("");
  const [contractId, setContractId] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleFile(f: File) {
    const allowed = [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "text/plain",
    ];
    if (!allowed.includes(f.type) && !f.name.match(/\.(pdf|doc|docx|txt)$/i)) {
      setErrorMsg("Sallitut tiedostomuodot: PDF, Word (.doc/.docx), tekstitiedosto (.txt)");
      return;
    }
    if (f.size > 10 * 1024 * 1024) {
      setErrorMsg("Tiedosto on liian suuri. Maksimikoko on 10 Mt.");
      return;
    }
    setErrorMsg("");
    setFile(f);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) { setErrorMsg("Valitse tiedosto"); return; }
    if (!customerEmail) { setErrorMsg("Sähköpostiosoite vaaditaan"); return; }

    setStep("uploading");
    setErrorMsg("");

    try {
      // Read file as base64
      const base64Content = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          // Strip data URL prefix
          const b64 = result.includes(",") ? result.split(",")[1] : result;
          resolve(b64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const res = await fetch("/api/contract/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileName: file.name,
          mimeType: file.type,
          base64Content,
          customerEmail,
          customerName,
          notes,
        }),
      });

      const data = await res.json();
      if (data.error) {
        setErrorMsg(data.error);
        setStep("error");
        return;
      }

      setContractId(data.contractId);
      setStep("done");
    } catch {
      setErrorMsg("Lähetys epäonnistui. Yritä uudelleen.");
      setStep("error");
    }
  }

  if (step === "done") {
    return (
      <div style={{ background: CREAM, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "2rem 1rem" }}>
        <div style={{ maxWidth: "520px", width: "100%", background: "#fff", border: `1px solid ${BORDER}` }}>
          <div style={{ background: NAVY, padding: "20px 28px", borderLeft: `4px solid ${GOLD}` }}>
            <span style={{ fontFamily: "Georgia, serif", fontSize: "22px", fontWeight: 700, color: "#fff" }}>
              Certus<span style={{ color: GOLD }}>Lex</span>
            </span>
          </div>
          <div style={{ padding: "40px 36px", textAlign: "center" }}>
            <div style={{ width: "64px", height: "64px", background: "#f0faf0", border: "2px solid #2a7a2a", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px", fontSize: "28px" }}>
              ✓
            </div>
            <h2 style={{ color: NAVY, fontFamily: "Georgia, serif", fontSize: "22px", marginBottom: "12px" }}>
              Sopimus vastaanotettu
            </h2>
            <p style={{ color: "#2C2416", fontSize: "14px", lineHeight: "1.7", marginBottom: "8px" }}>
              Asiakirjasi on lähetetty tarkistettavaksi. Juristi käy sen läpi ja saat vahvistuksen osoitteeseen
            </p>
            <p style={{ color: NAVY, fontWeight: 700, fontSize: "15px", marginBottom: "24px" }}>{customerEmail}</p>
            <div style={{ background: "#FAF7F2", border: `1px solid ${BORDER}`, padding: "14px 18px", marginBottom: "24px", textAlign: "left" }}>
              <div style={{ fontSize: "11px", color: "#8A8070", letterSpacing: "0.1em", fontWeight: 600, marginBottom: "4px" }}>TUNNISTE</div>
              <div style={{ fontFamily: "monospace", fontSize: "12px", color: NAVY, fontWeight: 600 }}>{contractId.slice(0, 16).toUpperCase()}</div>
            </div>
            <p style={{ fontSize: "13px", color: "#8A8070", lineHeight: "1.6" }}>
              Käsittelyaika on yleensä 24 tunnin sisällä arkisin. Jos sinulla on kysyttävää, ota yhteyttä osoitteeseen{" "}
              <a href="mailto:info@certuslex.fi" style={{ color: GOLD }}>info@certuslex.fi</a>
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ background: CREAM, minHeight: "100vh", padding: "2rem 1rem" }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg) } }
        input, textarea { outline: none; }
        input:focus, textarea:focus { border-color: ${GOLD} !important; }
      `}</style>

      {/* Header */}
      <div style={{ maxWidth: "600px", margin: "0 auto 32px" }}>
        <div style={{ background: NAVY, padding: "20px 28px", borderLeft: `4px solid ${GOLD}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontFamily: "Georgia, serif", fontSize: "22px", fontWeight: 700, color: "#fff" }}>
            Certus<span style={{ color: GOLD }}>Lex</span>
          </span>
          <span style={{ fontSize: "11px", letterSpacing: "0.12em", color: GOLD, fontWeight: 600 }}>SOPIMUSTARKISTUS</span>
        </div>
      </div>

      <div style={{ maxWidth: "600px", margin: "0 auto" }}>
        {/* Hero text */}
        <div style={{ marginBottom: "28px" }}>
          <h1 style={{ fontFamily: "Georgia, serif", fontSize: "26px", color: NAVY, marginBottom: "10px", fontWeight: 700 }}>
            Lähetä sopimus tarkistettavaksi
          </h1>
          <p style={{ color: "#2C2416", fontSize: "15px", lineHeight: "1.7" }}>
            Juristi tarkistaa asiakirjasi ja antaa palautteen 24 tunnin sisällä. Claude-tekoäly tekee esianalyysin, joka nopeuttaa juristin työtä.
          </p>
        </div>

        {/* Steps */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px", marginBottom: "32px" }}>
          {[
            { n: "1", label: "Lataa asiakirja" },
            { n: "2", label: "Juristi tarkistaa" },
            { n: "3", label: "Saat vastauksen" },
          ].map(({ n, label }) => (
            <div key={n} style={{ background: "#fff", border: `1px solid ${BORDER}`, padding: "14px 16px", display: "flex", alignItems: "center", gap: "10px" }}>
              <div style={{ width: "28px", height: "28px", background: NAVY, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <span style={{ color: GOLD, fontWeight: 700, fontSize: "13px" }}>{n}</span>
              </div>
              <span style={{ fontSize: "13px", color: "#2C2416", fontWeight: 500 }}>{label}</span>
            </div>
          ))}
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit}>
          {/* Drop zone */}
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
            onClick={() => fileInputRef.current?.click()}
            style={{
              border: `2px dashed ${dragOver ? GOLD : file ? GOLD : BORDER}`,
              background: dragOver ? "#FDF8EE" : file ? "#FFFBF2" : "#fff",
              borderRadius: "2px",
              padding: "40px 24px",
              textAlign: "center",
              cursor: "pointer",
              marginBottom: "20px",
              transition: "all 0.15s",
            }}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.doc,.docx,.txt"
              style={{ display: "none" }}
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
            />
            {file ? (
              <>
                <div style={{ fontSize: "32px", marginBottom: "8px" }}>📄</div>
                <div style={{ color: NAVY, fontWeight: 700, fontSize: "15px", marginBottom: "4px" }}>{file.name}</div>
                <div style={{ color: "#8A8070", fontSize: "12px" }}>{(file.size / 1024).toFixed(0)} kt — Klikkaa vaihtaaksesi</div>
              </>
            ) : (
              <>
                <div style={{ fontSize: "36px", marginBottom: "10px", color: "#8A8070" }}>⬆</div>
                <div style={{ color: NAVY, fontWeight: 600, fontSize: "15px", marginBottom: "6px" }}>Valitse tai pudota tiedosto tähän</div>
                <div style={{ color: "#8A8070", fontSize: "12px" }}>PDF, Word (.doc/.docx), teksti — max 10 Mt</div>
              </>
            )}
          </div>

          {/* Customer info */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px", marginBottom: "14px" }}>
            <div>
              <label style={{ display: "block", fontSize: "11px", letterSpacing: "0.1em", fontWeight: 700, color: "#8A8070", marginBottom: "6px" }}>
                NIMI
              </label>
              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Etunimi Sukunimi / Yritys"
                style={{ width: "100%", border: `1px solid ${BORDER}`, padding: "10px 12px", fontSize: "14px", color: NAVY, background: "#fff", boxSizing: "border-box" }}
              />
            </div>
            <div>
              <label style={{ display: "block", fontSize: "11px", letterSpacing: "0.1em", fontWeight: 700, color: "#8A8070", marginBottom: "6px" }}>
                SÄHKÖPOSTI *
              </label>
              <input
                type="email"
                value={customerEmail}
                onChange={(e) => setCustomerEmail(e.target.value)}
                required
                placeholder="sinä@yritys.fi"
                style={{ width: "100%", border: `1px solid ${BORDER}`, padding: "10px 12px", fontSize: "14px", color: NAVY, background: "#fff", boxSizing: "border-box" }}
              />
            </div>
          </div>

          <div style={{ marginBottom: "20px" }}>
            <label style={{ display: "block", fontSize: "11px", letterSpacing: "0.1em", fontWeight: 700, color: "#8A8070", marginBottom: "6px" }}>
              LISÄTIETOJA JURISTILLE (valinnainen)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Esim. Mihin kiinnittää erityistä huomiota? Onko jokin kohta epäselvä?"
              style={{ width: "100%", border: `1px solid ${BORDER}`, padding: "10px 12px", fontSize: "14px", color: NAVY, background: "#fff", resize: "vertical", boxSizing: "border-box", fontFamily: "inherit" }}
            />
          </div>

          {errorMsg && (
            <div style={{ background: "#FFF0F0", border: "1px solid #FFCCCC", padding: "12px 16px", marginBottom: "16px", fontSize: "13px", color: "#8B0000" }}>
              {errorMsg}
            </div>
          )}

          <button
            type="submit"
            disabled={step === "uploading"}
            style={{
              width: "100%",
              background: step === "uploading" ? "#8A8070" : GOLD,
              color: NAVY,
              border: "none",
              padding: "16px",
              fontSize: "15px",
              fontWeight: 700,
              letterSpacing: "0.06em",
              cursor: step === "uploading" ? "not-allowed" : "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "10px",
            }}
          >
            {step === "uploading" ? (
              <>
                <div style={{ width: "18px", height: "18px", border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
                Lähetetään ja analysoidaan...
              </>
            ) : (
              "LÄHETÄ TARKISTETTAVAKSI →"
            )}
          </button>

          <p style={{ marginTop: "14px", fontSize: "11px", color: "#8A8070", textAlign: "center", lineHeight: "1.6" }}>
            Asiakirjasi käsitellään luottamuksellisesti. Tiedot tallennetaan salattuun tietokantaan eikä niitä luovuteta kolmansille osapuolille.
          </p>
        </form>
      </div>
    </div>
  );
}
