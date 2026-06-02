// lib/srt.ts
// Minimal, dependency-free SRT parser.

export interface SrtCue {
  index: number;
  startMs: number;
  endMs: number;
  startTimecode: string; // "00:01:23"
  text: string;
}

function timecodeToMs(tc: string): number {
  // "00:00:04,000" or "00:00:04.000"
  const clean = tc.trim().replace(".", ",");
  const [hms, ms = "0"] = clean.split(",");
  const [h, m, s] = hms.split(":").map((n) => parseInt(n, 10) || 0);
  return ((h * 60 + m) * 60 + s) * 1000 + parseInt(ms, 10);
}

function msToShortTimecode(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return h > 0 ? `${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}

export function parseSrt(raw: string): SrtCue[] {
  const normalized = raw.replace(/\r\n/g, "\n").replace(/\r/g, "\n").trim();
  const blocks = normalized.split(/\n\s*\n/);
  const cues: SrtCue[] = [];

  for (const block of blocks) {
    const lines = block.split("\n").filter((l) => l.trim() !== "");
    if (lines.length < 2) continue;

    // First line may be the numeric index (optional in some files).
    let cursor = 0;
    let index = cues.length + 1;
    if (/^\d+$/.test(lines[0].trim())) {
      index = parseInt(lines[0].trim(), 10);
      cursor = 1;
    }

    const timeLine = lines[cursor];
    const timeMatch = timeLine.match(
      /(\d{2}:\d{2}:\d{2}[,.]\d{3})\s*-->\s*(\d{2}:\d{2}:\d{2}[,.]\d{3})/
    );
    if (!timeMatch) continue;

    const startMs = timecodeToMs(timeMatch[1]);
    const endMs = timecodeToMs(timeMatch[2]);
    const text = lines
      .slice(cursor + 1)
      .join(" ")
      .replace(/<[^>]+>/g, "") // strip styling tags
      .trim();

    if (!text) continue;
    cues.push({
      index,
      startMs,
      endMs,
      startTimecode: msToShortTimecode(startMs),
      text,
    });
  }

  return cues;
}

// Produce a compact, timestamped transcript string for the LLM to reason over.
export function cuesToTranscript(cues: SrtCue[]): string {
  return cues.map((c) => `[${c.startTimecode}] ${c.text}`).join("\n");
}

export function totalDurationMs(cues: SrtCue[]): number {
  if (cues.length === 0) return 0;
  return cues[cues.length - 1].endMs;
}
