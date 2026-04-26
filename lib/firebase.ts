// Tyypit vain — eivät aiheuta moduulin ajoa buildissa
import type { Firestore } from "firebase/firestore";
import type { FirebaseStorage } from "firebase/storage";
import type { Auth } from "firebase/auth";
import type { FirebaseApp } from "firebase/app";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? "",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ?? "",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? "",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ?? "",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? "",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID ?? "",
};

// Alustetaan vain selaimessa — require() ei aja buildissa toisin kuin import
let db: Firestore = null as unknown as Firestore;
let storage: FirebaseStorage = null as unknown as FirebaseStorage;
let auth: Auth = null as unknown as Auth;

if (typeof window !== "undefined") {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { initializeApp, getApps } = require("firebase/app") as typeof import("firebase/app");
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { getFirestore } = require("firebase/firestore") as typeof import("firebase/firestore");
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { getStorage } = require("firebase/storage") as typeof import("firebase/storage");
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { getAuth } = require("firebase/auth") as typeof import("firebase/auth");

  const app: FirebaseApp =
    getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
  db = getFirestore(app);
  storage = getStorage(app);
  auth = getAuth(app);
}

export { db, storage, auth };
