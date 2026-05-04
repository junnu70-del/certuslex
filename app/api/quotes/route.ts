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

    // Haetaan ilman orderBy — ei vaadi composite-indeksiä
    // Järjestetään createdAt:n mukaan JavaScriptillä
    let snap = await db.collection("quotes")
      .where("senderUid", "==", uid)
      .get();

    // Fallback: vanhat tarjoukset joissa ei ole senderUid
    if (snap.empty && decoded.email) {
      snap = await db.collection("quotes")
        .where("senderEmail", "==", decoded.email)
        .get();
    }

    const quotes = snap.docs
      .map(d => {
        const data = d.data();
        return {
          id: d.id,
          token: data.token ?? "",
          project: data.project ?? {},
          clientName: data.clientName ?? "",
          clientEmail: data.clientEmail ?? "",
          status: data.status ?? "sent",
          createdAt: data.createdAt?.toDate?.()?.toISOString() ?? null,
          comments: data.comments ?? [],
          senderEmail: data.senderEmail ?? "",
        };
      })
      // Järjestetään uusimmat ensin JavaScriptillä
      .sort((a, b) => {
        if (!a.createdAt) return 1;
        if (!b.createdAt) return -1;
        return b.createdAt.localeCompare(a.createdAt);
      });

    return NextResponse.json({ quotes });
  } catch (err) {
    console.error("Quotes GET error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

// DELETE /api/quotes?id=... — poista tarjous (vain omistaja)
export async function DELETE(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Ei kirjautunut" }, { status: 401 });
  }
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id puuttuu" }, { status: 400 });

  try {
    getAdminDb();
    const decoded = await getAuth().verifyIdToken(authHeader.slice(7));
    const db = getAdminDb();
    const snap = await db.collection("quotes").doc(id).get();
    if (!snap.exists) return NextResponse.json({ error: "Ei löydy" }, { status: 404 });
    const data = snap.data()!;
    if (data.senderUid !== decoded.uid && data.senderEmail !== decoded.email) {
      return NextResponse.json({ error: "Ei oikeuksia" }, { status: 403 });
    }
    await snap.ref.delete();
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Quotes DELETE error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
