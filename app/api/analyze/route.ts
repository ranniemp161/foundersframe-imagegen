// Route segment config MUST come first so Vercel resolves the Node.js runtime
// (60s cap) instead of silently falling back to Edge (25s cap).
export const runtime = "nodejs";
export const maxDuration = 60;

import { NextRequest, NextResponse } from "next/server";
import { HarmCategory, HarmBlockThreshold } from "@google/genai";
import { getGeminiClient, ANALYSIS_MODEL } from "@/lib/gemini";
import { parseSrt, cuesToTranscript, totalDurationMs } from "@/lib/srt";
import { buildAnalysisSystemPrompt } from "@/lib/style-preset";
import { isAuthorized } from "@/lib/auth";

// Cap transcript size so an oversized SRT can't push the Gemini call past the limit.
const MAX_TRANSCRIPT_CHARS = 30000;

async function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

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
    if (!isAuthorized(req)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { srt, targetCount, channel } = await req.json();
    if (!srt || typeof srt !== "string") {
      return NextResponse.json({ error: "No SRT content provided." }, { status: 400 });
    }

    const channelName = channel === "subishop" ? "subishop" : "foundersframe";

    const cues = parseSrt(srt);
    if (cues.length === 0) {
      return NextResponse.json(
        { error: "Couldn't parse any subtitles from that file. Is it a valid .srt?" },
        { status: 400 }
      );
    }

    const minutes = totalDurationMs(cues) / 60000;
    const count =
      typeof targetCount === "number" && targetCount > 0
        ? targetCount
        : channelName === "subishop"
        ? Math.max(3, Math.round(minutes * 1.5))
        : Math.max(8, Math.round(minutes * 6));

    const transcript = cuesToTranscript(cues).slice(0, MAX_TRANSCRIPT_CHARS);
    const client = getGeminiClient();

    let responseStream: any;
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        responseStream = await client.models.generateContentStream({
          model: ANALYSIS_MODEL,
          contents: [
            {
              role: "user",
              parts: [
                { text: buildAnalysisSystemPrompt(count, channelName) },
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
        break;
      } catch (err: any) {
        const msg = err?.message ?? "";
        const retry = msg.includes("429") || msg.includes("503") || msg.includes("rate");
        if (retry && attempt < 3) {
          await sleep(1000 * attempt);
          continue;
        }
        throw err;
      }
    }

    if (!responseStream) {
      throw new Error("Failed to initialize stream.");
    }

    const meta = {
      cueCount: cues.length,
      durationMinutes: Math.round(minutes * 10) / 10,
      suggestedCount: count,
    };

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of responseStream) {
            if (chunk.text) {
              controller.enqueue(encoder.encode(chunk.text));
            }
          }
          controller.close();
        } catch (err: any) {
          controller.error(err);
        }
      }
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "application/json",
        "X-Meta-Cue-Count": meta.cueCount.toString(),
        "X-Meta-Duration": meta.durationMinutes.toString(),
        "X-Meta-Suggested-Count": meta.suggestedCount.toString(),
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "Analysis failed." },
      { status: 500 }
    );
  }
}
