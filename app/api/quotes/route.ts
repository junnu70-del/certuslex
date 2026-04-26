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

// GET /api/quotes — hae kirjautuneen käyttäjän lähettämät tarjoukset
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Ei kirjautunut" }, { status: 401 });
  }
  const token = authHeader.slice(7);

  try {
    getAdminDb();
    const decoded = await getAuth().verifyIdToken(token);
    const uid = decoded.uid;

    const db = getAdminDb();

    // Ensisijaisesti haetaan senderUid:llä (luotettava, ei riipu company.email vs auth.email)
    let snap = await db.collection("quotes")
      .where("senderUid", "==", uid)
      .orderBy("createdAt", "desc")
      .get();

    // Fallback: vanhat tarjoukset joissa ei ole senderUid — haetaan sähköpostilla
    if (snap.empty && decoded.email) {
      snap = await db.collection("quotes")
        .where("senderEmail", "==", decoded.email)
        .orderBy("createdAt", "desc")
        .get();
    }

    const quotes = snap.docs.map(d => {
      const data = d.data();
      return {
        id: d.id,
        project: data.project ?? {},
        clientName: data.clientName ?? "",
        clientEmail: data.clientEmail ?? "",
        status: data.status ?? "sent",
        createdAt: data.createdAt?.toDate?.()?.toISOString() ?? null,
        comments: data.comments ?? [],
        senderEmail: data.senderEmail ?? "",
      };
    });

    return NextResponse.json({ quotes });
  } catch (err) {
    console.error("Quotes GET error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
