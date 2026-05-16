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

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const db = getAdminDb();

    const snap = await db.collection("documents").doc(id).get();
    if (!snap.exists) {
      return NextResponse.json({ error: "Tilausta ei löydy" }, { status: 404 });
    }

    const data = snap.data()!;

    // Palautetaan vain asiakkaalle turvalliset kentät
    return NextResponse.json({
      fileName: data.fileName ?? "",
      docType: data.docType ?? "",
      plan: data.plan ?? "",
      price: data.price ?? "",
      deliveryTime: data.deliveryTime ?? "",
      status: data.status ?? "pending_review",
      createdAt: data.createdAt?._seconds ?? null,
      inReviewAt: data.inReviewAt?._seconds ?? null,
      reviewedAt: data.reviewedAt?._seconds ?? null,
      review: data.review ?? "",
      claudeAnalysis: data.claudeAnalysis ?? "",
      correctedUrl: data.correctedUrl ?? "",
    });
  } catch (err) {
    console.error("[tilaus/id] Error:", err);
    return NextResponse.json({ error: "Virhe" }, { status: 500 });
  }
}
