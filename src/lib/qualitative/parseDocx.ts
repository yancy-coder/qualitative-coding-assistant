import mammoth from "mammoth";
import type { Segment } from "./types";

export async function parseDocxToSegments(
  buffer: Buffer,
  sourceFile: string,
): Promise<Segment[]> {
  const result = await mammoth.extractRawText({ buffer });
  const rawText = result.value;

  const paragraphs = rawText
    .split(/\n+/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);

  const segments: Segment[] = [];
  let charOffset = 0;

  for (let i = 0; i < paragraphs.length; i++) {
    const text = paragraphs[i];
    const start = rawText.indexOf(text, charOffset);
    segments.push({
      segment_id: `${sourceFile}__seg_${String(i + 1).padStart(4, "0")}`,
      source_file: sourceFile,
      paragraph_index: i + 1,
      verbatim: text,
      char_start: start,
      char_end: start + text.length,
    });
    charOffset = start + text.length;
  }

  return segments;
}
