"use client";
export const dynamic = "force-dynamic";
import Link from "next/link";
import { useState } from "react";

const STEPS = [
  { num: "01", title: "Sign up for free", desc: "Create an account with your email and password. Your 30-day trial starts automatically — no credit card required." },
  { num: "02", title: "Fill in your company profile", desc: "Enter your company details once: name, business ID, address, logo, hourly rate and payment terms. They'll auto-fill into every quote." },
  { num: "03", title: "Open the Quote Tool", desc: "Go to the Quote Tool and complete three steps: company info (pre-filled), project details, and specifications." },
  { num: "04", title: "Describe the project", desc: "Write freely about what the project involves — materials, work phases, estimates. You can also attach PDF drawings, Excel spreadsheets or images." },
  { num: "05", title: "Generate quote with AI", desc: "Click the button and wait 15–30 seconds. AI produces a professional quote document with pricing breakdown and timeline." },
  { num: "06", title: "Send to the client", desc: "Enter the client's email and send. The client receives a personal link to comment on or digitally sign the quote." },
];

const FAQ = [
  {
    q: "Do I need a credit card to start the trial?",
    a: "No. Try free for 30 days with no commitment. Payment details are only required when the trial ends and you choose to continue.",
  },
  {
    q: "What file formats can I attach to a quote?",
    a: "The Quote Tool supports PDF documents, Excel and CSV spreadsheets, and images (PNG, JPG, WebP). Maximum file size is 15 MB. AI analyzes the attachment and automatically uses the data in the pricing calculation.",
  },
  {
    q: "How does the electronic signature work?",
    a: "The client receives a personal link to the quote by email. From the link they can comment or accept the quote electronically by typing their name. The signature is an eIDAS-compatible simple electronic signature.",
  },
  {
    q: "Can I edit the AI-generated quote?",
    a: "You can print or copy the quote as text for editing. Direct in-browser editing is coming in a future version. You can also refine the specs and regenerate.",
  },
  {
    q: "What does the Margin % field do?",
    a: "If you enter 20, AI automatically adds a 20% margin to all costs. The margin percentage is not visible to the client — it is built directly into the unit prices.",
  },
  {
    q: "Does the quote appear in the archive immediately after sending?",
    a: "Yes. Every sent quote is automatically saved to the Quote Archive with status 'Sent'. When the client comments or signs, the status updates accordingly.",
  },
  {
    q: "Can I switch plans later?",
    a: "Yes. You can upgrade or downgrade your plan at any time — the change takes effect from the next billing period.",
  },
  {
    q: "Who do I contact if I have problems?",
    a: "Send an email to info@certuslex.fi — we typically respond the same day.",
  },
];

