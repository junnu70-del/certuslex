"use client";

import { useState } from "react";
import Link from "next/link";

// Määritelty komponentin ULKOPUOLELLA — ei re-mounttaa joka renderillä
function Input({ label, value, onChange, placeholder, type = "text" }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string;
}) {
  return (
    <div style={{ marginBottom: "1.2rem" }}>
      <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 600, letterSpacing: "0.08em", color: "#0F1F3D", marginBottom: "0.4rem" }}>{label}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        style={{ width: "100%", border: "1px solid #EDE8DE", padding: "0.7rem 0.9rem", fontSize: "0.9rem", outline: "none", fontFamily: "inherit", boxSizing: "border-box" as const, background: "#fff" }} />
    </div>
  );
}

type Step = "company" | "project" | "specs" | "generating" | "result";

interface CompanyInfo {
  name: string; businessId: string; address: string;
  contact: string; phone: string; email: string;
  hourlyRate: string; paymentTerms: string;
}
interface ProjectInfo {
  clientName: string; projectName: string; type: string;
  startDate: string; validUntil: string;
}

const PROJECT_TYPES = ["Rakennusurakka", "IT-projekti", "Konsultointi", "Suunnittelutyö", "Huolto & ylläpito", "Toimitus & asennus", "Muu"];

export default function TarjouskoneePage() {
  const [step, setStep] = useState<Step>("company");
  const [company, setCompany] = useState<CompanyInfo>({ name: "", businessId: "", address: "", contact: "", phone: "", email: "", hourlyRate: "", paymentTerms: "14 päivää netto" });
  const [project, setProject] = useState<ProjectInfo>({ clientName: "", projectName: "", type: "", startDate: "", validUntil: "" });
  const [specs, setSpecs] = useState("");
  const [quote, setQuote] = useState("");
  const [error, setError] = useState("");

  async function generateQuote() {
    setStep("generating");
    setError("");
    try {
      const res = await fetch("/api/generate-quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ company, project, specs }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Virhe");
      setQuote(data.quote);
      setStep("result");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Tuntematon virhe");
      setStep("specs");
    }
  }

  function copyToClipboard() {
    const tmp = document.createElement("div");
    tmp.innerHTML = quote;
    navigator.clipboard.writeText(tmp.innerText);
  }

  const stepNum = { company: 1, project: 2, specs: 3, generating: 3, result: 3 }[step];

  return (
    <div style={{ background: step === "result" ? "#fff" : "#F7F4EE", minHeight: "100vh" }}>
      {/* Nav */}
      <nav style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "1.2rem 3rem", borderBottom: "1px solid #EDE8DE", background: "#fff" }}>
        <Link href="/" style={{ fontFamily: "var(--font-cormorant), Georgia, serif", fontSize: "1.8rem", fontWeight: 700, textDecoration: "none", color: "#0F1F3D", letterSpacing: "-0.02em" }}>
          Certus<span style={{ color: "#C8A44A" }}>Lex</span>
          <span style={{ fontSize: "0.9rem", fontWeight: 400, color: "#C8A44A", marginLeft: "0.5rem", fontFamily: "inherit" }}>/ Tarjouskone</span>
        </Link>
        <Link href="/" style={{ fontSize: "0.82rem", color: "#8A8070", textDecoration: "none" }}>← Etusivu</Link>
      </nav>

      {/* Progress bar */}
      {step !== "result" && (
        <div style={{ background: "#fff", borderBottom: "1px solid #EDE8DE", padding: "1rem 3rem" }}>
          <div style={{ maxWidth: "680px", margin: "0 auto", display: "flex", gap: "0.5rem", alignItems: "center" }}>
            {[{ n: 1, label: "Yritystiedot" }, { n: 2, label: "Projekti" }, { n: 3, label: "Speksit & generointi" }].map((s, i) => (
              <div key={s.n} style={{ display: "flex", alignItems: "center", gap: "0.5rem", flex: i < 2 ? "none" : 1 }}>
                <div style={{ width: "28px", height: "28px", borderRadius: "50%", background: stepNum >= s.n ? "#0F1F3D" : "#EDE8DE", color: stepNum >= s.n ? "#C8A44A" : "#8A8070", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.75rem", fontWeight: 700, flexShrink: 0 }}>{s.n}</div>
                <span style={{ fontSize: "0.78rem", color: stepNum >= s.n ? "#0F1F3D" : "#8A8070", fontWeight: stepNum === s.n ? 600 : 400 }}>{s.label}</span>
                {i < 2 && <div style={{ flex: 1, height: "1px", background: stepNum > s.n ? "#C8A44A" : "#EDE8DE", margin: "0 0.5rem" }} />}
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ maxWidth: "680px", margin: "0 auto", padding: "3rem 2rem 5rem" }}>

        {/* ── STEP 1: YRITYSTIEDOT ── */}
        {step === "company" && (
          <div>
            <div style={{ borderLeft: "4px solid #C8A44A", paddingLeft: "1.2rem", marginBottom: "2.5rem" }}>
              <div style={{ fontSize: "0.72rem", letterSpacing: "0.14em", color: "#C8A44A", marginBottom: "0.3rem" }}>VAIHE 1 / 3</div>
              <h1 style={{ fontFamily: "var(--font-cormorant), Georgia, serif", fontSize: "2rem", fontWeight: 700, color: "#0F1F3D" }}>Yritystiedot</h1>
              <p style={{ fontSize: "0.85rem", color: "#8A8070", marginTop: "0.3rem" }}>Nämä tiedot näkyvät jokaisessa tarjouksessa. Täytä kerran — tallentuvat selaimeesi.</p>
            </div>

            <div style={{ background: "#fff", border: "1px solid #EDE8DE", padding: "2rem", marginBottom: "1.5rem" }}>
              <Input label="YRITYKSEN NIMI *" value={company.name} onChange={v => setCompany(p => ({ ...p, name: v }))} placeholder="Rakennus Oy Esimerkki" />
              <Input label="Y-TUNNUS" value={company.businessId} onChange={v => setCompany(p => ({ ...p, businessId: v }))} placeholder="1234567-8" />
              <Input label="OSOITE" value={company.address} onChange={v => setCompany(p => ({ ...p, address: v }))} placeholder="Esimerkkikatu 1, 00100 Helsinki" />
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                <Input label="YHTEYSHENKILÖ *" value={company.contact} onChange={v => setCompany(p => ({ ...p, contact: v }))} placeholder="Matti Meikäläinen" />
                <Input label="PUHELIN" value={company.phone} onChange={v => setCompany(p => ({ ...p, phone: v }))} placeholder="+358 40 123 4567" />
              </div>
              <Input label="SÄHKÖPOSTI *" value={company.email} onChange={v => setCompany(p => ({ ...p, email: v }))} placeholder="info@yritys.fi" type="email" />
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                <Input label="TUNTIHINTA (€/h)" value={company.hourlyRate} onChange={v => setCompany(p => ({ ...p, hourlyRate: v }))} placeholder="85" />
                <Input label="MAKSUEHDOT" value={company.paymentTerms} onChange={v => setCompany(p => ({ ...p, paymentTerms: v }))} placeholder="14 päivää netto" />
              </div>
            </div>

            <button
              disabled={!company.name || !company.contact || !company.email}
              onClick={() => setStep("project")}
              style={{ width: "100%", background: !company.name || !company.contact || !company.email ? "#EDE8DE" : "#0F1F3D", color: !company.name || !company.contact || !company.email ? "#8A8070" : "#C8A44A", border: "none", padding: "1rem", fontSize: "0.9rem", fontWeight: 600, cursor: !company.name || !company.contact || !company.email ? "not-allowed" : "pointer", letterSpacing: "0.05em" }}>
              Seuraava: Projektin tiedot →
            </button>
          </div>
        )}

        {/* ── STEP 2: PROJEKTI ── */}
        {step === "project" && (
          <div>
            <div style={{ borderLeft: "4px solid #C8A44A", paddingLeft: "1.2rem", marginBottom: "2.5rem" }}>
              <div style={{ fontSize: "0.72rem", letterSpacing: "0.14em", color: "#C8A44A", marginBottom: "0.3rem" }}>VAIHE 2 / 3</div>
              <h1 style={{ fontFamily: "var(--font-cormorant), Georgia, serif", fontSize: "2rem", fontWeight: 700, color: "#0F1F3D" }}>Projektin tiedot</h1>
              <p style={{ fontSize: "0.85rem", color: "#8A8070", marginTop: "0.3rem" }}>Kenelle tarjous menee ja mistä on kyse?</p>
            </div>

            <div style={{ background: "#fff", border: "1px solid #EDE8DE", padding: "2rem", marginBottom: "1.5rem" }}>
              <Input label="ASIAKKAAN NIMI / YRITYS *" value={project.clientName} onChange={v => setProject(p => ({ ...p, clientName: v }))} placeholder="Asiakas Oy" />
              <Input label="PROJEKTIN NIMI *" value={project.projectName} onChange={v => setProject(p => ({ ...p, projectName: v }))} placeholder="Verkkosivuston uudistus" />

              <div style={{ marginBottom: "1.2rem" }}>
                <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 600, letterSpacing: "0.08em", color: "#0F1F3D", marginBottom: "0.4rem" }}>PROJEKTIN TYYPPI *</label>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "0.5rem" }}>
                  {PROJECT_TYPES.map(t => (
                    <div key={t} onClick={() => setProject(p => ({ ...p, type: t }))}
                      style={{ border: `1px solid ${project.type === t ? "#C8A44A" : "#EDE8DE"}`, background: project.type === t ? "rgba(200,164,74,.06)" : "#fff", padding: "0.6rem", fontSize: "0.78rem", cursor: "pointer", textAlign: "center", color: project.type === t ? "#0F1F3D" : "#8A8070", fontWeight: project.type === t ? 600 : 400 }}>
                      {t}
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                <Input label="ARVIOITU ALOITUS" value={project.startDate} onChange={v => setProject(p => ({ ...p, startDate: v }))} placeholder="1.6.2026" />
                <Input label="TARJOUS VOIMASSA" value={project.validUntil} onChange={v => setProject(p => ({ ...p, validUntil: v }))} placeholder="30 päivää" />
              </div>
            </div>

            <div style={{ display: "flex", gap: "1rem" }}>
              <button onClick={() => setStep("company")} style={{ flex: "none", background: "transparent", border: "1px solid #EDE8DE", color: "#8A8070", padding: "1rem 1.5rem", fontSize: "0.85rem", cursor: "pointer" }}>← Takaisin</button>
              <button disabled={!project.clientName || !project.projectName || !project.type} onClick={() => setStep("specs")}
                style={{ flex: 1, background: !project.clientName || !project.projectName || !project.type ? "#EDE8DE" : "#0F1F3D", color: !project.clientName || !project.projectName || !project.type ? "#8A8070" : "#C8A44A", border: "none", padding: "1rem", fontSize: "0.9rem", fontWeight: 600, cursor: !project.clientName || !project.projectName || !project.type ? "not-allowed" : "pointer", letterSpacing: "0.05em" }}>
                Seuraava: Speksit →
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 3: SPEKSIT ── */}
        {step === "specs" && (
          <div>
            <div style={{ borderLeft: "4px solid #C8A44A", paddingLeft: "1.2rem", marginBottom: "2.5rem" }}>
              <div style={{ fontSize: "0.72rem", letterSpacing: "0.14em", color: "#C8A44A", marginBottom: "0.3rem" }}>VAIHE 3 / 3</div>
              <h1 style={{ fontFamily: "var(--font-cormorant), Georgia, serif", fontSize: "2rem", fontWeight: 700, color: "#0F1F3D" }}>Projektin speksit</h1>
              <p style={{ fontSize: "0.85rem", color: "#8A8070", marginTop: "0.3rem" }}>Kuvaile mitä tehdään — AI rakentaa tarjouksen. Mitä tarkemmin kuvailet, sitä parempi tulos.</p>
            </div>

            {error && <div style={{ background: "#fff0f0", border: "1px solid #9b2335", padding: "0.8rem 1rem", marginBottom: "1rem", fontSize: "0.85rem", color: "#9b2335" }}>{error}</div>}

            <div style={{ background: "#fff", border: "1px solid #EDE8DE", padding: "2rem", marginBottom: "1rem" }}>
              <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 600, letterSpacing: "0.08em", color: "#0F1F3D", marginBottom: "0.4rem" }}>PROJEKTIN KUVAUS JA SPEKSIT *</label>
              <textarea value={specs} onChange={e => setSpecs(e.target.value)} rows={10} placeholder={`Kuvaile tarkasti mitä projekti sisältää. Esimerkiksi:\n\n- Materiaalit: teräsputki DN100, paksuus 3mm, pituus 50m\n- Työvaiheet: kaivuutyöt, putkiasennus, täyttö\n- Arvioitu työmäärä: 3 henkilöä × 5 päivää\n- Erityisvaatimukset: työ tehdään liikenteen seassa, tarvitaan luvat\n- Lisäpalvelut: käyttöönotto ja testaus sisältyy hintaan\n- Hintataso: materiaalit n. 8 000 €, työ n. 12 000 €`}
                style={{ width: "100%", border: "1px solid #EDE8DE", padding: "0.8rem", fontSize: "0.88rem", outline: "none", fontFamily: "inherit", resize: "vertical", lineHeight: 1.6, boxSizing: "border-box" }} />
            </div>

            <div style={{ background: "rgba(200,164,74,.08)", border: "1px solid rgba(200,164,74,.3)", padding: "1rem 1.2rem", marginBottom: "1.5rem", fontSize: "0.82rem", color: "#4A4035" }}>
              💡 <strong>Vinkki:</strong> Liitä mukaan tarjouspyyntö, materiaalilista, tuntiarvio tai muu laskentapohja — AI osaa hyödyntää kaiken annetun tiedon.
            </div>

            <div style={{ display: "flex", gap: "1rem" }}>
              <button onClick={() => setStep("project")} style={{ flex: "none", background: "transparent", border: "1px solid #EDE8DE", color: "#8A8070", padding: "1rem 1.5rem", fontSize: "0.85rem", cursor: "pointer" }}>← Takaisin</button>
              <button disabled={specs.trim().length < 20} onClick={generateQuote}
                style={{ flex: 1, background: specs.trim().length < 20 ? "#EDE8DE" : "#C8A44A", color: specs.trim().length < 20 ? "#8A8070" : "#0F1F3D", border: "none", padding: "1rem", fontSize: "0.9rem", fontWeight: 700, cursor: specs.trim().length < 20 ? "not-allowed" : "pointer", letterSpacing: "0.05em" }}>
                🤖 Generoi tarjous AI:lla →
              </button>
            </div>
          </div>
        )}

        {/* ── GENERATING ── */}
        {step === "generating" && (
          <div style={{ textAlign: "center", padding: "5rem 2rem" }}>
            <div style={{ width: "60px", height: "60px", border: "3px solid #EDE8DE", borderTopColor: "#C8A44A", borderRadius: "50%", animation: "spin 1s linear infinite", margin: "0 auto 2rem" }} />
            <h2 style={{ fontFamily: "var(--font-cormorant), Georgia, serif", fontSize: "1.8rem", color: "#0F1F3D", marginBottom: "0.5rem" }}>AI rakentaa tarjousta...</h2>
            <p style={{ color: "#8A8070", fontSize: "0.9rem" }}>Analysoidaan speksit ja laaditaan ammattimainen tarjous. Kestää noin 15–30 sekuntia.</p>
          </div>
        )}

        {/* ── RESULT ── */}
        {step === "result" && (
          <div>
            <div style={{ borderLeft: "4px solid #C8A44A", paddingLeft: "1.2rem", marginBottom: "2rem" }}>
              <div style={{ fontSize: "0.72rem", letterSpacing: "0.14em", color: "#C8A44A", marginBottom: "0.3rem" }}>VALMIS</div>
              <h1 style={{ fontFamily: "var(--font-cormorant), Georgia, serif", fontSize: "2rem", fontWeight: 700, color: "#0F1F3D" }}>Tarjous generoitu</h1>
              <p style={{ fontSize: "0.85rem", color: "#8A8070", marginTop: "0.3rem" }}>{project.projectName} → {project.clientName}</p>
            </div>

            {/* Action buttons */}
            <div style={{ display: "flex", gap: "0.8rem", marginBottom: "1.5rem", flexWrap: "wrap" }}>
              <button onClick={copyToClipboard} style={{ background: "#0F1F3D", color: "#C8A44A", border: "none", padding: "0.8rem 1.4rem", fontSize: "0.82rem", fontWeight: 600, cursor: "pointer", letterSpacing: "0.04em" }}>
                📋 Kopioi teksti
              </button>
              <button onClick={() => window.print()} style={{ background: "transparent", border: "1px solid #EDE8DE", color: "#0F1F3D", padding: "0.8rem 1.4rem", fontSize: "0.82rem", cursor: "pointer" }}>
                🖨️ Tulosta / PDF
              </button>
              <button onClick={() => { setStep("specs"); setQuote(""); }} style={{ background: "transparent", border: "1px solid #EDE8DE", color: "#8A8070", padding: "0.8rem 1.4rem", fontSize: "0.82rem", cursor: "pointer" }}>
                🔄 Generoi uudelleen
              </button>
              <Link href="/" style={{ display: "inline-flex", alignItems: "center", background: "rgba(200,164,74,.1)", border: "1px solid rgba(200,164,74,.3)", color: "#C8A44A", padding: "0.8rem 1.4rem", fontSize: "0.82rem", textDecoration: "none", fontWeight: 500 }}>
                ⚖️ Lähetä juristille →
              </Link>
            </div>

            {/* Quote content */}
            <div
              style={{ background: "#fff", padding: "2.5rem 0", fontSize: "0.88rem", lineHeight: 1.8, color: "#2C2416", fontFamily: "Georgia, serif" }}
              dangerouslySetInnerHTML={{ __html: quote }}
            />
          </div>
        )}
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } } @media print { nav, button, a { display: none !important; } }`}</style>
    </div>
  );
}
