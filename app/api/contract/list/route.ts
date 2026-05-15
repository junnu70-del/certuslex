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

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization") ?? "";
    const idToken = authHeader.replace("Bearer ", "");

    if (!idToken) {
      return NextResponse.json({ error: "Kirjautuminen vaaditaan" }, { status: 401 });
    }

    const db = getAdminDb();
    const auth = getAuth();

    let isAdmin = false;
    try {
      const decoded = await auth.verifyIdToken(idToken);
      isAdmin = decoded.admin === true || (decoded.email ?? "").endsWith("@certuslex.fi");
    } catch {
      return NextResponse.json({ error: "Kirjautuminen vaaditaan" }, { status: 401 });
    }

    if (!isAdmin) {
      return NextResponse.json({ error: "Ei oikeuksia" }, { status: 403 });
    }

    const snap = await db
      .collection("contract_reviews")
      .orderBy("createdAt", "desc")
      .limit(100)
      .get();

    const contracts = snap.docs.map((doc) => {
      const d = doc.data();
      // Don't send base64 in list (too heavy)
      const { base64Content, ...rest } = d;
      void base64Content;
      return rest;
    });

    return NextResponse.json({ contracts });
  } catch (err) {
    console.error("[contract/list] Error:", err);
    return NextResponse.json({ error: "Virhe" }, { status: 500 });
  }
}
