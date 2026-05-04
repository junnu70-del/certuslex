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
    getAdminDb();
    const decoded = await getAuth().verifyIdToken(token);
    return decoded.uid;
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  try {
    const uid = await verifyToken(req);
    if (!uid) return NextResponse.json({ error: "Ei kirjautunut" }, { status: 401 });

    const id = req.nextUrl.pathname.split("/").at(-1)!;
    const db = getAdminDb();
    const snap = await db.collection("invoices").doc(id).get();

    if (!snap.exists) return NextResponse.json({ error: "Laskua ei löydy" }, { status: 404 });
    const data = snap.data()!;
    if (data.senderUid !== uid) return NextResponse.json({ error: "Ei oikeuksia" }, { status: 403 });

    return NextResponse.json({ id: snap.id, ...data });
  } catch (err) {
    console.error("Invoice GET error:", err);
    return NextResponse.json({ error: "Virhe" }, { status: 500 });
  }
}
