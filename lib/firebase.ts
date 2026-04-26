import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import { getFirestore, type Firestore } from "firebase/firestore";
import { getStorage, type FirebaseStorage } from "firebase/storage";
import { getAuth, type Auth } from "firebase/auth";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? "",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ?? "",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? "",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ?? "",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? "",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID ?? "",
};

// Wrap in try/catch: build-aikana env-muuttujat voivat puuttua (SSR).
// Kaikki Firebase-kutsut tapahtuvat vain selaimessa (useEffect/event handlers),
// joten null-arvot build-aikana eivät haittaa.
let _app: FirebaseApp | undefined;
let _db: Firestore | undefined;
let _storage: FirebaseStorage | undefined;
let _auth: Auth | undefined;

try {
  _app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
  _db = getFirestore(_app);
  _storage = getStorage(_app);
  _auth = getAuth(_app);
} catch {
  // SSR/build ilman ympäristömuuttujia — alustetaan selaimessa
}

export const db = _db as Firestore;
export const storage = _storage as FirebaseStorage;
export const auth = _auth as Auth;
