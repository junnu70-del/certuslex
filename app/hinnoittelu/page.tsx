"use client";

export const dynamic = "force-dynamic";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

const PLANS = [
  {
    id: "starter",
    name: "Starter",
    price: "49",
    period: "kk",
    tag: null,
    desc: "Pienelle toimistolle tai yksittäiselle asiantuntijalle.",
    features: [
      "10 tarjousta kuukaudessa",
      "AI-tarjousgeneraattori",
      "Sähköinen allekirjoitus",
      "Tarjousarkisto",
      "Sähköpostilähetys asiakkaalle",
      "—",
    ],
    cta: "Aloita kokeilu",
    color: "#0F1F3D",
    ctaColor: "#C8A44A",
    highlight: false,
  },
  {
    id: "pro",
    name: "Pro",
    price: "99",
    period: "kk",
    tag: "SUOSITUIN",
    desc: "Kasvavalle yritykselle — rajaton käyttö ilman rajoituksia.",
    features: [
      "Rajaton määrä tarjouksia",
      "AI-tarjousgeneraattori",
      "Sähköinen allekirjoitus",
      "Tarjousarkisto",
      "Sähköpostilähetys asiakkaalle",
      "📎 Liitetiedostot (PDF, piirustukset)",
    ],
    cta: "Aloita kokeilu",
    color: "#C8A44A",
    ctaColor: "#0F1F3D",
    highlight: true,
  },
  {
    id: "yritys",
    name: "Yritys",
    price: "249",
    period: "kk",
    tag: null,
    desc: "Useamman henkilön tiimille tai ketjulle.",
    features: [
      "Rajaton määrä tarjouksia",
      "AI-tarjousgeneraattori",
      "Sähköinen allekirjoitus",
      "Tarjousarkisto",
      "Sähköpostilähetys asiakkaalle",
      "📎 Liitetiedostot (PDF, piirustukset)",
    ],
    cta: "Ota yhteyttä",
    color: "#0F1F3D",
    ctaColor: "#C8A44A",
    highlight: false,
    contact: true,
  },
];

const FAQ = [
  {
    q: "Tarvitseeko luottokorttia kokeilun aloittamiseen?",
    a: "Ei. Kokeile 30 päivää täysin ilmaiseksi ilman sitoutumista. Maksukortti kysytään vasta kun kokeilu päättyy.",
  },
  {
    q: "Voinko vaihtaa pakettia myöhemmin?",
    a: "Kyllä. Voit päivittää tai laskea pakettiasi milloin tahansa — muutos astuu voimaan seuraavasta laskutuskaudesta.",
  },
  {
    q: "Miten sähköinen allekirjoitus toimii?",
    a: "Asiakas saa sähköpostiin henkilökohtaisen linkin, jossa voi kommentoida tai hyväksyä tarjouksen sähköisesti. Allekirjoitus on eIDAS-yhteensopiva yksinkertainen sähköinen allekirjoitus.",
  },
  {
    q: "Onko tarjouskone käytettävissä heti rekisteröitymisen jälkeen?",
    a: "Kyllä. Rekisteröitymisen jälkeen täytät yritysprofiilisi kerran ja tarjouskone on heti käytössä.",
  },
];

