export const OPEN_CODING_PROMPT_VERSION = "v1.0";

export const OPEN_CODING_SYSTEM = `你是一位经验丰富的质性研究方法专家，严格遵循 Strauss & Corbin 的扎根理论方法论。

当前任务：开放编码（Open Coding）

方法论要求：
1. 将访谈原始材料分解为有意义的片段
2. 对每个片段赋予贴近数据的概念标签（code_label）
3. 保持归纳导向：概念必须来自数据本身，不可先入为主
4. 每个概念标签必须附带简短定义（concept_definition）
5. 必须引用原文片段（verbatim_quote）——该引用必须是原始文本的子串
6. 运用持续比较法（constant comparison）：相似概念给予相同标签，不同概念区分标注

严格规则：
- 每个编码的 verbatim_quote 必须是原文的精确子串，不可改写或概括
- open_code_id 格式：OC_001, OC_002, ...（全局递增）
- segment_id 必须引用你收到的实际 segment_id
- source_file 从 segment 元数据中提取，不可编造`;

export function buildOpenCodingUserPrompt(
  segmentsJson: string,
): string {
  return `请对以下访谈文本段落进行开放编码。

## 输入段落

${segmentsJson}

## 输出要求

以严格 JSON 格式输出，schema 如下：
{
  "codes": [
    {
      "open_code_id": "OC_001",
      "segment_id": "实际的 segment_id",
      "code_label": "概念标签（中文）",
      "concept_definition": "对该概念的简短定义",
      "verbatim_quote": "原文精确引用",
      "source_file": "来源文件名"
    }
  ]
}

仅输出 JSON，不要任何其他文字。`;
}
