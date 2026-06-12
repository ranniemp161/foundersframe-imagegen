import { NextRequest, NextResponse } from "next/server";
import { getGeminiClient, resolveImageModelId } from "@/lib/gemini";
import { buildImagePrompt } from "@/lib/style-preset";
import { isAuthorized } from "@/lib/auth";

export const runtime = "nodejs";
export const maxDuration = 120;

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

export async function POST(req: NextRequest) {
  try {
    if (!isAuthorized(req)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { scene, modelKey, channel } = await req.json();
    if (!scene?.imagePrompt) {
      return NextResponse.json(
        { error: "Missing scene prompt." },
        { status: 400 }
      );
    }

    const channelName = channel === "subishop" ? "subishop" : "foundersframe";

    const finalPrompt = buildImagePrompt({
      imagePrompt: scene.imagePrompt,
      needsText: Boolean(scene.needsText),
      textLabel: scene.textLabel ?? "",
      hasCharacter: Boolean(scene.hasCharacter),
      channel: channelName,
    });

    // Gemini's image API has no direct size parameter — the desired output
    // dimensions must be requested through the prompt text itself.
    const sizedPrompt = finalPrompt + "\n\nIMPORTANT: " +
      (channelName === "subishop"
        ? "Generate this as a 1920x1080 landscape image (16:9 aspect ratio). Center the subject in the frame, surrounded by a clean, solid, flat neutral background."
        : "Generate this as a 960x1080 portrait image (half of a 1920x1080 HD frame). Subject on right side, empty white space on left side.");

    const client = getGeminiClient();
    const modelId = resolveImageModelId(modelKey);

    // Auto retry on 429/503 with backoff
    let lastError = "";
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const result = await client.models.generateContent({
          model: modelId,
          contents: [{ role: "user", parts: [{ text: sizedPrompt }] }],
          config: {
            responseModalities: ["IMAGE", "TEXT"],
          },
        });

        const parts = result.candidates?.[0]?.content?.parts ?? [];
        const imagePart = parts.find((p: any) => p.inlineData?.data);

        if (!imagePart?.inlineData?.data) {
          const textPart = parts.find((p: any) => p.text)?.text;
          return NextResponse.json(
            {
              error:
                textPart ||
                "No image returned. Try rephrasing the prompt.",
            },
            { status: 502 }
          );
        }

        const mime = imagePart.inlineData.mimeType ?? "image/png";
        return NextResponse.json({
          id: scene.id,
          dataUrl: `data:${mime};base64,${imagePart.inlineData.data}`,
        });
      } catch (err: any) {
        lastError = err?.message ?? "Unknown error";
        const isRetryable =
          lastError.includes("429") ||
          lastError.includes("503") ||
          lastError.includes("rate") ||
          lastError.includes("quota") ||
          lastError.includes("unavailable");

        if (isRetryable && attempt < 3) {
          await sleep(4000 * attempt);
          continue;
        }
        break;
      }
    }

    return NextResponse.json(
      { error: lastError || "Generation failed." },
      { status: 500 }
    );
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "Generation failed." },
      { status: 500 }
    );
  }
}
