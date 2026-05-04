import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";

function getAdminDb() {
  if (!getApps().length) {
    initializeApp({
      credential: cert({
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
      }),
    });
  }
  return getFirestore();
}

// Laskee suomalaisen viitenumeron tarkistenumeron
function finnishReference(invoiceNumber: string): string {
  const digits = invoiceNumber.replace(/\D/g, "");
  if (!digits) return "0";
  const weights = [7, 3, 1];
  let sum = 0;
  for (let i = 0; i < digits.length; i++) {
    sum += parseInt(digits[digits.length - 1 - i]) * weights[i % 3];
  }
  const checksum = (10 - (sum % 10)) % 10;
  return digits + checksum;
}

// Muotoilee viitenumeron ryhmittäin (5 numeroa kerrallaan oikealta)
function formatReference(ref: string): string {
  return ref.replace(/\D/g, "").replace(/(\d)(?=(\d{5})+$)/g, "$1 ");
}

// Rakentaa suomalaisen pankkiviivakoodin (versio 4, 54 merkkiä)
function buildBarcode(iban: string, totalAmount: number, reference: string, dueDate: string): string {
  // IBAN → 16 numeroa (poistetaan FI-etuliite ja välilyönnit)
  const ibanDigits = iban.replace(/\s/g, "").replace(/^FI/i, "").slice(0, 16).padStart(16, "0");

  // Summa → 8 numeroa (sentit, johtavat nollat)
  const cents = Math.round(totalAmount * 100);
  const amountStr = cents.toString().padStart(8, "0").slice(0, 8);

  // Viitenumero → 20 numeroa, oikealle tasattu
  const refDigits = reference.replace(/\D/g, "").padStart(20, "0").slice(0, 20);

  // Eräpäivä YYMMDD (dueDate on fi-FI muodossa esim. "15.6.2026")
  let dateStr = "000000";
  try {
    const parts = dueDate.match(/(\d+)\.(\d+)\.(\d{4})/);
    if (parts) {
      const yy = parts[3].slice(2);
      const mm = parts[2].padStart(2, "0");
      const dd = parts[1].padStart(2, "0");
      dateStr = yy + mm + dd;
    }
  } catch { /* käytä 000000 jos parsinta epäonnistuu */ }

  return `4${ibanDigits}${amountStr}000${refDigits}${dateStr}`;
}

async function verifyToken(req: NextRequest): Promise<string | null> {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;
  const token = authHeader.slice(7);
  try {
    getAdminDb();
    const decoded = await getAuth().verifyIdToken(token);
    return decoded.uid;
  } catch {
    return null;
  }
}

