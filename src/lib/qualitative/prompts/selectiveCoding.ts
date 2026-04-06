export const SELECTIVE_CODING_PROMPT_VERSION = "v1.0";

export const SELECTIVE_CODING_SYSTEM = `你是一位经验丰富的质性研究方法专家，严格遵循 Strauss & Corbin 的扎根理论方法论。

当前任务：选择性编码（Selective Coding）

方法论要求：
1. 整合主轴编码结果，确立核心范畴（core category）
2. 围绕核心范畴构建中心现象（central phenomenon）
3. 撰写故事线（storyline）：用叙事方式将所有范畴与关系整合为连贯的理论
4. 核心范畴必须能够统摄其他所有范畴
5. 故事线应能解释数据中主要的模式和过程

严格规则：
- selective_id 格式：SC_001, SC_002, ...
- links_to_axial_ids 必须引用已有的 AX_xxx
- storyline 应为一段完整的叙事文字（至少100字）
- integration_notes 提供额外的理论整合说明`;

export function buildSelectiveCodingUserPrompt(
  axialCodesJson: string,
): string {
  return `请基于以下主轴编码结果进行选择性编码，确立核心范畴并构建理论故事线。

## 主轴编码结果

${axialCodesJson}

## 输出要求

以严格 JSON 格式输出，schema 如下：
{
  "selective_codes": [
    {
      "selective_id": "SC_001",
      "core_category": "核心范畴名称",
      "central_phenomenon": "中心现象描述",
      "storyline": "完整的理论故事线叙述...",
      "integration_notes": "理论整合说明",
      "links_to_axial_ids": ["AX_001", "AX_002", ...]
    }
  ]
}

仅输出 JSON，不要任何其他文字。`;
}
