"use client";

import { Scene, ImgState } from "./types";

interface PreviewLightboxProps {
  previewId: string;
  setPreviewId: (id: string | null) => void;
  scenes: Scene[];
  images: Record<string, ImgState>;
  downloadOne: (scene: Scene) => void;
  generateOne: (scene: Scene) => void;
}

export default function PreviewLightbox({
  previewId,
  setPreviewId,
  scenes,
  images,
  downloadOne,
  generateOne,
}: PreviewLightboxProps) {
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
}
