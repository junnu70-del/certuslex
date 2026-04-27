"use client";

import { useState, useEffect, useRef } from "react";
import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore, collection, query, orderBy, onSnapshot, doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { getStorage, ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? "",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ?? "",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? "",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ?? "",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? "",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID ?? "",
};

function getFirebaseApp() {
  return getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
}

const ADMIN_PASSWORD = "certuslex2026";

interface Document {
  id: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  storageUrl: string;
  docType: string;
  plan: string;
  price: string;
  deliveryTime: string;
  userEmail?: string;
  status: "pending_review" | "in_review" | "completed";
  createdAt: { seconds: number } | null;
  inReviewAt?: { seconds: number };
  review?: string;
  reviewedAt?: { seconds: number };
  correctedFileName?: string;
  correctedUrl?: string;
}

const statusLabel: Record<string, { text: string; color: string }> = {
  pending_review: { text: "Odottaa", color: "#C8862A" },
  in_review: { text: "Käsittelyssä", color: "#1A2F52" },
  completed: { text: "Valmis", color: "#2D6A4F" },
};

function formatDate(ts: { seconds: number } | null) {
  if (!ts) return "—";
  return new Date(ts.seconds * 1000).toLocaleDateString("fi-FI", {
    day: "numeric", month: "numeric", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function formatSize(bytes: number) {
  return (bytes / 1024).toFixed(0) + " KB";
}

interface AccessCode {
  id: string;
  code: string;
  label: string;
  recipientEmail: string;
  recipientName: string;
  maxUses: number;
  usedCount: number;
  uses: { timestamp: string; action: string }[];
  active: boolean;
  createdAt: { seconds: number } | null;
}

export default function AdminClient() {
  const [authed, setAuthed] = useState(false);
  const [password, setPassword] = useState("");
  const [pwError, setPwError] = useState(false);
  const [docs, setDocs] = useState<Document[]>([]);
  const [selected, setSelected] = useState<Document | null>(null);
  const [review, setReview] = useState("");
  const [saving, setSaving] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [correctedFile, setCorrectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const correctedFileRef = useRef<HTMLInputElement>(null);
  const [filter, setFilter] = useState<"all" | "pending_review" | "in_review" | "completed">("all");
  const [tab, setTab] = useState<"jono" | "koodit">("jono");
  // Koodit
  const [codes, setCodes] = useState<AccessCode[]>([]);
  const [newEmail, setNewEmail] = useState("");
  const [newName, setNewName] = useState("");
  const [newLabel, setNewLabel] = useState("");
  const [newMaxUses, setNewMaxUses] = useState("10");
  const [creatingCode, setCreatingCode] = useState(false);
  const [createResult, setCreateResult] = useState<{ code?: string; error?: string } | null>(null);

  useEffect(() => {
    if (!authed) return;
    const db = getFirestore(getFirebaseApp());
    // Dokumenttijono
    const q = query(collection(db, "documents"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      setDocs(snap.docs.map(d => ({ id: d.id, ...d.data() } as Document)));
    });
    // Käyttökoodit
    const qc = query(collection(db, "access_codes"), orderBy("createdAt", "desc"));
    const unsubCodes = onSnapshot(qc, (snap) => {
      setCodes(snap.docs.map(d => ({ id: d.id, ...d.data() } as AccessCode)));
    });
    return () => { unsub(); unsubCodes(); };
  }, [authed]);

  async function createCode() {
    if (!newEmail) return;
    setCreatingCode(true);
    setCreateResult(null);
    try {
      const res = await fetch("/api/create-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          adminPassword: "certuslex2026",
          recipientEmail: newEmail,
          recipientName: newName,
          label: newLabel || newEmail,
          maxUses: Number(newMaxUses) || 10,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setCreateResult({ code: data.codeFormatted });
        setNewEmail(""); setNewName(""); setNewLabel(""); setNewMaxUses("10");
      } else {
        setCreateResult({ error: data.error });
      }
    } catch {
      setCreateResult({ error: "Verkkovirhe" });
    } finally {
      setCreatingCode(false);
    }
  }

  function login() {
    if (password === ADMIN_PASSWORD) {
      setAuthed(true);
      setPwError(false);
    } else {
      setPwError(true);
    }
  }

  async function openDoc(d: Document) {
    setSelected(d);
    setReview(d.review ?? "");
    if (d.status === "pending_review") {
      const db = getFirestore(getFirebaseApp());
      await updateDoc(doc(db, "documents", d.id), { status: "in_review", inReviewAt: serverTimestamp() });
    }
  }

  async function saveReview() {
    if (!selected) return;
    setSaving(true);
    setEmailSent(false);
    setEmailError(null);
    setUploadProgress(0);

    const app = getFirebaseApp();
    const db = getFirestore(app);
    const storage = getStorage(app);

    let correctedUrl: string | null = null;
    if (correctedFile) {
      const timestamp = Date.now();
      const storageRef = ref(storage, `reviewed/${timestamp}_${correctedFile.name}`);
      const uploadTask = uploadBytesResumable(storageRef, correctedFile);
      await new Promise<void>((resolve, reject) => {
        uploadTask.on("state_changed",
          (snap) => setUploadProgress(Math.round((snap.bytesTransferred / snap.totalBytes) * 100)),
          reject,
          resolve
        );
      });
      correctedUrl = await getDownloadURL(storageRef);
    }

    await updateDoc(doc(db, "documents", selected.id), {
      review,
      status: "completed",
      reviewedAt: serverTimestamp(),
      ...(correctedUrl ? { correctedUrl, correctedFileName: correctedFile!.name } : {}),
    });

    if (selected.userEmail) {
      try {
        const res = await fetch("/api/send-review", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userEmail: selected.userEmail,
            fileName: selected.fileName,
            docId: selected.id,
            plan: selected.plan,
            review,
            correctedUrl,
            correctedFileName: correctedFile?.name ?? null,
          }),
        });
        if (res.ok) {
          setEmailSent(true);
        } else {
          const data = await res.json();
          setEmailError(data.error ?? "Sähköpostin lähetys epäonnistui");
        }
      } catch {
        setEmailError("Verkkovirhe sähköpostin lähetyksessä");
      }
    }

    setSaving(false);
    setCorrectedFile(null);
    setSelected(null);
  }

  const filtered = filter === "all" ? docs : docs.filter(d => d.status === filter);
  const pendingCount = docs.filter(d => d.status === "pending_review").length;

  if (!authed) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--navy)" }}>
        <div style={{ background: "#fff", padding: "2.5rem", width: "360px" }}>
          <div style={{ fontFamily: "var(--font-cormorant), Georgia, serif", fontSize: "1.8rem", fontWeight: 700, marginBottom: "0.3rem", color: "var(--navy)" }}>
            Certus<span style={{ color: "var(--gold)" }}>Lex</span>
          </div>
          <p style={{ fontSize: "0.8rem", color: "var(--muted)", marginBottom: "2rem", letterSpacing: "0.08em" }}>JURISTI-PORTAALI</p>
          <label style={{ fontSize: "0.78rem", fontWeight: 500, letterSpacing: "0.06em", display: "block", marginBottom: "0.5rem" }}>SALASANA</label>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            onKeyDown={e => e.key === "Enter" && login()}
            style={{ width: "100%", border: `1px solid ${pwError ? "var(--red)" : "var(--cream2)"}`, padding: "0.7rem", fontSize: "0.9rem", marginBottom: "0.5rem", outline: "none" }}
            placeholder="••••••••"
            autoFocus
          />
          {pwError && <p style={{ color: "var(--red)", fontSize: "0.78rem", marginBottom: "0.8rem" }}>Väärä salasana</p>}
          <button
            onClick={login}
            style={{ width: "100%", background: "var(--navy)", color: "#fff", border: "none", padding: "0.85rem", fontSize: "0.88rem", fontWeight: 500, cursor: "pointer", letterSpacing: "0.05em" }}
          >
            Kirjaudu →
          </button>
        </div>
      </div>
    );
  }

  if (selected) {
    const st = statusLabel[selected.status];
    return (
      <div style={{ minHeight: "100vh", background: "var(--cream)", fontFamily: "var(--font-dm-sans), Arial, sans-serif" }}>
        <nav style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "1rem 2rem", background: "var(--navy)", borderBottom: "1px solid rgba(200,164,74,.15)" }}>
          <div style={{ fontFamily: "var(--font-cormorant), Georgia, serif", fontSize: "1.5rem", fontWeight: 700, color: "#fff" }}>
            Certus<span style={{ color: "var(--gold)" }}>Lex</span>
            <span style={{ fontSize: "0.7rem", letterSpacing: "0.1em", color: "var(--muted)", marginLeft: "0.8rem" }}>ADMIN</span>
          </div>
          <button onClick={() => setSelected(null)} style={{ background: "transparent", border: "1px solid rgba(255,255,255,.2)", color: "var(--light)", padding: "0.4rem 1rem", cursor: "pointer", fontSize: "0.82rem" }}>
            ← Takaisin jonoon
          </button>
        </nav>

        <div style={{ maxWidth: "760px", margin: "0 auto", padding: "2.5rem 2rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "2rem", paddingBottom: "1.5rem", borderBottom: "1px solid var(--cream2)" }}>
            <div style={{ background: "var(--navy)", color: "var(--gold)", fontSize: "0.7rem", letterSpacing: "0.1em", padding: "0.4rem 0.8rem" }}>
              {selected.docType.toUpperCase()}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: "var(--font-cormorant), Georgia, serif", fontSize: "1.3rem", fontWeight: 700, color: "var(--navy)" }}>{selected.fileName}</div>
              <div style={{ fontSize: "0.78rem", color: "var(--muted)", marginTop: "0.2rem" }}>
                {selected.plan}-paketti · {formatSize(selected.fileSize)} · Saapunut {formatDate(selected.createdAt)}
              </div>
            </div>
            <div style={{ fontSize: "0.78rem", fontWeight: 500, color: st.color }}>⬤ {st.text}</div>
          </div>

          <div style={{ display: "flex", gap: "1rem", marginBottom: "1.2rem", flexWrap: "wrap", alignItems: "center" }}>
            <a href={selected.storageUrl} target="_blank" rel="noopener noreferrer"
              style={{ background: "var(--gold)", color: "var(--navy)", fontSize: "0.85rem", fontWeight: 500, padding: "0.7rem 1.5rem", textDecoration: "none", display: "inline-block" }}>
              ⬇ Avaa asiakirja
            </a>
            <div style={{ fontSize: "0.78rem", color: "var(--muted)" }}>
              Tilausnumero: <strong>{selected.id}</strong>
            </div>
          </div>

          {selected.userEmail && (
            <div style={{ background: "#EEF2F8", padding: "0.6rem 1rem", marginBottom: "1.5rem", fontSize: "0.8rem", color: "var(--navy)", display: "flex", alignItems: "center", gap: "0.5rem" }}>
              ✉️ Lausunto lähetetään: <strong>{selected.userEmail}</strong>
            </div>
          )}

          <div style={{ marginBottom: "1rem" }}>
            <label style={{ fontSize: "0.78rem", fontWeight: 500, letterSpacing: "0.08em", display: "block", marginBottom: "0.6rem", color: "var(--navy)" }}>LAUSUNTO</label>
            <textarea value={review} onChange={e => setReview(e.target.value)}
              placeholder="Kirjoita juridinen lausunto tähän. Merkitse löydökset selkeästi: VIRHE, HUOMIO tai OK."
              style={{ width: "100%", minHeight: "280px", border: "1px solid var(--cream2)", background: "#fff", padding: "1rem", fontSize: "0.88rem", lineHeight: 1.7, resize: "vertical", outline: "none", fontFamily: "var(--font-dm-sans), Arial, sans-serif", color: "var(--navy)" }} />
          </div>

          <div style={{ marginBottom: "1.5rem" }}>
            <label style={{ fontSize: "0.78rem", fontWeight: 500, letterSpacing: "0.08em", display: "block", marginBottom: "0.6rem", color: "var(--navy)" }}>
              KORJATTU ASIAKIRJA <span style={{ color: "var(--muted)", fontWeight: 400 }}>(valinnainen)</span>
            </label>
            <input type="file" ref={correctedFileRef} accept=".pdf,.doc,.docx" style={{ display: "none" }} onChange={e => setCorrectedFile(e.target.files?.[0] ?? null)} />
            {!correctedFile ? (
              <button type="button" onClick={() => correctedFileRef.current?.click()}
                style={{ border: "1px dashed var(--cream2)", background: "#fff", padding: "0.7rem 1.2rem", fontSize: "0.84rem", color: "var(--muted)", cursor: "pointer", width: "100%" }}>
                + Lisää korjattu asiakirja (PDF, DOC, DOCX)
              </button>
            ) : (
              <div style={{ display: "flex", alignItems: "center", gap: "0.8rem", background: "#EEF2F8", padding: "0.6rem 1rem" }}>
                <span style={{ fontSize: "1.1rem" }}>📄</span>
                <span style={{ fontSize: "0.85rem", color: "var(--navy)", flex: 1 }}>{correctedFile.name}</span>
                {uploadProgress > 0 && uploadProgress < 100 && <span style={{ fontSize: "0.75rem", color: "var(--muted)" }}>{uploadProgress}%</span>}
                <button onClick={() => setCorrectedFile(null)} style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--muted)", fontSize: "0.9rem" }}>✕</button>
              </div>
            )}
          </div>

          {emailError && (
            <div style={{ background: "#fff0f0", border: "1px solid var(--red)", padding: "0.7rem 1rem", marginBottom: "1rem", fontSize: "0.82rem", color: "var(--red)" }}>
              ⚠ Sähköpostin lähetys epäonnistui: {emailError}
            </div>
          )}

          <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
            <button onClick={saveReview} disabled={saving || !review.trim()}
              style={{ background: saving || !review.trim() ? "var(--muted)" : "var(--navy)", color: "#fff", border: "none", padding: "0.9rem 2rem", fontSize: "0.9rem", fontWeight: 500, cursor: saving || !review.trim() ? "default" : "pointer", letterSpacing: "0.05em" }}>
              {saving ? (uploadProgress > 0 && uploadProgress < 100 ? `Ladataan ${uploadProgress}%...` : "Lähetetään...") : "Tallenna & lähetä lausunto ✓"}
            </button>
            <button onClick={() => setSelected(null)} style={{ background: "transparent", border: "1px solid var(--cream2)", color: "var(--navy)", padding: "0.9rem 1.5rem", cursor: "pointer", fontSize: "0.85rem" }}>
              Peruuta
            </button>
            {emailSent && <span style={{ fontSize: "0.82rem", color: "#2D6A4F" }}>✓ Sähköposti lähetetty</span>}
          </div>

          <div style={{ marginTop: "2.5rem", paddingTop: "1.5rem", borderTop: "1px solid var(--cream2)" }}>
            <p style={{ fontSize: "0.72rem", fontWeight: 600, letterSpacing: "0.1em", color: "var(--muted)", marginBottom: "1rem" }}>TAPAUSLOKI</p>
            <div style={{ display: "flex", flexDirection: "column", gap: "0" }}>
              {[
                { done: !!selected.createdAt, icon: "📥", label: "Asiakirja vastaanotettu", time: formatDate(selected.createdAt), sub: `${selected.plan}-paketti · ${selected.price} € · ${selected.deliveryTime} toimitusaika` },
                { done: !!selected.inReviewAt || selected.status !== "pending_review", icon: "👁", label: "Avattu käsittelyyn", time: selected.inReviewAt ? formatDate(selected.inReviewAt) : (selected.status !== "pending_review" ? "—" : null), sub: selected.userEmail ?? "" },
                { done: !!selected.correctedUrl, icon: "📄", label: "Korjattu asiakirja ladattu", time: selected.correctedUrl ? "✓" : null, sub: selected.correctedFileName ?? "" },
                { done: !!selected.reviewedAt, icon: "✅", label: "Lausunto lähetetty", time: selected.reviewedAt ? formatDate(selected.reviewedAt) : null, sub: selected.userEmail ? `→ ${selected.userEmail}` : "" },
              ].map((entry, i) => (
                entry.time !== null && (
                  <div key={i} style={{ display: "flex", gap: "0.8rem", paddingBottom: "1rem", position: "relative" }}>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 0 }}>
                      <div style={{ width: "28px", height: "28px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", background: entry.done ? "var(--navy)" : "var(--cream2)", fontSize: "0.75rem", flexShrink: 0 }}>
                        {entry.icon}
                      </div>
                      {i < 3 && <div style={{ width: "1px", background: "var(--cream2)", flex: 1, minHeight: "16px" }} />}
                    </div>
                    <div style={{ paddingTop: "3px", paddingBottom: "0.5rem" }}>
                      <div style={{ fontSize: "0.82rem", fontWeight: 500, color: entry.done ? "var(--navy)" : "var(--muted)" }}>{entry.label}</div>
                      <div style={{ fontSize: "0.73rem", color: "var(--muted)", marginTop: "0.1rem" }}>
                        {entry.time} {entry.sub && <span style={{ marginLeft: "0.4rem" }}>{entry.sub}</span>}
                      </div>
                    </div>
                  </div>
                )
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "var(--cream)", fontFamily: "var(--font-dm-sans), Arial, sans-serif" }}>
      <nav style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "1rem 2rem", background: "var(--navy)", borderBottom: "1px solid rgba(200,164,74,.15)" }}>
        <div style={{ fontFamily: "var(--font-cormorant), Georgia, serif", fontSize: "1.5rem", fontWeight: 700, color: "#fff" }}>
          Certus<span style={{ color: "var(--gold)" }}>Lex</span>
          <span style={{ fontSize: "0.7rem", letterSpacing: "0.1em", color: "var(--muted)", marginLeft: "0.8rem" }}>ADMIN</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "1.5rem" }}>
          {pendingCount > 0 && (
            <div style={{ background: "var(--gold)", color: "var(--navy)", fontSize: "0.72rem", fontWeight: 600, padding: "0.25rem 0.7rem", borderRadius: "99px" }}>
              {pendingCount} odottaa
            </div>
          )}
          <button onClick={() => setAuthed(false)} style={{ background: "transparent", border: "none", color: "var(--muted)", fontSize: "0.82rem", cursor: "pointer" }}>
            Kirjaudu ulos
          </button>
        </div>
      </nav>

      {/* Välilehdet */}
      <div style={{ background: "var(--navy)", borderBottom: "1px solid rgba(200,164,74,.15)", display: "flex", gap: "0" }}>
        {([["jono", `📄 Dokumenttijono${pendingCount > 0 ? ` (${pendingCount})` : ""}`], ["koodit", `🔑 Käyttökoodit (${codes.length})`]] as const).map(([id, label]) => (
          <button key={id} onClick={() => setTab(id)}
            style={{ padding: "0.75rem 1.8rem", background: "none", border: "none", borderBottom: tab === id ? "2px solid #C8A44A" : "2px solid transparent", color: tab === id ? "#C8A44A" : "rgba(255,255,255,.5)", fontSize: "0.82rem", fontWeight: tab === id ? 700 : 400, cursor: "pointer", letterSpacing: "0.04em" }}>
            {label}
          </button>
        ))}
      </div>

      <div style={{ maxWidth: "900px", margin: "0 auto", padding: "2rem" }}>

        {/* ── JONO-VÄLILEHTI ── */}
        {tab === "jono" && (
          <>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.5rem" }}>
              <h2 style={{ fontFamily: "var(--font-cormorant), Georgia, serif", fontSize: "1.8rem", fontWeight: 700, color: "var(--navy)" }}>Dokumenttijono</h2>
              <div style={{ display: "flex", gap: "0.4rem" }}>
                {(["all", "pending_review", "in_review", "completed"] as const).map(f => (
                  <button key={f} onClick={() => setFilter(f)} style={{ padding: "0.35rem 0.9rem", fontSize: "0.75rem", letterSpacing: "0.05em", border: "1px solid var(--cream2)", cursor: "pointer", background: filter === f ? "var(--navy)" : "#fff", color: filter === f ? "#fff" : "var(--navy)" }}>
                    {f === "all" ? "Kaikki" : f === "pending_review" ? "Odottaa" : f === "in_review" ? "Käsittelyssä" : "Valmis"}
                  </button>
                ))}
              </div>
            </div>
            {filtered.length === 0 ? (
              <div style={{ textAlign: "center", padding: "4rem", color: "var(--muted)", fontSize: "0.9rem" }}>Ei asiakirjoja</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                {filtered.map(d => {
                  const st = statusLabel[d.status];
                  return (
                    <div key={d.id} onClick={() => openDoc(d)}
                      style={{ background: "#fff", border: `1px solid ${d.status === "pending_review" ? "rgba(200,164,74,.4)" : "var(--cream2)"}`, padding: "1rem 1.5rem", cursor: "pointer", display: "flex", alignItems: "center", gap: "1rem" }}>
                      <div style={{ fontSize: "1.4rem" }}>📄</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 500, fontSize: "0.9rem", color: "var(--navy)" }}>{d.fileName}</div>
                        <div style={{ fontSize: "0.75rem", color: "var(--muted)", marginTop: "0.2rem" }}>{d.docType} · {d.plan} ({d.price}€) · {formatDate(d.createdAt)}</div>
                      </div>
                      <div style={{ fontSize: "0.75rem", fontWeight: 500, color: st.color, whiteSpace: "nowrap" }}>⬤ {st.text}</div>
                      <div style={{ color: "var(--muted)", fontSize: "0.9rem" }}>→</div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* ── KOODIT-VÄLILEHTI ── */}
        {tab === "koodit" && (
          <>
            <h2 style={{ fontFamily: "var(--font-cormorant), Georgia, serif", fontSize: "1.8rem", fontWeight: 700, color: "var(--navy)", marginBottom: "1.5rem" }}>Käyttökoodit</h2>

            {/* Luo uusi koodi */}
            <div style={{ background: "#fff", border: "1px solid var(--cream2)", padding: "1.5rem 2rem", marginBottom: "2rem" }}>
              <p style={{ fontSize: "0.72rem", fontWeight: 700, letterSpacing: "0.1em", color: "var(--navy)", margin: "0 0 1.2rem" }}>+ LUO UUSI KÄYTTÖKOODI</p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.8rem", marginBottom: "0.8rem" }}>
                <div>
                  <label style={{ fontSize: "0.72rem", fontWeight: 600, letterSpacing: "0.06em", display: "block", marginBottom: "0.3rem", color: "var(--navy)" }}>SÄHKÖPOSTI *</label>
                  <input value={newEmail} onChange={e => setNewEmail(e.target.value)} placeholder="asiakas@yritys.fi" type="email"
                    style={{ width: "100%", border: "1px solid var(--cream2)", padding: "0.6rem 0.8rem", fontSize: "0.85rem", outline: "none", boxSizing: "border-box" as const }} />
                </div>
                <div>
                  <label style={{ fontSize: "0.72rem", fontWeight: 600, letterSpacing: "0.06em", display: "block", marginBottom: "0.3rem", color: "var(--navy)" }}>NIMI</label>
                  <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Matti Meikäläinen"
                    style={{ width: "100%", border: "1px solid var(--cream2)", padding: "0.6rem 0.8rem", fontSize: "0.85rem", outline: "none", boxSizing: "border-box" as const }} />
                </div>
                <div>
                  <label style={{ fontSize: "0.72rem", fontWeight: 600, letterSpacing: "0.06em", display: "block", marginBottom: "0.3rem", color: "var(--navy)" }}>KUVAUS (oma muistiinpano)</label>
                  <input value={newLabel} onChange={e => setNewLabel(e.target.value)} placeholder="esim. Rakennus Oy kokeilu"
                    style={{ width: "100%", border: "1px solid var(--cream2)", padding: "0.6rem 0.8rem", fontSize: "0.85rem", outline: "none", boxSizing: "border-box" as const }} />
                </div>
                <div>
                  <label style={{ fontSize: "0.72rem", fontWeight: 600, letterSpacing: "0.06em", display: "block", marginBottom: "0.3rem", color: "var(--navy)" }}>MAX KÄYTTÖKERRAT</label>
                  <input value={newMaxUses} onChange={e => setNewMaxUses(e.target.value)} type="number" min="1" max="100"
                    style={{ width: "100%", border: "1px solid var(--cream2)", padding: "0.6rem 0.8rem", fontSize: "0.85rem", outline: "none", boxSizing: "border-box" as const }} />
                </div>
              </div>
              <button onClick={createCode} disabled={!newEmail || creatingCode}
                style={{ background: !newEmail || creatingCode ? "var(--cream2)" : "var(--navy)", color: !newEmail || creatingCode ? "var(--muted)" : "var(--gold)", border: "none", padding: "0.75rem 1.8rem", fontSize: "0.85rem", fontWeight: 600, cursor: !newEmail || creatingCode ? "default" : "pointer", letterSpacing: "0.04em" }}>
                {creatingCode ? "Luodaan..." : "Luo koodi & lähetä sähköposti →"}
              </button>
              {createResult?.code && (
                <div style={{ marginTop: "0.8rem", background: "#F0FDF4", border: "1px solid #86EFAC", padding: "0.7rem 1rem", fontSize: "0.85rem", color: "#166534" }}>
                  ✅ Koodi luotu ja lähetetty: <strong style={{ fontFamily: "monospace", fontSize: "1rem", letterSpacing: "0.12em" }}>{createResult.code}</strong>
                </div>
              )}
              {createResult?.error && (
                <div style={{ marginTop: "0.8rem", background: "#fff0f0", border: "1px solid #f5c6cb", padding: "0.7rem 1rem", fontSize: "0.85rem", color: "#9b2335" }}>
                  ⚠️ {createResult.error}
                </div>
              )}
            </div>

            {/* Koodilista */}
            {codes.length === 0 ? (
              <div style={{ textAlign: "center", padding: "3rem", color: "var(--muted)" }}>Ei koodeja vielä</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                {codes.map(c => {
                  const pct = Math.round((c.usedCount / c.maxUses) * 100);
                  return (
                    <div key={c.id} style={{ background: "#fff", border: "1px solid var(--cream2)", padding: "1rem 1.5rem" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "0.6rem" }}>
                        <span style={{ fontFamily: "monospace", fontSize: "1.1rem", fontWeight: 700, color: "var(--navy)", letterSpacing: "0.12em" }}>
                          {c.code.slice(0, 3)} {c.code.slice(3)}
                        </span>
                        <span style={{ flex: 1, fontSize: "0.82rem", color: "var(--muted)" }}>{c.label}</span>
                        <span style={{ fontSize: "0.75rem", color: c.active ? "#2D6A4F" : "var(--muted)", fontWeight: 600 }}>
                          {c.active ? "⬤ Aktiivinen" : "⬤ Suljettu"}
                        </span>
                      </div>
                      <div style={{ fontSize: "0.78rem", color: "var(--muted)", marginBottom: "0.5rem" }}>
                        📧 {c.recipientEmail}{c.recipientName ? ` (${c.recipientName})` : ""}
                      </div>
                      {/* Käyttömittari */}
                      <div style={{ display: "flex", alignItems: "center", gap: "0.8rem" }}>
                        <div style={{ flex: 1, height: "4px", background: "var(--cream2)", position: "relative" }}>
                          <div style={{ position: "absolute", left: 0, top: 0, height: "100%", width: `${pct}%`, background: pct >= 80 ? "#C8862A" : "var(--navy)", transition: "width 0.3s" }} />
                        </div>
                        <span style={{ fontSize: "0.72rem", color: "var(--muted)", whiteSpace: "nowrap" }}>
                          {c.usedCount} / {c.maxUses} käyttöä
                        </span>
                      </div>
                      {/* Käyttöloki */}
                      {c.uses?.length > 0 && (
                        <details style={{ marginTop: "0.6rem" }}>
                          <summary style={{ fontSize: "0.72rem", color: "var(--muted)", cursor: "pointer" }}>
                            Näytä käyttöloki ({c.uses.length} merkintää)
                          </summary>
                          <div style={{ marginTop: "0.5rem", display: "flex", flexDirection: "column", gap: "0.2rem" }}>
                            {[...c.uses].reverse().slice(0, 10).map((u, i) => (
                              <div key={i} style={{ fontSize: "0.72rem", color: "var(--muted)", paddingLeft: "0.5rem", borderLeft: "2px solid var(--cream2)" }}>
                                {new Date(u.timestamp).toLocaleString("fi-FI")} — {u.action}
                              </div>
                            ))}
                          </div>
                        </details>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
