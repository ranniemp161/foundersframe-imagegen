import { GoogleGenAI } from "@google/genai";

export function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is missing in .env.local");
  return new GoogleGenAI({ apiKey });
}

// Text model — transcript analysis
export const ANALYSIS_MODEL = "gemini-2.5-flash";

// Image models — Nano Banana family (IDs verified against the live model list)
export const IMAGE_MODELS = {
  nano_banana: {
    id: "gemini-2.5-flash-image",
    label: "Nano Banana",
    note: "~$0.039/img · fast · great quality",
  },
  nano_banana_pro: {
    id: "nano-banana-pro-preview",
    label: "Nano Banana Pro",
    note: "~$0.134/img · best text + character consistency",
  },
} as const;

export type ImageModelKey = keyof typeof IMAGE_MODELS;

export function resolveImageModelId(key: string): string {
  const k =
    (key as ImageModelKey) in IMAGE_MODELS
      ? (key as ImageModelKey)
      : "nano_banana";
  return IMAGE_MODELS[k].id;
}
