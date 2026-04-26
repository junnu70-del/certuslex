"use client";

export const dynamic = "force-dynamic";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";

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

type Step = "company" | "project" | "specs" | "generating" | "result" | "send";

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
  const [margin, setMargin] = useState("");
  const [extraInstructions, setExtraInstructions] = useState("");
  const [quote, setQuote] = useState("");
  const [error, setError] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [sentQuoteUrl, setSentQuoteUrl] = useState("");
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [userEmail, setUserEmail] = useState("");
  const [userId, setUserId] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [trialDaysLeft, setTrialDaysLeft] = useState<number | null>(null);
  const [isExpired, setIsExpired] = useState(false);
  const [attachment, setAttachment] = useState<{ name: string; size: number; base64: string; mimeType: string } | null>(null);
  const attachRef = useRef<HTMLInputElement>(null);

  // Lataa yritysprofiili automaattisesti kirjautuneelle käyttäjälle
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (!u) return;
      setUserEmail(u.email ?? "");
      setUserId(u.uid);
      try {
        const token = await u.getIdToken();
        const res = await fetch("/api/profile", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const p = await res.json();
          if (p && p.name) {
            setCompany({
              name: p.name ?? "",
              businessId: p.businessId ?? "",
              address: `${p.address ?? ""}${p.zip ? ", " + p.zip : ""}${p.city ? " " + p.city : ""}`.trim(),
              contact: p.contact ?? "",
              phone: p.phone ?? "",
              email: p.email ?? "",
              hourlyRate: p.hourlyRate ?? "",
              paymentTerms: p.paymentTerms ?? "14 päivää netto",
            });
            setLogoUrl(p.logoUrl ?? "");
            setProfileLoaded(true);
          }
          // Trial-tila aina mukana
          if (p.trialDaysLeft !== undefined) setTrialDaysLeft(p.trialDaysLeft);
          if (p.isExpired !== undefined) setIsExpired(p.isExpired);
        }
      } catch { /* ei profiilia */ }
    });
    return () => unsub();
  }, []);

  async function generateQuote() {
    setStep("generating");
    setError("");
    try {
      const res = await fetch("/api/generate-quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          company, project, attachment,
          specs: specs
            + (margin ? `\n\nKATEPROSENTTI: Lisää kustannuksiin ${margin}% kate/marginaali suoraan yksikköhintoihin. ÄLÄ mainitse kateprosenttia tai marginaalia tarjousdokumentissa — se on yrityksen sisäinen tieto eikä kuulu asiakkaalle.` : "")
            + (extraInstructions ? `\n\nLISÄOHJEET: ${extraInstructions}` : ""),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Virhe");
      const logoHtml = logoUrl
        ? `<div style="text-align:right;margin-bottom:2rem;padding-bottom:1.5rem;border-bottom:2px solid #C8A44A;">
            <img src="${logoUrl}" alt="Logo" style="max-height:70px;max-width:220px;object-fit:contain;" />
           </div>`
        : "";
      // Korjaa tummat solut suoraan HTML-merkkijonosta — lisää color:#C8A44A kaikkiin tummiin taustaväreihin
      function fixDarkCells(html: string): string {
        // Korvaa kaikki style-attribuutit joissa on tumma taustaväri (#0F1F3D tai rgb-vastine)
        return html.replace(
          /style="([^"]*)background(-color)?:\s*#0[Ff]1[Ff]3[Dd]([^"]*)"/g,
          (_, before, _bc, after) =>
            `style="${before}background-color:#0F1F3D;color:#C8A44A;${after}"`
        ).replace(
          /style="([^"]*)background(-color)?:\s*rgb\(15,\s*31,\s*61\)([^"]*)"/g,
          (_, before, _bc, after) =>
            `style="${before}background-color:#0F1F3D;color:#C8A44A;${after}"`
        );
      }
      setQuote(logoHtml + fixDarkCells(data.quote));
      setStep("result");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Tuntematon virhe");
      setStep("specs");
    }
  }

  function handleAttachmentSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 15 * 1024 * 1024) {
      setError("Tiedosto on liian suuri (max 15 Mt)");
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      setAttachment({ name: file.name, size: file.size, base64: dataUrl.split(",")[1], mimeType: file.type });
    };
    reader.readAsDataURL(file);
    // reset input so same file can be re-selected
    e.target.value = "";
  }

  function copyToClipboard() {
    const tmp = document.createElement("div");
    tmp.innerHTML = quote;
    navigator.clipboard.writeText(tmp.innerText);
  }

  async function sendQuoteToClient() {
    if (!clientEmail) return;
    setSending(true);
    setError("");
    try {
      const res = await fetch("/api/send-quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quoteHtml: quote, company, project, clientEmail, senderUid: userId, senderAuthEmail: userEmail }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Virhe");
      setSentQuoteUrl(`https://certuslex.fi/tarjous/${data.quoteId}?token=${data.token}`);
      setStep("send");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Virhe");
    } finally {
      setSending(false);
    }
  }

  const stepNum = { company: 1, project: 2, specs: 3, generating: 3, result: 3, send: 3 }[step];

  // Paywall — trial vanhentunut
  if (isExpired) return (
    <div style={{ background: "#F7F4EE", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "2rem" }}>
      <div style={{ background: "#fff", border: "2px solid #C8A44A", padding: "3rem 3.5rem", maxWidth: "480px", textAlign: "center" }}>
        <div style={{ fontSize: "2.5rem", marginBottom: "1rem" }}>⏰</div>
        <p style={{ fontSize: "0.72rem", fontWeight: 700, letterSpacing: "0.14em", color: "#C8A44A", marginBottom: "0.8rem" }}>ILMAINEN KOKEILU PÄÄTTYNYT</p>
        <h2 style={{ fontFamily: "var(--font-cormorant), Georgia, serif", fontSize: "1.8rem", fontWeight: 700, color: "#0F1F3D", margin: "0 0 1rem" }}>
          Jatka tilaamalla paketti
        </h2>
        <p style={{ fontSize: "0.88rem", color: "#8A8070", margin: "0 0 2rem", lineHeight: 1.6 }}>
          30 päivän ilmainen kokeilu on päättynyt. Valitse paketti jatkaaksesi ammattimaaisten tarjousten luomista.
        </p>
        <Link href="/hinnoittelu"
          style={{ display: "inline-block", background: "#C8A44A", color: "#0F1F3D", padding: "0.9rem 2.5rem", fontSize: "0.95rem", fontWeight: 700, textDecoration: "none", letterSpacing: "0.05em" }}>
          Katso paketit →
        </Link>
        <p style={{ fontSize: "0.75rem", color: "#8A8070", marginTop: "1.5rem" }}>
          Kysymyksiä? <a href="mailto:info@certuslex.fi" style={{ color: "#C8A44A" }}>info@certuslex.fi</a>
        </p>
      </div>
    </div>
  );

  return (
    <div style={{ background: step === "result" ? "#fff" : "#F7F4EE", minHeight: "100vh" }}>
      {/* Trial-banneri */}
      {userEmail && trialDaysLeft !== null && trialDaysLeft <= 7 && !isExpired && (
        <div style={{ background: trialDaysLeft <= 3 ? "#fff0f0" : "#FFF8E7", borderBottom: `2px solid ${trialDaysLeft <= 3 ? "#f5c6cb" : "#C8A44A"}`, padding: "0.6rem 2rem", display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: "0.82rem" }}>
          <span style={{ color: trialDaysLeft <= 3 ? "#9b2335" : "#7A4F00", fontWeight: 600 }}>
            {trialDaysLeft <= 3 ? "⚠️" : "⏳"} Ilmainen kokeilu päättyy {trialDaysLeft === 0 ? "tänään" : `${trialDaysLeft} päivän kuluttua`}
          </span>
          <Link href="/hinnoittelu" style={{ color: "#C8A44A", fontWeight: 700, textDecoration: "none", fontSize: "0.78rem" }}>
            Valitse paketti →
          </Link>
        </div>
      )}
      {/* Nav */}
      <nav style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "1.2rem 3rem", borderBottom: "1px solid #EDE8DE", background: "#fff" }}>
        <Link href="/" style={{ fontFamily: "var(--font-cormorant), Georgia, serif", fontSize: "1.8rem", fontWeight: 700, textDecoration: "none", color: "#0F1F3D", letterSpacing: "-0.02em" }}>
          Certus<span style={{ color: "#C8A44A" }}>Lex</span>
          <span style={{ fontSize: "0.9rem", fontWeight: 400, color: "#C8A44A", marginLeft: "0.5rem", fontFamily: "inherit" }}>/ Tarjouskone</span>
        </Link>
        <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
          {userEmail ? (
            <>
              <Link href="/tarjoukset" style={{ fontSize: "0.82rem", color: "#0F1F3D", textDecoration: "none", fontWeight: 500 }}>📋 Arkisto</Link>
              <Link href="/profiili" style={{ fontSize: "0.82rem", color: "#C8A44A", textDecoration: "none", fontWeight: 500 }}>⚙️ Yritysprofiili</Link>
            </>
          ) : (
            <>
              <Link href="/hinnoittelu" style={{ fontSize: "0.82rem", color: "#C8A44A", textDecoration: "none", fontWeight: 600 }}>Hinnoittelu</Link>
              <Link href="/kirjaudu" style={{ fontSize: "0.82rem", color: "#8A8070", textDecoration: "none" }}>Kirjaudu →</Link>
            </>
          )}
          <Link href="/ohjeet" style={{ fontSize: "0.82rem", color: "#8A8070", textDecoration: "none" }}>Ohjeet</Link>
          <Link href="/en/help" style={{ fontSize: "0.75rem", color: "#8A8070", textDecoration: "none", opacity: 0.6 }}>🇬🇧 EN</Link>
        </div>
      </nav>

      {/* Profiili ladattu -ilmoitus */}
      {profileLoaded && step === "company" && (
        <div style={{ background: "#f0fdf4", borderBottom: "1px solid #86efac", padding: "0.6rem 3rem", fontSize: "0.82rem", color: "#166534", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span>✅ Yritystiedot ladattu automaattisesti profiilista</span>
          <Link href="/profiili" style={{ color: "#166534", fontWeight: 600, textDecoration: "none" }}>Muokkaa →</Link>
        </div>
      )}

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

      <div style={{ maxWidth: "680px", margin: "0 auto", padding: step === "result" ? "3rem 2rem 0" : "3rem 2rem 5rem" }}>

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

            {/* Kate ja lisäohjeet */}
            <div style={{ background: "#fff", border: "1px solid #EDE8DE", padding: "1.5rem 2rem", marginBottom: "1rem" }}>
              <p style={{ fontSize: "0.72rem", fontWeight: 700, letterSpacing: "0.1em", color: "#0F1F3D", margin: "0 0 1rem" }}>
                ⚙️ HINNOITTELUASETUKSET <span style={{ color: "#8A8070", fontWeight: 400, letterSpacing: 0 }}>(valinnainen)</span>
              </p>
              <div style={{ display: "grid", gridTemplateColumns: "140px 1fr", gap: "1rem", alignItems: "start" }}>
                <div>
                  <label style={{ display: "block", fontSize: "0.72rem", fontWeight: 600, letterSpacing: "0.08em", color: "#0F1F3D", marginBottom: "0.4rem" }}>KATE %</label>
                  <input
                    type="number"
                    value={margin}
                    onChange={e => setMargin(e.target.value)}
                    placeholder="esim. 20"
                    min="0" max="200"
                    style={{ width: "100%", border: "1px solid #EDE8DE", padding: "0.7rem 0.9rem", fontSize: "0.9rem", outline: "none", fontFamily: "inherit", boxSizing: "border-box" as const, background: "#fff" }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "0.72rem", fontWeight: 600, letterSpacing: "0.08em", color: "#0F1F3D", marginBottom: "0.4rem" }}>LISÄOHJEET AI:LLE</label>
                  <input
                    type="text"
                    value={extraInstructions}
                    onChange={e => setExtraInstructions(e.target.value)}
                    placeholder="esim. Korosta toimitusaikaa, lisää takuuehto 2 v, käytä konservatiivisia arvioita"
                    style={{ width: "100%", border: "1px solid #EDE8DE", padding: "0.7rem 0.9rem", fontSize: "0.9rem", outline: "none", fontFamily: "inherit", boxSizing: "border-box" as const, background: "#fff" }}
                  />
                </div>
              </div>
            </div>

            {/* Tiedostoliite */}
            <div style={{ background: "#fff", border: "1px solid #EDE8DE", padding: "1.5rem 2rem", marginBottom: "1rem" }}>
              <p style={{ fontSize: "0.72rem", fontWeight: 700, letterSpacing: "0.1em", color: "#0F1F3D", margin: "0 0 0.8rem" }}>📎 LIITÄ ASIAKIRJA TAI PIIRUSTUS <span style={{ color: "#8A8070", fontWeight: 400, letterSpacing: 0 }}>(valinnainen)</span></p>
              <p style={{ fontSize: "0.8rem", color: "#8A8070", margin: "0 0 1rem" }}>AI lukee liitteen ja hyödyntää sitä tarjouslaskennassa — piirustukset, rakennelaskelmat, tarjouspyynnöt, materiaalilistat.</p>

              {attachment ? (
                <div style={{ display: "flex", alignItems: "center", gap: "1rem", background: "#F0FDF4", border: "1px solid #86EFAC", padding: "0.8rem 1rem" }}>
                  <span style={{ fontSize: "1.4rem" }}>
                    {attachment.mimeType.startsWith("image/") ? "🖼️" : (attachment.mimeType.includes("sheet") || attachment.mimeType.includes("excel") || attachment.name.match(/\.(xlsx|xls|csv)$/i)) ? "📊" : "📄"}
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: "0.85rem", fontWeight: 600, color: "#166534", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{attachment.name}</div>
                    <div style={{ fontSize: "0.72rem", color: "#4ADE80" }}>
                      {(attachment.size / 1024).toFixed(0)} kt — {attachment.mimeType.startsWith("image/") ? "Kuva (vision)" : (attachment.mimeType.includes("sheet") || attachment.mimeType.includes("excel") || attachment.name.match(/\.(xlsx|xls|csv)$/i)) ? "Excel/CSV → muunnetaan tekstiksi" : "PDF-dokumentti"}
                    </div>
                  </div>
                  <button onClick={() => setAttachment(null)}
                    style={{ background: "none", border: "none", color: "#9b2335", cursor: "pointer", fontSize: "1.2rem", padding: "0.2rem 0.4rem", lineHeight: 1 }}>
                    ✕
                  </button>
                </div>
              ) : (
                <button onClick={() => attachRef.current?.click()}
                  style={{ display: "flex", alignItems: "center", gap: "0.6rem", background: "transparent", border: "2px dashed #C8A44A", color: "#0F1F3D", padding: "0.8rem 1.4rem", fontSize: "0.83rem", fontWeight: 600, cursor: "pointer", width: "100%", justifyContent: "center" }}>
                  <span style={{ fontSize: "1.1rem" }}>📎</span> Valitse tiedosto (PDF, Excel, CSV, PNG, JPG — max 15 Mt)
                </button>
              )}
              <input ref={attachRef} type="file" accept="application/pdf,image/png,image/jpeg,image/jpg,image/webp,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv,.xlsx,.xls,.csv" style={{ display: "none" }} onChange={handleAttachmentSelect} />
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
            <p style={{ color: "#8A8070", fontSize: "0.9rem" }}>{attachment ? "Analysoidaan speksit ja liitetty asiakirja — kestää hetken enemmän." : "Analysoidaan speksit ja laaditaan ammattimainen tarjous. Kestää noin 15–30 sekuntia."}</p>
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
            </div>

            {/* Lähetä asiakkaalle */}
            <div style={{ background: "#FAF7F2", border: "1px solid rgba(200,164,74,.4)", padding: "1.5rem 2rem", marginBottom: "1.5rem" }}>
              <p style={{ fontSize: "0.75rem", fontWeight: 700, letterSpacing: "0.1em", color: "#0F1F3D", margin: "0 0 0.8rem" }}>📨 LÄHETÄ ASIAKKAALLE</p>
              <p style={{ fontSize: "0.82rem", color: "#4A4035", margin: "0 0 1rem" }}>Asiakas saa sähköpostiin linkin josta voi kommentoida tai allekirjoittaa tarjouksen sähköisesti.</p>
              <div style={{ display: "flex", gap: "0.8rem", alignItems: "flex-start" }}>
                <input
                  value={clientEmail}
                  onChange={e => setClientEmail(e.target.value)}
                  placeholder={`${project.clientName.toLowerCase().replace(/\s+/g, "")}@yritys.fi`}
                  type="email"
                  style={{ flex: 1, border: "1px solid #EDE8DE", padding: "0.7rem 0.9rem", fontSize: "0.9rem", outline: "none", boxSizing: "border-box" as const, background: "#fff" }}
                />
                <button
                  onClick={sendQuoteToClient}
                  disabled={sending || !clientEmail}
                  style={{ background: !clientEmail || sending ? "#EDE8DE" : "#C8A44A", color: !clientEmail || sending ? "#8A8070" : "#0F1F3D", border: "none", padding: "0.7rem 1.4rem", fontSize: "0.85rem", fontWeight: 700, cursor: !clientEmail || sending ? "not-allowed" : "pointer", whiteSpace: "nowrap" as const }}>
                  {sending ? "Lähetetään..." : "Lähetä →"}
                </button>
              </div>
              {error && <p style={{ color: "#9b2335", fontSize: "0.82rem", margin: "0.5rem 0 0" }}>{error}</p>}
            </div>

            {/* Quote content */}
            <div
              style={{ background: "#fff", padding: "2.5rem 2rem 10rem", fontSize: "0.88rem", lineHeight: 1.8, color: "#2C2416", fontFamily: "Georgia, serif", marginLeft: "-2rem", marginRight: "-2rem" }}
              dangerouslySetInnerHTML={{ __html: quote }}
            />
          </div>
        )}

        {/* ── SEND SUCCESS ── */}
        {step === "send" && (
          <div style={{ textAlign: "center", padding: "3rem 1rem" }}>
            <div style={{ fontSize: "3.5rem", marginBottom: "1rem" }}>📨</div>
            <h2 style={{ fontFamily: "var(--font-cormorant), Georgia, serif", fontSize: "2rem", color: "#0F1F3D", marginBottom: "0.5rem" }}>Tarjous lähetetty!</h2>
            <p style={{ color: "#8A8070", fontSize: "0.9rem", marginBottom: "2rem" }}>
              Sähköposti lähetetty osoitteeseen <strong style={{ color: "#0F1F3D" }}>{clientEmail}</strong>.<br/>
              Asiakas voi kommentoida tai allekirjoittaa tarjouksen linkistä.
            </p>
            <div style={{ background: "#FAF7F2", border: "1px solid #EDE8DE", padding: "1rem 1.5rem", marginBottom: "2rem", fontSize: "0.8rem", color: "#4A4035", textAlign: "left" }}>
              <p style={{ margin: "0 0 0.4rem", fontWeight: 600 }}>Tarjouslinkki (voit jakaa myös suoraan):</p>
              <a href={sentQuoteUrl} target="_blank" rel="noopener noreferrer" style={{ color: "#C8A44A", wordBreak: "break-all" as const, fontSize: "0.75rem" }}>{sentQuoteUrl}</a>
            </div>
            <div style={{ display: "flex", gap: "1rem", justifyContent: "center", flexWrap: "wrap" }}>
              <button onClick={() => { setStep("result"); setError(""); }} style={{ background: "transparent", border: "1px solid #EDE8DE", color: "#8A8070", padding: "0.8rem 1.5rem", cursor: "pointer", fontSize: "0.85rem" }}>
                ← Palaa tarjoukseen
              </button>
              <button onClick={() => { setStep("specs"); setQuote(""); setClientEmail(""); setSentQuoteUrl(""); }} style={{ background: "#0F1F3D", color: "#C8A44A", border: "none", padding: "0.8rem 1.5rem", cursor: "pointer", fontSize: "0.85rem", fontWeight: 600 }}>
                🔄 Tee uusi tarjous
              </button>
            </div>
          </div>
        )}
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } } @media print { nav, button, a { display: none !important; } }`}</style>
    </div>
  );
}
