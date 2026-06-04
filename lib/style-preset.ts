// lib/style-preset.ts
// The visual DNA of the FoundersFrame channel, distilled from TJ's reference frames.
// This string is appended to every image prompt so the whole batch stays consistent.

export const FOUNDERSFRAME_STYLE = `
FoundersFrame explainer style. A clean modern whiteboard-animation / motion-graphic look:
- Background: clean solid white (#FFFFFF) only. No gradients, no textures, no shadows, no vignette behind the main subject. The white must be pure and flat so background removal tools can cleanly isolate the subject.
- Icons & objects: hand-drawn line-art with dark navy-charcoal outlines (#2D3142), light interior fills, subtle shading. Confident marker-style strokes, slightly imperfect, friendly.
- Accent colour: a single warm gold/yellow (#E8C547) used sparingly for highlights, arrows, flags, glows, or one key element. Occasional muted red (#E84747) accent only when it carries meaning.
- Composition: ONE clear idea per image, generous negative space, centred or simple left-to-right flow. Arrows (dashed or solid, hand-drawn) to show movement or cause-and-effect.
- Text labels (when present): clean bold sans-serif or friendly hand-lettered word, sometimes inside a gold-outlined speech bubble or a dark rounded banner with white lettering. Keep text short (1-3 words).
- Overall feel: professional, optimistic, business/startup explainer. Like Johnny Harris meets a polished whiteboard-doodle video.
- NO photo-realism for icons, NO busy backgrounds, NO clutter, NO drop-shadow-heavy 3D, NO stock-photo look.
`.trim();

// Some images use a semi-realistic cartoon CHARACTER (see the green-jacket avatar frame).
// When the scene calls for a person/founder figure, this modifier is added.
export const CHARACTER_MODIFIER = `
If a person is shown, render them as a clean semi-realistic cartoon / graphic-novel style character
(smooth cel shading, friendly confident expression, modern casual clothing), isolated cleanly on the
off-white background — consistent with a recurring brand mascot, not a photograph.
`.trim();

// The system instruction that turns a transcript into image prompts.
export function buildAnalysisSystemPrompt(targetCount: number): string {
  return `
You are the visual director for "FoundersFrame", a YouTube channel hosted by TJ — business and startup
explainer content. Your job: read a video transcript and select the moments that most deserve a
supporting graphic, then write a ready-to-use image-generation prompt for each.

EDITORIAL RULES (important):
- Select roughly ${targetCount} moments — only the ones where a visual genuinely ADDS clarity or punch.
  Do not visualise filler, intros, or pure talking. Prioritise: key concepts, metaphors, numbers/stats,
  contrasts ("before vs after"), processes/flows, and emotional turning points.
- Spread selections across the whole video, not clustered at the start.
- Each graphic must express ONE idea. If a sentence has two ideas, pick the stronger one.
- Keep any on-image TEXT to 1-3 words maximum (a label, not a sentence).

For each selected moment return:
- "timestamp": the [mm:ss] from the transcript where the visual should appear.
- "concept": 3-6 word summary of the idea (for TJ to scan).
- "needsText": true/false — does the graphic need a word/label baked in?
- "textLabel": the 1-3 word label if needsText is true, else "".
- "hasCharacter": true/false — does the scene call for a person/founder figure?
- "imagePrompt": a vivid, concrete prompt describing exactly what to draw (subjects, layout,
  arrows, what the gold accent highlights). Describe the SCENE only — do NOT restate the art style,
  that is added automatically. Do NOT name real people; describe figures generically.

Return STRICT JSON only, no markdown, no commentary:
{ "scenes": [ { "timestamp": "...", "concept": "...", "needsText": false, "textLabel": "", "hasCharacter": false, "imagePrompt": "..." } ] }
`.trim();
}

// Assemble the final prompt sent to the image model for one scene.
export function buildImagePrompt(opts: {
  imagePrompt: string;
  needsText: boolean;
  textLabel: string;
  hasCharacter: boolean;
}): string {
  const parts: string[] = [opts.imagePrompt];

  if (opts.needsText && opts.textLabel) {
    parts.push(
      `Include the text "${opts.textLabel}" rendered cleanly and legibly as a label in the image.`
    );
  } else {
    parts.push(`Do not add any text or words to the image.`);
  }

  if (opts.hasCharacter) parts.push(CHARACTER_MODIFIER);

  parts.push(FOUNDERSFRAME_STYLE);
  parts.push(
    `Compose the subject on the RIGHT side of the frame, centered vertically, occupying roughly 50-60% of the width. Leave the LEFT side completely empty white space. This graphic will sit beside a presenter on screen who occupies the left half.`
  );

  return parts.join("\n\n");
}
