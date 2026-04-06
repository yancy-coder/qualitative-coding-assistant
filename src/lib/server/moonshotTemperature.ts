/**
 * Moonshot / Kimi：部分模型（如 kimi-k2.5）仅接受 temperature=1，否则会报
 * invalid temperature: only 1 is allowed for this model。
 * 可通过 MOONSHOT_TEMPERATURE 覆盖（换用其他模型时）。
 */
export function getMoonshotTemperature(): number {
  const raw = process.env.MOONSHOT_TEMPERATURE?.trim();
  if (!raw) return 1;
  const n = Number(raw);
  return Number.isFinite(n) ? n : 1;
}

/**
 * 主轴编码输出 JSON 往往很长；默认 32000（原 16000 易截断导致 JSON 不完整）。
 * 可通过 MOONSHOT_AXIAL_MAX_OUTPUT_TOKENS 调整（具体上限以 Moonshot 文档为准）。
 */
export function getMoonshotAxialMaxOutputTokens(): number {
  const raw = process.env.MOONSHOT_AXIAL_MAX_OUTPUT_TOKENS?.trim();
  if (!raw) return 32000;
  const n = parseInt(raw, 10);
  if (!Number.isFinite(n) || n <= 0) return 32000;
  return Math.min(n, 128000);
}
