import type { OpenCode, AxialCode, SelectiveCode } from "./types";

function escapeCsv(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function toCsvRow(values: string[]): string {
  return values.map(escapeCsv).join(",");
}

export function openCodesToCsv(codes: OpenCode[]): string {
  const header = toCsvRow([
    "序号",
    "编码ID",
    "段落ID",
    "概念标签",
    "概念定义",
    "原文引用",
    "来源文件",
  ]);
  const rows = codes.map((c, i) =>
    toCsvRow([
      String(i + 1),
      c.open_code_id,
      c.segment_id,
      c.code_label,
      c.concept_definition,
      c.verbatim_quote,
      c.source_file,
    ]),
  );
  return [header, ...rows].join("\n");
}

export function axialCodesToCsv(codes: AxialCode[]): string {
  const header = toCsvRow([
    "序号",
    "编码ID",
    "范畴",
    "来源开放编码",
    "范式维度",
    "关系描述",
    "证据引用",
    "来源文件",
  ]);
  const rows = codes.map((c, i) =>
    toCsvRow([
      String(i + 1),
      c.axial_id,
      c.category,
      c.from_open_code_ids.join("; "),
      c.paradigm_slot,
      c.relationship_description,
      c.supporting_evidence_refs.join("; "),
      c.source_file,
    ]),
  );
  return [header, ...rows].join("\n");
}

export function selectiveCodesToCsv(codes: SelectiveCode[]): string {
  const header = toCsvRow([
    "序号",
    "编码ID",
    "核心范畴",
    "中心现象",
    "故事线",
    "理论整合说明",
    "关联主轴编码",
  ]);
  const rows = codes.map((c, i) =>
    toCsvRow([
      String(i + 1),
      c.selective_id,
      c.core_category,
      c.central_phenomenon,
      c.storyline,
      c.integration_notes,
      c.links_to_axial_ids.join("; "),
    ]),
  );
  return [header, ...rows].join("\n");
}

export function integratedLongCsv(
  openCodes: OpenCode[],
  axialCodes: AxialCode[],
  selectiveCodes: SelectiveCode[],
): string {
  const header = toCsvRow([
    "阶段",
    "序号",
    "编码ID",
    "标签/范畴/核心范畴",
    "原文引用/关系描述/故事线",
    "来源文件",
  ]);
  const rows: string[] = [];

  openCodes.forEach((c, i) => {
    rows.push(
      toCsvRow([
        "开放编码",
        String(i + 1),
        c.open_code_id,
        c.code_label,
        c.verbatim_quote,
        c.source_file,
      ]),
    );
  });

  axialCodes.forEach((c, i) => {
    rows.push(
      toCsvRow([
        "主轴编码",
        String(i + 1),
        c.axial_id,
        c.category,
        c.relationship_description,
        c.source_file,
      ]),
    );
  });

  selectiveCodes.forEach((c, i) => {
    rows.push(
      toCsvRow([
        "选择性编码",
        String(i + 1),
        c.selective_id,
        c.core_category,
        c.storyline,
        "",
      ]),
    );
  });

  return [header, ...rows].join("\n");
}
