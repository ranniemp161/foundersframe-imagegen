"use client";

import { Scene, ImgState } from "../types";

interface ResultsStepProps {
  scenes: Scene[];
  images: Record<string, ImgState>;
  doneCount: number;
  progressTotal: number;
  progressPct: number;
  downloadZip: () => void;
  generateOne: (scene: Scene) => void;
  setPreviewId: (id: string | null) => void;
}

export default function ResultsStep({
  scenes,
  images,
  doneCount,
  progressTotal,
  progressPct,
  downloadZip,
  generateOne,
  setPreviewId,
}: ResultsStepProps) {
  return (
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
  );
}
