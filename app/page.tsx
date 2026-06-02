"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import JSZip from "jszip";

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
  { key: "flux_schnell", label: "Flux Schnell (Fastest)", note: "~$0.003/img · best for testing" },
  { key: "flux_dev", label: "Flux Dev (Balanced)", note: "~$0.025/img · best quality/speed" },
  { key: "flux_pro", label: "Flux Pro", note: "~$0.05/img · highest quality" },
];

// How many image requests to keep in flight at once. Tune to your rate limit.
const CONCURRENCY = 2;

function timestampToFilename(ts: string, i: number): string {
  const safe = ts.replace(/[^0-9]/g, "") || String(i + 1).padStart(3, "0");
  return `ff_${String(i + 1).padStart(2, "0")}_${safe}.png`;
}

export default function Home() {
  const [srtName, setSrtName] = useState("");
  const [srtText, setSrtText] = useState("");
  const [dragging, setDragging] = useState(false);

  const [targetCount, setTargetCount] = useState<number | "">("");
  const [modelKey, setModelKey] = useState("flux_schnell");
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [meta, setMeta] = useState<{ durationMinutes: number; suggestedCount: number } | null>(null);
  const [images, setImages] = useState<Record<string, ImgState>>({});

  const [analyzing, setAnalyzing] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");

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

  async function analyze() {
    setAnalyzing(true);
    setError("");
    setImages({});
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          srt: srtText,
          targetCount: targetCount === "" ? undefined : Number(targetCount),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Analysis failed.");
      setScenes(data.scenes);
      setMeta(data.meta);
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
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scene, modelKey }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed.");
      setImages((p) => ({ ...p, [scene.id]: { status: "done", dataUrl: data.dataUrl } }));
    } catch (e: any) {
      setImages((p) => ({ ...p, [scene.id]: { status: "error", error: e.message } }));
    }
  }

  // Parallel generation with a small concurrency cap (worker-pool pattern).
  async function generateAll() {
    setGenerating(true);
    const queue = [...scenes];
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

  const doneCount = useMemo(
    () => Object.values(images).filter((i) => i.status === "done").length,
    [images]
  );
  const activeModel = MODELS.find((m) => m.key === modelKey)!;

  return (
    <div className="wrap">
      <div className="brand">
        <div className="brand-mark">FF</div>
        <h1>
          FoundersFrame <span>Image Studio</span>
        </h1>
      </div>
      <p className="subtitle">
        Drop in a video transcript and get a full batch of on-brand explainer
        graphics — analyzed, prompted, and generated in TJ&apos;s style. Built for the
        Hyperframes animation pipeline.
      </p>

      {error && <div className="banner error">{error}</div>}

      {/* STEP 1 — upload */}
      <section className="step">
        <div className="step-head">
          <div className="step-num">1</div>
          <div className="step-title">Upload transcript</div>
          <div className="step-hint">.srt subtitle file</div>
        </div>

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
          {srtName ? (
            <span className="file-pill">
              <b>✓</b> {srtName}
            </span>
          ) : (
            <>
              <div>
                Drag your <strong>.srt</strong> here, or click to browse
              </div>
              <p>The transcript never leaves your machine except to call the API.</p>
            </>
          )}
          <input
            ref={fileRef}
            type="file"
            accept=".srt"
            hidden
            onChange={(e) => e.target.files?.[0] && readFile(e.target.files[0])}
          />
        </div>
      </section>

      {/* STEP 2 — settings + analyze */}
      <section className="step">
        <div className="step-head">
          <div className="step-num">2</div>
          <div className="step-title">Settings</div>
        </div>
        <div className="row">
          <div className="field">
            <label>Image model</label>
            <select value={modelKey} onChange={(e) => setModelKey(e.target.value)}>
              {MODELS.map((m) => (
                <option key={m.key} value={m.key}>
                  {m.label}
                </option>
              ))}
            </select>
            <span className="model-note">{activeModel.note}</span>
          </div>
          <div className="field">
            <label>Image count</label>
            <input
              type="number"
              min={1}
              max={120}
              placeholder="auto"
              value={targetCount}
              onChange={(e) =>
                setTargetCount(e.target.value === "" ? "" : Number(e.target.value))
              }
              style={{ width: 110 }}
            />
            <span className="model-note">blank = auto (~6/min)</span>
          </div>
          <button
            className="btn btn-gold"
            disabled={!srtText || analyzing}
            onClick={analyze}
          >
            {analyzing ? "Analyzing…" : "Analyze transcript →"}
          </button>
        </div>
        {meta && (
          <div className="banner info" style={{ marginTop: 18, marginBottom: 0 }}>
            {meta.durationMinutes} min video · suggested {meta.suggestedCount} visuals ·{" "}
            {scenes.length} scenes selected
          </div>
        )}
      </section>

      {/* STEP 3 — review prompts */}
      {scenes.length > 0 && (
        <section className="step">
          <div className="step-head">
            <div className="step-num">3</div>
            <div className="step-title">Review &amp; edit prompts</div>
            <div className="step-hint">tweak anything before spending credits</div>
          </div>
          <div className="scene-list">
            {scenes.map((s) => (
              <div className="scene" key={s.id}>
                <div className="scene-meta">
                  <span className="ts">⏱ {s.timestamp}</span>
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
            ))}
          </div>
          <div style={{ marginTop: 20, display: "flex", gap: 12 }}>
            <button
              className="btn btn-gold"
              disabled={generating}
              onClick={generateAll}
            >
              {generating
                ? `Generating… ${doneCount}/${scenes.length}`
                : `Generate ${scenes.length} images`}
            </button>
          </div>
        </section>
      )}

      {/* STEP 4 — results */}
      {Object.keys(images).length > 0 && (
        <section className="step">
          <div className="step-head">
            <div className="step-num">4</div>
            <div className="step-title">Results</div>
          </div>
          <div className="toolbar">
            <div className="progress">
              <div style={{ width: `${(doneCount / scenes.length) * 100}%` }} />
            </div>
            <span className="count">
              {doneCount}/{scenes.length} done
            </span>
            <button
              className="btn btn-ghost"
              disabled={doneCount === 0}
              onClick={downloadZip}
            >
              ⬇ Download ZIP + manifest
            </button>
          </div>

          <div className="grid">
            {scenes.map((s, i) => {
              const img = images[s.id];
              if (!img) return null;
              return (
                <div className="card" key={s.id}>
                  <div className="thumb">
                    {img.status === "loading" && <div className="spinner" />}
                    {img.status === "error" && (
                      <div className="chip err">
                        {img.error}
                        <br />
                        <button
                          className="icon-btn"
                          style={{ marginTop: 8 }}
                          onClick={() => generateOne(s)}
                        >
                          retry
                        </button>
                      </div>
                    )}
                    {img.status === "done" && img.dataUrl && (
                      <img src={img.dataUrl} alt={s.concept} />
                    )}
                  </div>
                  <div className="info">
                    <span className="ts">{s.timestamp}</span>
                    <span className="concept">{s.concept}</span>
                    {img.status === "done" && (
                      <button className="icon-btn" onClick={() => generateOne(s)}>
                        ↻
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