export default function HelpPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  return (
    <div style={{ background: "#F7F4EE", minHeight: "100vh", fontFamily: "var(--font-dm-sans), Arial, sans-serif" }}>
      {/* Nav */}
      <nav style={{ background: "#0F1F3D", padding: "1rem 2rem", borderLeft: "4px solid #C8A44A", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <Link href="/en" style={{ fontFamily: "var(--font-cormorant), Georgia, serif", fontSize: "1.6rem", fontWeight: 700, color: "#fff", textDecoration: "none" }}>
          Certus<span style={{ color: "#C8A44A" }}>Lex</span>
        </Link>
        <div style={{ display: "flex", gap: "1.5rem", alignItems: "center" }}>
          <Link href="/tarjouskone" style={{ color: "#C8A44A", fontSize: "0.82rem", textDecoration: "none" }}>Quote Tool</Link>
          <Link href="/en/pricing" style={{ color: "#fff", fontSize: "0.82rem", textDecoration: "none", opacity: 0.75 }}>Pricing</Link>
          <Link href="/ohjeet" style={{ color: "#fff", fontSize: "0.82rem", textDecoration: "none", opacity: 0.6 }}>🇫🇮 FI</Link>
        </div>
      </nav>

      {/* Hero */}
      <div style={{ textAlign: "center", padding: "4rem 1.5rem 2rem" }}>
        <div style={{ display: "inline-block", background: "rgba(200,164,74,.12)", border: "1px solid rgba(200,164,74,.4)", color: "#C8A44A", fontSize: "0.68rem", fontWeight: 700, letterSpacing: "0.14em", padding: "0.35rem 1rem", marginBottom: "1.5rem" }}>
          USER GUIDE
        </div>
        <h1 style={{ fontFamily: "var(--font-cormorant), Georgia, serif", fontSize: "clamp(2rem,5vw,3rem)", fontWeight: 700, color: "#0F1F3D", margin: "0 0 1rem", lineHeight: 1.15 }}>
          How CertusLex works
        </h1>
        <p style={{ fontSize: "1rem", color: "#8A8070", maxWidth: "500px", margin: "0 auto", lineHeight: 1.6 }}>
          A professional quote to your client in under five minutes — follow the guide below.
        </p>
      </div>

      {/* Steps */}
      <div style={{ maxWidth: "780px", margin: "3rem auto 0", padding: "0 1.5rem" }}>
        <p style={{ fontSize: "0.72rem", fontWeight: 700, letterSpacing: "0.12em", color: "#0F1F3D", marginBottom: "1.5rem", textAlign: "center" }}>QUICK GUIDE — 6 STEPS</p>
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {STEPS.map((s) => (
            <div key={s.num} style={{ background: "#fff", border: "1px solid #EDE8DE", padding: "1.5rem 2rem", display: "flex", gap: "1.5rem", alignItems: "flex-start" }}>
              <div style={{ fontFamily: "var(--font-cormorant), Georgia, serif", fontSize: "2rem", fontWeight: 700, color: "#C8A44A", lineHeight: 1, flexShrink: 0 }}>{s.num}</div>
              <div>
                <p style={{ fontSize: "0.95rem", fontWeight: 700, color: "#0F1F3D", margin: "0 0 0.4rem" }}>{s.title}</p>
                <p style={{ fontSize: "0.85rem", color: "#8A8070", margin: 0, lineHeight: 1.6 }}>{s.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Tips */}
      <div style={{ maxWidth: "780px", margin: "3rem auto 0", padding: "0 1.5rem" }}>
        <div style={{ background: "#0F1F3D", padding: "2rem 2.5rem", borderLeft: "4px solid #C8A44A" }}>
          <p style={{ fontSize: "0.72rem", fontWeight: 700, letterSpacing: "0.12em", color: "#C8A44A", margin: "0 0 1rem" }}>💡 TIPS FOR BEST RESULTS</p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px,1fr))", gap: "1.2rem" }}>
            {[
              { t: "More detail = better quote", d: "The more precisely you describe materials, work phases and quantities, the more accurate the pricing AI produces." },
              { t: "Attach the RFQ or drawings", d: "If the client sent a written request for quotation or technical drawings, attach them — AI reads them automatically." },
              { t: "Use the Margin % field", d: "Enter your desired margin before generating. It's built into the prices and is never visible to the client." },
              { t: "Regenerate if needed", d: "If the result isn't right, click 'Regenerate', refine the instructions or adjust the specs." },
            ].map(v => (
              <div key={v.t}>
                <p style={{ fontSize: "0.85rem", fontWeight: 700, color: "#C8A44A", margin: "0 0 0.3rem" }}>{v.t}</p>
                <p style={{ fontSize: "0.78rem", color: "#B0A898", margin: 0, lineHeight: 1.5 }}>{v.d}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* FAQ */}
      <div style={{ maxWidth: "640px", margin: "3rem auto 0", padding: "0 1.5rem" }}>
        <p style={{ fontSize: "0.72rem", fontWeight: 700, letterSpacing: "0.12em", color: "#0F1F3D", textAlign: "center", marginBottom: "1.5rem" }}>FREQUENTLY ASKED QUESTIONS</p>
        {FAQ.map((item, i) => (
          <div key={i} style={{ background: "#fff", border: "1px solid #EDE8DE", marginBottom: "0.5rem" }}>
            <button onClick={() => setOpenFaq(openFaq === i ? null : i)}
              style={{ width: "100%", background: "none", border: "none", padding: "1.1rem 1.4rem", textAlign: "left", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "1rem" }}>
              <span style={{ fontSize: "0.88rem", fontWeight: 600, color: "#0F1F3D" }}>{item.q}</span>
              <span style={{ color: "#C8A44A", fontSize: "1.2rem", flexShrink: 0, transition: "transform 0.2s", display: "inline-block", transform: openFaq === i ? "rotate(45deg)" : "none" }}>+</span>
            </button>
            {openFaq === i && (
              <div style={{ padding: "0 1.4rem 1.1rem", fontSize: "0.83rem", color: "#8A8070", lineHeight: 1.7 }}>{item.a}</div>
            )}
          </div>
        ))}
      </div>

      {/* CTA */}
      <div style={{ textAlign: "center", padding: "4rem 1.5rem 5rem" }}>
        <div style={{ background: "#0F1F3D", display: "inline-block", padding: "2.5rem 3.5rem", borderLeft: "4px solid #C8A44A", maxWidth: "460px" }}>
          <p style={{ fontFamily: "var(--font-cormorant), Georgia, serif", fontSize: "1.6rem", fontWeight: 700, color: "#fff", margin: "0 0 0.5rem" }}>Ready to try it?</p>
          <p style={{ fontSize: "0.85rem", color: "#B0A898", margin: "0 0 1.5rem" }}>30 days free — no credit card required.</p>
          <Link href="/kirjaudu?plan=pro&trial=1"
            style={{ display: "inline-block", background: "#C8A44A", color: "#0F1F3D", padding: "0.9rem 2.5rem", fontSize: "0.9rem", fontWeight: 700, textDecoration: "none", letterSpacing: "0.05em" }}>
            Start free trial →
          </Link>
        </div>
      </div>
    </div>
  );
}
