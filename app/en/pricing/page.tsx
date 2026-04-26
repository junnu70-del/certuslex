"use client";
export const dynamic = "force-dynamic";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

const PLANS = [
  {
    id: "starter", name: "Starter", price: "49", period: "mo", tag: null,
    desc: "For a small firm or individual professional.",
    features: ["10 quotes per month", "AI Quote Generator", "Electronic Signature", "Quote Archive", "Email delivery to client", "—"],
    cta: "Start trial", highlight: false, contact: false,
  },
  {
    id: "pro", name: "Pro", price: "99", period: "mo", tag: "MOST POPULAR",
    desc: "For a growing business — unlimited use.",
    features: ["Unlimited quotes", "AI Quote Generator", "Electronic Signature", "Quote Archive", "Email delivery to client", "📎 Attachments (PDF, drawings)"],
    cta: "Start trial", highlight: true, contact: false,
  },
  {
    id: "yritys", name: "Enterprise", price: "249", period: "mo", tag: null,
    desc: "For multi-person teams or chains.",
    features: ["Unlimited quotes", "AI Quote Generator", "Electronic Signature", "Quote Archive", "Email delivery to client", "📎 Attachments (PDF, drawings)"],
    cta: "Contact us", highlight: false, contact: true,
  },
];

const FAQ = [
  { q: "Do I need a credit card to start?", a: "No. Try free for 30 days with no commitment. Payment details are only asked when the trial ends." },
  { q: "Can I switch plans later?", a: "Yes. You can upgrade or downgrade at any time — changes take effect from the next billing period." },
  { q: "How does the electronic signature work?", a: "The client receives a personal link by email where they can comment or sign the quote electronically. The signature is eIDAS-compatible." },
  { q: "Is the Quote Tool available immediately after signing up?", a: "Yes. After signing up, fill in your company profile once and the Quote Tool is ready to use." },
];

