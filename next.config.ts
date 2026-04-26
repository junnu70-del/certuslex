import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  turbopack: {
    root: path.resolve(__dirname),
  },
  // Estä Firebase-moduulin bundlaus server-puolelle
  // (Firebase käyttää selainkohtaisia API:ja kuten indexedDB)
  serverExternalPackages: ["firebase", "firebase/app", "firebase/auth", "firebase/firestore", "firebase/storage"],
};

export default nextConfig;
