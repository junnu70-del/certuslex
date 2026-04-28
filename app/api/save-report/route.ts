import { NextRequest, NextResponse } from "next/server";
import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getFirestore, Timestamp } from "firebase-admin/firestore";

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
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: corsHeaders });
}

export async function POST(req: NextRequest) {
  try {
    const { sessionId, hid, name, org, meetingType, location, date, duration,
            transcript, tilanne, tarpeet, toimet, askeleet } = await req.json();

    if (!sessionId || !hid) {
      return NextResponse.json({ error: "sessionId ja hid vaaditaan" }, { status: 400 });
    }

    const db = getAdminDb();
    await db.collection("kenttamuistiot").doc(sessionId).set({
      sessionId,
      hid,
      name: name || "",
      org: org || "",
      meetingType: meetingType || "",
      location: location || "",
      date: date || new Date().toISOString(),
      duration: duration || "",
      transcript: transcript || "",
      tilanne: tilanne || "",
      tarpeet: tarpeet || "",
      toimet: toimet || "",
      askeleet: askeleet || "",
      savedAt: Timestamp.now(),
    });

    return NextResponse.json({ ok: true }, { headers: corsHeaders });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Tuntematon virhe";
    console.error("save-report error:", msg);
    return NextResponse.json({ error: msg }, { status: 500, headers: corsHeaders });
  }
}
