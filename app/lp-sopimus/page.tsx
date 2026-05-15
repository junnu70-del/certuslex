"use client";

import { useEffect } from "react";

export default function SopimuskoneLanding() {
  useEffect(() => {
    const slides = [
      { label: "ALIHANKKIJASOPIMUKSET" },
      { label: "TYÖSOPIMUKSET" },
      { label: "NDA-SOPIMUKSET" },
      { label: "VUOKRASOPIMUKSET" },
      { label: "KAUPPASOPIMUKSET" },
    ];

    const layers = document.querySelectorAll<HTMLElement>(".bg-layer");
    const eyebrow = document.getElementById("eyebrow");
    const eyebrowText = document.getElementById("eyebrow-text");
    const dotsContainer = document.getElementById("bg-dots");
    if (!dotsContainer || !eyebrow || !eyebrowText) return;

    let current = 0;
    let timer: ReturnType<typeof setInterval>;

    slides.forEach((_, i) => {
      const d = document.createElement("div");
      d.className = "bg-dot" + (i === 0 ? " active" : "");
      d.addEventListener("click", () => goTo(i));
      dotsContainer.appendChild(d);
    });

    function switchTo(idx: number) {
      layers[current].classList.remove("active");
      eyebrow!.classList.add("fade-out");
      setTimeout(() => {
        eyebrowText!.textContent = slides[idx].label;
        eyebrow!.classList.remove("fade-out");
      }, 300);
      layers[idx].classList.add("active");
      document.querySelectorAll(".bg-dot").forEach((d, i) => {
        d.classList.toggle("active", i === idx);
      });
      current = idx;
    }

    function goTo(idx: number) {
      clearInterval(timer);
      switchTo(idx);
      timer = setInterval(next, 4500);
    }

    function next() { switchTo((current + 1) % slides.length); }
    timer = setInterval(next, 4500);

    const slogans = document.querySelectorAll<HTMLElement>(".slogan-word");
    let sIdx = 0;
    function nextSlogan() {
      const cur = sIdx;
      const nxt = (sIdx + 1) % slogans.length;
      slogans[cur].classList.remove("enter");
      slogans[cur].classList.add("exit-up");
      slogans[nxt].classList.remove("below");
      slogans[nxt].classList.add("enter");
      setTimeout(() => {
        slogans[cur].classList.remove("exit-up");
        slogans[cur].classList.add("below");
      }, 500);
      sIdx = nxt;
    }
    const sTimer = setInterval(nextSlogan, 3000);

    return () => { clearInterval(timer); clearInterval(sTimer); };
  }, []);

  return (
    <>
      <style>{`
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
        :root{--gold:#C8A44A;--navy:#0F1F3D;--dark:#08111F;}
        body{font-family:'DM Sans',Arial,sans-serif;background:var(--dark);color:#fff;overflow-x:hidden;}
        a{text-decoration:none;color:inherit;}

        .lp-nav{padding:1rem 2rem;display:flex;align-items:center;justify-content:space-between;position:fixed;top:0;left:0;right:0;z-index:100;background:rgba(8,17,31,0.82);backdrop-filter:blur(14px);border-bottom:1px solid rgba(200,164,74,0.12);}
        .lp-logo{font-family:'Cormorant Garamond',Georgia,serif;font-size:1.5rem;font-weight:700;color:#fff;}
        .lp-logo b{color:var(--gold);}
        .lp-nav-r{display:flex;gap:1rem;align-items:center;}
        .lp-nav-link{color:rgba(255,255,255,.5);font-size:.82rem;font-weight:500;padding:.4rem .7rem;}
        .lp-nav-btn{background:var(--gold);color:var(--navy);padding:.55rem 1.3rem;font-size:.82rem;font-weight:800;letter-spacing:.04em;transition:opacity .15s;}
        .lp-nav-btn:hover{opacity:.88;}

        .lp-hero{min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:8rem 1.5rem 5rem;position:relative;overflow:hidden;}
        .bg-layer{position:absolute;inset:0;background-size:cover;background-position:center 40%;opacity:0;transition:opacity 1.4s ease-in-out;pointer-events:none;}
        .bg-layer.active{opacity:1;}
        .hero-overlay{position:absolute;inset:0;background:linear-gradient(170deg,rgba(8,17,31,0.88) 0%,rgba(8,17,31,0.62) 50%,rgba(8,17,31,0.96) 100%);pointer-events:none;z-index:1;}
        .hero-glow{position:absolute;inset:0;background:radial-gradient(ellipse 60% 45% at 50% 38%,rgba(200,164,74,0.13) 0%,transparent 65%);pointer-events:none;z-index:2;}
        .hero-inner{position:relative;z-index:3;max-width:860px;margin:0 auto;}

        .eyebrow{display:inline-flex;align-items:center;gap:.6rem;background:rgba(200,164,74,0.12);border:1px solid rgba(200,164,74,0.28);color:var(--gold);font-size:.7rem;font-weight:700;letter-spacing:.13em;padding:.38rem 1rem;margin-bottom:2rem;transition:opacity .35s;}
        .eyebrow.fade-out{opacity:0;}
        .eyebrow-dot{width:6px;height:6px;background:var(--gold);border-radius:50%;animation:lp-blink 1.6s ease infinite;display:inline-block;}
        @keyframes lp-blink{0%,100%{opacity:1;}50%{opacity:.2;}}

        .slogan-wrap{overflow:hidden;height:1.25em;position:relative;display:inline-block;}
        .slogan-word{display:block;color:var(--gold);font-style:normal;font-weight:800;transition:transform .45s cubic-bezier(.4,0,.2,1),opacity .45s ease;position:absolute;left:0;right:0;white-space:nowrap;}
        .slogan-word.enter{transform:translateY(0);opacity:1;}
        .slogan-word.exit-up{transform:translateY(-110%);opacity:0;}
        .slogan-word.below{transform:translateY(110%);opacity:0;}

        .bg-dots{position:absolute;bottom:2.5rem;left:50%;transform:translateX(-50%);display:flex;gap:.5rem;z-index:4;}
        .bg-dot{width:6px;height:6px;border-radius:50%;background:rgba(255,255,255,.25);cursor:pointer;transition:background .3s,transform .3s;}
        .bg-dot.active{background:var(--gold);transform:scale(1.4);}

        .lp-h1{font-family:'DM Sans',sans-serif;font-size:clamp(3.2rem,8.5vw,6rem);font-weight:800;line-height:.98;letter-spacing:-.035em;margin-bottom:1.5rem;}
        .lp-h1 em{color:var(--gold);font-style:normal;display:block;}
        .hero-sub{font-size:clamp(1rem,1.8vw,1.2rem);color:rgba(255,255,255,.58);max-width:520px;margin:0 auto 2.5rem;line-height:1.65;}
        .hero-sub b{color:#fff;font-weight:600;}
        .btns{display:flex;gap:1rem;justify-content:center;flex-wrap:wrap;margin-bottom:3rem;}
        .btn-gold{background:var(--gold);color:var(--navy);padding:1.05rem 2.5rem;font-size:1.05rem;font-weight:800;letter-spacing:.02em;display:inline-block;transition:transform .15s,box-shadow .15s;font-family:'DM Sans',sans-serif;}
        .btn-gold:hover{transform:translateY(-2px);box-shadow:0 10px 36px rgba(200,164,74,.38);}
        .btn-ghost{background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.18);color:#fff;padding:1.05rem 2.5rem;font-size:1.05rem;font-weight:600;display:inline-block;transition:background .18s;font-family:'DM Sans',sans-serif;}
        .btn-ghost:hover{background:rgba(255,255,255,.13);}
        .proof-row{display:flex;align-items:center;justify-content:center;gap:1.5rem;flex-wrap:wrap;}
        .proof-item{font-size:.77rem;color:rgba(255,255,255,.38);font-weight:500;display:flex;align-items:center;gap:.4rem;}
        .proof-item span{color:var(--gold);}

        .ticker{background:var(--gold);padding:.6rem 0;overflow:hidden;white-space:nowrap;}
        .ticker-track{display:inline-flex;animation:lp-ticker 22s linear infinite;}
        .ticker-item{font-size:.72rem;font-weight:800;letter-spacing:.1em;color:var(--navy);padding:0 2.5rem;}
        @keyframes lp-ticker{from{transform:translateX(0);}to{transform:translateX(-50%);}}

        .pain{background:#060E1A;padding:5.5rem 2rem;}
        .pain-head{text-align:center;margin-bottom:3.5rem;}
        .section-tag{font-size:.68rem;font-weight:700;letter-spacing:.14em;color:var(--gold);margin-bottom:.8rem;}
        .pain-head h2{font-size:clamp(1.8rem,3.5vw,2.6rem);font-weight:800;letter-spacing:-.02em;line-height:1.15;}
        .pain-head h2 span{color:var(--gold);}
        .pain-grid{max-width:860px;margin:0 auto;display:grid;grid-template-columns:repeat(3,1fr);gap:1px;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.05);}
        .pain-col{background:#060E1A;padding:2rem 1.6rem;}
        .tag-before{font-size:.62rem;font-weight:700;letter-spacing:.1em;color:rgba(255,255,255,.25);margin-bottom:.6rem;}
        .pain-txt{font-size:.93rem;color:rgba(255,255,255,.6);line-height:1.55;font-weight:500;}
        .divider-arrow{font-size:1.4rem;color:var(--gold);margin:1.2rem 0;}
        .tag-after{font-size:.62rem;font-weight:700;letter-spacing:.1em;color:var(--gold);margin-bottom:.6rem;}
        .gain-txt{font-size:.93rem;color:#fff;line-height:1.55;font-weight:600;}

        .steps{padding:6rem 2rem;background:var(--dark);}
        .steps-head{text-align:center;margin-bottom:4rem;}
        .steps-h2{font-size:clamp(2rem,4vw,3.2rem);font-weight:800;letter-spacing:-.025em;margin-bottom:.5rem;}
        .steps-sub{font-size:.9rem;color:rgba(255,255,255,.35);}
        .steps-row{max-width:900px;margin:0 auto;display:grid;grid-template-columns:repeat(3,1fr);gap:2rem;position:relative;}
        .steps-row::before{content:'';position:absolute;top:2.8rem;left:calc(16.6% + 1rem);right:calc(16.6% + 1rem);height:1px;background:linear-gradient(90deg,transparent,rgba(200,164,74,.35),transparent);}
        .step-item{text-align:center;}
        .step-num{width:56px;height:56px;background:var(--gold);color:var(--navy);font-size:1.4rem;font-weight:800;display:flex;align-items:center;justify-content:center;margin:0 auto 1.4rem;}
        .step-item h3{font-size:1rem;font-weight:700;margin-bottom:.55rem;}
        .step-item p{font-size:.82rem;color:rgba(255,255,255,.45);line-height:1.65;}

        .numbers{background:var(--gold);padding:3.2rem 2rem;}
        .num-inner{max-width:820px;margin:0 auto;display:flex;justify-content:space-around;flex-wrap:wrap;gap:2rem;text-align:center;}
        .num-v{font-family:'Cormorant Garamond',Georgia,serif;font-size:3.4rem;font-weight:700;color:var(--navy);line-height:1;}
        .num-l{font-size:.75rem;font-weight:800;letter-spacing:.08em;color:rgba(15,31,61,.65);margin-top:.35rem;}

        .demo{background:#060E1A;padding:5.5rem 2rem;}
        .demo-inner{max-width:880px;margin:0 auto;display:grid;grid-template-columns:1fr 1fr;gap:4rem;align-items:center;}
        .demo-text .tag-small{font-size:.68rem;font-weight:700;letter-spacing:.13em;color:var(--gold);margin-bottom:1rem;}
        .demo-text h2{font-size:clamp(1.8rem,3.5vw,2.6rem);font-weight:800;letter-spacing:-.025em;margin-bottom:1.2rem;line-height:1.15;}
        .demo-text p{font-size:.88rem;color:rgba(255,255,255,.5);line-height:1.7;margin-bottom:2rem;}
        .demo-box{background:rgba(200,164,74,.05);border:1px solid rgba(200,164,74,.18);padding:2rem;position:relative;}
        .demo-badge{position:absolute;top:-11px;right:1.5rem;background:var(--gold);color:var(--navy);font-size:.6rem;font-weight:800;letter-spacing:.1em;padding:.24rem .75rem;}
        .demo-loading{height:6px;background:rgba(255,255,255,.05);margin-bottom:1.3rem;overflow:hidden;}
        .demo-loading-fill{height:100%;background:var(--gold);width:0;animation:lp-loadfill 2.5s cubic-bezier(.4,0,.2,1) .5s forwards;}
        @keyframes lp-loadfill{to{width:100%;}}
        .demo-line{display:flex;gap:.8rem;align-items:flex-start;margin-bottom:.9rem;}
        .demo-dot-gold{width:7px;height:7px;background:var(--gold);flex-shrink:0;margin-top:.35rem;}
        .demo-line-t{font-size:.8rem;color:rgba(255,255,255,.55);line-height:1.5;}
        .demo-line-t b{color:#fff;}
        .demo-done{font-size:.8rem;color:var(--gold);font-weight:700;margin-top:.5rem;}

        .testi{padding:5.5rem 2rem;background:var(--dark);text-align:center;position:relative;overflow:hidden;}
        .testi::before{content:'';position:absolute;inset:0;background:radial-gradient(ellipse 50% 60% at 50% 50%,rgba(200,164,74,.06) 0%,transparent 70%);pointer-events:none;}
        .testi-q{font-size:clamp(1.4rem,3vw,2.1rem);font-weight:700;max-width:700px;margin:0 auto 2.2rem;line-height:1.42;letter-spacing:-.01em;position:relative;}
        .testi-q em{color:var(--gold);font-style:normal;}
        .testi-who{display:flex;align-items:center;justify-content:center;gap:.8rem;}
        .testi-av{width:44px;height:44px;background:var(--gold);display:flex;align-items:center;justify-content:center;font-weight:800;font-size:1.1rem;color:var(--navy);}
        .testi-name{font-weight:700;font-size:.88rem;text-align:left;}
        .testi-role{font-size:.73rem;color:rgba(255,255,255,.35);text-align:left;}

        .pricing{background:#060E1A;padding:6rem 2rem;}
        .pricing-head{text-align:center;margin-bottom:4rem;}
        .pricing-h2{font-size:clamp(2rem,4vw,3.2rem);font-weight:800;letter-spacing:-.025em;}
        .pricing-sub{font-size:.88rem;color:rgba(255,255,255,.35);margin-top:.6rem;}
        .p-grid{max-width:920px;margin:0 auto;display:grid;grid-template-columns:repeat(3,1fr);gap:1.5rem;align-items:start;}
        .p-card{background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.07);padding:2rem 1.8rem;transition:border-color .2s;}
        .p-card:hover{border-color:rgba(200,164,74,.35);}
        .p-card.hi{background:var(--gold);border:none;transform:translateY(-10px);position:relative;}
        .p-hi-tag{position:absolute;top:-13px;left:50%;transform:translateX(-50%);background:#fff;color:var(--navy);font-size:.58rem;font-weight:800;letter-spacing:.12em;padding:.25rem .85rem;white-space:nowrap;}
        .p-n{font-size:.65rem;font-weight:700;letter-spacing:.12em;color:rgba(255,255,255,.35);margin-bottom:.5rem;}
        .p-card.hi .p-n{color:rgba(15,31,61,.55);}
        .p-v{font-family:'Cormorant Garamond',Georgia,serif;font-size:3rem;font-weight:700;color:#fff;line-height:1;}
        .p-card.hi .p-v{color:var(--navy);}
        .p-per{font-size:.75rem;color:rgba(255,255,255,.35);}
        .p-card.hi .p-per{color:rgba(15,31,61,.55);}
        .p-d{font-size:.78rem;color:rgba(255,255,255,.35);margin:.8rem 0 1.4rem;line-height:1.5;}
        .p-card.hi .p-d{color:rgba(15,31,61,.6);}
        .p-ul{list-style:none;margin-bottom:1.8rem;}
        .p-ul li{font-size:.8rem;display:flex;gap:.6rem;padding:.38rem 0;border-bottom:1px solid rgba(255,255,255,.05);color:rgba(255,255,255,.65);}
        .p-card.hi .p-ul li{border-color:rgba(15,31,61,.1);color:var(--navy);}
        .ck{color:var(--gold);font-size:.68rem;margin-top:.15rem;flex-shrink:0;}
        .p-card.hi .ck{color:var(--navy);}
        .p-btn{display:block;text-align:center;padding:.88rem;font-size:.87rem;font-weight:800;letter-spacing:.04em;background:var(--gold);color:var(--navy);font-family:'DM Sans',sans-serif;transition:opacity .15s;}
        .p-btn:hover{opacity:.88;}
        .p-card.hi .p-btn{background:var(--navy);color:var(--gold);}
        .p-note{text-align:center;font-size:.66rem;margin-top:.6rem;color:rgba(255,255,255,.2);}
        .p-card.hi .p-note{color:rgba(15,31,61,.4);}

        .lp-final{padding:7rem 2rem 8rem;text-align:center;position:relative;overflow:hidden;}
        .final-bg{position:absolute;inset:0;background:url('https://images.unsplash.com/photo-1521791136064-7986c2920216?w=1600&q=80') center center/cover no-repeat;pointer-events:none;}
        .final-ov{position:absolute;inset:0;background:rgba(8,17,31,0.9);pointer-events:none;}
        .final-glow{position:absolute;inset:0;background:radial-gradient(ellipse 55% 55% at 50% 50%,rgba(200,164,74,0.12) 0%,transparent 70%);pointer-events:none;}
        .final-inner{position:relative;}
        .lp-final h2{font-size:clamp(2.8rem,7vw,5rem);font-weight:800;letter-spacing:-.035em;line-height:1.0;margin-bottom:1rem;}
        .lp-final h2 em{color:var(--gold);font-style:normal;display:block;}
        .lp-final p{font-size:1rem;color:rgba(255,255,255,.4);margin-bottom:2.5rem;}

        .lp-footer{background:#040A12;border-top:1px solid rgba(255,255,255,.05);padding:1.8rem 2rem;}
        .foot-in{max-width:920px;margin:0 auto;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:1rem;}
        .foot-logo{font-family:'Cormorant Garamond',Georgia,serif;font-size:1.25rem;font-weight:700;color:rgba(255,255,255,.4);}
        .foot-links{display:flex;gap:1.4rem;flex-wrap:wrap;}
        .foot-links a{font-size:.73rem;color:rgba(255,255,255,.22);font-weight:500;}
        .foot-copy{font-size:.68rem;color:rgba(255,255,255,.14);}

        .mob-bar{display:none;position:fixed;bottom:0;left:0;right:0;z-index:200;background:rgba(8,17,31,.96);backdrop-filter:blur(10px);border-top:1px solid rgba(200,164,74,.25);padding:.75rem 1.2rem;}
        .mob-bar a{display:block;background:var(--gold);color:var(--navy);text-align:center;padding:.82rem;font-size:.9rem;font-weight:800;letter-spacing:.03em;font-family:'DM Sans',sans-serif;}

        @media(max-width:760px){
          .pain-grid,.steps-row,.demo-inner,.p-grid{grid-template-columns:1fr !important;}
          .steps-row::before{display:none;}
          .p-card.hi{transform:none;}
          .btns{flex-direction:column;align-items:stretch;}
          .btn-gold,.btn-ghost{text-align:center;}
          .mob-bar{display:block;}
          .lp-nav-link{display:none;}
        }
      `}</style>

      <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@700&family=DM+Sans:wght@400;500;700;800&display=swap" rel="stylesheet"/>

      {/* NAV */}
      <nav className="lp-nav">
        <div className="lp-logo">Sopimus<b>|</b>kone</div>
        <div className="lp-nav-r">
          <a href="#steps" className="lp-nav-link">Miten toimii</a>
          <a href="#pricing" className="lp-nav-link">Hinnat</a>
          <a href="/kirjaudu?plan=pro&trial=1" className="lp-nav-btn">Aloita ilmaiseksi →</a>
        </div>
      </nav>

      {/* HERO */}
      <section className="lp-hero">
        {/* Taustakuvat: toimistotyö, kädenpuristus, neuvottelu, asiakirjat, allekirjoitus */}
        <div className="bg-layer active" style={{backgroundImage:"url('https://images.unsplash.com/photo-1589829085413-56de8ae18c73?w=1800&q=80')"}}></div>
        <div className="bg-layer" style={{backgroundImage:"url('https://images.unsplash.com/photo-1521791136064-7986c2920216?w=1800&q=80')"}}></div>
        <div className="bg-layer" style={{backgroundImage:"url('https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=1800&q=80')"}}></div>
        <div className="bg-layer" style={{backgroundImage:"url('https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=1800&q=80')"}}></div>
        <div className="bg-layer" style={{backgroundImage:"url('https://images.unsplash.com/photo-1507209696998-2a353d54e2f3?w=1800&q=80')"}}></div>
        <div className="hero-overlay"></div>
        <div className="hero-glow"></div>
        <div className="hero-inner">
          <div className="eyebrow" id="eyebrow">
            <span className="eyebrow-dot"></span>
            <span id="eyebrow-text">ALIHANKKIJASOPIMUKSET</span>
          </div>
          <h1 className="lp-h1">Sopimus valmiina<em>5 minuutissa.</em></h1>
          <p className="hero-sub">
            <span className="slogan-wrap" style={{minWidth:"340px",verticalAlign:"bottom"}}>
              <span className="slogan-word enter">Onko asiakirja kunnossa?</span>
              <span className="slogan-word below">Osaanko laatia tämän oikein?</span>
              <span className="slogan-word below">Joudunko tästä ongelmiin?</span>
            </span>
            {" "}Ei enää epävarmuutta. <b>Tuo sopimuksesi — juristi varmistaa</b> että se on oikein.
          </p>
          <div className="btns">
            <a href="/kirjaudu?plan=pro&trial=1" className="btn-gold">Kokeile 30 päivää ilmaiseksi →</a>
            <a href="/tarjouskone?demo=1" className="btn-ghost">Katso demo ensin</a>
          </div>
          <div className="proof-row">
            <div className="proof-item"><span>✓</span> Ei luottokorttia</div>
            <div className="proof-item"><span>✓</span> Valmis alle 5 minuutissa</div>
            <div className="proof-item"><span>✓</span> eIDAS-allekirjoitus</div>
            <div className="proof-item"><span>✓</span> Juristivarmistettu pohja</div>
          </div>
        </div>
        <div className="bg-dots" id="bg-dots"></div>
      </section>

      {/* TICKER */}
      <div className="ticker">
        <div className="ticker-track">
          {["JURISTI TARKISTAA","✦","SÄHKÖINEN ALLEKIRJOITUS","✦","NOPEA HYVÄKSYNTÄ","✦","eIDAS-PÄTEVÄ","✦","JURISTIVARMISTETTU","✦","SOPIMUSARKISTO","✦",
            "JURISTI TARKISTAA","✦","SÄHKÖINEN ALLEKIRJOITUS","✦","NOPEA HYVÄKSYNTÄ","✦","eIDAS-PÄTEVÄ","✦","JURISTIVARMISTETTU","✦","SOPIMUSARKISTO","✦"].map((t,i)=>(
            <span className="ticker-item" key={i}>{t}</span>
          ))}
        </div>
      </div>

      {/* PAIN → GAIN */}
      <section className="pain">
        <div className="pain-head">
          <div className="section-tag">TUNNISTUUKO TÄMÄ?</div>
          <h2>Epävarmuus maksaa. <span>Varmuus ei.</span></h2>
        </div>
        <div className="pain-grid">
          {[
            {b:"\"Onko tämä asiakirja nyt kunnossa?\" — Et tiedä, etkä uskalla kysyä lakimieheltä kun lasku tulee.", a:"Lataa sopimuksesi palveluun — juristi tarkistaa ja vahvistaa oikeellisuuden. Tiedät että se pitää."},
            {b:"\"Miten nämä vastuut oikein määräytyvät?\" — Googlet kaksi tuntia, saat viisi eri vastausta.", a:"Juristi katsoo läpi vastuukysymykset ja merkitsee selkokielellä mitä pitää korjata tai hyväksyä."},
            {b:"\"Joudunko tästä sopimuksesta ongelmiin?\" — Käytät vanhaa pohjaa ja toivot parasta.", a:"Juristivarmistettu asiakirja, sähköinen allekirjoitus, arkisto todisteena. Selkä suojattuna."},
          ].map((item,i)=>(
            <div className="pain-col" key={i}>
              <div className="tag-before">ENNEN</div>
              <div className="pain-txt">{item.b}</div>
              <div className="divider-arrow">↓</div>
              <div className="tag-after">SOPIMUSKONEELLA</div>
              <div className="gain-txt">{item.a}</div>
            </div>
          ))}
        </div>
      </section>

      {/* STEPS */}
      <section className="steps" id="steps">
        <div className="steps-head">
          <div className="section-tag">NÄIN YKSINKERTAISTA SE ON</div>
          <div className="steps-h2">Kolme askelta. Valmis sopimus.</div>
          <p className="steps-sub">Ei koulutusta, ei asennuksia — toimii heti selaimessa.</p>
        </div>
        <div className="steps-row">
          {[
            {n:"1", h:"Lataa asiakirjasi palveluun", p:"Toit oman sopimuksen, käytit valmispohjaa tai laadit sen itse — ei väliä. Lataa se palveluun ja kerro mitä haluat tarkistettavan."},
            {n:"2", h:"Juristi tarkistaa ja vahvistaa", p:"Pätevä juristi käy läpi asiakirjan, tarkistaa vastuut, ehdot ja laillisuuden — ja antaa hyväksynnän tai korjausehdotukset selkokielellä."},
            {n:"3", h:"Molemmat allekirjoittavat", p:"Kun asiakirja on kunnossa, kumpikin osapuoli allekirjoittaa sähköisesti selaimessa. eIDAS-pätevä, juridisesti sitova, arkistoitu."},
          ].map((s,i)=>(
            <div className="step-item" key={i}>
              <div className="step-num">{s.n}</div>
              <h3>{s.h}</h3>
              <p>{s.p}</p>
            </div>
          ))}
        </div>
      </section>

      {/* NUMBERS */}
      <section className="numbers">
        <div className="num-inner">
          <div><div className="num-v">5 min</div><div className="num-l">SOPIMUKSEN TEKO</div></div>
          <div><div className="num-v">eIDAS</div><div className="num-l">JURIDISESTI PÄTEVÄ</div></div>
          <div><div className="num-v">100 %</div><div className="num-l">DIGITAALINEN</div></div>
          <div><div className="num-v">30 pv</div><div className="num-l">ILMAINEN KOKEILU</div></div>
        </div>
      </section>

      {/* DEMO */}
      <section className="demo">
        <div className="demo-inner">
          <div className="demo-text">
            <div className="tag-small">KOKEILE ENSIN — EI REKISTERÖITYMISTÄ</div>
            <h2>Näe miten sopimus syntyy. Heti.</h2>
            <p>Avaa demo, valitse sopimuksen tyyppi ja katso miten valmis asiakirja muodostuu silmien edessä. Ei rekisteröitymistä, ei asennuksia.</p>
            <a href="/tarjouskone?demo=1" className="btn-gold">Avaa demo →</a>
          </div>
          <div className="demo-box">
            <div className="demo-badge">LIVE DEMO</div>
            <div style={{fontSize:".62rem",fontWeight:700,letterSpacing:".1em",color:"rgba(255,255,255,.28)",marginBottom:".9rem"}}>JURISTI TARKISTAA...</div>
            <div className="demo-loading"><div className="demo-loading-fill"></div></div>
            <div className="demo-line"><div className="demo-dot-gold"></div><div className="demo-line-t"><b>Asiakirja:</b> Alihankkijasopimus</div></div>
            <div className="demo-line"><div className="demo-dot-gold"></div><div className="demo-line-t"><b>Vastuut:</b> tarkistettu ✓</div></div>
            <div className="demo-line"><div className="demo-dot-gold"></div><div className="demo-line-t"><b>Ehdot ja laillisuus:</b> vahvistettu ✓</div></div>
            <div className="demo-done">✓ Juristivarmistettu — lähetä allekirjoitettavaksi</div>
          </div>
        </div>
      </section>

      {/* TESTIMONIAL */}
      <section className="testi">
        <div style={{fontSize:"3.5rem",color:"var(--gold)",lineHeight:1,marginBottom:"1.2rem"}}>&ldquo;</div>
        <p className="testi-q">Ennen alihankkijasopimus teetti <em>tunnin työn</em> ja lakimiehen laskun päälle. Nyt sopimus on valmis ennen kuin kahvi jäähtyy.</p>
        <div className="testi-who">
          <div className="testi-av">J</div>
          <div>
            <div className="testi-name">Janne K.</div>
            <div className="testi-role">Toimitusjohtaja, rakennusyritys</div>
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section className="pricing" id="pricing">
        <div className="pricing-head">
          <div className="section-tag">HINNOITTELU</div>
          <div className="pricing-h2">Yksinkertainen. Ei yllätyksiä.</div>
          <p className="pricing-sub">30 päivää ilmaiseksi — ei luottokorttia, ei sitoutumista.</p>
        </div>
        <div className="p-grid">
          <div className="p-card">
            <div className="p-n">STARTER</div>
            <div className="p-v">49€</div><div className="p-per">/kuukausi</div>
            <p className="p-d">Pienelle yritykselle tai yksittäiselle yrittäjälle.</p>
            <ul className="p-ul">
              {["10 sopimusta / kk","AI-sopimusgeneraattori","Sähköinen allekirjoitus","Sopimusarkisto","Sähköpostilähetys"].map(f=><li key={f}><span className="ck">✓</span>{f}</li>)}
            </ul>
            <a href="/kirjaudu?plan=starter&trial=1" className="p-btn">Aloita kokeilu →</a>
            <p className="p-note">30 pv ilmaiseksi • ei korttia</p>
          </div>
          <div className="p-card hi">
            <div className="p-hi-tag">SUOSITUIN</div>
            <div className="p-n">PRO</div>
            <div className="p-v">99€</div><div className="p-per">/kuukausi</div>
            <p className="p-d">Kasvavalle yritykselle — rajaton käyttö.</p>
            <ul className="p-ul">
              {["Rajaton määrä sopimuksia","AI-sopimusgeneraattori","Sähköinen allekirjoitus","Sopimusarkisto","Sähköpostilähetys","Word-lataus muokkausta varten"].map(f=><li key={f}><span className="ck">✓</span>{f}</li>)}
            </ul>
            <a href="/kirjaudu?plan=pro&trial=1" className="p-btn">Aloita kokeilu →</a>
            <p className="p-note">30 pv ilmaiseksi • ei korttia</p>
          </div>
          <div className="p-card">
            <div className="p-n">YRITYS</div>
            <div className="p-v">249€</div><div className="p-per">/kuukausi</div>
            <p className="p-d">Tiimille tai useammalle käyttäjälle.</p>
            <ul className="p-ul">
              {["Rajaton määrä sopimuksia","AI-sopimusgeneraattori","Sähköinen allekirjoitus","Sopimusarkisto","Sähköpostilähetys","Word-lataus muokkausta varten"].map(f=><li key={f}><span className="ck">✓</span>{f}</li>)}
            </ul>
            <a href="mailto:info@certuslex.fi?subject=Yritys-paketti" className="p-btn">Ota yhteyttä →</a>
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="lp-final">
        <div className="final-bg"></div>
        <div className="final-ov"></div>
        <div className="final-glow"></div>
        <div className="final-inner">
          <h2>Tuo sopimuksesi.<em>Juristi hoitaa loput.</em></h2>
          <p>30 päivää ilmaiseksi. Ei luottokorttia. Ei sitoutumista.</p>
          <a href="/kirjaudu?plan=pro&trial=1" className="btn-gold" style={{fontSize:"1.1rem",padding:"1.1rem 3rem"}}>Kokeile ilmaiseksi →</a>
        </div>
      </section>

      <footer className="lp-footer">
        <div className="foot-in">
          <div className="foot-logo">Sopimus|kone</div>
          <div className="foot-links">
            <a href="#pricing">Hinnoittelu</a>
            <a href="/ohjeet">Ohjeet</a>
            <a href="/tietosuoja">Tietosuoja</a>
            <a href="/kayttoehdot">Käyttöehdot</a>
          </div>
          <div className="foot-copy">© 2026 CertusLex / Sopimuskone</div>
        </div>
      </footer>

      <div className="mob-bar">
        <a href="/kirjaudu?plan=pro&trial=1">Kokeile ilmaiseksi — 30 pv →</a>
      </div>
    </>
  );
}
