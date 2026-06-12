"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import JSZip from "jszip";

import PasswordGate from "@/components/PasswordGate";
import Sidebar from "@/components/Sidebar";
import PreviewLightbox from "@/components/PreviewLightbox";
import UploadStep from "@/components/steps/UploadStep";
import SettingsStep from "@/components/steps/SettingsStep";
import ReviewStep from "@/components/steps/ReviewStep";
import ResultsStep from "@/components/steps/ResultsStep";

import { Scene, ImgState, ImageModel } from "@/components/types";

const SESSION_KEY = "ff_session";
const TOKEN_RE = /^[a-f0-9]{32}$/;

function readSession(): string | null {
  if (typeof window === "undefined") return null;
  const t = window.localStorage.getItem(SESSION_KEY);
  return t && TOKEN_RE.test(t) ? t : null;
}

const MODELS: ImageModel[] = [
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

// Helper to convert timestamp string to ms
function parseTimestampMs(ts: string): number {
  const parts = ts.split(":").map(Number);
  return parts.length === 3
    ? (parts[0] * 3600 + parts[1] * 60 + parts[2]) * 1000
    : (parts[0] * 60 + (parts[1] || 0)) * 1000;
}

// Helper to format ms back to display timecode
function msToTimecode(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return h > 0
    ? `${pad(h)}:${pad(m)}:${pad(s)}`
    : `${pad(m)}:${pad(s)}`;
}

function timestampToFilename(
  scene: Scene,
  index: number,
  channel: "foundersframe" | "subishop" = "foundersframe"
): string {
  // Convert "05:18" or "01:23:45" to milliseconds
  const parts = scene.timestamp.split(":").map(Number);
  const totalMs =
    parts.length === 3
      ? (parts[0] * 3600 + parts[1] * 60 + parts[2]) * 1000
      : (parts[0] * 60 + (parts[1] || 0)) * 1000;

  // Default display duration 5 seconds
  const durationMs = 5000;

  // Slugify concept for human readability
  const slug = scene.concept
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);

  const seq = String(index + 1).padStart(2, "0");
  const ts = String(totalMs).padStart(8, "0");
  const dur = String(durationMs).padStart(5, "0");

  const prefix = channel === "subishop" ? "ss" : "ff";
  // Format: prefix_[seq]_[timestamp_ms]_[duration_ms]_[concept-slug].png
  return `${prefix}_${seq}_${ts}_${dur}_${slug}.png`;
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

  const [channel, setChannel] = useState<"foundersframe" | "subishop">("foundersframe");
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
          channel,
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

      const parsedMeta = {
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
      setMeta(parsedMeta);
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
        body: JSON.stringify({ scene, modelKey, channel }),
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
        zip.file(timestampToFilename(s, i, channel), base64, { base64: true });
      }
    });
    // Drop a manifest so the prompts travel with the images into Hyperframes.
    const isSubi = channel === "subishop";
    const manifest = {
      version: "1.0",
      project: srtName.replace(/\.srt$/i, ""),
      generated_at: new Date().toISOString(),
      total_images: scenes.filter(
        (s) => images[s.id]?.status === "done"
      ).length,
      fps: 30,
      frame_width: 1920,
      frame_height: 1080,
      asset_width: isSubi ? 1920 : 960,
      asset_height: 1080,
      asset_position: isSubi ? "center" : "right",
      timeline: scenes
        .filter((s) => images[s.id]?.status === "done")
        .map((s, i) => {
          const timestampMs = parseTimestampMs(s.timestamp);
          const durationMs = 5000;
          return {
            sequence: i + 1,
            file: timestampToFilename(s, i, channel),
            timestamp_ms: timestampMs,
            timestamp_display: msToTimecode(timestampMs),
            duration_ms: durationMs,
            duration_display: "0:05",
            frame_in: Math.round((timestampMs / 1000) * 30),
            frame_out: Math.round(
              ((timestampMs + durationMs) / 1000) * 30
            ),
            concept: s.concept,
            text_label: s.textLabel || "",
            has_character: s.hasCharacter,
            prompt: s.imagePrompt,
            placement: isSubi ? {
              x: 0,
              y: 0,
              width: 1920,
              height: 1080,
              anchor: "center",
            } : {
              x: 960,
              y: 0,
              width: 960,
              height: 1080,
              anchor: "top-right",
            },
          };
        }),
    };

    zip.file("manifest.json", JSON.stringify(manifest, null, 2));

    zip.file(
      "IMPORT_INSTRUCTIONS.txt",
      `${isSubi ? "SUBI SHOP" : "FOUNDERSFRAME"} IMAGE BATCH
Generated: ${new Date().toLocaleString()}
Total images: ${manifest.total_images}

FILENAME FORMAT:
${isSubi ? "ss" : "ff"}_[sequence]_[timestamp_ms]_[duration_ms]_[concept].png

HOW TO USE IN HYPERFRAMES:
1. Import all PNG files into your media bin
2. Each filename contains the exact timeline position
   - timestamp_ms = where to place it on the timeline
   - duration_ms = how long to show it (default 5000ms)
3. Place each asset at the ${isSubi ? "CENTER" : "RIGHT"} of the 1920x1080 frame
   - X position: ${isSubi ? "0" : "960"}
   - Y position: 0
   - Width: ${isSubi ? "1920" : "960"}, Height: 1080
4. Use Hyperframes background removal on each clip
5. The manifest.json contains full placement data
   for automated import if Hyperframes supports JSON import

EXAMPLE:
${isSubi ? "ss_01_00053000_05000_storytelling-builds-trust.png" : "ff_01_00053000_05000_storytelling-builds-trust.png"}
→ Sequence 1
→ Place at 0:53 on timeline
→ Show for 5 seconds
→ Concept: storytelling builds trust
`
    );
    const blob = await zip.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${isSubi ? "subishop" : "foundersframe"}-${srtName.replace(/\.srt$/i, "") || "batch"}.zip`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const downloadOne = useCallback((scene: Scene) => {
    const img = images[scene.id];
    if (img?.status !== "done" || !img.dataUrl) return;
    const i = scenes.findIndex((s) => s.id === scene.id);
    const a = document.createElement("a");
    a.href = img.dataUrl;
    a.download = timestampToFilename(scene, i < 0 ? 0 : i, channel);
    a.click();
  }, [images, scenes, channel]);

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

  const adjustCount = useCallback((delta: number) => {
    setTargetCount((c) => {
      const base = c === "" ? meta?.suggestedCount || 0 : Number(c);
      return Math.min(120, Math.max(1, base + delta));
    });
  }, [meta]);

  const toggleScene = useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  const allSelected = scenes.length > 0 && selectedCount === scenes.length;
  const toggleAll = useCallback(() => {
    setSelected(allSelected ? new Set() : new Set(scenes.map((s) => s.id)));
  }, [allSelected, scenes]);

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

  return (
    <div className={`app ${collapsed ? "is-collapsed" : ""}`}>
      <div className="bg-fx" aria-hidden="true" />

      {/* ============ SIDEBAR ============ */}
      <Sidebar
        step={step}
        setStep={setStep}
        collapsed={collapsed}
        setCollapsed={setCollapsed}
        canAccess={canAccess}
        activeModelLabel={activeModel.label}
        totalGenerated={totalGenerated}
        logout={logout}
      />

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
              <UploadStep
                srtName={srtName}
                removeFile={removeFile}
                dragging={dragging}
                setDragging={setDragging}
                onDrop={onDrop}
                fileRef={fileRef}
                readFile={readFile}
                setStep={setStep}
              />
            )}

            {/* ---------- STEP 2: SETTINGS ---------- */}
            {step === 2 && (
              <SettingsStep
                channel={channel}
                setChannel={setChannel}
                modelKey={modelKey}
                setModelKey={setModelKey}
                targetCount={targetCount}
                setTargetCount={setTargetCount}
                meta={meta}
                srtText={srtText}
                analyzing={analyzing}
                analyze={analyze}
                estCost={estCost}
                adjustCount={adjustCount}
                models={MODELS}
              />
            )}

            {/* ---------- STEP 3: REVIEW ---------- */}
            {step === 3 && (
              <ReviewStep
                scenes={scenes}
                selected={selected}
                toggleScene={toggleScene}
                allSelected={allSelected}
                toggleAll={toggleAll}
                updateScene={updateScene}
                selectedCount={selectedCount}
                generating={generating}
                doneCount={doneCount}
                generateAll={generateAll}
              />
            )}

            {/* ---------- STEP 4: RESULTS ---------- */}
            {step === 4 && (
              <ResultsStep
                scenes={scenes}
                images={images}
                doneCount={doneCount}
                progressTotal={progressTotal}
                progressPct={progressPct}
                downloadZip={downloadZip}
                generateOne={generateOne}
                setPreviewId={setPreviewId}
              />
            )}
          </div>
        </div>

        {/* ============ PREVIEW LIGHTBOX ============ */}
        {previewId && (
          <PreviewLightbox
            previewId={previewId}
            setPreviewId={setPreviewId}
            scenes={scenes}
            images={images}
            downloadOne={downloadOne}
            generateOne={generateOne}
          />
        )}
      </main>
    </div>
  );
}
