import { NextRequest, NextResponse } from "next/server";
import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

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

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: corsHeaders });
}

export async function GET(req: NextRequest) {
  try {
    const hid = req.nextUrl.searchParams.get("hid");
    if (!hid) {
      return NextResponse.json({ error: "hid vaaditaan" }, { status: 400 });
    }

    const db = getAdminDb();
    const snap = await db.collection("kenttamuistiot")
      .where("hid", "==", hid)
      .orderBy("savedAt", "desc")
      .limit(50)
      .get();

    const reports = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    return NextResponse.json({ ok: true, reports }, { headers: corsHeaders });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Tuntematon virhe";
    console.error("get-reports error:", msg);
    return NextResponse.json({ error: msg }, { status: 500, headers: corsHeaders });
  }
}
