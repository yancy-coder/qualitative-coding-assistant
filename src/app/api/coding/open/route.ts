import { NextResponse } from "next/server";
import {
  OPEN_CODING_SYSTEM,
  OPEN_CODING_PROMPT_VERSION,
} from "@/lib/qualitative/prompts/openCoding";
import type { Segment, AuditManifest } from "@/lib/qualitative/types";
import { runOpenCodingBatches } from "@/lib/server/openCodingBatch";

export const maxDuration = 600;

export async function POST(req: Request) {
  try {
    const { segments } = (await req.json()) as { segments: Segment[] };

    const maxOutputTokens = Number(
      process.env.OPEN_CODING_MAX_OUTPUT_TOKENS || "16000",
    );
    const batchSize = Math.max(
      1,
      Number.parseInt(process.env.OPEN_CODING_BATCH_SIZE || "20", 10) || 20,
    );
    const concurrency = Math.max(
      1,
      Number.parseInt(process.env.OPEN_CODING_CONCURRENCY || "5", 10) || 5,
    );

    const model = process.env.MOONSHOT_MODEL || "kimi-k2.5";

    const { allCodes, errors } = await runOpenCodingBatches({
      segments,
      batchSize,
      concurrency,
      maxOutputTokens,
      maxRetries: 2,
    });

    if (allCodes.length === 0 && errors.length > 0) {
      throw new Error(`All batches failed: ${errors.join("; ")}`);
    }

    const manifest: AuditManifest = {
      step: "open_coding",
      timestamp: new Date().toISOString(),
      prompt_version: OPEN_CODING_PROMPT_VERSION,
      system_prompt: OPEN_CODING_SYSTEM,
      user_prompt: `并发开放编码：${Math.ceil(segments.length / batchSize)} 批，并发度 ${concurrency}`,
      model,
      segments_sent: segments.map((s) => s.segment_id),
      temperature: undefined,
      max_output_tokens: maxOutputTokens,
    };

    return NextResponse.json({ codes: allCodes, manifest });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Open coding failed";
    console.error("Open coding error:", e);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
