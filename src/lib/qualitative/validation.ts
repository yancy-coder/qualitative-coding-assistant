import type { OpenCode, AxialCode, Segment, ParadigmSlot } from "./types";

export interface ValidationWarning {
  type: "verbatim_mismatch" | "invalid_paradigm" | "orphan_category" | "missing_ref";
  id: string;
  message: string;
}

const VALID_PARADIGM_SLOTS: ParadigmSlot[] = [
  "causal_cond",
  "phenomenon",
  "context",
  "intervening",
  "strategy",
  "consequence",
  "other",
];

export function validateOpenCodes(
  codes: OpenCode[],
  segments: Segment[],
): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];
  const segmentMap = new Map(segments.map((s) => [s.segment_id, s.verbatim]));

  for (const code of codes) {
    const segText = segmentMap.get(code.segment_id);
    if (!segText) {
      warnings.push({
        type: "missing_ref",
        id: code.open_code_id,
        message: `segment_id "${code.segment_id}" 在解析结果中不存在`,
      });
      continue;
    }

    if (!segText.includes(code.verbatim_quote)) {
      const normalizedSeg = segText.replace(/\s+/g, " ").trim();
      const normalizedQuote = code.verbatim_quote.replace(/\s+/g, " ").trim();
      if (!normalizedSeg.includes(normalizedQuote)) {
        warnings.push({
          type: "verbatim_mismatch",
          id: code.open_code_id,
          message: `引用 "${code.verbatim_quote.slice(0, 50)}..." 未在段落 ${code.segment_id} 原文中找到匹配子串`,
        });
      }
    }
  }

  return warnings;
}

export function validateAxialCodes(
  axialCodes: AxialCode[],
  openCodes: OpenCode[],
): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];
  const openCodeIds = new Set(openCodes.map((c) => c.open_code_id));

  for (const ac of axialCodes) {
    if (!VALID_PARADIGM_SLOTS.includes(ac.paradigm_slot)) {
      warnings.push({
        type: "invalid_paradigm",
        id: ac.axial_id,
        message: `范式维度 "${ac.paradigm_slot}" 不在合法枚举中`,
      });
    }

    for (const ref of ac.from_open_code_ids) {
      if (!openCodeIds.has(ref)) {
        warnings.push({
          type: "orphan_category",
          id: ac.axial_id,
          message: `引用的开放编码 "${ref}" 不存在`,
        });
      }
    }
  }

  return warnings;
}
