import { NextRequest, NextResponse } from "next/server";
import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

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

// GET — tarkista koodi ilman käyttöä (lataus)
export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  if (!code) return NextResponse.json({ valid: false, error: "Koodi puuttuu" });

  const db = getAdminDb();
  const snap = await db.collection("access_codes").where("code", "==", code).where("active", "==", true).get();

  if (snap.empty) return NextResponse.json({ valid: false, error: "Virheellinen koodi" });

  const data = snap.docs[0].data();
  const usesLeft = data.maxUses - (data.usedCount ?? 0);

  if (usesLeft <= 0) return NextResponse.json({ valid: false, error: "Koodin käyttökerrat on käytetty" });

  return NextResponse.json({ valid: true, usesLeft, label: data.label ?? "", codeId: snap.docs[0].id, recipientEmail: data.recipientEmail ?? "", recipientName: data.recipientName ?? "" });
}

// POST — käytä yksi käyttökerta
export async function POST(req: NextRequest) {
  const { code, action } = await req.json() as { code: string; action?: string };
  if (!code) return NextResponse.json({ valid: false, error: "Koodi puuttuu" }, { status: 400 });

  const db = getAdminDb();
  const snap = await db.collection("access_codes").where("code", "==", code).where("active", "==", true).get();

  if (snap.empty) return NextResponse.json({ valid: false, error: "Virheellinen koodi" }, { status: 403 });

  const docRef = snap.docs[0].ref;
  const data = snap.docs[0].data();
  const usesLeft = data.maxUses - (data.usedCount ?? 0);

  if (usesLeft <= 0) return NextResponse.json({ valid: false, error: "Koodin käyttökerrat on käytetty" }, { status: 403 });

  // Kirjaa käyttö
  await docRef.update({
    usedCount: FieldValue.increment(1),
    uses: FieldValue.arrayUnion({ timestamp: new Date().toISOString(), action: action ?? "generate_quote" }),
  });

  return NextResponse.json({ valid: true, usesLeft: usesLeft - 1, label: data.label ?? "" });
}
