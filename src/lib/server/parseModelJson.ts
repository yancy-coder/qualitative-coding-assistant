/**
 * Normalize model output (strip markdown fences) and parse JSON.
 * Surfaces truncation hints when parse fails on likely-cut-off payloads.
 */
export function parseModelJson(raw: string): unknown {
  const cleaned = raw
    .replace(/```json\s*/gi, "")
    .replace(/```\s*/g, "")
    .trim();
  if (cleaned.length === 0) {
    throw new Error("Model returned empty output");
  }
  try {
    return JSON.parse(cleaned);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    const likelyTruncated =
      /unexpected end|unterminated|end of data|Unexpected end/i.test(msg) ||
      (!cleaned.trimEnd().endsWith("}") && !cleaned.trimEnd().endsWith("]"));
    const hint = likelyTruncated
      ? " Output was likely truncated (output token limit). Reduce batch size or raise maxOutputTokens."
      : "";
    throw new Error(`Invalid JSON from model: ${msg}.${hint}`);
  }
}
