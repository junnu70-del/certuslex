import { NextRequest, NextResponse } from "next/server";
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

async function verifyToken(req: NextRequest): Promise<string | null> {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;
  const token = authHeader.slice(7);
  try {
    // Varmistetaan että admin on alustettu ennen getAuth()
    getAdminDb();
    const decoded = await getAuth().verifyIdToken(token);
    return decoded.uid;
  } catch {
    return null;
  }
}

// GET /api/profile — hae yritysprofiili, käynnistä trial automaattisesti
export async function GET(req: NextRequest) {
  const uid = await verifyToken(req);
  if (!uid) return NextResponse.json({ error: "Ei kirjautunut" }, { status: 401 });

  try {
    const db = getAdminDb();
    const ref = db.collection("companies").doc(uid);
    const snap = await ref.get();
    const data = snap.exists ? (snap.data() ?? {}) : {};

    // Käynnistä 30 pv trial automaattisesti ensimmäisellä kirjautumisella
    if (!data.trialStartedAt) {
      const now = new Date();
      const trialEnds = new Date(now);
      trialEnds.setDate(trialEnds.getDate() + 30);
      await ref.set({
        trialStartedAt: now.toISOString(),
        trialEndsAt: trialEnds.toISOString(),
        subscriptionStatus: "trial",
        plan: "pro",
      }, { merge: true });
      data.trialStartedAt = now.toISOString();
      data.trialEndsAt = trialEnds.toISOString();
      data.subscriptionStatus = "trial";
      data.plan = "pro";
    }

    // Laske jäljellä olevat trial-päivät
    const trialEndsAt = new Date(data.trialEndsAt);
    const daysLeft = Math.ceil((trialEndsAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    const isExpired = data.subscriptionStatus !== "active" && daysLeft <= 0;

    return NextResponse.json({ ...data, trialDaysLeft: Math.max(0, daysLeft), isExpired });
  } catch (err) {
    console.error("Profile GET error:", err);
    return NextResponse.json({ error: "Tietokantavirhe: " + String(err) }, { status: 500 });
  }
}

// POST /api/profile — tallenna yritysprofiili
export async function POST(req: NextRequest) {
  const uid = await verifyToken(req);
  if (!uid) return NextResponse.json({ error: "Ei kirjautunut" }, { status: 401 });

  try {
    const profile = await req.json();

    // Suodatetaan undefined-arvot pois — Firestore ei hyväksy niitä
    const clean = Object.fromEntries(
      Object.entries(profile).filter(([, v]) => v !== undefined && v !== null)
    );

    const db = getAdminDb();
    await db.collection("companies").doc(uid).set(clean, { merge: true });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Profile POST error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
