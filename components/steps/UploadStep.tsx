"use client";

import { IconCheck, IconUpload } from "../Icons";

interface UploadStepProps {
  srtName: string;
  removeFile: () => void;
  dragging: boolean;
  setDragging: (dragging: boolean) => void;
  onDrop: (e: React.DragEvent) => void;
  fileRef: React.RefObject<HTMLInputElement | null>;
  readFile: (file: File) => void;
  setStep: (step: number) => void;
}

export default function UploadStep({
  srtName,
  removeFile,
  dragging,
  setDragging,
  onDrop,
  fileRef,
  readFile,
  setStep,
}: UploadStepProps) {
  return (
    <>
      {srtName ? (
        <div className="drop-loaded">
          <span className="file-pill">
            <b>
              <IconCheck size={15} />
            </b>{" "}
            {srtName}
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
  );
}
