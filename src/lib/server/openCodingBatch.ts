import { createOpenAI } from "@ai-sdk/openai";
import { generateText } from "ai";
import { OpenCodingResponseSchema } from "@/lib/qualitative/schemas/openCoding";
import {
  OPEN_CODING_SYSTEM,
  buildOpenCodingUserPrompt,
} from "@/lib/qualitative/prompts/openCoding";
import type { OpenCode, Segment } from "@/lib/qualitative/types";
import { getMoonshotTemperature } from "@/lib/server/moonshotTemperature";
import { parseModelJson } from "@/lib/server/parseModelJson";

export interface BatchResult {
  batchIndex: number;
  codes: OpenCode[];
  error?: string;
}

export interface OpenCodingConfig {
  segments: Segment[];
  batchSize: number;
  concurrency: number;
  maxOutputTokens: number;
  maxRetries: number;
  onBatchDone?: (completed: number, total: number, codesCount: number) => void;
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    out.push(arr.slice(i, i + size));
  }
  return out;
}

async function processSingleBatch(
  batch: Segment[],
  batchIndex: number,
  totalBatches: number,
  provider: ReturnType<typeof createOpenAI>,
  model: string,
  temperature: number,
  maxOutputTokens: number,
  maxRetries: number,
): Promise<BatchResult> {
  const segmentsJson = JSON.stringify(
    batch.map((s) => ({
      segment_id: s.segment_id,
      source_file: s.source_file,
      paragraph_index: s.paragraph_index,
      verbatim: s.verbatim,
    })),
    null,
    2,
  );

  const batchPreamble =
    totalBatches > 1
      ? `【批次 ${batchIndex + 1}/${totalBatches}，${batch.length} 个段落】请仅针对本批段落编码。open_code_id 使用 OC_001、OC_002… 递增即可（合并后会统一重编号）。\n\n`
      : "";

  const userPrompt = batchPreamble + buildOpenCodingUserPrompt(segmentsJson);
  const allowedIds = new Set(batch.map((s) => s.segment_id));

  let lastError: unknown;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const result = await generateText({
        model: provider.chat(model),
        system: OPEN_CODING_SYSTEM,
        prompt: userPrompt,
        temperature,
        maxOutputTokens,
      });

      if (!result.text || result.text.trim().length === 0) {
        const reason = result.finishReason ?? "unknown";
        throw new Error(
          `Empty output (batch ${batchIndex + 1}/${totalBatches}, finishReason: ${reason})`,
        );
      }

      const parsed = OpenCodingResponseSchema.parse(parseModelJson(result.text));
      const codes = parsed.codes.filter((c) => allowedIds.has(c.segment_id));
      return { batchIndex, codes };
    } catch (err) {
      lastError = err;
      if (attempt < maxRetries) {
        const delay = 3000 * (attempt + 1);
        console.warn(
          `Open coding batch ${batchIndex + 1} attempt ${attempt + 1} failed, retrying in ${delay}ms:`,
          err instanceof Error ? err.message : err,
        );
        await new Promise((r) => setTimeout(r, delay));
      }
    }
  }

  const errMsg = lastError instanceof Error ? lastError.message : String(lastError);
  console.error(`Open coding batch ${batchIndex + 1} failed after ${maxRetries + 1} attempts:`, errMsg);
  return { batchIndex, codes: [], error: errMsg };
}

export async function runOpenCodingBatches(
  config: OpenCodingConfig,
): Promise<{ allCodes: OpenCode[]; errors: string[] }> {
  const { segments, batchSize, concurrency, maxOutputTokens, maxRetries, onBatchDone } = config;

  const temperature = getMoonshotTemperature();
  const model = process.env.MOONSHOT_MODEL || "kimi-k2.5";
  const baseURL = process.env.MOONSHOT_BASE_URL || "https://api.moonshot.cn/v1";
  const apiKey = process.env.MOONSHOT_API_KEY || "";
  const provider = createOpenAI({ baseURL, apiKey });

  const batches = chunk(segments, batchSize);
  const concurrencyGroups = chunk(
    batches.map((b, i) => ({ batch: b, index: i })),
    concurrency,
  );

  const allResults: BatchResult[] = [];
  let completedCount = 0;

  for (const group of concurrencyGroups) {
    const results = await Promise.allSettled(
      group.map((g) =>
        processSingleBatch(
          g.batch,
          g.index,
          batches.length,
          provider,
          model,
          temperature,
          maxOutputTokens,
          maxRetries,
        ),
      ),
    );

    for (const r of results) {
      completedCount++;
      if (r.status === "fulfilled") {
        allResults.push(r.value);
      } else {
        allResults.push({
          batchIndex: completedCount - 1,
          codes: [],
          error: r.reason instanceof Error ? r.reason.message : String(r.reason),
        });
      }
      const totalCodes = allResults.reduce((sum, br) => sum + br.codes.length, 0);
      onBatchDone?.(completedCount, batches.length, totalCodes);
    }
  }

  allResults.sort((a, b) => a.batchIndex - b.batchIndex);

  let nextId = 1;
  const allCodes: OpenCode[] = [];
  const errors: string[] = [];

  for (const br of allResults) {
    if (br.error) {
      errors.push(`Batch ${br.batchIndex + 1}: ${br.error}`);
    }
    for (const code of br.codes) {
      allCodes.push({
        ...code,
        open_code_id: `OC_${String(nextId++).padStart(3, "0")}`,
      });
    }
  }

  return { allCodes, errors };
}
