"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import JSZip from "jszip";

const SESSION_KEY = "ff_session";
const TOKEN_RE = /^[a-f0-9]{32}$/;

function readSession(): string | null {
  if (typeof window === "undefined") return null;
  const t = window.localStorage.getItem(SESSION_KEY);
  return t && TOKEN_RE.test(t) ? t : null;
}

/* ---------- hand-drawn style inline icons ---------- */
type IconProps = { size?: number; className?: string };

const IconChevron = ({ size = 18, className }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
    <path d="M15 6l-6 6 6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const IconUpload = ({ size = 22, className }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
    <path
      d="M7 18a4 4 0 0 1-.5-7.97A5.5 5.5 0 0 1 17 9.5a3.5 3.5 0 0 1 .5 6.97"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path d="M12 21V11m0 0l-3 3m3-3l3 3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const IconSliders = ({ size = 22, className }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
    <path d="M4 7h9M17 7h3M4 17h3M11 17h9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    <circle cx="15" cy="7" r="2.3" stroke="currentColor" strokeWidth="1.8" />
    <circle cx="9" cy="17" r="2.3" stroke="currentColor" strokeWidth="1.8" />
  </svg>
);

const IconPencil = ({ size = 22, className }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
    <path
      d="M14.5 5.5l4 4M4 20l1-4L16 5a2.1 2.1 0 0 1 3 3L8 19l-4 1z"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const IconGrid = ({ size = 22, className }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
    <rect x="4" y="4" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.8" />
    <rect x="13" y="4" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.8" />
    <rect x="4" y="13" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.8" />
    <rect x="13" y="13" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.8" />
  </svg>
);

const IconCheck = ({ size = 22, className }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
    <path d="M5 12.5l4.5 4.5L19 7" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const IconLock = ({ size = 18, className }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
    <rect x="4" y="10" width="16" height="11" rx="2" stroke="currentColor" strokeWidth="1.9" />
    <path d="M8 10V7a4 4 0 0 1 8 0v3" stroke="currentColor" strokeWidth="1.9" />
  </svg>
);

const IconEye = ({ size = 18, className }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
    <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" stroke="currentColor" strokeWidth="1.8" />
    <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.8" />
  </svg>
);

const IconEyeOff = ({ size = 18, className }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
    <path
      d="M4 4l16 16M9.9 5.2A9.6 9.6 0 0 1 12 5c6 0 9.5 7 9.5 7a16 16 0 0 1-2.7 3.4M6.6 7.1A16 16 0 0 0 2.5 12S6 19 12 19a9.4 9.4 0 0 0 3.6-.7"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
    />
  </svg>
);

function PasswordGate({ onUnlock }: { onUnlock: (token: string) => void }) {
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState("");
  const [shake, setShake] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [leaving, setLeaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (!res.ok) {
        setError("Incorrect password");
        setShake(true);
        setTimeout(() => setShake(false), 500);
        setPassword("");
        return;
      }
      const data = await res.json();
      if (data?.token && TOKEN_RE.test(data.token)) {
        // play the exit animation, then hand the token up
        setLeaving(true);
        const token = data.token;
        setTimeout(() => onUnlock(token), 300);
      } else {
        setError("Unexpected server response.");
      }
    } catch {
      setError("Something went wrong. Try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className={`gate ${leaving ? "gate-leaving" : ""}`}>
      <div className="bg-fx" aria-hidden="true" />
      <form className={`gate-card ${shake ? "shake" : ""}`} onSubmit={submit}>
        <div className="brand-mark gate-mark">FF</div>
        <h1 className="gate-title">FoundersFrame</h1>
        <p className="gate-studio">Image Studio</p>
        <div className="gate-divider" />
        <p className="gate-sub">Enter password to continue</p>

        <div className="gate-input-wrap">
          <input
            className="gate-input"
            type={show ? "text" : "password"}
            placeholder="Password"
            value={password}
            autoFocus
            onChange={(e) => {
              setPassword(e.target.value);
              if (error) setError("");
            }}
          />
          <button
            type="button"
            className="gate-toggle"
            onClick={() => setShow((s) => !s)}
            aria-label={show ? "Hide password" : "Show password"}
          >
            {show ? <IconEyeOff /> : <IconEye />}
          </button>
        </div>

        {error && <div className="gate-error">{error}</div>}

        <button className="btn btn-gold gate-btn" type="submit" disabled={submitting || leaving}>
          {submitting ? "Unlocking…" : "Unlock →"}
        </button>
      </form>
    </div>
  );
}

type Scene = {
  id: string;
  timestamp: string;
  concept: string;
  needsText: boolean;
  textLabel: string;
  hasCharacter: boolean;
  imagePrompt: string;
};

type ImgState = {
  status: "idle" | "loading" | "done" | "error";
  dataUrl?: string;
  error?: string;
};

const MODELS = [
  {
    key: "nano_banana",
    label: "Nano Banana",
    priceNote: "~$0.039 / image",
    price: 0.039,
    desc: "Fast · great quality for everyday batches.",
  },
  {
    key: "nano_banana_pro",
    label: "Nano Banana Pro",
    priceNote: "~$0.134 / image",
    price: 0.134,
    desc: "Best text rendering + character consistency.",
  },
];

// How many image requests to keep in flight at once. Tune to your rate limit.
const CONCURRENCY = 2;

const STEP_TITLES = ["Upload Transcript", "Settings", "Review Prompts", "Results"];

function timestampToFilename(ts: string, i: number): string {
  const safe = ts.replace(/[^0-9]/g, "") || String(i + 1).padStart(3, "0");
  return `ff_${String(i + 1).padStart(2, "0")}_${safe}.png`;
}

export default function Home() {
  // Auth gate. `ready` avoids a flash of the gate before localStorage is read.
  const [token, setToken] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setToken(readSession());
    setReady(true);
  }, []);

  const unlock = useCallback((t: string) => {
    window.localStorage.setItem(SESSION_KEY, t);
    setToken(t);
  }, []);

  const logout = useCallback(() => {
    window.localStorage.removeItem(SESSION_KEY);
    setToken(null);
  }, []);

  const [srtName, setSrtName] = useState("");
  const [srtText, setSrtText] = useState("");
  const [dragging, setDragging] = useState(false);

  const [targetCount, setTargetCount] = useState<number | "">("");
  const [modelKey, setModelKey] = useState("nano_banana");
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [meta, setMeta] = useState<{ durationMinutes: number; suggestedCount: number } | null>(null);
  const [images, setImages] = useState<Record<string, ImgState>>({});

  const [analyzing, setAnalyzing] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");

  // UI-only state for the redesigned workflow shell.
  const [step, setStep] = useState(1);
  const [collapsed, setCollapsed] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [genTotal, setGenTotal] = useState(0);
  const [totalGenerated, setTotalGenerated] = useState(0);
  const [previewId, setPreviewId] = useState<string | null>(null);

  const fileRef = useRef<HTMLInputElement>(null);

  const readFile = (file: File) => {
    if (!file.name.toLowerCase().endsWith(".srt")) {
      setError("Please upload a .srt subtitle file.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setSrtText(String(reader.result || ""));
      setSrtName(file.name);
      setScenes([]);
      setImages({});
      setError("");
    };
    reader.readAsText(file);
  };

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) readFile(file);
  }, []);

  function removeFile() {
    setSrtName("");
    setSrtText("");
    setScenes([]);
    setImages({});
    setMeta(null);
    setError("");
  }

  async function analyze() {
    setAnalyzing(true);
    setError("");
    setImages({});
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-ff-token": token ?? "",
        },
        body: JSON.stringify({
          srt: srtText,
          targetCount: targetCount === "" ? undefined : Number(targetCount),
        }),
      });

      if (res.status === 401) {
        logout();
        throw new Error("Session expired. Please log in again.");
      }

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Analysis failed.");
      }

      const meta = {
        durationMinutes: Number(res.headers.get("X-Meta-Duration") || 0),
        suggestedCount: Number(res.headers.get("X-Meta-Suggested-Count") || 0),
      };

      const reader = res.body?.getReader();
      if (!reader) throw new Error("No response body");
      const decoder = new TextDecoder();
      let rawJson = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        rawJson += decoder.decode(value, { stream: true });
      }
      rawJson += decoder.decode();

      let parsed: any;
      try {
        parsed = JSON.parse(rawJson.replace(/```json|```/g, "").trim());
      } catch (err) {
        throw new Error("Model returned unparseable output. Try again.");
      }

      const scenesList = (parsed.scenes ?? []).map((s: any, i: number) => ({
        id: `scene-${i + 1}`,
        timestamp: s.timestamp ?? "",
        concept: s.concept ?? "",
        needsText: Boolean(s.needsText),
        textLabel: s.textLabel ?? "",
        hasCharacter: Boolean(s.hasCharacter),
        imagePrompt: s.imagePrompt ?? "",
      }));

      setScenes(scenesList);
      setSelected(new Set(scenesList.map((s: Scene) => s.id)));
      setMeta(meta);
      setStep(3);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setAnalyzing(false);
    }
  }

  function updateScene(id: string, patch: Partial<Scene>) {
    setScenes((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  }

  async function generateOne(scene: Scene) {
    setImages((p) => ({ ...p, [scene.id]: { status: "loading" } }));
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-ff-token": token ?? "",
        },
        body: JSON.stringify({ scene, modelKey }),
      });
      if (res.status === 401) {
        logout();
        throw new Error("Session expired. Please log in again.");
      }
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed.");
      setImages((p) => ({ ...p, [scene.id]: { status: "done", dataUrl: data.dataUrl } }));
      setTotalGenerated((n) => n + 1);
    } catch (e: any) {
      setImages((p) => ({ ...p, [scene.id]: { status: "error", error: e.message } }));
    }
  }

  // Parallel generation with a small concurrency cap (worker-pool pattern).
  async function generateAll() {
    setGenerating(true);
    setStep(4);
    const queue = scenes.filter((s) => selected.has(s.id));
    setGenTotal(queue.length);
    async function worker() {
      while (queue.length) {
        const next = queue.shift();
        if (next) await generateOne(next);
      }
    }
    await Promise.all(Array.from({ length: CONCURRENCY }, worker));
    setGenerating(false);
  }

  async function downloadZip() {
    const zip = new JSZip();
    scenes.forEach((s, i) => {
      const img = images[s.id];
      if (img?.status === "done" && img.dataUrl) {
        const base64 = img.dataUrl.split(",")[1];
        zip.file(timestampToFilename(s.timestamp, i), base64, { base64: true });
      }
    });
    // Drop a manifest so the prompts travel with the images into Hyperframes.
    const manifest = scenes.map((s, i) => ({
      file: timestampToFilename(s.timestamp, i),
      timestamp: s.timestamp,
      concept: s.concept,
      textLabel: s.textLabel,
      prompt: s.imagePrompt,
    }));
    zip.file("manifest.json", JSON.stringify(manifest, null, 2));
    const blob = await zip.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `foundersframe-${srtName.replace(/\.srt$/i, "") || "batch"}.zip`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function downloadOne(scene: Scene) {
    const img = images[scene.id];
    if (img?.status !== "done" || !img.dataUrl) return;
    const i = scenes.findIndex((s) => s.id === scene.id);
    const a = document.createElement("a");
    a.href = img.dataUrl;
    a.download = timestampToFilename(scene.timestamp, i < 0 ? 0 : i);
    a.click();
  }

  // Close the preview on Escape.
  useEffect(() => {
    if (!previewId) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setPreviewId(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [previewId]);

  const doneCount = useMemo(
    () => Object.values(images).filter((i) => i.status === "done").length,
    [images]
  );
  const activeModel = MODELS.find((m) => m.key === modelKey)!;

  const selectedCount = selected.size;
  const progressTotal = genTotal || Object.keys(images).length || scenes.length || 0;
  const progressPct = progressTotal ? Math.round((doneCount / progressTotal) * 100) : 0;

  // Effective count used for the live cost estimate on the Settings step.
  const estCount =
    targetCount === "" ? meta?.suggestedCount || scenes.length || 0 : Number(targetCount);
  const estCost = (estCount * activeModel.price).toFixed(2);

  function adjustCount(delta: number) {
    setTargetCount((c) => {
      const base = c === "" ? meta?.suggestedCount || 0 : Number(c);
      return Math.min(120, Math.max(1, base + delta));
    });
  }

  function toggleScene(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  const allSelected = scenes.length > 0 && selectedCount === scenes.length;
  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(scenes.map((s) => s.id)));
  }

  // Which workflow steps the user is allowed to open.
  const canAccess = useCallback(
    (n: number) => {
      if (n === 1) return true;
      if (n === 2) return !!srtText;
      if (n === 3) return scenes.length > 0;
      if (n === 4) return Object.keys(images).length > 0;
      return false;
    },
    [srtText, scenes.length, images]
  );

  // Hold render until localStorage has been checked, then gate on the token.
  if (!ready) return null;
  if (!token) return <PasswordGate onUnlock={unlock} />;

  const NAV = [
    { n: 1, label: "Upload", Icon: IconUpload },
    { n: 2, label: "Settings", Icon: IconSliders },
    { n: 3, label: "Review", Icon: IconPencil },
    { n: 4, label: "Results", Icon: IconGrid },
  ];

  return (
    <div className={`app ${collapsed ? "is-collapsed" : ""}`}>
      <div className="bg-fx" aria-hidden="true" />

      {/* ============ SIDEBAR ============ */}
      <aside className="sidebar">
        <div className="sb-top">
          <div className="brand-mark sb-mark">FF</div>
          <span className="sb-wordmark">FoundersFrame</span>
          <button
            className="sb-toggle"
            onClick={() => setCollapsed((c) => !c)}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            title={collapsed ? "Expand" : "Collapse"}
          >
            <IconChevron className="sb-chevron" />
          </button>
        </div>

        <nav className="sb-nav">
          {NAV.map(({ n, label, Icon }) => {
            const accessible = canAccess(n);
            const isActive = n === step;
            const isCompleted = accessible && !isActive;
            const cls = isActive ? "active" : isCompleted ? "completed" : "locked";
            return (
              <button
                key={n}
                className={`sb-item ${cls}`}
                disabled={!accessible}
                onClick={() => accessible && setStep(n)}
                title={collapsed ? label : undefined}
              >
                <span className="sb-icon">{isCompleted ? <IconCheck size={20} /> : <Icon size={22} />}</span>
                <span className="sb-label">{label}</span>
              </button>
            );
          })}
        </nav>

        <div className="sb-bottom">
          <div className="sb-divider" />
          <div className="sb-model" title={activeModel.label}>
            <span className="sb-model-dot" />
            <span className="sb-label sb-model-name">{activeModel.label}</span>
          </div>
          <div className="sb-stats sb-label">
            <span className="sb-stat-num">{totalGenerated}</span> images generated
          </div>
          <button className="sb-lock" onClick={logout} title="Lock app" aria-label="Lock app">
            <IconLock />
            <span className="sb-label">Lock app</span>
          </button>
        </div>
      </aside>

      {/* ============ MAIN ============ */}
      <main className="main">
        <header className="topbar">
          <h1 className="topbar-title">{STEP_TITLES[step - 1]}</h1>
          <span className="topbar-counter">Step {step} of 4</span>
        </header>

        <div className="content">
          {error && (
            <div className="banner error" key={error}>
              {error}
            </div>
          )}

          <div className="panel" key={step}>
            {/* ---------- STEP 1: UPLOAD ---------- */}
            {step === 1 && (
              <>
                {srtName ? (
                  <div className="drop-loaded">
                    <span className="file-pill">
                      <b><IconCheck size={15} /></b> {srtName}
                      <button className="file-x" onClick={removeFile} aria-label="Remove file">
                        ×
                      </button>
                    </span>
                  </div>
                ) : (
                  <div
                    className={`drop ${dragging ? "drag" : ""}`}
                    onClick={() => fileRef.current?.click()}
                    onDragOver={(e) => {
                      e.preventDefault();
                      setDragging(true);
                    }}
                    onDragLeave={() => setDragging(false)}
                    onDrop={onDrop}
                  >
                    <IconUpload size={48} className="drop-icon" />
                    <div className="drop-title">Drop your .srt file here</div>
                    <p className="drop-sub">or click to browse</p>
                  </div>
                )}
                <input
                  ref={fileRef}
                  type="file"
                  accept=".srt"
                  hidden
                  onChange={(e) => e.target.files?.[0] && readFile(e.target.files[0])}
                />
                {srtName && (
                  <div className="panel-actions">
                    <button className="btn btn-gold" onClick={() => setStep(2)}>
                      Continue to Settings →
                    </button>
                  </div>
                )}
              </>
            )}

            {/* ---------- STEP 2: SETTINGS ---------- */}
            {step === 2 && (
              <>
                <div className="settings-grid">
                  <div className="card-box">
                    <div className="card-box-title">Image Model</div>
                    <div className="model-list">
                      {MODELS.map((m) => (
                        <button
                          key={m.key}
                          type="button"
                          className={`model-card ${modelKey === m.key ? "selected" : ""}`}
                          onClick={() => setModelKey(m.key)}
                        >
                          <div className="model-card-head">
                            <span className="model-card-name">{m.label}</span>
                            <span className="model-card-price">{m.priceNote}</span>
                          </div>
                          <p className="model-card-desc">{m.desc}</p>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="card-box">
                    <div className="card-box-title">Image Count</div>
                    <div className="counter">
                      <button
                        className="counter-btn"
                        onClick={() => adjustCount(-1)}
                        aria-label="Decrease"
                      >
                        −
                      </button>
                      <input
                        type="number"
                        min={1}
                        max={120}
                        placeholder="auto"
                        value={targetCount}
                        onChange={(e) =>
                          setTargetCount(e.target.value === "" ? "" : Number(e.target.value))
                        }
                        className="counter-input"
                      />
                      <button
                        className="counter-btn"
                        onClick={() => adjustCount(1)}
                        aria-label="Increase"
                      >
                        +
                      </button>
                    </div>
                    <p className="counter-hint">blank = auto (~6/min)</p>
                    <p className="counter-cost">~${estCost} estimated</p>
                  </div>
                </div>

                {meta && (
                  <div className="banner info">
                    {meta.durationMinutes} min video · suggested {meta.suggestedCount} visuals
                  </div>
                )}

                <button
                  className="btn btn-gold btn-block"
                  disabled={!srtText || analyzing}
                  onClick={analyze}
                >
                  {analyzing ? "Analyzing…" : "Analyze Transcript →"}
                </button>
              </>
            )}

            {/* ---------- STEP 3: REVIEW ---------- */}
            {step === 3 && (
              <>
                <div className="review-head">
                  <span className="review-count">{scenes.length} scenes</span>
                  <button className="link-toggle" onClick={toggleAll}>
                    {allSelected ? "Deselect all" : "Select all"}
                  </button>
                </div>

                <div className="scene-list">
                  {scenes.map((s) => {
                    const on = selected.has(s.id);
                    return (
                      <div className={`scene ${on ? "" : "scene-off"}`} key={s.id}>
                        <div className="scene-meta">
                          <label className="scene-check">
                            <input
                              type="checkbox"
                              checked={on}
                              onChange={() => toggleScene(s.id)}
                            />
                            <span className="ts">{s.timestamp}</span>
                          </label>
                          <span className="concept">{s.concept}</span>
                          <div className="tags">
                            {s.needsText && s.textLabel && (
                              <span className="tag">“{s.textLabel}”</span>
                            )}
                            {s.hasCharacter && <span className="tag char">character</span>}
                          </div>
                        </div>
                        <textarea
                          className="prompt-edit"
                          value={s.imagePrompt}
                          onChange={(e) => updateScene(s.id, { imagePrompt: e.target.value })}
                        />
                      </div>
                    );
                  })}
                </div>

                <div className="sticky-bar">
                  <span className="sticky-info">{selectedCount} scenes selected</span>
                  <button
                    className="btn btn-gold"
                    disabled={generating || selectedCount === 0}
                    onClick={generateAll}
                  >
                    {generating
                      ? `Generating… ${doneCount}/${selectedCount}`
                      : `Generate ${selectedCount} Images →`}
                  </button>
                </div>
              </>
            )}

            {/* ---------- STEP 4: RESULTS ---------- */}
            {step === 4 && (
              <>
                <div className="results-bar">
                  <span className="results-count">
                    {doneCount} / {progressTotal} images done
                  </span>
                  <div className="results-progress">
                    <div className="progress">
                      <div style={{ width: `${progressPct}%` }} />
                    </div>
                    <span className="progress-label">{progressPct}%</span>
                  </div>
                  <button
                    className="btn btn-ghost"
                    disabled={doneCount === 0}
                    onClick={downloadZip}
                  >
                    Download ZIP
                  </button>
                </div>

                <div className="grid">
                  {scenes.map((s, i) => {
                    const img = images[s.id];
                    if (!img) return null;
                    return (
                      <div
                        className="card"
                        key={s.id}
                        style={{ animationDelay: `${Math.min(i, 12) * 50}ms` }}
                      >
                        <div className="thumb">
                          {img.status === "loading" && (
                            <div className="loading-state">
                              <div className="spinner" />
                              <span>Generating…</span>
                            </div>
                          )}
                          {img.status === "error" && (
                            <div className="error-state">
                              <span className="error-msg">{img.error}</span>
                              <button className="icon-btn" onClick={() => generateOne(s)}>
                                Retry
                              </button>
                            </div>
                          )}
                          {img.status === "done" && img.dataUrl && (
                            <img src={img.dataUrl} alt={s.concept} className="thumb-img" />
                          )}

                          {img.status === "done" && (
                            <button
                              type="button"
                              className="thumb-overlay"
                              onClick={() => setPreviewId(s.id)}
                              title="Click to preview"
                            >
                              <span className="overlay-zoom">⤢ Preview</span>
                              <span className="overlay-concept">{s.concept}</span>
                            </button>
                          )}
                        </div>
                        <div className="info">
                          <span className="ts">{s.timestamp}</span>
                          <span className="concept">{s.concept}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </div>

        {/* ============ PREVIEW LIGHTBOX ============ */}
        {(() => {
          if (!previewId) return null;
          const scene = scenes.find((s) => s.id === previewId);
          const img = scene ? images[scene.id] : undefined;
          if (!scene || img?.status !== "done" || !img.dataUrl) return null;
          return (
            <div
              className="lightbox"
              role="dialog"
              aria-modal="true"
              onClick={() => setPreviewId(null)}
            >
              <div className="lightbox-card" onClick={(e) => e.stopPropagation()}>
                <button
                  className="lightbox-close"
                  onClick={() => setPreviewId(null)}
                  aria-label="Close preview"
                >
                  ×
                </button>
                <div className="lightbox-img-wrap">
                  <img src={img.dataUrl} alt={scene.concept} className="lightbox-img" />
                </div>
                <div className="lightbox-info">
                  <div className="lightbox-meta">
                    <span className="ts">{scene.timestamp}</span>
                    <span className="lightbox-concept">{scene.concept}</span>
                  </div>
                  {scene.imagePrompt && (
                    <p className="lightbox-prompt">{scene.imagePrompt}</p>
                  )}
                  <div className="lightbox-actions">
                    <button className="btn btn-gold" onClick={() => downloadOne(scene)}>
                      ⬇ Download image
                    </button>
                    <button
                      className="btn btn-ghost"
                      onClick={() => {
                        setPreviewId(null);
                        generateOne(scene);
                      }}
                    >
                      ↻ Regenerate
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })()}
      </main>
    </div>
  );
}