function buildInvoiceHtml(data: {
  invoiceNumber: string;
  invoiceDate: string;
  dueDate: string;
  company: Record<string, string>;
  client: { name: string; email: string };
  projectName: string;
  amountExVat: number;
  vatRate: number;
  vatAmount: number;
  totalAmount: number;
  invoiceId: string;
  reference: string;
  referenceFormatted: string;
  barcode: string;
}) {
  const fmt = (n: number) => n.toLocaleString("fi-FI", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const { invoiceNumber, invoiceDate, dueDate, company, client, projectName, amountExVat, vatRate, vatAmount, totalAmount, invoiceId, reference, referenceFormatted, barcode } = data;

  return `<!DOCTYPE html>
<html lang="fi">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>Lasku ${invoiceNumber}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@600;700&family=DM+Sans:wght@400;500;600&display=swap');
  *{box-sizing:border-box;margin:0;padding:0}
  body{background:#F7F4EE;font-family:'DM Sans',Arial,sans-serif;color:#2C2416;padding:40px 20px}
  .wrap{max-width:780px;margin:0 auto;background:#fff;border:1px solid #E0D9CE}
  .hdr{background:#0F1F3D;padding:24px 36px;border-left:4px solid #C8A44A;display:flex;justify-content:space-between;align-items:center}
  .logo{font-family:'Cormorant Garamond',Georgia,serif;font-size:26px;font-weight:700;color:#fff}
  .logo span{color:#C8A44A}
  .hdr-right{text-align:right}
  .inv-label{font-size:11px;letter-spacing:0.12em;color:#C8A44A;font-weight:600}
  .inv-num{font-size:20px;font-weight:700;color:#fff;font-family:'Cormorant Garamond',Georgia,serif}
  .body{padding:36px}
  .meta-row{display:grid;grid-template-columns:1fr 1fr;gap:24px;margin-bottom:32px}
  .meta-box{background:#FAF7F2;border:1px solid #EDE8DE;padding:18px 20px}
  .meta-title{font-size:10px;letter-spacing:0.12em;font-weight:700;color:#C8A44A;margin-bottom:10px}
  .meta-line{font-size:13px;color:#2C2416;line-height:1.7}
  .meta-line b{color:#0F1F3D}
  .dates{display:grid;grid-template-columns:1fr 1fr 1fr;gap:16px;margin-bottom:32px}
  .date-box{border-left:3px solid #C8A44A;padding:10px 14px;background:#FAF7F2}
  .date-lbl{font-size:10px;letter-spacing:0.1em;color:#8A8070;margin-bottom:3px;font-weight:600}
  .date-val{font-size:14px;font-weight:600;color:#0F1F3D}
  table{width:100%;border-collapse:collapse;margin-bottom:24px}
  thead tr{background:#0F1F3D}
  thead th{color:#C8A44A;font-size:10px;letter-spacing:0.1em;font-weight:700;padding:10px 14px;text-align:left}
  tbody tr{border-bottom:1px solid #EDE8DE}
  tbody td{padding:12px 14px;font-size:13px;color:#2C2416}
  .amount-right{text-align:right}
  .totals{margin-left:auto;width:280px;border:1px solid #EDE8DE}
  .total-row{display:flex;justify-content:space-between;padding:8px 16px;font-size:13px;border-bottom:1px solid #EDE8DE}
  .total-row:last-child{border-bottom:none;background:#0F1F3D;color:#fff;font-size:14px;font-weight:700;padding:12px 16px}
  .total-row:last-child span:last-child{color:#C8A44A}
  .payment{margin-top:32px;background:#FAF7F2;border:1px solid #EDE8DE;padding:20px 24px}
  .payment-title{font-size:10px;letter-spacing:0.12em;font-weight:700;color:#0F1F3D;margin-bottom:12px}
  .payment-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px}
  .payment-item{font-size:12px;color:#2C2416}
  .payment-item span{font-size:10px;color:#8A8070;display:block;margin-bottom:2px;letter-spacing:0.08em;font-weight:600}
  .ref{font-family:monospace;font-size:13px;color:#0F1F3D;font-weight:600}
  .ftr{background:#0F1F3D;border-top:4px solid #C8A44A;padding:14px 36px;display:flex;justify-content:space-between;align-items:center}
  .ftr-left{font-size:11px;color:rgba(255,255,255,0.5)}
  .ftr-right{font-size:11px;color:#C8A44A}
  @media print{
    body{background:#fff;padding:0}
    .wrap{border:none;max-width:100%}
    .no-print{display:none!important}
  }
</style>
</head>
<body>
<div class="no-print" style="max-width:780px;margin:0 auto 16px;display:flex;gap:10px">
  <button onclick="window.print()" style="background:#0F1F3D;color:#C8A44A;border:none;padding:10px 20px;font-size:13px;font-weight:600;cursor:pointer;letter-spacing:0.05em">
    🖨️ Tulosta / Tallenna PDF
  </button>
  <button onclick="window.history.back()" style="background:none;border:1px solid #C8A44A;color:#0F1F3D;padding:10px 20px;font-size:13px;cursor:pointer">
    ← Takaisin
  </button>
</div>

<div class="wrap">
  <div class="hdr">
    <div class="logo">Certus<span>Lex</span></div>
    <div class="hdr-right">
      <div class="inv-label">LASKU</div>
      <div class="inv-num">${invoiceNumber}</div>
    </div>
  </div>

  <div class="body">
    <div class="dates">
      <div class="date-box">
        <div class="date-lbl">LASKUPÄIVÄ</div>
        <div class="date-val">${invoiceDate}</div>
      </div>
      <div class="date-box">
        <div class="date-lbl">ERÄPÄIVÄ</div>
        <div class="date-val">${dueDate}</div>
      </div>
      <div class="date-box">
        <div class="date-lbl">TUNNISTE</div>
        <div class="date-val" style="font-size:11px;font-family:monospace">${invoiceId.slice(0, 8).toUpperCase()}</div>
      </div>
    </div>

    <div class="meta-row">
      <div class="meta-box">
        <div class="meta-title">LASKUTTAJA</div>
        <div class="meta-line"><b>${company.name || "—"}</b></div>
        ${company.businessId ? `<div class="meta-line">Y-tunnus: ${company.businessId}</div>` : ""}
        ${company.address ? `<div class="meta-line">${company.address}</div>` : ""}
        ${company.zip || company.city ? `<div class="meta-line">${[company.zip, company.city].filter(Boolean).join(" ")}</div>` : ""}
        ${company.phone ? `<div class="meta-line">${company.phone}</div>` : ""}
        <div class="meta-line">${company.email || ""}</div>
      </div>
      <div class="meta-box">
        <div class="meta-title">LASKUTETTAVA</div>
        <div class="meta-line"><b>${client.name || "—"}</b></div>
        <div class="meta-line">${client.email}</div>
      </div>
    </div>

    <table>
      <thead>
        <tr>
          <th>KUVAUS</th>
          <th class="amount-right">MÄÄRÄ</th>
          <th class="amount-right">ALV %</th>
          <th class="amount-right">YHTEENSÄ (ALV 0%)</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>${projectName}</td>
          <td class="amount-right">1</td>
          <td class="amount-right">${vatRate} %</td>
          <td class="amount-right">${fmt(amountExVat)} €</td>
        </tr>
      </tbody>
    </table>

    <div class="totals">
      <div class="total-row"><span>Veroton hinta</span><span>${fmt(amountExVat)} €</span></div>
      <div class="total-row"><span>ALV ${vatRate} %</span><span>${fmt(vatAmount)} €</span></div>
      <div class="total-row"><span>YHTEENSÄ</span><span>${fmt(totalAmount)} €</span></div>
    </div>

    <div class="payment">
      <div class="payment-title">MAKSUTIEDOT</div>
      <div class="payment-grid">
        <div class="payment-item">
          <span>TILINUMERO (IBAN)</span>
          <span class="ref">${company.iban || "—"}</span>
        </div>
        <div class="payment-item">
          <span>VIITENUMERO</span>
          <span class="ref">${reference}</span>
        </div>
        <div class="payment-item">
          <span>ERÄPÄIVÄ</span>
          ${dueDate}
        </div>
        <div class="payment-item">
          <span>MAKSETTAVA YHTEENSÄ</span>
          <b>${fmt(totalAmount)} €</b>
        </div>
      </div>

      ${barcode ? `
      <div style="margin-top:20px;padding-top:16px;border-top:1px solid #EDE8DE;">
        <div style="font-size:10px;letter-spacing:0.1em;font-weight:700;color:#8A8070;margin-bottom:8px;">PANKKIVIIVAKOODI</div>
        <svg id="barcode-svg"></svg>
        <div style="font-size:10px;color:#A09080;margin-top:4px;font-family:monospace;word-break:break-all;">${barcode}</div>
        <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.6/dist/barcodes/JsBarcode.code128.min.js"></script>
        <script>
          if(typeof JsBarcode !== 'undefined'){
            JsBarcode("#barcode-svg","${barcode}",{format:"CODE128",width:1.5,height:50,displayValue:false,margin:0});
          }
        </script>
      </div>` : ""}
    </div>
  </div>

  <div class="ftr">
    <span class="ftr-left">© 2026 CertusLex — certuslex.fi</span>
    <span class="ftr-right">Kiitos yhteistyöstä!</span>
  </div>
</div>
</body>
</html>`;
}

function buildEmailHtml(data: Parameters<typeof buildInvoiceHtml>[0], invoiceUrl: string): string {
  const fmt = (n: number) => n.toLocaleString("fi-FI", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return `<!DOCTYPE html><html lang="fi"><head><meta charset="UTF-8"/></head>
<body style="margin:0;padding:0;background:#F5F2EC;font-family:Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#F5F2EC;padding:40px 0;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border:1px solid #E0D9CE;">
<tr><td style="background:#0F1F3D;padding:24px 32px;border-left:4px solid #C8A44A;display:block;">
  <span style="font-size:22px;font-weight:700;color:#fff;font-family:Georgia,serif;">Certus<span style="color:#C8A44A;">Lex</span></span>
</td></tr>
<tr><td style="padding:32px;">
  <p style="font-size:15px;font-weight:600;color:#0F1F3D;margin:0 0 8px;">📄 Lasku ${data.invoiceNumber}</p>
  <p style="font-size:13px;color:#7A6E60;margin:0 0 24px;">Hei ${data.client.name}, tässä laskusi projektista <b>${data.projectName}</b>.</p>

  <table width="100%" cellpadding="0" cellspacing="0" style="background:#FAF7F2;border:1px solid #E0D9CE;margin-bottom:24px;">
  <tr><td style="padding:20px 24px;">
    <p style="font-size:11px;font-weight:700;letter-spacing:0.1em;color:#0F1F3D;margin:0 0 12px;">LASKUN TIEDOT</p>
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td style="font-size:12px;color:#7A6E60;padding:4px 0;width:45%;">Laskunumero</td>
        <td style="font-size:12px;color:#2C2416;font-weight:600;">${data.invoiceNumber}</td>
      </tr>
      <tr>
        <td style="font-size:12px;color:#7A6E60;padding:4px 0;">Projekti</td>
        <td style="font-size:12px;color:#2C2416;">${data.projectName}</td>
      </tr>
      <tr>
        <td style="font-size:12px;color:#7A6E60;padding:4px 0;">Laskupäivä</td>
        <td style="font-size:12px;color:#2C2416;">${data.invoiceDate}</td>
      </tr>
      <tr>
        <td style="font-size:12px;color:#7A6E60;padding:4px 0;">Eräpäivä</td>
        <td style="font-size:12px;color:#2C2416;font-weight:600;color:#C8A44A;">${data.dueDate}</td>
      </tr>
      <tr>
        <td style="font-size:12px;color:#7A6E60;padding:4px 0;">Veroton hinta</td>
        <td style="font-size:12px;color:#2C2416;">${fmt(data.amountExVat)} €</td>
      </tr>
      <tr>
        <td style="font-size:12px;color:#7A6E60;padding:4px 0;">ALV ${data.vatRate} %</td>
        <td style="font-size:12px;color:#2C2416;">${fmt(data.vatAmount)} €</td>
      </tr>
      <tr>
        <td style="font-size:12px;color:#7A6E60;padding:4px 0;border-top:1px solid #EDE8DE;"><b>Yhteensä</b></td>
        <td style="font-size:14px;color:#0F1F3D;font-weight:700;border-top:1px solid #EDE8DE;">${fmt(data.totalAmount)} €</td>
      </tr>
    </table>
  </td></tr>
  </table>

  <table width="100%" cellpadding="0" cellspacing="0" style="background:#FAF7F2;border:1px solid #E0D9CE;margin-bottom:24px;">
  <tr><td style="padding:20px 24px;">
    <p style="font-size:11px;font-weight:700;letter-spacing:0.1em;color:#0F1F3D;margin:0 0 12px;">MAKSUTIEDOT</p>
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td style="font-size:12px;color:#7A6E60;padding:4px 0;width:45%;">IBAN</td>
        <td style="font-size:12px;color:#2C2416;font-family:monospace;font-weight:600;">${data.company.iban || "—"}</td>
      </tr>
      <tr>
        <td style="font-size:12px;color:#7A6E60;padding:4px 0;">Viitenumero</td>
        <td style="font-size:12px;color:#2C2416;font-family:monospace;font-weight:600;">${data.referenceFormatted}</td>
      </tr>
      <tr>
        <td style="font-size:12px;color:#7A6E60;padding:4px 0;">Eräpäivä</td>
        <td style="font-size:12px;color:#0F1F3D;font-weight:600;">${data.dueDate}</td>
      </tr>
    </table>
  </td></tr>
  </table>

  <a href="${invoiceUrl}" style="display:inline-block;background:#0F1F3D;color:#C8A44A;padding:12px 24px;font-size:13px;font-weight:700;text-decoration:none;letter-spacing:0.05em;">
    Avaa lasku →
  </a>
  <p style="font-size:11px;color:#A09080;margin:16px 0 0;">Laskuttaja: ${data.company.name} — ${data.company.email}</p>
</td></tr>
<tr><td style="background:#F5F2EC;padding:16px 32px;border-top:1px solid #E0D9CE;">
  <p style="font-size:11px;color:#A09080;margin:0;">© 2026 CertusLex — <a href="https://certuslex.fi" style="color:#C8A44A;text-decoration:none;">certuslex.fi</a></p>
</td></tr>
</table>
</td></tr>
</table>
</body></html>`;
}

export async function POST(req: NextRequest) {
  try {
    const uid = await verifyToken(req);
    if (!uid) return NextResponse.json({ error: "Ei kirjautunut" }, { status: 401 });

    const { quoteId, invoiceNumber, description, amountExVat, vatRate, dueDate } = await req.json() as {
      quoteId: string;
      invoiceNumber: string;
      description?: string;
      amountExVat: number;
      vatRate: number;
      dueDate: string;
    };

    if (!quoteId || !invoiceNumber || amountExVat == null || vatRate == null || !dueDate) {
      return NextResponse.json({ error: "Puuttuvat kentät" }, { status: 400 });
    }

    const db = getAdminDb();

    const [quoteSnap, profileSnap] = await Promise.all([
      db.collection("quotes").doc(quoteId).get(),
      db.collection("companies").doc(uid).get(),
    ]);

    if (!quoteSnap.exists) return NextResponse.json({ error: "Tarjousta ei löydy" }, { status: 404 });
    const quote = quoteSnap.data()!;
    if (quote.senderUid !== uid) return NextResponse.json({ error: "Ei oikeuksia" }, { status: 403 });

    const profile = profileSnap.exists ? (profileSnap.data() ?? {}) : {} as Record<string, string>;

    const vatAmount = Math.round(amountExVat * (vatRate / 100) * 100) / 100;
    const totalAmount = Math.round((amountExVat + vatAmount) * 100) / 100;

    const today = new Date();
    const invoiceDate = today.toLocaleDateString("fi-FI", { day: "numeric", month: "numeric", year: "numeric" });

    const companyData = {
      name: profile.name || "",
      businessId: profile.businessId || "",
      address: profile.address || "",
      city: profile.city || "",
      zip: profile.zip || "",
      phone: profile.phone || "",
      email: profile.email || "",
      iban: profile.iban || "",
      contact: profile.contact || "",
    };

    const reference = finnishReference(invoiceNumber);
    const referenceFormatted = formatReference(reference);
    const barcode = companyData.iban ? buildBarcode(companyData.iban, totalAmount, reference, dueDate) : "";

    const invoiceData = {
      quoteId,
      senderUid: uid,
      invoiceNumber,
      invoiceDate,
      dueDate,
      company: companyData,
      client: {
        name: quote.clientName || quote.project?.clientName || "",
        email: quote.signedEmail || quote.clientEmail || "",
      },
      projectName: description?.trim() || quote.project?.projectName || "",
      amountExVat,
      vatRate,
      vatAmount,
      totalAmount,
      reference,
      referenceFormatted,
      barcode,
      status: "sent",
      createdAt: new Date(),
    };

    const ref = await db.collection("invoices").add(invoiceData);
    const invoiceId = ref.id;

    const invoiceUrl = `https://certuslex.fi/laskut/${invoiceId}`;

    const htmlData = { ...invoiceData, invoiceId };
    const invoiceHtml = buildInvoiceHtml(htmlData);
    const emailHtml = buildEmailHtml(htmlData, invoiceUrl);

    await ref.update({ invoiceHtml });

    const transporter = nodemailer.createTransport({
      host: "smtp.zoho.eu",
      port: 587,
      secure: false,
      auth: {
        user: process.env.ZOHO_FROM_EMAIL ?? "info@certuslex.fi",
        pass: process.env.ZOHO_SMTP_PASS,
      },
    });

    const fromEmail = process.env.ZOHO_FROM_EMAIL ?? "info@certuslex.fi";

    await transporter.sendMail({
      from: `"${invoiceData.company.name || "CertusLex"}" <${fromEmail}>`,
      to: invoiceData.client.email,
      subject: `Lasku ${invoiceNumber} — ${invoiceData.projectName}`,
      html: emailHtml,
    });

    return NextResponse.json({ ok: true, invoiceId });
  } catch (err) {
    console.error("Create invoice error:", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "Virhe" }, { status: 500 });
  }
}