export default function HinnoitteluPage() {
  const router = useRouter();
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  function choosePlan(plan: typeof PLANS[0]) {
    if (plan.contact) {
      window.location.href = "mailto:info@certuslex.fi?subject=Yritys-paketti";
      return;
    }
    router.push(`/kirjaudu?plan=${plan.id}&trial=1`);
  }

  return (
    <div style={{ background: "#F7F4EE", minHeight: "100vh", fontFamily: "var(--font-dm-sans), Arial, sans-serif" }}>

      {/* Nav */}
      <nav style={{ background: "#0F1F3D", padding: "1rem 2rem", borderLeft: "4px solid #C8A44A", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <Link href="/" style={{ fontFamily: "var(--font-cormorant), Georgia, serif", fontSize: "1.6rem", fontWeight: 700, color: "#fff", textDecoration: "none" }}>
          Certus<span style={{ color: "#C8A44A" }}>Lex</span>
        </Link>
        <div style={{ display: "flex", gap: "1.5rem", alignItems: "center" }}>
          <Link href="/tarjouskone" style={{ color: "#C8A44A", fontSize: "0.82rem", textDecoration: "none" }}>Tarjouskone</Link>
          <Link href="/ohjeet" style={{ color: "#fff", fontSize: "0.82rem", textDecoration: "none", opacity: 0.75 }}>Ohjeet</Link>
          <Link href="/kirjaudu" style={{ color: "#fff", fontSize: "0.82rem", textDecoration: "none", opacity: 0.75 }}>Kirjaudu</Link>
          <Link href="/en/pricing" style={{ color: "#fff", fontSize: "0.75rem", textDecoration: "none", opacity: 0.5 }}>🇬🇧 EN</Link>
        </div>
      </nav>

      {/* Hero */}
      <div style={{ textAlign: "center", padding: "4rem 1.5rem 2rem" }}>
        <div style={{ display: "inline-block", background: "rgba(200,164,74,.12)", border: "1px solid rgba(200,164,74,.4)", color: "#C8A44A", fontSize: "0.68rem", fontWeight: 700, letterSpacing: "0.14em", padding: "0.35rem 1rem", marginBottom: "1.5rem" }}>
          TARJOUSKONE — HINNOITTELU
        </div>
        <h1 style={{ fontFamily: "var(--font-cormorant), Georgia, serif", fontSize: "clamp(2.2rem, 5vw, 3.2rem)", fontWeight: 700, color: "#0F1F3D", margin: "0 0 1rem", lineHeight: 1.15 }}>
          Ammattimainen tarjous<br />muutamassa minuutissa
        </h1>
        <p style={{ fontSize: "1rem", color: "#8A8070", maxWidth: "520px", margin: "0 auto 0.8rem", lineHeight: 1.6 }}>
          Kokeile 30 päivää ilmaiseksi — ei luottokorttia, ei sitoutumista.
        </p>
        <p style={{ fontSize: "0.82rem", color: "#C8A44A", fontWeight: 600 }}>
          ✓ Rekisteröityminen vie alle minuutin
        </p>
      </div>

      {/* Pricing cards */}
      <div style={{ maxWidth: "1000px", margin: "0 auto", padding: "2rem 1.5rem", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "1.5rem", alignItems: "start" }}>
        {PLANS.map((plan) => (
          <div key={plan.id}
            style={{ background: plan.highlight ? "#0F1F3D" : "#fff", border: plan.highlight ? "2px solid #C8A44A" : "1px solid #EDE8DE", padding: "2rem", position: "relative", boxShadow: plan.highlight ? "0 8px 40px rgba(15,31,61,.18)" : "none", transform: plan.highlight ? "translateY(-8px)" : "none" }}>

            {plan.tag && (
              <div style={{ position: "absolute", top: "-14px", left: "50%", transform: "translateX(-50%)", background: "#C8A44A", color: "#0F1F3D", fontSize: "0.65rem", fontWeight: 800, letterSpacing: "0.14em", padding: "0.3rem 1rem", whiteSpace: "nowrap" }}>
                {plan.tag}
              </div>
            )}

            <div style={{ marginBottom: "1.5rem" }}>
              <p style={{ fontSize: "0.72rem", fontWeight: 700, letterSpacing: "0.12em", color: plan.highlight ? "#C8A44A" : "#8A8070", margin: "0 0 0.4rem" }}>
                {plan.name.toUpperCase()}
              </p>
              <div style={{ display: "flex", alignItems: "flex-end", gap: "0.3rem", marginBottom: "0.5rem" }}>
                <span style={{ fontFamily: "var(--font-cormorant), Georgia, serif", fontSize: "3rem", fontWeight: 700, color: plan.highlight ? "#fff" : "#0F1F3D", lineHeight: 1 }}>
                  {plan.price}€
                </span>
                <span style={{ fontSize: "0.82rem", color: plan.highlight ? "#C8A44A" : "#8A8070", paddingBottom: "0.5rem" }}>/{plan.period}</span>
              </div>
              <p style={{ fontSize: "0.82rem", color: plan.highlight ? "#B0A898" : "#8A8070", margin: 0, lineHeight: 1.5 }}>{plan.desc}</p>
            </div>

            <ul style={{ listStyle: "none", padding: 0, margin: "0 0 2rem" }}>
              {plan.features.map((f, i) => (
                <li key={i} style={{ display: "flex", alignItems: "flex-start", gap: "0.6rem", padding: "0.45rem 0", borderBottom: "1px solid", borderColor: plan.highlight ? "rgba(255,255,255,.08)" : "#F0EDE6", fontSize: "0.85rem", color: f === "—" ? (plan.highlight ? "rgba(255,255,255,.3)" : "#C8C0B0") : (plan.highlight ? "#E8E4DC" : "#2C2416") }}>
                  <span style={{ color: f === "—" ? "transparent" : "#C8A44A", flexShrink: 0, fontSize: "0.75rem", marginTop: "0.15rem" }}>
                    {f === "—" ? "—" : "✓"}
                  </span>
                  {f === "—" ? "—" : f}
                </li>
              ))}
            </ul>

            <button onClick={() => choosePlan(plan)}
              style={{ width: "100%", background: plan.highlight ? "#C8A44A" : "#0F1F3D", color: plan.highlight ? "#0F1F3D" : "#C8A44A", border: "none", padding: "0.9rem", fontSize: "0.9rem", fontWeight: 700, cursor: "pointer", letterSpacing: "0.05em", transition: "opacity 0.2s" }}>
              {plan.cta} →
            </button>

            {!plan.contact && (
              <p style={{ textAlign: "center", fontSize: "0.72rem", color: plan.highlight ? "rgba(200,164,74,.7)" : "#8A8070", margin: "0.8rem 0 0" }}>
                30 päivää ilmaiseksi • ei korttia
              </p>
            )}
          </div>
        ))}
      </div>

      {/* Feature comparison */}
      <div style={{ maxWidth: "780px", margin: "3rem auto 0", padding: "0 1.5rem" }}>
        <div style={{ background: "#fff", border: "1px solid #EDE8DE", padding: "2.5rem" }}>
          <p style={{ fontSize: "0.72rem", fontWeight: 700, letterSpacing: "0.12em", color: "#0F1F3D", margin: "0 0 2rem", textAlign: "center" }}>MITÄ TARJOUSKONE TEKEE?</p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "2rem" }}>
            {[
              { icon: "🤖", title: "AI kirjoittaa tarjouksen", desc: "Syötä projektin tiedot ja speksit — valmis ammattimainen tarjous syntyy alle minuutissa." },
              { icon: "📎", title: "Lukee piirustukset", desc: "Liitä PDF tai kuva — AI analysoi rakennelaskelmat ja hinnoittelee urakan automaattisesti." },
              { icon: "✍️", title: "Sähköinen allekirjoitus", desc: "Asiakas kommentoi tai allekirjoittaa tarjouksen sähköisesti suoraan selaimessa." },
              { icon: "📋", title: "Kaikki arkistossa", desc: "Lähetetyt tarjoukset statuksineen tallessa yhdessä paikassa — aina saatavilla." },
            ].map((f) => (
              <div key={f.title} style={{ textAlign: "center" }}>
                <div style={{ fontSize: "2rem", marginBottom: "0.6rem" }}>{f.icon}</div>
                <p style={{ fontSize: "0.88rem", fontWeight: 700, color: "#0F1F3D", margin: "0 0 0.4rem" }}>{f.title}</p>
                <p style={{ fontSize: "0.78rem", color: "#8A8070", margin: 0, lineHeight: 1.5 }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* FAQ */}
      <div style={{ maxWidth: "640px", margin: "3rem auto 0", padding: "0 1.5rem" }}>
        <p style={{ fontSize: "0.72rem", fontWeight: 700, letterSpacing: "0.12em", color: "#0F1F3D", textAlign: "center", marginBottom: "1.5rem" }}>USEIN KYSYTTYÄ</p>
        {FAQ.map((item, i) => (
          <div key={i} style={{ background: "#fff", border: "1px solid #EDE8DE", marginBottom: "0.5rem" }}>
            <button onClick={() => setOpenFaq(openFaq === i ? null : i)}
              style={{ width: "100%", background: "none", border: "none", padding: "1.1rem 1.4rem", textAlign: "left", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "1rem" }}>
              <span style={{ fontSize: "0.88rem", fontWeight: 600, color: "#0F1F3D" }}>{item.q}</span>
              <span style={{ color: "#C8A44A", fontSize: "1.2rem", flexShrink: 0, transition: "transform 0.2s", transform: openFaq === i ? "rotate(45deg)" : "none" }}>+</span>
            </button>
            {openFaq === i && (
              <div style={{ padding: "0 1.4rem 1.1rem", fontSize: "0.83rem", color: "#8A8070", lineHeight: 1.7 }}>
                {item.a}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Bottom CTA */}
      <div style={{ textAlign: "center", padding: "4rem 1.5rem 5rem" }}>
        <div style={{ background: "#0F1F3D", display: "inline-block", padding: "3rem 4rem", borderLeft: "4px solid #C8A44A", maxWidth: "500px" }}>
          <p style={{ fontFamily: "var(--font-cormorant), Georgia, serif", fontSize: "1.8rem", fontWeight: 700, color: "#fff", margin: "0 0 0.5rem", lineHeight: 1.2 }}>
            Valmis aloittamaan?
          </p>
          <p style={{ fontSize: "0.85rem", color: "#B0A898", margin: "0 0 1.5rem" }}>
            30 päivää ilmaiseksi — ei luottokorttia tarvita.
          </p>
          <Link href="/kirjaudu?plan=pro&trial=1"
            style={{ display: "inline-block", background: "#C8A44A", color: "#0F1F3D", padding: "0.9rem 2.5rem", fontSize: "0.9rem", fontWeight: 700, textDecoration: "none", letterSpacing: "0.05em" }}>
            Aloita ilmainen kokeilu →
          </Link>
        </div>
      </div>

      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
