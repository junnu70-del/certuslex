"use client";

export const dynamic = "force-dynamic";

import { useState, useEffect, useRef } from "react";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged, signOut, User } from "firebase/auth";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { t, type Lang } from "@/lib/translations";

interface CompanyProfile {
  name: string; businessId: string; address: string; city: string; zip: string;
  phone: string; email: string; invoiceEmail: string; iban: string; website: string;
  contact: string; hourlyRate: string; paymentTerms: string; logoUrl: string;
}

const empty: CompanyProfile = {
  name: "", businessId: "", address: "", city: "", zip: "",
  phone: "", email: "", invoiceEmail: "", iban: "", website: "",
  contact: "", hourlyRate: "", paymentTerms: "14 päivää netto", logoUrl: "",
};

const INP: React.CSSProperties = {
  width: "100%", border: "1px solid #EDE8DE", padding: "0.7rem 0.9rem",
  fontSize: "0.9rem", outline: "none", boxSizing: "border-box",
  fontFamily: "inherit", background: "#fff",
};
const LBL: React.CSSProperties = {
  display: "block", fontSize: "0.72rem", fontWeight: 700,
  letterSpacing: "0.08em", color: "#0F1F3D", marginBottom: "0.4rem",
};

export default function ProfiiliPage() {
  const router = useRouter();
  const [lang, setLang] = useState<Lang>("fi");
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<CompanyProfile>(empty);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [logoUploading, setLogoUploading] = useState(false);
  const [logoError, setLogoError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const T = t[lang].profiili;

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
        const res = await fetch("/api/profile", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          if (data && Object.keys(data).length > 0) setProfile(data as CompanyProfile);
          else setProfile({ ...empty, email: u.email ?? "" });
        } else {
          setProfile({ ...empty, email: u.email ?? "" });
        }
      } catch (err) {
        console.error("Profile load error:", err);
        setProfile({ ...empty, email: u.email ?? "" });
      } finally {
        setLoading(false);
      }
    });
    return () => unsub();
  }, [router]);

  async function handleSave() {
    if (!user) return;
    setSaving(true);
    setSaveError("");
    try {
      const token = await user.getIdToken();
      const res = await fetch("/api/profile", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(profile),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Tuntematon virhe");
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("Save error:", msg);
      setSaveError((lang === "en" ? "Save failed: " : "Tallennus epäonnistui: ") + msg);
    } finally {
      setSaving(false);
    }
  }

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setLogoError("");

    if (file.size > 500 * 1024) {
      setLogoError(lang === "en" ? "Logo too large — max 500 KB" : "Logo on liian suuri — max 500 KB");
      return;
    }

    setLogoUploading(true);
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      setProfile(p => ({ ...p, logoUrl: dataUrl }));
    } catch (err) {
      console.error("Logo upload error:", err);
      setLogoError(lang === "en" ? "Logo upload failed — try again" : "Logon lataus epäonnistui — yritä uudelleen");
    } finally {
      setLogoUploading(false);
    }
  }

  const upd = (k: keyof CompanyProfile) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setProfile(p => ({ ...p, [k]: e.target.value }));

  if (loading) return (
    <div style={{ background: "#F7F4EE", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ width: "40px", height: "40px", border: "3px solid #EDE8DE", borderTopColor: "#C8A44A", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  return (
    <div style={{ background: "#F7F4EE", minHeight: "100vh" }}>
      <nav style={{ background: "#0F1F3D", padding: "1rem 2rem", borderLeft: "4px solid #C8A44A", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <Link href="/" style={{ fontFamily: "var(--font-cormorant), Georgia, serif", fontSize: "1.6rem", fontWeight: 700, color: "#fff", textDecoration: "none" }}>
          Certus<span style={{ color: "#C8A44A" }}>Lex</span>
          <span style={{ fontSize: "0.85rem", color: "#C8A44A", marginLeft: "0.5rem" }}>/ {lang === "en" ? "Company Profile" : "Yritysprofiili"}</span>
        </Link>
        <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
          <Link href="/tarjouskone" style={{ color: "#C8A44A", fontSize: "0.82rem", textDecoration: "none" }}>{t[lang].nav.quoteTool} →</Link>
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

      <div style={{ maxWidth: "700px", margin: "0 auto", padding: "3rem 1.5rem 6rem" }}>
        <div style={{ borderLeft: "4px solid #C8A44A", paddingLeft: "1.2rem", marginBottom: "2.5rem" }}>
          <div style={{ fontSize: "0.7rem", letterSpacing: "0.14em", color: "#C8A44A", marginBottom: "0.3rem" }}>{lang === "en" ? "COMPANY PROFILE" : "YRITYSPROFIILI"}</div>
          <h1 style={{ fontFamily: "var(--font-cormorant), Georgia, serif", fontSize: "2rem", fontWeight: 700, color: "#0F1F3D", margin: 0 }}>{T.title}</h1>
          <p style={{ fontSize: "0.85rem", color: "#8A8070", margin: "0.3rem 0 0" }}>{T.subtitle}</p>
        </div>

        {/* Logo */}
        <div style={{ background: "#fff", border: "1px solid #EDE8DE", padding: "2rem", marginBottom: "1.5rem" }}>
          <p style={{ fontSize: "0.72rem", fontWeight: 700, letterSpacing: "0.1em", color: "#0F1F3D", margin: "0 0 1rem" }}>{T.logo}</p>
          <div style={{ display: "flex", alignItems: "center", gap: "1.5rem", flexWrap: "wrap" }}>
            {profile.logoUrl ? (
              <img src={profile.logoUrl} alt="Logo" style={{ height: "60px", maxWidth: "180px", objectFit: "contain", border: "1px solid #EDE8DE", padding: "0.5rem" }} />
            ) : (
              <div style={{ width: "120px", height: "60px", border: "2px dashed #EDE8DE", display: "flex", alignItems: "center", justifyContent: "center", color: "#8A8070", fontSize: "0.75rem" }}>{lang === "en" ? "No logo" : "Ei logoa"}</div>
            )}
            <div>
              <button onClick={() => fileRef.current?.click()} disabled={logoUploading}
                style={{ background: "#0F1F3D", color: "#C8A44A", border: "none", padding: "0.6rem 1.2rem", fontSize: "0.82rem", fontWeight: 600, cursor: "pointer", display: "block", marginBottom: "0.5rem" }}>
                {logoUploading ? (lang === "en" ? "Uploading..." : "Ladataan...") : profile.logoUrl ? T.changeLogo : T.uploadLogo}
              </button>
              <p style={{ fontSize: "0.75rem", color: "#8A8070", margin: 0 }}>{T.logoDesc}</p>
              {logoError && <p style={{ fontSize: "0.75rem", color: "#9b2335", margin: "0.4rem 0 0" }}>{logoError}</p>}
              {profile.logoUrl && (
                <button onClick={() => setProfile(p => ({ ...p, logoUrl: "" }))}
                  style={{ background: "none", border: "none", color: "#9b2335", fontSize: "0.75rem", cursor: "pointer", padding: "0.3rem 0", marginTop: "0.3rem" }}>
                  {T.removeLogo}
                </button>
              )}
            </div>
          </div>
          <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleLogoUpload} />
        </div>

        {/* Perustiedot */}
        <div style={{ background: "#fff", border: "1px solid #EDE8DE", padding: "2rem", marginBottom: "1.5rem" }}>
          <p style={{ fontSize: "0.72rem", fontWeight: 700, letterSpacing: "0.1em", color: "#0F1F3D", margin: "0 0 1.5rem" }}>{T.basics}</p>
          <div style={{ marginBottom: "1.1rem" }}>
            <label style={LBL}>{T.companyName}</label>
            <input value={profile.name} onChange={upd("name")} placeholder={lang === "en" ? "Example Ltd" : "Esimerkki Oy"} style={INP} />
          </div>
          <div style={{ marginBottom: "1.1rem" }}>
            <label style={LBL}>{T.businessId}</label>
            <input value={profile.businessId} onChange={upd("businessId")} placeholder="1234567-8" style={INP} />
          </div>
          <div style={{ marginBottom: "1.1rem" }}>
            <label style={LBL}>{T.contact}</label>
            <input value={profile.contact} onChange={upd("contact")} placeholder={lang === "en" ? "Jane Smith" : "Matti Meikäläinen"} style={INP} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1.1rem" }}>
            <div>
              <label style={LBL}>{T.phone}</label>
              <input value={profile.phone} onChange={upd("phone")} placeholder="+358 40 123 4567" style={INP} />
            </div>
            <div>
              <label style={LBL}>{T.email}</label>
              <input type="email" value={profile.email} onChange={upd("email")} placeholder="info@company.fi" style={INP} />
            </div>
          </div>
          <div style={{ marginBottom: "1.1rem" }}>
            <label style={LBL}>{T.invoiceEmail}</label>
            <input type="email" value={profile.invoiceEmail} onChange={upd("invoiceEmail")} placeholder={lang === "en" ? "invoicing@company.fi" : "laskutus@yritys.fi"} style={INP} />
          </div>
          <div style={{ marginBottom: "1.1rem" }}>
            <label style={LBL}>{T.website}</label>
            <input value={profile.website} onChange={upd("website")} placeholder="https://www.company.fi" style={INP} />
          </div>
        </div>

        {/* Osoite */}
        <div style={{ background: "#fff", border: "1px solid #EDE8DE", padding: "2rem", marginBottom: "1.5rem" }}>
          <p style={{ fontSize: "0.72rem", fontWeight: 700, letterSpacing: "0.1em", color: "#0F1F3D", margin: "0 0 1.5rem" }}>{T.address}</p>
          <div style={{ marginBottom: "1.1rem" }}>
            <label style={LBL}>{T.street}</label>
            <input value={profile.address} onChange={upd("address")} placeholder={lang === "en" ? "Example Street 1" : "Esimerkkikatu 1"} style={INP} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "1rem" }}>
            <div>
              <label style={LBL}>{T.zip}</label>
              <input value={profile.zip} onChange={upd("zip")} placeholder="00100" style={INP} />
            </div>
            <div>
              <label style={LBL}>{T.city}</label>
              <input value={profile.city} onChange={upd("city")} placeholder={lang === "en" ? "Helsinki" : "Helsinki"} style={INP} />
            </div>
          </div>
        </div>

        {/* Maksu */}
        <div style={{ background: "#fff", border: "1px solid #EDE8DE", padding: "2rem", marginBottom: "2rem" }}>
          <p style={{ fontSize: "0.72rem", fontWeight: 700, letterSpacing: "0.1em", color: "#0F1F3D", margin: "0 0 1.5rem" }}>{T.payment}</p>
          <div style={{ marginBottom: "1.1rem" }}>
            <label style={LBL}>{T.iban}</label>
            <input value={profile.iban} onChange={upd("iban")} placeholder="FI12 3456 7890 1234 56" style={INP} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
            <div>
              <label style={LBL}>{T.hourlyRate}</label>
              <input value={profile.hourlyRate} onChange={upd("hourlyRate")} placeholder="85" style={INP} />
            </div>
            <div>
              <label style={LBL}>{T.paymentTerms}</label>
              <input value={profile.paymentTerms} onChange={upd("paymentTerms")} placeholder={lang === "en" ? "14 days net" : "14 päivää netto"} style={INP} />
            </div>
          </div>
        </div>

        {saveError && (
          <div style={{ background: "#fff0f0", border: "1px solid #f5c6cb", padding: "0.8rem 1rem", marginBottom: "1rem", fontSize: "0.85rem", color: "#9b2335" }}>
            ⚠️ {saveError}
          </div>
        )}

        <button onClick={handleSave} disabled={saving}
          style={{ width: "100%", background: saving ? "#EDE8DE" : saved ? "#166534" : "#C8A44A", color: saving ? "#8A8070" : "#0F1F3D", border: "none", padding: "1rem", fontSize: "1rem", fontWeight: 700, cursor: saving ? "not-allowed" : "pointer", letterSpacing: "0.05em", transition: "background 0.3s" }}>
          {saving ? T.saving : saved ? T.saved : T.save}
        </button>

        {user && (
          <p style={{ fontSize: "0.75rem", color: "#8A8070", textAlign: "center", marginTop: "1rem" }}>
            {user.email}
          </p>
        )}
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
