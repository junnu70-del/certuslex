import { NextRequest, NextResponse } from "next/server";
import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
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

// POST /api/log-consent — tallentaa käyttöehtojen hyväksynnän audit-lokiin
export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Ei kirjautunut" }, { status: 401 });
  }
  const token = authHeader.slice(7);

  try {
    const db = getAdminDb();
    const decoded = await getAuth().verifyIdToken(token);

    // IP-osoite — Vercel välittää tämän headerissa
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("x-real-ip") ||
      "unknown";

    const userAgent = req.headers.get("user-agent") || "unknown";

    const body = await req.json().catch(() => ({}));
    const termsVersion = body.termsVersion ?? "2026-05-04";

    await db.collection("consent_logs").add({
      uid: decoded.uid,
      email: decoded.email ?? "",
      termsVersion,
      acceptedAt: FieldValue.serverTimestamp(),
      ip,
      userAgent,
      action: "register_accept",
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("log-consent error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
