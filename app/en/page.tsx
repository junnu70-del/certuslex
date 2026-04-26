"use client";
import Link from "next/link";

export default function EnHome() {
  return (
    <div style={{ background: "#F7F4EE", minHeight: "100vh", fontFamily: "var(--font-dm-sans), Arial, sans-serif" }}>
      <nav style={{ background: "#0F1F3D", padding: "1rem 2rem", borderLeft: "4px solid #C8A44A", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <Link href="/en" style={{ fontFamily: "var(--font-cormorant), Georgia, serif", fontSize: "1.6rem", fontWeight: 700, color: "#fff", textDecoration: "none" }}>
          Certus<span style={{ color: "#C8A44A" }}>Lex</span>
        </Link>
        <div style={{ display: "flex", gap: "1.5rem", alignItems: "center" }}>
          <Link href="/en/pricing" style={{ color: "#C8A44A", fontSize: "0.82rem", textDecoration: "none" }}>Pricing</Link>
          <Link href="/en/help" style={{ color: "#fff", fontSize: "0.82rem", textDecoration: "none", opacity: 0.75 }}>Help</Link>
          <Link href="/kirjaudu" style={{ color: "#fff", fontSize: "0.82rem", textDecoration: "none", opacity: 0.75 }}>Sign in</Link>
          <Link href="/" style={{ color: "#fff", fontSize: "0.75rem", textDecoration: "none", opacity: 0.5 }}>🇫🇮 FI</Link>
        </div>
      </nav>

      {/* Hero */}
      <div style={{ maxWidth: "900px", margin: "0 auto", padding: "6rem 2rem 4rem", textAlign: "center" }}>
        <div style={{ display: "inline-block", background: "rgba(200,164,74,.12)", border: "1px solid rgba(200,164,74,.4)", color: "#C8A44A", fontSize: "0.68rem", fontWeight: 700, letterSpacing: "0.14em", padding: "0.35rem 1rem", marginBottom: "2rem" }}>
          AI-POWERED QUOTE TOOL
        </div>
        <h1 style={{ fontFamily: "var(--font-cormorant), Georgia, serif", fontSize: "clamp(2.8rem, 6vw, 4.2rem)", fontWeight: 700, color: "#0F1F3D", margin: "0 0 1.5rem", lineHeight: 1.1 }}>
          Professional quotes<br />in minutes — not hours
        </h1>
        <p style={{ fontSize: "1.1rem", color: "#8A8070", maxWidth: "560px", margin: "0 auto 2.5rem", lineHeight: 1.7 }}>
          CertusLex generates accurate, professional quotes from your project specs. Add an attachment, set your margin, and send — with electronic signature built in.
        </p>
        <div style={{ display: "flex", gap: "1rem", justifyContent: "center", flexWrap: "wrap" }}>
          <Link href="/kirjaudu?plan=pro&trial=1" style={{ background: "#C8A44A", color: "#0F1F3D", padding: "1rem 2.5rem", fontSize: "1rem", fontWeight: 700, textDecoration: "none", letterSpacing: "0.05em", display: "inline-block" }}>
            Start free trial →
          </Link>
          <Link href="/en/pricing" style={{ background: "transparent", border: "2px solid #0F1F3D", color: "#0F1F3D", padding: "1rem 2rem", fontSize: "1rem", fontWeight: 600, textDecoration: "none", display: "inline-block" }}>
            View pricing
          </Link>
        </div>
        <p style={{ fontSize: "0.82rem", color: "#C8A44A", fontWeight: 600, marginTop: "1rem" }}>✓ 30 days free · No credit card · Ready in under a minute</p>
      </div>

      {/* Features */}
      <div style={{ maxWidth: "900px", margin: "0 auto 4rem", padding: "0 2rem" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px,1fr))", gap: "1.5rem" }}>
          {[
            { icon: "🤖", title: "AI writes the quote", desc: "Enter project specs — a polished professional quote is ready in under a minute." },
            { icon: "📎", title: "Reads attachments", desc: "Attach a PDF or image — AI analyzes drawings and prices the job automatically." },
            { icon: "✍️", title: "Electronic signature", desc: "Client comments or signs electronically directly in their browser." },
            { icon: "📋", title: "Everything archived", desc: "Sent quotes with their status saved in one place — always available." },
          ].map(f => (
            <div key={f.title} style={{ background: "#fff", border: "1px solid #EDE8DE", padding: "2rem", textAlign: "center" }}>
              <div style={{ fontSize: "2rem", marginBottom: "0.8rem" }}>{f.icon}</div>
              <p style={{ fontSize: "0.92rem", fontWeight: 700, color: "#0F1F3D", margin: "0 0 0.5rem" }}>{f.title}</p>
              <p style={{ fontSize: "0.8rem", color: "#8A8070", margin: 0, lineHeight: 1.5 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom CTA */}
      <div style={{ textAlign: "center", padding: "2rem 1.5rem 5rem" }}>
        <div style={{ background: "#0F1F3D", display: "inline-block", padding: "3rem 4rem", borderLeft: "4px solid #C8A44A", maxWidth: "500px" }}>
          <p style={{ fontFamily: "var(--font-cormorant), Georgia, serif", fontSize: "1.8rem", fontWeight: 700, color: "#fff", margin: "0 0 0.5rem", lineHeight: 1.2 }}>Ready to get started?</p>
          <p style={{ fontSize: "0.85rem", color: "#B0A898", margin: "0 0 1.5rem" }}>30 days free — no credit card required.</p>
          <Link href="/kirjaudu?plan=pro&trial=1" style={{ display: "inline-block", background: "#C8A44A", color: "#0F1F3D", padding: "0.9rem 2.5rem", fontSize: "0.9rem", fontWeight: 700, textDecoration: "none", letterSpacing: "0.05em" }}>
            Start free trial →
          </Link>
        </div>
      </div>
    </div>
  );
}
