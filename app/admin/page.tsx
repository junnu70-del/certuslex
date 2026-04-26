"use client";

import dynamic from "next/dynamic";

// ssr: false estää Firebase-moduulin evaluoinnin build-aikana
const AdminClient = dynamic(() => import("./AdminClient"), {
  ssr: false,
  loading: () => (
    <div style={{ minHeight: "100vh", background: "#0F1F3D", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ width: "40px", height: "40px", border: "3px solid rgba(200,164,74,.3)", borderTopColor: "#C8A44A", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  ),
});

export default function AdminPage() {
  return <AdminClient />;
}
