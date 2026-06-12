"use client";

import { ImageModel } from "../types";

interface SettingsStepProps {
  channel: "foundersframe" | "subishop";
  setChannel: (c: "foundersframe" | "subishop") => void;
  modelKey: string;
  setModelKey: (k: string) => void;
  targetCount: number | "";
  setTargetCount: (c: number | "") => void;
  meta: { durationMinutes: number; suggestedCount: number } | null;
  srtText: string;
  analyzing: boolean;
  analyze: () => void;
  estCost: string;
  adjustCount: (delta: number) => void;
  models: ImageModel[];
}

export default function SettingsStep({
  channel,
  setChannel,
  modelKey,
  setModelKey,
  targetCount,
  setTargetCount,
  meta,
  srtText,
  analyzing,
  analyze,
  estCost,
  adjustCount,
  models,
}: SettingsStepProps) {
  return (
    <>
      <div className="settings-grid">
        {/* Channel Selection */}
        <div className="card-box" style={{ gridColumn: "1 / -1" }}>
          <div className="card-box-title">Target Channel / Style</div>
          <div
            className="model-list"
            style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}
          >
            <button
              type="button"
              className={`model-card ${channel === "foundersframe" ? "selected" : ""}`}
              onClick={() => setChannel("foundersframe")}
            >
              <div className="model-card-head">
                <span className="model-card-name">FoundersFrame</span>
                <span className="model-card-price">~6/min density</span>
              </div>
              <p className="model-card-desc">
                Whiteboard motion graphics. Clean doodles with gold accents on green screen.
                Right-aligned for presenter.
              </p>
            </button>
            <button
              type="button"
              className={`model-card ${channel === "subishop" ? "selected" : ""}`}
              onClick={() => setChannel("subishop")}
            >
              <div className="model-card-head">
                <span className="model-card-name">Subi Shop</span>
                <span className="model-card-price">~1.5/min density</span>
              </div>
              <p className="model-card-desc">
                2D vector infographics. Clean shapes, diagrams, and symbolism. 16:9 full-frame
                centered on green screen.
              </p>
            </button>
          </div>
        </div>

        {/* Model Selection */}
        <div className="card-box">
          <div className="card-box-title">Image Model</div>
          <div className="model-list">
            {models.map((m) => (
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

        {/* Count Counter */}
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
  );
}
