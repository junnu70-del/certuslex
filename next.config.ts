import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  turbopack: {
    root: path.resolve(__dirname),
  },
  // Firebase ei saa bundlautua server-puolelle — käyttää selaimen API:ja
  serverExternalPackages: [
    "firebase",
    "firebase/app",
    "firebase/auth",
    "firebase/firestore",
    "firebase/storage",
    "@firebase/app",
    "@firebase/auth",
    "@firebase/firestore",
    "@firebase/storage",
    "mammoth",
  ],
};

export default nextConfig;
