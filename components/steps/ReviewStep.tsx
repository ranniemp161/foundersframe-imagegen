"use client";

import { Scene } from "../types";

interface ReviewStepProps {
  scenes: Scene[];
  selected: Set<string>;
  toggleScene: (id: string) => void;
  allSelected: boolean;
  toggleAll: () => void;
  updateScene: (id: string, patch: Partial<Scene>) => void;
  selectedCount: number;
  generating: boolean;
  doneCount: number;
  generateAll: () => void;
}

export default function ReviewStep({
  scenes,
  selected,
  toggleScene,
  allSelected,
  toggleAll,
  updateScene,
  selectedCount,
  generating,
  doneCount,
  generateAll,
}: ReviewStepProps) {
  return (
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
  );
}
