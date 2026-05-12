"use client";

export const dynamic = "force-dynamic";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { t, PROJECT_TYPES_FI, PROJECT_TYPES_EN, type Lang } from "@/lib/translations";

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
  hourlyRate: string; paymentTerms: string; industry: string;
}
interface ProjectInfo {
  clientName: string; projectName: string; type: string;
  startDate: string; validUntil: string;
}

export default function TarjouskoneePage() {
  const [lang, setLang] = useState<Lang>("fi");
  const [step, setStep] = useState<Step>("company");
  const [company, setCompany] = useState<CompanyInfo>({ name: "", businessId: "", address: "", contact: "", phone: "", email: "", hourlyRate: "", paymentTerms: "14 päivää netto", industry: "" });
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
  const [accessCode, setAccessCode] = useState<string | null>(null);
  const [codeUsesLeft, setCodeUsesLeft] = useState<number | null>(null);
  const [attachments, setAttachments] = useState<Array<{ name: string; size: number; base64: string; mimeType: string }>>([]);
  const attachRef = useRef<HTMLInputElement>(null);
  const [projectImageUrl, setProjectImageUrl] = useState("");
  const [uploadingImage, setUploadingImage] = useState(false);
  const projectImageRef = useRef<HTMLInputElement>(null);
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [checklistDone, setChecklistDone] = useState(false);

  const T = t[lang].tarjouskone;
  const PROJECT_TYPES = lang === "en" ? PROJECT_TYPES_EN : PROJECT_TYPES_FI;

  // Lue kieli + access code localStoragesta + demo-tila
  useEffect(() => {
    const savedLang = localStorage.getItem("certuslex_lang") as Lang | null;
    if (savedLang === "en" || savedLang === "fi") setLang(savedLang);

    // Demo-moodi: ?demo=1 URL-parametrista
    if (window.location.search.includes("demo=1")) {
      setIsDemoMode(true);
      setCompany({
        name: "Oma Yritys Oy", businessId: "", address: "",
        contact: "Etunimi Sukunimi", phone: "", email: "",
        hourlyRate: "", paymentTerms: "14 päivää netto", industry: "",
      });
      setProject({ clientName: "Asiakas Oy", projectName: "", type: "", startDate: "", validUntil: "" });
      setStep("specs");
      return;
    }

    // Checklist: tarkista onko kaikki vaiheet tehty
    const firstQuoteDone = !!localStorage.getItem("certuslex_first_quote");
    const firstSendDone = !!localStorage.getItem("certuslex_first_send");
    if (firstQuoteDone && firstSendDone) setChecklistDone(true);

    const savedCode = localStorage.getItem("certuslex_code");
    if (savedCode) {
      fetch(`/api/verify-code?code=${savedCode}`)
        .then(r => r.json())
        .then(d => {
          if (d.valid) {
            setAccessCode(savedCode);
            setCodeUsesLeft(d.usesLeft);
          } else {
            localStorage.removeItem("certuslex_code");
          }
        });
    }
  }, []);

  function toggleLang() {
    const next: Lang = lang === "fi" ? "en" : "fi";
    setLang(next);
    localStorage.setItem("certuslex_lang", next);
  }

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
              industry: p.industry ?? "",
            });
            setLogoUrl(p.logoUrl ?? "");
            setProfileLoaded(true);
          }
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

    // Käytä yksi käyttökerta jos koodi käytössä
    if (accessCode && !userEmail) {
      const res = await fetch("/api/verify-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: accessCode, action: "generate_quote" }),
      });
      const data = await res.json();
      if (!data.valid) {
        setError(lang === "en" ? "Access code has no uses left." : "Käyttökoodi on käytetty loppuun.");
        setStep("specs");
        return;
      }
      setCodeUsesLeft(data.usesLeft);
    }
    try {
      const res = await fetch("/api/generate-quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          company,
          project: {
            ...project,
            startDate: project.startDate ? new Date(project.startDate).toLocaleDateString("fi-FI") : "",
            validUntil: project.validUntil ? new Date(project.validUntil).toLocaleDateString("fi-FI") : "",
          },
          attachments,
          projectImageUrl,
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
      function fixDarkCells(html: string): string {
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
      if (!isDemoMode) localStorage.setItem("certuslex_first_quote", "1");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Tuntematon virhe");
      setStep("specs");
    }
  }

  function handleAttachmentSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    for (const file of files) {
      if (file.size > 15 * 1024 * 1024) {
        setError(lang === "en" ? `${file.name}: too large (max 15 MB)` : `${file.name}: liian suuri (max 15 Mt)`);
        continue;
      }
      const reader = new FileReader();
      reader.onload = (ev) => {
        const dataUrl = ev.target?.result as string;
        setAttachments(prev => [...prev, { name: file.name, size: file.size, base64: dataUrl.split(",")[1], mimeType: file.type }]);
      };
      reader.readAsDataURL(file);
    }
    e.target.value = "";
  }

  function compressImage(file: File, maxWidth = 1400, quality = 0.82): Promise<Blob> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        URL.revokeObjectURL(url);
        const scale = Math.min(1, maxWidth / img.width);
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext("2d")!;
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        canvas.toBlob(
          blob => blob ? resolve(blob) : reject(new Error("Kuvan pakkaus epäonnistui")),
          "image/jpeg", quality
        );
      };
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Kuvan luku epäonnistui")); };
      img.src = url;
    });
  }

  async function handleProjectImageSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 50 * 1024 * 1024) { setError(lang === "en" ? "Image too large (max 50 MB)" : "Kuva liian suuri (max 50 Mt)"); return; }
    setUploadingImage(true);
    try {
      const user = auth?.currentUser;
      if (!user) throw new Error("Kirjaudu sisään ensin");
      const idToken = await user.getIdToken();
      const compressed = await compressImage(file);
      const fd = new FormData();
      fd.append("file", new File([compressed], file.name.replace(/\.[^.]+$/, ".jpg"), { type: "image/jpeg" }));
      const res = await fetch("/api/upload-project-image", {
        method: "POST",
        headers: { Authorization: `Bearer ${idToken}` },
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? res.statusText);
      setProjectImageUrl(data.url);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError((lang === "en" ? "Image upload failed: " : "Kuvan lataus epäonnistui: ") + msg);
    } finally {
      setUploadingImage(false);
      e.target.value = "";
    }
  }

  function copyToClipboard() {
    const tmp = document.createElement("div");
    tmp.innerHTML = quote;
    navigator.clipboard.writeText(tmp.innerText);
  }

  function downloadAsWord() {
    const clientName = project.clientName?.replace(/[^a-zA-Z0-9äöåÄÖÅ]/g, "_") || "asiakas";
    const projectName = project.projectName?.replace(/[^a-zA-Z0-9äöåÄÖÅ]/g, "_") || "tarjous";
    const fileName = `Tarjous_${clientName}_${projectName}.doc`;

    // Word ei lue <style>-CSS:ää — inline-tyylit img-tageille
    const cleanedQuote = quote
      .replace(/object-fit\s*:\s*[^;'"]+;?\s*/gi, "")
      .replace(/max-height\s*:\s*[^;'"]+;?\s*/gi, "")
      // Lisää width/height-rajoitus jokaiseen img-tagiin
      .replace(/<img(\s)/gi, '<img style="max-width:580px;height:auto;display:block;"$1');

    const html = `<!DOCTYPE html>
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
<body>
  <div class="WordSection1">
    ${cleanedQuote}
  </div>
</body>
</html>`;

    const blob = new Blob(['﻿', html], { type: "application/msword;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 1000);
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
      localStorage.setItem("certuslex_first_send", "1");
      if (!checklistDone) setChecklistDone(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Virhe");
    } finally {
      setSending(false);
    }
  }

  const stepNum = { company: 1, project: 2, specs: 3, generating: 3, result: 3, send: 3 }[step];

  // Koodi käytetty loppuun — ei kirjautunut käyttäjä
  if (!userEmail && accessCode && codeUsesLeft === 0) return (
    <div style={{ background: "#F7F4EE", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "2rem" }}>
      <div style={{ background: "#fff", border: "2px solid #C8A44A", padding: "3rem 3.5rem", maxWidth: "480px", textAlign: "center" }}>
        <div style={{ fontSize: "2.5rem", marginBottom: "1rem" }}>🎯</div>
        <p style={{ fontSize: "0.72rem", fontWeight: 700, letterSpacing: "0.14em", color: "#C8A44A", marginBottom: "0.8rem" }}>KÄYTTÖKERRAT KÄYTETTY</p>
        <h2 style={{ fontFamily: "var(--font-cormorant), Georgia, serif", fontSize: "1.8rem", fontWeight: 700, color: "#0F1F3D", margin: "0 0 1rem" }}>
          {lang === "en" ? "All uses spent" : "Kaikki käyttökerrat käytetty"}
        </h2>
        <p style={{ fontSize: "0.88rem", color: "#8A8070", margin: "0 0 2rem", lineHeight: 1.6 }}>
          {lang === "en" ? "Your access code is used up. Subscribe to continue creating professional quotes." : "Käyttökoodisi on käytetty loppuun. Tilaa paketti jatkaaksesi ammattimaisten tarjousten luomista."}
        </p>
        <a href="/hinnoittelu" style={{ display: "inline-block", background: "#C8A44A", color: "#0F1F3D", padding: "0.9rem 2.5rem", fontSize: "0.95rem", fontWeight: 700, textDecoration: "none", letterSpacing: "0.05em" }}>
          {lang === "en" ? "View plans →" : "Katso paketit →"}
        </a>
        <p style={{ fontSize: "0.75rem", color: "#8A8070", marginTop: "1.5rem" }}>
          {lang === "en" ? "Questions? " : "Kysymyksiä? "}<a href="mailto:info@certuslex.fi" style={{ color: "#C8A44A" }}>info@certuslex.fi</a>
        </p>
      </div>
    </div>
  );

  // Paywall
  if (isExpired) return (
    <div style={{ background: "#F7F4EE", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "2rem" }}>
      <div style={{ background: "#fff", border: "2px solid #C8A44A", padding: "3rem 3.5rem", maxWidth: "480px", textAlign: "center" }}>
        <div style={{ fontSize: "2.5rem", marginBottom: "1rem" }}>⏰</div>
        <p style={{ fontSize: "0.72rem", fontWeight: 700, letterSpacing: "0.14em", color: "#C8A44A", marginBottom: "0.8rem" }}>{T.trialExpiredTitle.toUpperCase()}</p>
        <h2 style={{ fontFamily: "var(--font-cormorant), Georgia, serif", fontSize: "1.8rem", fontWeight: 700, color: "#0F1F3D", margin: "0 0 1rem" }}>
          {lang === "en" ? "Subscribe to continue" : "Jatka tilaamalla paketti"}
        </h2>
        <p style={{ fontSize: "0.88rem", color: "#8A8070", margin: "0 0 2rem", lineHeight: 1.6 }}>{T.trialExpiredDesc}</p>
        <Link href="/hinnoittelu"
          style={{ display: "inline-block", background: "#C8A44A", color: "#0F1F3D", padding: "0.9rem 2.5rem", fontSize: "0.95rem", fontWeight: 700, textDecoration: "none", letterSpacing: "0.05em" }}>
          {T.trialExpiredBtn}
        </Link>
        <p style={{ fontSize: "0.75rem", color: "#8A8070", marginTop: "1.5rem" }}>
          {lang === "en" ? "Questions? " : "Kysymyksiä? "}<a href="mailto:info@certuslex.fi" style={{ color: "#C8A44A" }}>info@certuslex.fi</a>
        </p>
      </div>
    </div>
  );

  const stepLabels = lang === "en"
    ? [{ n: 1, label: "Company Info" }, { n: 2, label: "Project" }, { n: 3, label: "Specs & generation" }]
    : [{ n: 1, label: "Yritystiedot" }, { n: 2, label: "Projekti" }, { n: 3, label: "Speksit & generointi" }];

  return (
    <div style={{ background: "#F7F4EE", minHeight: "100vh" }}>
      {/* Koodi-banneri */}
      {accessCode && !userEmail && codeUsesLeft !== null && (
        <div style={{ background: codeUsesLeft <= 2 ? "#FFF8E7" : "#F0FDF4", borderBottom: `2px solid ${codeUsesLeft <= 2 ? "#C8A44A" : "#86efac"}`, padding: "0.6rem 2rem", display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: "0.82rem" }}>
          <span style={{ color: codeUsesLeft <= 2 ? "#7A4F00" : "#166534", fontWeight: 600 }}>
            {codeUsesLeft <= 2 ? "⚠️" : "🔑"} {lang === "en" ? `Access code active — ${codeUsesLeft} use${codeUsesLeft !== 1 ? "s" : ""} remaining` : `Käyttökoodi aktiivinen — ${codeUsesLeft} käyttökertaa jäljellä`}
          </span>
          <a href="/hinnoittelu" style={{ color: "#C8A44A", fontWeight: 700, textDecoration: "none", fontSize: "0.78rem" }}>
            {lang === "en" ? "Subscribe →" : "Tilaa paketti →"}
          </a>
        </div>
      )}

      {/* Trial-banneri */}
      {userEmail && trialDaysLeft !== null && trialDaysLeft <= 7 && !isExpired && (
        <div style={{ background: trialDaysLeft <= 3 ? "#fff0f0" : "#FFF8E7", borderBottom: `2px solid ${trialDaysLeft <= 3 ? "#f5c6cb" : "#C8A44A"}`, padding: "0.6rem 2rem", display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: "0.82rem" }}>
          <span style={{ color: trialDaysLeft <= 3 ? "#9b2335" : "#7A4F00", fontWeight: 600 }}>
            {trialDaysLeft <= 3 ? "⚠️" : "⏳"} {T.trialBanner} {trialDaysLeft === 0 ? T.trialToday : `${trialDaysLeft} ${T.trialDays}`}
          </span>
          <Link href="/hinnoittelu" style={{ color: "#C8A44A", fontWeight: 700, textDecoration: "none", fontSize: "0.78rem" }}>
            {T.choosePlan}
          </Link>
        </div>
      )}

      {/* Nav */}
      <nav style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "1.2rem 3rem", borderBottom: "1px solid #EDE8DE", background: "#fff" }}>
        <Link href="/" style={{ fontFamily: "var(--font-cormorant), Georgia, serif", fontSize: "1.8rem", fontWeight: 700, textDecoration: "none", color: "#0F1F3D", letterSpacing: "-0.02em" }}>
          Certus<span style={{ color: "#C8A44A" }}>Lex</span>
          <span style={{ fontSize: "0.9rem", fontWeight: 400, color: "#C8A44A", marginLeft: "0.5rem", fontFamily: "inherit" }}>/ {T.title}</span>
        </Link>
        <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
          {userEmail ? (
            <>
              <Link href="/tarjoukset" style={{ fontSize: "0.82rem", color: "#0F1F3D", textDecoration: "none", fontWeight: 500 }}>{t[lang].nav.archive}</Link>
              <Link href="/profiili" style={{ fontSize: "0.82rem", color: "#C8A44A", textDecoration: "none", fontWeight: 500 }}>{t[lang].nav.profile}</Link>
            </>
          ) : (
            <>
              <Link href="/hinnoittelu" style={{ fontSize: "0.82rem", color: "#C8A44A", textDecoration: "none", fontWeight: 600 }}>{t[lang].nav.pricing}</Link>
              <Link href="/kirjaudu" style={{ fontSize: "0.82rem", color: "#8A8070", textDecoration: "none" }}>{t[lang].nav.login} →</Link>
            </>
          )}
          <Link href={lang === "en" ? "/en/help" : "/ohjeet"} style={{ fontSize: "0.82rem", color: "#8A8070", textDecoration: "none" }}>{t[lang].nav.help}</Link>
          <button onClick={toggleLang}
            style={{ background: "none", border: "1px solid #EDE8DE", color: "#8A8070", fontSize: "0.75rem", cursor: "pointer", padding: "0.25rem 0.6rem", borderRadius: "3px" }}>
            {lang === "fi" ? "🇬🇧 EN" : "🇫🇮 FI"}
          </button>
        </div>
      </nav>

      {/* Aloitusopas-checklist uusille käyttäjille */}
      {userEmail && !checklistDone && !isDemoMode && (
        <div style={{ background: "#0F1F3D", borderBottom: "2px solid #C8A44A", padding: "0.7rem 3rem", display: "flex", alignItems: "center", gap: "2rem", flexWrap: "wrap" }}>
          <span style={{ fontSize: "0.7rem", letterSpacing: "0.12em", color: "#C8A44A", fontWeight: 700, flexShrink: 0 }}>ALOITUSOPAS</span>
          {[
            { label: "Luo tili", done: true },
            { label: "Täytä profiili", done: profileLoaded },
            { label: "Tee tarjous", done: !!localStorage.getItem?.("certuslex_first_quote") },
            { label: "Lähetä asiakkaalle", done: !!localStorage.getItem?.("certuslex_first_send") },
          ].map((s, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
              <span style={{ width: "16px", height: "16px", borderRadius: "50%", background: s.done ? "#C8A44A" : "rgba(255,255,255,0.1)", border: s.done ? "none" : "1px solid rgba(200,164,74,0.4)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                {s.done && <span style={{ color: "#0F1F3D", fontSize: "9px", fontWeight: 900 }}>✓</span>}
              </span>
              <span style={{ fontSize: "0.75rem", color: s.done ? "#C8A44A" : "rgba(255,255,255,0.5)", fontWeight: s.done ? 600 : 400 }}>{s.label}</span>
            </div>
          ))}
          <button onClick={() => { setChecklistDone(true); localStorage.setItem("certuslex_checklist_dismissed", "1"); }}
            style={{ marginLeft: "auto", background: "none", border: "none", color: "rgba(255,255,255,0.3)", fontSize: "0.75rem", cursor: "pointer", padding: 0 }}>
            ✕ piilota
          </button>
        </div>
      )}

      {/* Profiili ladattu */}
      {profileLoaded && step === "company" && (
        <div style={{ background: "#f0fdf4", borderBottom: "1px solid #86efac", padding: "0.6rem 3rem", fontSize: "0.82rem", color: "#166534", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span>✅ {T.profileLoaded}</span>
          <Link href="/profiili" style={{ color: "#166534", fontWeight: 600, textDecoration: "none" }}>{lang === "en" ? "Edit →" : "Muokkaa →"}</Link>
        </div>
      )}

      {/* Progress bar */}
      {step !== "result" && (
        <div style={{ background: "#fff", borderBottom: "1px solid #EDE8DE", padding: "1rem 3rem" }}>
          <div style={{ maxWidth: "680px", margin: "0 auto", display: "flex", gap: "0.5rem", alignItems: "center" }}>
            {stepLabels.map((s, i) => (
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

        {/* ── STEP 1 ── */}
        {step === "company" && (
          <div>
            <div style={{ borderLeft: "4px solid #C8A44A", paddingLeft: "1.2rem", marginBottom: "2.5rem" }}>
              <div style={{ fontSize: "0.72rem", letterSpacing: "0.14em", color: "#C8A44A", marginBottom: "0.3rem" }}>{lang === "en" ? "STEP 1 / 3" : "VAIHE 1 / 3"}</div>
              <h1 style={{ fontFamily: "var(--font-cormorant), Georgia, serif", fontSize: "2rem", fontWeight: 700, color: "#0F1F3D" }}>{T.step1}</h1>
              <p style={{ fontSize: "0.85rem", color: "#8A8070", marginTop: "0.3rem" }}>{lang === "en" ? "These details appear in every quote. Fill in once." : "Nämä tiedot näkyvät jokaisessa tarjouksessa. Täytä kerran — tallentuvat selaimeesi."}</p>
            </div>

            <div style={{ background: "#fff", border: "1px solid #EDE8DE", padding: "2rem", marginBottom: "1.5rem" }}>
              <Input label={t[lang].profiili.companyName} value={company.name} onChange={v => setCompany(p => ({ ...p, name: v }))} placeholder={lang === "en" ? "Example Ltd" : "Rakennus Oy Esimerkki"} />
              <Input label={t[lang].profiili.businessId} value={company.businessId} onChange={v => setCompany(p => ({ ...p, businessId: v }))} placeholder="1234567-8" />
              <Input label={t[lang].profiili.street} value={company.address} onChange={v => setCompany(p => ({ ...p, address: v }))} placeholder={lang === "en" ? "Example Street 1, 00100 Helsinki" : "Esimerkkikatu 1, 00100 Helsinki"} />
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                <Input label={t[lang].profiili.contact} value={company.contact} onChange={v => setCompany(p => ({ ...p, contact: v }))} placeholder={lang === "en" ? "Jane Smith" : "Matti Meikäläinen"} />
                <Input label={t[lang].profiili.phone} value={company.phone} onChange={v => setCompany(p => ({ ...p, phone: v }))} placeholder="+358 40 123 4567" />
              </div>
              <Input label={t[lang].profiili.email} value={company.email} onChange={v => setCompany(p => ({ ...p, email: v }))} placeholder="info@company.fi" type="email" />
              <div style={{ display: "grid", gridTemplateColumns: project.type === "Tuotemyynti" || project.type === "Product sale" ? "1fr" : "1fr 1fr", gap: "1rem" }}>
                {project.type !== "Tuotemyynti" && project.type !== "Product sale" && (
                  <Input label={t[lang].profiili.hourlyRate} value={company.hourlyRate} onChange={v => setCompany(p => ({ ...p, hourlyRate: v }))} placeholder="85" />
                )}
                <Input label={t[lang].profiili.paymentTerms} value={company.paymentTerms} onChange={v => setCompany(p => ({ ...p, paymentTerms: v }))} placeholder={lang === "en" ? "14 days net" : "14 päivää netto"} />
              </div>
            </div>

            <button
              disabled={!company.name || !company.contact || !company.email}
              onClick={() => setStep("project")}
              style={{ width: "100%", background: !company.name || !company.contact || !company.email ? "#EDE8DE" : "#0F1F3D", color: !company.name || !company.contact || !company.email ? "#8A8070" : "#C8A44A", border: "none", padding: "1rem", fontSize: "0.9rem", fontWeight: 600, cursor: !company.name || !company.contact || !company.email ? "not-allowed" : "pointer", letterSpacing: "0.05em" }}>
              {lang === "en" ? "Next: Project Details →" : "Seuraava: Projektin tiedot →"}
            </button>
          </div>
        )}

        {/* ── STEP 2 ── */}
        {step === "project" && (
          <div>
            <div style={{ borderLeft: "4px solid #C8A44A", paddingLeft: "1.2rem", marginBottom: "2.5rem" }}>
              <div style={{ fontSize: "0.72rem", letterSpacing: "0.14em", color: "#C8A44A", marginBottom: "0.3rem" }}>{lang === "en" ? "STEP 2 / 3" : "VAIHE 2 / 3"}</div>
              <h1 style={{ fontFamily: "var(--font-cormorant), Georgia, serif", fontSize: "2rem", fontWeight: 700, color: "#0F1F3D" }}>{lang === "en" ? "Project Details" : "Projektin tiedot"}</h1>
              <p style={{ fontSize: "0.85rem", color: "#8A8070", marginTop: "0.3rem" }}>{lang === "en" ? "Who is the quote for and what is it about?" : "Kenelle tarjous menee ja mistä on kyse?"}</p>
            </div>

            <div style={{ background: "#fff", border: "1px solid #EDE8DE", padding: "2rem", marginBottom: "1.5rem" }}>
              <Input label={lang === "en" ? "CLIENT NAME / COMPANY *" : "ASIAKKAAN NIMI / YRITYS *"} value={project.clientName} onChange={v => setProject(p => ({ ...p, clientName: v }))} placeholder={lang === "en" ? "Client Ltd" : "Asiakas Oy"} />
              <Input label={lang === "en" ? "PROJECT NAME *" : "PROJEKTIN NIMI *"} value={project.projectName} onChange={v => setProject(p => ({ ...p, projectName: v }))} placeholder={lang === "en" ? "Website redesign" : "Verkkosivuston uudistus"} />

              <div style={{ marginBottom: "1.2rem" }}>
                <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 600, letterSpacing: "0.08em", color: "#0F1F3D", marginBottom: "0.4rem" }}>{lang === "en" ? "PROJECT TYPE *" : "PROJEKTIN TYYPPI *"}</label>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "0.5rem" }}>
                  {PROJECT_TYPES.map((pt, idx) => {
                    // Match by index so switching lang resets visual but keeps value
                    const fiFallback = PROJECT_TYPES_FI[idx];
                    const isSelected = project.type === pt || project.type === (lang === "en" ? PROJECT_TYPES_FI[idx] : PROJECT_TYPES_EN[idx]);
                    return (
                      <div key={pt} onClick={() => setProject(p => ({ ...p, type: fiFallback }))}
                        style={{ border: `1px solid ${isSelected ? "#C8A44A" : "#EDE8DE"}`, background: isSelected ? "rgba(200,164,74,.06)" : "#fff", padding: "0.6rem", fontSize: "0.78rem", cursor: "pointer", textAlign: "center", color: isSelected ? "#0F1F3D" : "#8A8070", fontWeight: isSelected ? 600 : 400 }}>
                        {pt}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                <Input label={lang === "en" ? "EST. START DATE" : "ARVIOITU ALOITUS"} value={project.startDate} onChange={v => setProject(p => ({ ...p, startDate: v }))} type="date" />
                <Input label={lang === "en" ? "VALID UNTIL" : "TARJOUS VOIMASSA"} value={project.validUntil} onChange={v => setProject(p => ({ ...p, validUntil: v }))} type="date" />
              </div>
            </div>

            <div style={{ display: "flex", gap: "1rem" }}>
              <button onClick={() => setStep("company")} style={{ flex: "none", background: "transparent", border: "1px solid #EDE8DE", color: "#8A8070", padding: "1rem 1.5rem", fontSize: "0.85rem", cursor: "pointer" }}>{T.back}</button>
              <button disabled={!project.clientName || !project.projectName || !project.type} onClick={() => setStep("specs")}
                style={{ flex: 1, background: !project.clientName || !project.projectName || !project.type ? "#EDE8DE" : "#0F1F3D", color: !project.clientName || !project.projectName || !project.type ? "#8A8070" : "#C8A44A", border: "none", padding: "1rem", fontSize: "0.9rem", fontWeight: 600, cursor: !project.clientName || !project.projectName || !project.type ? "not-allowed" : "pointer", letterSpacing: "0.05em" }}>
                {lang === "en" ? "Next: Specs →" : "Seuraava: Speksit →"}
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 3: SPEKSIT ── */}
        {step === "specs" && (
          <div>
            <div style={{ borderLeft: "4px solid #C8A44A", paddingLeft: "1.2rem", marginBottom: "2.5rem" }}>
              <div style={{ fontSize: "0.72rem", letterSpacing: "0.14em", color: "#C8A44A", marginBottom: "0.3rem" }}>{lang === "en" ? "STEP 3 / 3" : "VAIHE 3 / 3"}</div>
              <h1 style={{ fontFamily: "var(--font-cormorant), Georgia, serif", fontSize: "2rem", fontWeight: 700, color: "#0F1F3D" }}>{lang === "en" ? "Project Specs" : "Projektin speksit"}</h1>
              <p style={{ fontSize: "0.85rem", color: "#8A8070", marginTop: "0.3rem" }}>{lang === "en" ? "Describe what needs to be done — AI builds the quote. The more detail, the better." : "Kuvaile mitä tehdään — AI rakentaa tarjouksen. Mitä tarkemmin kuvailet, sitä parempi tulos."}</p>
            </div>

            {error && <div style={{ background: "#fff0f0", border: "1px solid #9b2335", padding: "0.8rem 1rem", marginBottom: "1rem", fontSize: "0.85rem", color: "#9b2335" }}>{error}</div>}

            <div style={{ background: "#fff", border: "1px solid #EDE8DE", padding: "2rem", marginBottom: "1rem" }}>
              <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 600, letterSpacing: "0.08em", color: "#0F1F3D", marginBottom: "0.4rem" }}>{T.specsLabel}</label>
              <textarea value={specs} onChange={e => setSpecs(e.target.value)} rows={10}
                placeholder={(() => {
                  const ind = company.industry;
                  const examples: Record<string, string> = {
                    lvi: `Kuvaile tarkasti mitä LVI-työ sisältää. Esimerkiksi:\n\n- Kohde: kerrostalo, 12 asuntoa, 1970-luvun rakennus\n- Työ: käyttövesiputkiston uusiminen kupariputkella (DN15–DN32)\n- Materiaalit: kupariputket, liittimet, venttiilit, eristeet (arvio n. 4 500 €)\n- Työvaiheet: vanhan putken purku, uuden asennus, eristys, painekoe\n- Työmäärä: 2 LVI-asentajaa × 5 päivää\n- Erityistä: työ tehdään asukkaiden kannalta haastavissa olosuhteissa, vesi poikki max 4h/päivä\n- Lupakuvat ja dokumentointi sisältyy`,
                    rakenne: `Kuvaile tarkasti urakan sisältö. Esimerkiksi:\n\n- Kohde: omakotitalo, 150 m², Espoo\n- Työ: kylpyhuoneremontti täydellinen — purkutyöt, vesieristys, kaakeli, kalusteet\n- Materiaalit: asiakkaan valitsemat kaakelit (n. 80 m²), vesieriste, valulaatta\n- Työvaiheet: purku, kaatovalu, vesieristys, kaakelointi, kalusteasennus, silikonointi\n- Työmäärä: 2 rakennusmiestä × 10 päivää\n- Aikataulu: aloitus heti, valmis 3 viikossa\n- YSE 1998 -ehdot, takuu 2 vuotta`,
                    sahko: `Kuvaile tarkasti sähkötyön sisältö. Esimerkiksi:\n\n- Kohde: liiketila 200 m², Tampere\n- Työ: sähköistyksen täydellinen uusiminen — nousukaapeli, jakokeskus, pistorasiat, valaistus\n- Materiaalit: 3-vaiheinen jakokeskus 63A, MMJ-kaapelit, LED-valaisimet 40 kpl\n- Työvaiheet: suunnittelu, kaapelointi, keskuksen kytkentä, testaus, käyttöönottotarkastus\n- Työmäärä: 2 sähköasentajaa × 4 päivää\n- Tarkastusmittaukset ja dokumentointi (sähköpiirustukset) sisältyy\n- Käyttöönottotarkastus viranomaisen kanssa`,
                    it: `Kuvaile projekti tarkasti. Esimerkiksi:\n\n- Projekti: verkkokaupan uudistus React + Node.js -teknologioilla\n- Laajuus: tuotelistaus, ostoskori, maksujärjestelmä (Stripe), asiakastili\n- Vaiheet: vaatimusmäärittely (5h), UI/UX-suunnittelu (15h), frontend (60h), backend + API (40h), testaus (15h), käyttöönotto (5h)\n- Integraatiot: WooCommerce-tuotedata, Stripe-maksu, PostNord-toimitus\n- Teknologia: React 18, Next.js 14, Node.js, PostgreSQL, AWS\n- Ylläpito: 10h/kk SLA-sopimus tarjolla erikseen\n- Projektin kesto: n. 3 kk`,
                    markkinointi: `Kuvaile toimeksianto tarkasti. Esimerkiksi:\n\n- Toimeksianto: B2B-yrityksen brändiuudistus + markkinointimateriaalit\n- Sisältö: logo, värimaailma, fonttiopas, käyntikortti, esitepohja, PowerPoint-pohja\n- Lisäksi: 3 kk some-sisältökalenteri (Instagram, LinkedIn), 12 julkaisua/kk\n- Suunnittelutyö: 40h\n- Kuvamateriaalit: stock-kuvat (lisenssi sisältyy)\n- Tekijänoikeudet siirtyvät tilaajalle luovutuksen yhteydessä`,
                    kiinteisto: `Kuvaile palvelun sisältö tarkasti. Esimerkiksi:\n\n- Kohde: toimistokiinteistö 1 500 m², Helsinki\n- Palvelu: kiinteistönhoitosopimus 12 kk\n- Sisältö: lämmitysjärjestelmän valvonta ja huolto, lumenauraus + hiekoitus, nurmikon hoito, siivous 2×/vk\n- Henkilöstö: 1 kiinteistönhoitaja + siivoustiimi\n- Päivystys: 24/7 vikailmoitukset\n- Raportointi: kuukausiraportti tilaajalle`,
                    taloushallinto: `Kuvaile palvelun sisältö tarkasti. Esimerkiksi:\n\n- Asiakas: kasvuyritys, 8 henkilöä, liikevaihto n. 1,2 M€/vuosi\n- Palvelut: juokseva kirjanpito, arvonlisäveroilmoitukset (kuukausittain), palkanlaskenta (8 henkilöä)\n- Tilinpäätös: vuosittainen, sisältää veroilmoituksen\n- Ohjelmisto: Procountor (lisenssi asiakkaalla)\n- Lisäpalvelut: kvartaaliraportointi johdolle, budjetointi tarvittaessa\n- Aloitus: heti`,
                    juridiikka: `Kuvaile toimeksianto tarkasti. Esimerkiksi:\n\n- Toimeksianto: yrityskaupan juridinen neuvonta ostajan puolella\n- Kohde: teknologiayritys, kauppahinta n. 2 M€\n- Vaiheet: due diligence -tarkastus, kauppakirjan laadinta, neuvottelutuki, sulkeminen\n- Arvioitu työmäärä: 40–60 tuntia\n- Erityistä: myyjällä oma juristi, tavoite sulkea kauppa 3 kuukaudessa\n- Kulut (käräjämaksut, rekisteröinti-ilmoitukset) veloitetaan erikseen toteutuneen mukaan`,
                    kuljetus: `Kuvaile kuljetustarve tarkasti. Esimerkiksi:\n\n- Reitti: Helsinki → Tampere, viikoittain tiistaisin\n- Lasti: elintarvikkeet, 10 EUR-lavaa, yhteensä n. 8 000 kg\n- Kalusto: täysperävaunu (13,6 m) + hydraulinen nosturi\n- Erityisvaatimukset: kylmäkuljetus +4°C, HACCP-dokumentointi\n- Sopimuskausi: 12 kk, aloitus heti\n- Polttoainelisä: markkinaindeksin mukaan`,
                    teollisuus: `Kuvaile tilaus tarkasti. Esimerkiksi:\n\n- Tuote: teräsrakenne, hitsattu, materiaali S355\n- Mitat: 3 000 × 800 × 600 mm, paino n. 450 kg\n- Valmistus: plasma- tai laserleikkaus, särmäys, MIG-hitsaus, pintakäsittely (maalaus RAL 7016)\n- Määrä: 5 kpl (protoerä), jatkotilaukset mahdollisia\n- Toleranssit: ISO 2768-m\n- Dokumentointi: EN 1090 -sertifiointi, hitsauspöytäkirjat\n- Toimitusaika: 4 viikkoa`,
                    siivous: `Kuvaile palvelu tarkasti. Esimerkiksi:\n\n- Kohde: toimisto 300 m², 2 kerrosta, Helsinki\n- Palvelu: ylläpitosiivoussopimus 12 kk\n- Tiheys: 3× viikossa (ma, ke, pe), kesto n. 3h/kerta\n- Sisältö: toimistotilat, neuvotteluhuoneet, wc:t (4 kpl), keittiö, käytävät\n- Perussiivous: 2× vuodessa (ikkunat, kaappien päälliset)\n- Pesuaineet ja tarvikkeet sisältyvät hintaan`,
                    maisemointi: `Kuvaile työ tarkasti. Esimerkiksi:\n\n- Kohde: omakotitalon piha 800 m², Vantaa\n- Työ: piharemontti — nurmikko, istutukset, kiveys, aitaus\n- Materiaalit: nurmikonsiemenet tai valmis nurmimatto (300 m²), pensaat 20 kpl, kiveyslaatat 80 m²\n- Kaivinkone: tarvitaan maansiirtoon (1 päivä)\n- Kasteluputkisto: automaattinen, 6 vyöhykettä\n- Jätteet: kuljetus pois sisältyy\n- Istutustakuu: 1 kasvukausi`,
                  };
                  if (ind && examples[ind]) return examples[ind];
                  return lang === "en"
                    ? `Describe the project in detail. For example:\n\n- Materials: steel pipe DN100, 3mm, 50m length\n- Work stages: excavation, pipe installation, backfill\n- Est. effort: 3 people × 5 days\n- Special requirements: work in traffic, permits needed\n- Additional services: commissioning and testing included\n- Price estimate: materials ~€8,000, labour ~€12,000`
                    : `Kuvaile tarkasti mitä projekti sisältää. Esimerkiksi:\n\n- Materiaalit ja työvaiheet\n- Arvioitu työmäärä\n- Erityisvaatimukset\n- Lisäpalvelut\n- Hintataso-arvio`;
                })()}
                style={{ width: "100%", border: "1px solid #EDE8DE", padding: "0.8rem", fontSize: "0.88rem", outline: "none", fontFamily: "inherit", resize: "vertical", lineHeight: 1.6, boxSizing: "border-box" }} />
            </div>

            {/* Kate ja lisäohjeet */}
            <div style={{ background: "#fff", border: "1px solid #EDE8DE", padding: "1.5rem 2rem", marginBottom: "1rem" }}>
              <p style={{ fontSize: "0.72rem", fontWeight: 700, letterSpacing: "0.1em", color: "#0F1F3D", margin: "0 0 1rem" }}>
                ⚙️ {lang === "en" ? "PRICING SETTINGS" : "HINNOITTELUASETUKSET"} <span style={{ color: "#8A8070", fontWeight: 400, letterSpacing: 0 }}>({lang === "en" ? "optional" : "valinnainen"})</span>
              </p>
              <div style={{ display: "grid", gridTemplateColumns: "140px 1fr", gap: "1rem", alignItems: "start" }}>
                <div>
                  <label style={{ display: "block", fontSize: "0.72rem", fontWeight: 600, letterSpacing: "0.08em", color: "#0F1F3D", marginBottom: "0.4rem" }}>{T.marginLabel}</label>
                  <input
                    type="number"
                    value={margin}
                    onChange={e => setMargin(e.target.value)}
                    placeholder={lang === "en" ? "e.g. 20" : "esim. 20"}
                    min="0" max="200"
                    style={{ width: "100%", border: "1px solid #EDE8DE", padding: "0.7rem 0.9rem", fontSize: "0.9rem", outline: "none", fontFamily: "inherit", boxSizing: "border-box" as const, background: "#fff" }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "0.72rem", fontWeight: 600, letterSpacing: "0.08em", color: "#0F1F3D", marginBottom: "0.4rem" }}>{T.extraLabel}</label>
                  <input
                    type="text"
                    value={extraInstructions}
                    onChange={e => setExtraInstructions(e.target.value)}
                    placeholder={T.extraPlaceholder}
                    style={{ width: "100%", border: "1px solid #EDE8DE", padding: "0.7rem 0.9rem", fontSize: "0.9rem", outline: "none", fontFamily: "inherit", boxSizing: "border-box" as const, background: "#fff" }}
                  />
                </div>
              </div>
            </div>

            {/* Tiedostoliite */}
            <div style={{ background: "#fff", border: "1px solid #EDE8DE", padding: "1.5rem 2rem", marginBottom: "1rem" }}>
              <p style={{ fontSize: "0.72rem", fontWeight: 700, letterSpacing: "0.1em", color: "#0F1F3D", margin: "0 0 0.8rem" }}>{T.attachLabel} <span style={{ color: "#8A8070", fontWeight: 400, letterSpacing: 0 }}>({lang === "en" ? "optional" : "valinnainen"})</span></p>
              <p style={{ fontSize: "0.8rem", color: "#8A8070", margin: "0 0 1rem" }}>{T.attachDesc}</p>

              {attachments.length > 0 && (
                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", marginBottom: "0.8rem" }}>
                  {attachments.map((att, idx) => (
                    <div key={idx} style={{ display: "flex", alignItems: "center", gap: "1rem", background: "#F0FDF4", border: "1px solid #86EFAC", padding: "0.7rem 1rem" }}>
                      <span style={{ fontSize: "1.3rem" }}>
                        {att.mimeType.startsWith("image/") ? "🖼️" : (att.mimeType.includes("sheet") || att.mimeType.includes("excel") || att.name.match(/\.(xlsx|xls|csv)$/i)) ? "📊" : "📄"}
                      </span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: "0.83rem", fontWeight: 600, color: "#166534", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{att.name}</div>
                        <div style={{ fontSize: "0.71rem", color: "#4ADE80" }}>
                          {(att.size / 1024).toFixed(0)} {lang === "en" ? "KB" : "kt"} — {att.mimeType.startsWith("image/") ? (lang === "en" ? "Image (vision)" : "Kuva (vision)") : (att.mimeType.includes("sheet") || att.mimeType.includes("excel") || att.name.match(/\.(xlsx|xls|csv)$/i)) ? (lang === "en" ? "Excel/CSV → text" : "Excel/CSV → teksti") : "PDF"}
                        </div>
                      </div>
                      <button onClick={() => setAttachments(prev => prev.filter((_, i) => i !== idx))}
                        style={{ background: "none", border: "none", color: "#9b2335", cursor: "pointer", fontSize: "1.1rem", padding: "0.2rem 0.4rem", lineHeight: 1 }}>✕</button>
                    </div>
                  ))}
                </div>
              )}
              <button onClick={() => attachRef.current?.click()}
                style={{ display: "flex", alignItems: "center", gap: "0.6rem", background: "transparent", border: "2px dashed #C8A44A", color: "#0F1F3D", padding: "0.8rem 1.4rem", fontSize: "0.83rem", fontWeight: 600, cursor: "pointer", width: "100%", justifyContent: "center" }}>
                <span style={{ fontSize: "1.1rem" }}>📎</span> {attachments.length > 0 ? (lang === "en" ? "Add another file" : "Lisää toinen tiedosto") : T.attachBtn}
              </button>
              <input ref={attachRef} type="file" multiple accept="application/pdf,image/png,image/jpeg,image/jpg,image/webp,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv,.xlsx,.xls,.csv" style={{ display: "none" }} onChange={handleAttachmentSelect} />
            </div>

            {/* Kohteen kuva */}
            <div style={{ background: "#fff", border: "1px solid #EDE8DE", padding: "1.5rem 2rem", marginBottom: "1rem" }}>
              <p style={{ fontSize: "0.72rem", fontWeight: 700, letterSpacing: "0.1em", color: "#0F1F3D", margin: "0 0 0.5rem" }}>
                🖼️ {lang === "en" ? "PROJECT PHOTO" : "KOHTEEN KUVA"} <span style={{ color: "#8A8070", fontWeight: 400, letterSpacing: 0 }}>({lang === "en" ? "optional" : "valinnainen"})</span>
              </p>
              <p style={{ fontSize: "0.8rem", color: "#8A8070", margin: "0 0 1rem" }}>
                {lang === "en" ? "Add a photo of the site or property — it appears as a full-width banner at the top of the quote." : "Lisää kuva kohteesta tai kiinteistöstä — se näkyy tarjouksen yläosassa leveänä banneri-kuvana."}
              </p>

              {projectImageUrl && (
                <div style={{ position: "relative", marginBottom: "0.8rem", border: "2px solid #C8A44A" }}>
                  <img src={projectImageUrl} alt="Kohteen kuva" style={{ width: "100%", maxHeight: "180px", objectFit: "cover", display: "block" }} />
                  <button
                    onClick={() => setProjectImageUrl("")}
                    style={{ position: "absolute", top: "8px", right: "8px", background: "#0F1F3D", border: "none", color: "#C8A44A", width: "28px", height: "28px", borderRadius: "50%", cursor: "pointer", fontSize: "1rem", lineHeight: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    ✕
                  </button>
                  <div style={{ background: "#0F1F3D", padding: "0.4rem 0.8rem", fontSize: "0.75rem", color: "rgba(255,255,255,0.6)" }}>
                    ✓ {lang === "en" ? "Photo added" : "Kuva lisätty"} — {lang === "en" ? "will appear in quote" : "näkyy tarjouksessa"}
                  </div>
                </div>
              )}

              {uploadingImage ? (
                <div style={{ display: "flex", alignItems: "center", gap: "0.8rem", padding: "0.8rem", color: "#8A8070", fontSize: "0.83rem" }}>
                  <div style={{ width: "18px", height: "18px", border: "2px solid #EDE8DE", borderTopColor: "#C8A44A", borderRadius: "50%", animation: "spin 1s linear infinite", flexShrink: 0 }} />
                  {lang === "en" ? "Uploading photo…" : "Ladataan kuvaa…"}
                </div>
              ) : (
                <button onClick={() => projectImageRef.current?.click()}
                  style={{ display: "flex", alignItems: "center", gap: "0.6rem", background: "transparent", border: "2px dashed #C8A44A", color: "#0F1F3D", padding: "0.8rem 1.4rem", fontSize: "0.83rem", fontWeight: 600, cursor: "pointer", width: "100%", justifyContent: "center" }}>
                  <span style={{ fontSize: "1.1rem" }}>🖼️</span> {projectImageUrl ? (lang === "en" ? "Change photo" : "Vaihda kuva") : (lang === "en" ? "Add site photo" : "Lisää kohteen kuva")}
                </button>
              )}
              <input ref={projectImageRef} type="file" accept="image/png,image/jpeg,image/jpg,image/webp" style={{ display: "none" }} onChange={handleProjectImageSelect} />
            </div>

            <div style={{ background: "rgba(200,164,74,.08)", border: "1px solid rgba(200,164,74,.3)", padding: "1rem 1.2rem", marginBottom: "1.5rem", fontSize: "0.82rem", color: "#4A4035" }}>
              💡 <strong>{lang === "en" ? "Tip:" : "Vinkki:"}</strong> {lang === "en" ? "Attach a quote request, material list, time estimate or other calculation base — AI uses all the information provided." : "Liitä mukaan tarjouspyyntö, materiaalilista, tuntiarvio tai muu laskentapohja — AI osaa hyödyntää kaiken annetun tiedon."}
            </div>

            <div style={{ display: "flex", gap: "1rem" }}>
              <button onClick={() => setStep("project")} style={{ flex: "none", background: "transparent", border: "1px solid #EDE8DE", color: "#8A8070", padding: "1rem 1.5rem", fontSize: "0.85rem", cursor: "pointer" }}>{T.back}</button>
              <button disabled={specs.trim().length < 20} onClick={generateQuote}
                style={{ flex: 1, background: specs.trim().length < 20 ? "#EDE8DE" : "#C8A44A", color: specs.trim().length < 20 ? "#8A8070" : "#0F1F3D", border: "none", padding: "1rem", fontSize: "0.9rem", fontWeight: 700, cursor: specs.trim().length < 20 ? "not-allowed" : "pointer", letterSpacing: "0.05em" }}>
                {T.generate}
              </button>
            </div>
          </div>
        )}

        {/* ── GENERATING ── */}
        {step === "generating" && (
          <div style={{ textAlign: "center", padding: "5rem 2rem" }}>
            <div style={{ width: "60px", height: "60px", border: "3px solid #EDE8DE", borderTopColor: "#C8A44A", borderRadius: "50%", animation: "spin 1s linear infinite", margin: "0 auto 2rem" }} />
            <h2 style={{ fontFamily: "var(--font-cormorant), Georgia, serif", fontSize: "1.8rem", color: "#0F1F3D", marginBottom: "0.5rem" }}>{T.generating}</h2>
            <p style={{ color: "#8A8070", fontSize: "0.9rem" }}>{attachments.length > 0 ? (lang === "en" ? `Analyzing specs and ${attachments.length} attached file${attachments.length > 1 ? "s" : ""} — this may take a moment longer.` : `Analysoidaan speksit ja ${attachments.length} liitetiedosto${attachments.length > 1 ? "a" : ""} — kestää hetken enemmän.`) : T.generatingDesc}</p>
          </div>
        )}

        {/* ── RESULT ── */}
        {step === "result" && (
          <div>
            {/* Demo-moodi CTA */}
            {isDemoMode && (
              <div style={{ background: "#0F1F3D", borderLeft: "4px solid #C8A44A", padding: "1.5rem 2rem", marginBottom: "2rem", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1.5rem", flexWrap: "wrap" }}>
                <div>
                  <div style={{ fontSize: "0.72rem", letterSpacing: "0.12em", color: "#C8A44A", fontWeight: 700, marginBottom: "0.3rem" }}>ESIKATSELU — DEMO</div>
                  <p style={{ color: "#fff", fontSize: "0.95rem", fontWeight: 600, margin: 0 }}>Luo ilmainen tili tallentaaksesi ja lähettääksesi tämän tarjouksen</p>
                  <p style={{ color: "rgba(255,255,255,0.6)", fontSize: "0.82rem", margin: "0.3rem 0 0" }}>Saat 3 ilmaista tarjousta — ei luottokorttia</p>
                </div>
                <div style={{ display: "flex", gap: "0.8rem", flexShrink: 0 }}>
                  <a href="/kirjaudu?plan=starter&trial=1" style={{ display: "inline-block", background: "#C8A44A", color: "#0F1F3D", padding: "0.8rem 1.8rem", fontSize: "0.9rem", fontWeight: 700, textDecoration: "none", letterSpacing: "0.04em" }}>
                    Luo tili ilmaiseksi →
                  </a>
                  <a href="/koodi" style={{ display: "inline-block", border: "1px solid rgba(200,164,74,0.5)", color: "#C8A44A", padding: "0.8rem 1.2rem", fontSize: "0.85rem", textDecoration: "none" }}>
                    Minulla on koodi
                  </a>
                </div>
              </div>
            )}

            <div style={{ borderLeft: "4px solid #C8A44A", paddingLeft: "1.2rem", marginBottom: "2rem" }}>
              <div style={{ fontSize: "0.72rem", letterSpacing: "0.14em", color: "#C8A44A", marginBottom: "0.3rem" }}>{lang === "en" ? "DONE" : "VALMIS"}</div>
              <h1 style={{ fontFamily: "var(--font-cormorant), Georgia, serif", fontSize: "2rem", fontWeight: 700, color: "#0F1F3D" }}>{T.result}</h1>
              <p style={{ fontSize: "0.85rem", color: "#8A8070", marginTop: "0.3rem" }}>{project.projectName} → {project.clientName}</p>
            </div>

            <div style={{ display: "flex", gap: "0.8rem", marginBottom: "1.5rem", flexWrap: "wrap" }}>
              <button onClick={copyToClipboard} style={{ background: "#0F1F3D", color: "#C8A44A", border: "none", padding: "0.8rem 1.4rem", fontSize: "0.82rem", fontWeight: 600, cursor: "pointer", letterSpacing: "0.04em" }}>
                {T.copy}
              </button>
              <button onClick={() => window.print()} style={{ background: "transparent", border: "1px solid #EDE8DE", color: "#0F1F3D", padding: "0.8rem 1.4rem", fontSize: "0.82rem", cursor: "pointer" }}>
                {T.print}
              </button>
              <button onClick={downloadAsWord} style={{ background: "transparent", border: "1px solid #C8A44A", color: "#C8A44A", padding: "0.8rem 1.4rem", fontSize: "0.82rem", cursor: "pointer", fontWeight: 600 }}>
                {lang === "en" ? "⬇ Word (.doc)" : "⬇ Word (.doc)"}
              </button>
              <button onClick={() => { setStep("specs"); setQuote(""); }} style={{ background: "transparent", border: "1px solid #EDE8DE", color: "#8A8070", padding: "0.8rem 1.4rem", fontSize: "0.82rem", cursor: "pointer" }}>
                {T.regenerate}
              </button>
            </div>

            {/* Piilotetaan lähetysosio demo-moodissa */}
            {isDemoMode && (
              <div style={{ background: "#FAF7F2", border: "1px solid rgba(200,164,74,.3)", padding: "1.2rem 2rem", marginBottom: "1.5rem", textAlign: "center" }}>
                <p style={{ fontSize: "0.85rem", color: "#4A4035", margin: 0 }}>🔒 Tarjouksen lähettäminen asiakkaalle vaatii tilin — <a href="/kirjaudu?plan=starter&trial=1" style={{ color: "#C8A44A", fontWeight: 700 }}>luo tili ilmaiseksi</a></p>
              </div>
            )}

            {!isDemoMode && <div style={{ background: "#FAF7F2", border: "1px solid rgba(200,164,74,.4)", padding: "1.5rem 2rem", marginBottom: "1.5rem" }}>
              <p style={{ fontSize: "0.75rem", fontWeight: 700, letterSpacing: "0.1em", color: "#0F1F3D", margin: "0 0 0.8rem" }}>{T.sendLabel}</p>
              <p style={{ fontSize: "0.82rem", color: "#4A4035", margin: "0 0 1rem" }}>{T.sendDesc}</p>
              <div style={{ display: "flex", gap: "0.8rem", alignItems: "flex-start" }}>
                <input
                  value={clientEmail}
                  onChange={e => setClientEmail(e.target.value)}
                  placeholder={`${project.clientName.toLowerCase().replace(/\s+/g, "")}@company.fi`}
                  type="email"
                  style={{ flex: 1, border: "1px solid #EDE8DE", padding: "0.7rem 0.9rem", fontSize: "0.9rem", outline: "none", boxSizing: "border-box" as const, background: "#fff" }}
                />
                <button
                  onClick={sendQuoteToClient}
                  disabled={sending || !clientEmail}
                  style={{ background: !clientEmail || sending ? "#EDE8DE" : "#C8A44A", color: !clientEmail || sending ? "#8A8070" : "#0F1F3D", border: "none", padding: "0.7rem 1.4rem", fontSize: "0.85rem", fontWeight: 700, cursor: !clientEmail || sending ? "not-allowed" : "pointer", whiteSpace: "nowrap" as const }}>
                  {sending ? T.sending : T.send + " →"}
                </button>
              </div>
              {error && <p style={{ color: "#9b2335", fontSize: "0.82rem", margin: "0.5rem 0 0" }}>{error}</p>}
            </div>}

            <div
              style={{ background: "#fff", padding: "2.5rem 2rem 8rem", fontSize: "0.88rem", lineHeight: 1.8, color: "#2C2416", fontFamily: "Georgia, serif", boxShadow: "0 8px 48px rgba(15,31,61,0.13), 0 2px 8px rgba(15,31,61,0.07)", borderTop: "4px solid #C8A44A" }}
              dangerouslySetInnerHTML={{ __html: quote }}
            />
          </div>
        )}

        {/* ── SEND SUCCESS ── */}
        {step === "send" && (
          <div style={{ textAlign: "center", padding: "3rem 1rem" }}>
            <div style={{ fontSize: "3.5rem", marginBottom: "1rem" }}>📨</div>
            <h2 style={{ fontFamily: "var(--font-cormorant), Georgia, serif", fontSize: "2rem", color: "#0F1F3D", marginBottom: "0.5rem" }}>{T.sent}</h2>
            <p style={{ color: "#8A8070", fontSize: "0.9rem", marginBottom: "2rem" }}>
              {lang === "en" ? "Email sent to " : "Sähköposti lähetetty osoitteeseen "}<strong style={{ color: "#0F1F3D" }}>{clientEmail}</strong>.<br/>
              {lang === "en" ? "The client can comment or sign the quote from the link." : "Asiakas voi kommentoida tai allekirjoittaa tarjouksen linkistä."}
            </p>
            <div style={{ background: "#FAF7F2", border: "1px solid #EDE8DE", padding: "1rem 1.5rem", marginBottom: "2rem", fontSize: "0.8rem", color: "#4A4035", textAlign: "left" }}>
              <p style={{ margin: "0 0 0.4rem", fontWeight: 600 }}>{lang === "en" ? "Quote link (can also share directly):" : "Tarjouslinkki (voit jakaa myös suoraan):"}</p>
              <a href={sentQuoteUrl} target="_blank" rel="noopener noreferrer" style={{ color: "#C8A44A", wordBreak: "break-all" as const, fontSize: "0.75rem" }}>{sentQuoteUrl}</a>
            </div>
            <div style={{ display: "flex", gap: "1rem", justifyContent: "center", flexWrap: "wrap" }}>
              <button onClick={() => { setStep("result"); setError(""); }} style={{ background: "transparent", border: "1px solid #EDE8DE", color: "#8A8070", padding: "0.8rem 1.5rem", cursor: "pointer", fontSize: "0.85rem" }}>
                {lang === "en" ? "← Back to quote" : "← Palaa tarjoukseen"}
              </button>
              <button onClick={() => { setStep("specs"); setQuote(""); setClientEmail(""); setSentQuoteUrl(""); }} style={{ background: "#0F1F3D", color: "#C8A44A", border: "none", padding: "0.8rem 1.5rem", cursor: "pointer", fontSize: "0.85rem", fontWeight: 600 }}>
                {lang === "en" ? "🔄 New quote" : "🔄 Tee uusi tarjous"}
              </button>
            </div>
          </div>
        )}
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } } @media print { nav, button, a { display: none !important; } }`}</style>
    </div>
  );
}
