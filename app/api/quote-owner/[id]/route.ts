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

// GET /api/quote-owner/[id] — tarjouksen omistaja voi lukea ilman tokenia
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Ei kirjautunut" }, { status: 401 });
  }

  try {
    getAdminDb();
    const decoded = await getAuth().verifyIdToken(authHeader.slice(7));
    const uid = decoded.uid;

    const id = req.nextUrl.pathname.split("/").at(-1)!;
    const db = getAdminDb();
    const snap = await db.collection("quotes").doc(id).get();

    if (!snap.exists) {
      return NextResponse.json({ error: "Tarjousta ei löydy" }, { status: 404 });
    }

    const data = snap.data()!;

    // Varmista että käyttäjä on tarjouksen lähettäjä
    if (data.senderUid !== uid && data.senderEmail !== decoded.email) {
      return NextResponse.json({ error: "Ei oikeutta" }, { status: 403 });
    }

    return NextResponse.json({
      quoteHtml: data.quoteHtml,
      company: data.company,
      project: data.project,
      clientName: data.clientName,
      status: data.status,
      totalAmountExVat: data.totalAmountExVat ?? null,
      totalAmountIncVat: data.totalAmountIncVat ?? null,
      signedName: data.signedName,
      signedAt: data.signedAt?.toDate?.()?.toLocaleString("fi-FI") ?? null,
      comments: (data.comments ?? []).map((c: { name: string; message: string; createdAt: { toDate?: () => Date } | string }) => ({
        name: c.name,
        message: c.message,
        createdAt: typeof c.createdAt === "object" && "toDate" in c.createdAt && c.createdAt.toDate
          ? c.createdAt.toDate().toLocaleString("fi-FI")
          : c.createdAt,
      })),
    });
  } catch (err) {
    console.error("Quote owner GET error:", err);
    return NextResponse.json({ error: "Virhe" }, { status: 500 });
  }
}

// PATCH /api/quote-owner/[id] — päivitä tarjouksen HTML
export async function PATCH(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Ei kirjautunut" }, { status: 401 });
  }
  try {
    const db = getAdminDb();
    const decoded = await getAuth().verifyIdToken(authHeader.slice(7));
    const id = req.nextUrl.pathname.split("/").at(-1)!;
    const snap = await db.collection("quotes").doc(id).get();
    if (!snap.exists) return NextResponse.json({ error: "Ei löydy" }, { status: 404 });
    const data = snap.data()!;
    if (data.senderUid !== decoded.uid && data.senderEmail !== decoded.email) {
      return NextResponse.json({ error: "Ei oikeutta" }, { status: 403 });
    }
    const { quoteHtml } = await req.json() as { quoteHtml: string };
    await db.collection("quotes").doc(id).update({ quoteHtml, updatedAt: new Date() });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Quote owner PATCH error:", err);
    return NextResponse.json({ error: "Virhe" }, { status: 500 });
  }
}
