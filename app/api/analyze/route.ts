import { NextRequest, NextResponse } from "next/server";
import { HarmCategory, HarmBlockThreshold } from "@google/genai";
import { getGeminiClient, ANALYSIS_MODEL } from "@/lib/gemini";
import { parseSrt, cuesToTranscript, totalDurationMs } from "@/lib/srt";
import { buildAnalysisSystemPrompt } from "@/lib/style-preset";

export const runtime = "nodejs";

async function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}
export const maxDuration = 60;

export interface Scene {
  id: string;
  timestamp: string;
  concept: string;
  needsText: boolean;
  textLabel: string;
  hasCharacter: boolean;
  imagePrompt: string;
}

export async function POST(req: NextRequest) {
  try {
    const { srt, targetCount } = await req.json();
    if (!srt || typeof srt !== "string") {
      return NextResponse.json({ error: "No SRT content provided." }, { status: 400 });
    }

    const cues = parseSrt(srt);
    if (cues.length === 0) {
      return NextResponse.json(
        { error: "Couldn't parse any subtitles from that file. Is it a valid .srt?" },
        { status: 400 }
      );
    }

    // Auto-suggest a count from video length if the caller didn't pin one:
    // roughly ~6 images per minute, matching TJ's ~50 images / 8 min.
    const minutes = totalDurationMs(cues) / 60000;
    const count =
      typeof targetCount === "number" && targetCount > 0
        ? targetCount
        : Math.max(8, Math.round(minutes * 6));

    const transcript = cuesToTranscript(cues);
    const client = getGeminiClient();

    let result: any;
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        result = await client.models.generateContent({
          model: ANALYSIS_MODEL,
          contents: [
            {
              role: "user",
              parts: [
                { text: buildAnalysisSystemPrompt(count) },
                { text: `\n\nTRANSCRIPT:\n${transcript}` },
              ],
            },
          ],
          config: {
            responseMimeType: "application/json",
            temperature: 0.7,
            safetySettings: [
              {
                category: HarmCategory.HARM_CATEGORY_HARASSMENT,
                threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
              },
              {
                category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
                threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
              },
              {
                category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
                threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
              },
              {
                category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
                threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
              },
            ],
          },
        });
        break; // Success, break out of retry loop
      } catch (err: any) {
        const msg = err?.message ?? "";
        const retry = msg.includes("429") || msg.includes("503") || msg.includes("rate");
        if (retry && attempt < 3) {
          await sleep(2000 * attempt);
          continue;
        }
        throw err; // If it's not a retryable error or we exhausted attempts, bubble it up
      }
    }

    const raw = result.text ?? "";
    let parsed: { scenes?: Omit<Scene, "id">[] };
    try {
      parsed = JSON.parse(raw.replace(/```json|```/g, "").trim());
    } catch {
      return NextResponse.json(
        { error: "Model returned unparseable output. Try again." },
        { status: 502 }
      );
    }

    const scenes: Scene[] = (parsed.scenes ?? []).map((s, i) => ({
      id: `scene-${i + 1}`,
      timestamp: s.timestamp ?? "",
      concept: s.concept ?? "",
      needsText: Boolean(s.needsText),
      textLabel: s.textLabel ?? "",
      hasCharacter: Boolean(s.hasCharacter),
      imagePrompt: s.imagePrompt ?? "",
    }));

    return NextResponse.json({
      scenes,
      meta: {
        cueCount: cues.length,
        durationMinutes: Math.round(minutes * 10) / 10,
        suggestedCount: count,
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "Analysis failed." },
      { status: 500 }
    );
  }
}
