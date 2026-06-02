import { NextRequest, NextResponse } from "next/server";
import { buildImagePrompt } from "@/lib/style-preset";

export const runtime = "nodejs";
export const maxDuration = 120;

const HF_MODEL = "black-forest-labs/FLUX.1-schnell";

async function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

export async function POST(req: NextRequest) {
  try {
    const hfKey = process.env.HF_API_KEY;
    if (!hfKey) {
      return NextResponse.json(
        { error: "HF_API_KEY is missing in .env.local" },
        { status: 400 }
      );
    }

    const { scene, modelKey } = await req.json();
    if (!scene?.imagePrompt) {
      return NextResponse.json({ error: "Missing scene prompt." }, { status: 400 });
    }

    const finalPrompt = buildImagePrompt({
      imagePrompt: scene.imagePrompt,
      needsText: Boolean(scene.needsText),
      textLabel: scene.textLabel ?? "",
      hasCharacter: Boolean(scene.hasCharacter),
    });

    // Hugging Face Inference API — returns raw image bytes directly.
    for (let attempt = 1; attempt <= 3; attempt++) {
      const res = await fetch(
        `https://router.huggingface.co/hf-inference/models/${HF_MODEL}`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${hfKey.trim()}`,
            "Content-Type": "application/json",
            "x-wait-for-model": "true",
          },
          body: JSON.stringify({
            inputs: finalPrompt,
            parameters: {
              width: 1280,
              height: 720,
              num_inference_steps: 4,
            },
          }),
        }
      );

      // 503 = model is loading, retry after a few seconds.
      if (res.status === 503) {
        if (attempt < 3) { await sleep(5000 * attempt); continue; }
        return NextResponse.json(
          { error: "Model is loading, please try again in 30 seconds." },
          { status: 503 }
        );
      }

      if (!res.ok) {
        const errText = await res.text();
        console.error(`[HF ERROR] Status: ${res.status} | Body: ${errText}`);
        return NextResponse.json(
          { error: `Hugging Face error ${res.status}: ${errText}` },
          { status: 500 }
        );
      }

      // Response is raw image bytes — convert to base64.
      const buffer = await res.arrayBuffer();
      const base64 = Buffer.from(buffer).toString("base64");
      const mime = res.headers.get("content-type") || "image/jpeg";

      return NextResponse.json({
        id: scene.id,
        dataUrl: `data:${mime};base64,${base64}`,
      });
    }

    return NextResponse.json({ error: "Generation failed after retries." }, { status: 500 });
  } catch (err: any) {
    console.error("[GENERATE ERROR]:", err);
    return NextResponse.json(
      { error: err?.message ?? "Generation failed." },
      { status: 500 }
    );
  }
}