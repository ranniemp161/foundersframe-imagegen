import { GoogleGenAI } from "@google/genai";

export function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is missing.");
  return new GoogleGenAI({ apiKey });
}

export const ANALYSIS_MODEL = "gemini-2.5-flash";

export const IMAGE_MODELS = {
  flux_schnell: { falModelId: "fal-ai/flux/schnell", label: "Flux Schnell (Fastest)", note: "~$0.003/img · best for testing" },
  flux_dev: { falModelId: "fal-ai/flux/dev", label: "Flux Dev (Balanced)", note: "~$0.025/img · best quality/speed" },
  flux_pro: { falModelId: "fal-ai/flux-pro", label: "Flux Pro", note: "~$0.05/img · highest quality" },
} as const;

export type ImageModelKey = keyof typeof IMAGE_MODELS;

export function resolveFalModelId(key: string): string {
  const k = (key as ImageModelKey) in IMAGE_MODELS ? (key as ImageModelKey) : "flux_schnell";
  return IMAGE_MODELS[k].falModelId;
}