export default function PricingPage() {
  const router = useRouter();
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  function choosePlan(plan: typeof PLANS[0]) {
    if (plan.contact) { window.location.href = "mailto:info@certuslex.fi?subject=Enterprise plan"; return; }
    router.push(`/kirjaudu?plan=${plan.id}&trial=1`);
  }

  return (
    <div style={{ background: "#F7F4EE", minHeight: "100vh", fontFamily: "var(--font-dm-sans), Arial, sans-serif" }}>
      <nav style={{ background: "#0F1F3D", padding: "1rem 2rem", borderLeft: "4px solid #C8A44A", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <Link href="/en" style={{ fontFamily: "var(--font-cormorant), Georgia, serif", fontSize: "1.6rem", fontWeight: 700, color: "#fff", textDecoration: "none" }}>
          Certus<span style={{ color: "#C8A44A" }}>Lex</span>
        </Link>
        <div style={{ display: "flex", gap: "1.5rem", alignItems: "center" }}>
          <Link href="/tarjouskone" style={{ color: "#C8A44A", fontSize: "0.82rem", textDecoration: "none" }}>Quote Tool</Link>
          <Link href="/en/help" style={{ color: "#fff", fontSize: "0.82rem", textDecoration: "none", opacity: 0.75 }}>Help</Link>
          <Link href="/kirjaudu" style={{ color: "#fff", fontSize: "0.82rem", textDecoration: "none", opacity: 0.75 }}>Sign in</Link>
          <Link href="/hinnoittelu" style={{ color: "#fff", fontSize: "0.75rem", textDecoration: "none", opacity: 0.5 }}>🇫🇮 FI</Link>
        </div>
      </nav>

      <div style={{ textAlign: "center", padding: "4rem 1.5rem 2rem" }}>
        <div style={{ display: "inline-block", background: "rgba(200,164,74,.12)", border: "1px solid rgba(200,164,74,.4)", color: "#C8A44A", fontSize: "0.68rem", fontWeight: 700, letterSpacing: "0.14em", padding: "0.35rem 1rem", marginBottom: "1.5rem" }}>
          QUOTE TOOL — PRICING
        </div>
        <h1 style={{ fontFamily: "var(--font-cormorant), Georgia, serif", fontSize: "clamp(2.2rem, 5vw, 3.2rem)", fontWeight: 700, color: "#0F1F3D", margin: "0 0 1rem", lineHeight: 1.15 }}>
          Professional quotes<br />in minutes
        </h1>
        <p style={{ fontSize: "1rem", color: "#8A8070", maxWidth: "520px", margin: "0 auto 0.8rem", lineHeight: 1.6 }}>
          Try free for 30 days — no credit card, no commitment.
        </p>
        <p style={{ fontSize: "0.82rem", color: "#C8A44A", fontWeight: 600 }}>✓ Sign up in under a minute</p>
      </div>

      <div style={{ maxWidth: "1000px", margin: "0 auto", padding: "2rem 1.5rem", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "1.5rem", alignItems: "start" }}>
        {PLANS.map((plan) => (
          <div key={plan.id} style={{ background: plan.highlight ? "#0F1F3D" : "#fff", border: plan.highlight ? "2px solid #C8A44A" : "1px solid #EDE8DE", padding: "2rem", position: "relative", boxShadow: plan.highlight ? "0 8px 40px rgba(15,31,61,.18)" : "none", transform: plan.highlight ? "translateY(-8px)" : "none" }}>
            {plan.tag && (
              <div style={{ position: "absolute", top: "-14px", left: "50%", transform: "translateX(-50%)", background: "#C8A44A", color: "#0F1F3D", fontSize: "0.65rem", fontWeight: 800, letterSpacing: "0.14em", padding: "0.3rem 1rem", whiteSpace: "nowrap" }}>{plan.tag}</div>
            )}
            <div style={{ marginBottom: "1.5rem" }}>
              <p style={{ fontSize: "0.72rem", fontWeight: 700, letterSpacing: "0.12em", color: plan.highlight ? "#C8A44A" : "#8A8070", margin: "0 0 0.4rem" }}>{plan.name.toUpperCase()}</p>
              <div style={{ display: "flex", alignItems: "flex-end", gap: "0.3rem", marginBottom: "0.5rem" }}>
                <span style={{ fontFamily: "var(--font-cormorant), Georgia, serif", fontSize: "3rem", fontWeight: 700, color: plan.highlight ? "#fff" : "#0F1F3D", lineHeight: 1 }}>{plan.price}€</span>
                <span style={{ fontSize: "0.82rem", color: plan.highlight ? "#C8A44A" : "#8A8070", paddingBottom: "0.5rem" }}>/{plan.period}</span>
              </div>
              <p style={{ fontSize: "0.82rem", color: plan.highlight ? "#B0A898" : "#8A8070", margin: 0, lineHeight: 1.5 }}>{plan.desc}</p>
            </div>
            <ul style={{ listStyle: "none", padding: 0, margin: "0 0 2rem" }}>
              {plan.features.map((f, i) => (
                <li key={i} style={{ display: "flex", alignItems: "flex-start", gap: "0.6rem", padding: "0.45rem 0", borderBottom: "1px solid", borderColor: plan.highlight ? "rgba(255,255,255,.08)" : "#F0EDE6", fontSize: "0.85rem", color: f === "—" ? (plan.highlight ? "rgba(255,255,255,.3)" : "#C8C0B0") : (plan.highlight ? "#E8E4DC" : "#2C2416") }}>
                  <span style={{ color: f === "—" ? "transparent" : "#C8A44A", flexShrink: 0, fontSize: "0.75rem", marginTop: "0.15rem" }}>{f === "—" ? "—" : "✓"}</span>
                  {f === "—" ? "—" : f}
                </li>
              ))}
            </ul>
            <button onClick={() => choosePlan(plan)} style={{ width: "100%", background: plan.highlight ? "#C8A44A" : "#0F1F3D", color: plan.highlight ? "#0F1F3D" : "#C8A44A", border: "none", padding: "0.9rem", fontSize: "0.9rem", fontWeight: 700, cursor: "pointer", letterSpacing: "0.05em" }}>
              {plan.cta} →
            </button>
            {!plan.contact && (
              <p style={{ textAlign: "center", fontSize: "0.72rem", color: plan.highlight ? "rgba(200,164,74,.7)" : "#8A8070", margin: "0.8rem 0 0" }}>30 days free · no card needed</p>
            )}
          </div>
        ))}
      </div>

      <div style={{ maxWidth: "640px", margin: "3rem auto 0", padding: "0 1.5rem" }}>
        <p style={{ fontSize: "0.72rem", fontWeight: 700, letterSpacing: "0.12em", color: "#0F1F3D", textAlign: "center", marginBottom: "1.5rem" }}>FREQUENTLY ASKED QUESTIONS</p>
        {FAQ.map((item, i) => (
          <div key={i} style={{ background: "#fff", border: "1px solid #EDE8DE", marginBottom: "0.5rem" }}>
            <button onClick={() => setOpenFaq(openFaq === i ? null : i)} style={{ width: "100%", background: "none", border: "none", padding: "1.1rem 1.4rem", textAlign: "left", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "1rem" }}>
              <span style={{ fontSize: "0.88rem", fontWeight: 600, color: "#0F1F3D" }}>{item.q}</span>
              <span style={{ color: "#C8A44A", fontSize: "1.2rem", flexShrink: 0, display: "inline-block", transform: openFaq === i ? "rotate(45deg)" : "none", transition: "transform 0.2s" }}>+</span>
            </button>
            {openFaq === i && <div style={{ padding: "0 1.4rem 1.1rem", fontSize: "0.83rem", color: "#8A8070", lineHeight: 1.7 }}>{item.a}</div>}
          </div>
        ))}
      </div>

      <div style={{ textAlign: "center", padding: "4rem 1.5rem 5rem" }}>
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
