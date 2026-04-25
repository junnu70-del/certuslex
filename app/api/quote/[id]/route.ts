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

export async function GET(req: NextRequest) {
  try {
    const token = req.nextUrl.searchParams.get("token");
    const id = req.nextUrl.pathname.split("/").at(-1)!;

    if (!token) return NextResponse.json({ error: "Token puuttuu" }, { status: 400 });

    const db = getAdminDb();
    const snap = await db.collection("quotes").doc(id).get();
    if (!snap.exists) return NextResponse.json({ error: "Tarjousta ei löydy" }, { status: 404 });

    const data = snap.data()!;
    if (data.token !== token) return NextResponse.json({ error: "Virheellinen linkki" }, { status: 403 });

    // Palautetaan tiedot ilman tokenia
    return NextResponse.json({
      quoteHtml: data.quoteHtml,
      company: data.company,
      project: data.project,
      clientName: data.clientName,
      status: data.status,
      signedName: data.signedName,
      signedAt: data.signedAt?.toDate?.()?.toLocaleString("fi-FI") ?? null,
      comments: (data.comments ?? []).map((c: { name: string; message: string; email?: string; createdAt: { toDate?: () => Date } | string }) => ({
        name: c.name,
        message: c.message,
        createdAt: typeof c.createdAt === "object" && "toDate" in c.createdAt && c.createdAt.toDate
          ? c.createdAt.toDate().toLocaleString("fi-FI")
          : c.createdAt,
      })),
    });
  } catch (err) {
    console.error("Get quote error:", err);
    return NextResponse.json({ error: "Virhe" }, { status: 500 });
  }
}
