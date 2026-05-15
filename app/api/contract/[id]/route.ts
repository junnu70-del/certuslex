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

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const authHeader = req.headers.get("authorization") ?? "";
    const idToken = authHeader.replace("Bearer ", "");

    const db = getAdminDb();
    const auth = getAuth();

    // Verify token — allow "public" token for status-only view
    let uid = "";
    let isAdmin = false;
    let isPublic = false;

    if (idToken === "public" || !idToken) {
      isPublic = true;
    } else {
      try {
        const decoded = await auth.verifyIdToken(idToken);
        uid = decoded.uid;
        const email = decoded.email ?? "";
        const adminEmails = ["junnu70@gmail.com", "risto@kurkilaw.com"];
        isAdmin = decoded.admin === true || email.endsWith("@certuslex.fi") || adminEmails.includes(email);
      } catch {
        isPublic = true; // Treat invalid token as public
      }
    }

    const snap = await db.collection("contract_reviews").doc(id).get();
    if (!snap.exists) {
      return NextResponse.json({ error: "Sopimusta ei löydy" }, { status: 404 });
    }

    const data = snap.data()!;

    // Public: only return status + comment + fileName (no PII, no file)
    if (isPublic) {
      return NextResponse.json({
        status: data.status,
        fileName: data.fileName,
        juristiComment: data.juristiComment ?? "",
        createdAt: data.createdAt,
      });
    }

    // Authenticated non-admin: only own contracts
    if (!isAdmin && data.customerUid !== uid) {
      return NextResponse.json({ error: "Ei käyttöoikeutta" }, { status: 403 });
    }

    // Palauta data — admin näkee storageUrl:n, asiakas ei
    const response = { ...data };
    if (!isAdmin) {
      delete response.storageUrl;
      delete response.base64Content; // vanhat dokumentit
    }

    return NextResponse.json(response);
  } catch (err) {
    console.error("[contract/id] Error:", err);
    return NextResponse.json({ error: "Virhe" }, { status: 500 });
  }
}
