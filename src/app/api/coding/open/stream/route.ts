import {
  OPEN_CODING_SYSTEM,
  OPEN_CODING_PROMPT_VERSION,
} from "@/lib/qualitative/prompts/openCoding";
import type { Segment, AuditManifest } from "@/lib/qualitative/types";
import { runOpenCodingBatches } from "@/lib/server/openCodingBatch";

export const maxDuration = 600;

export async function POST(req: Request) {
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

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      function send(data: Record<string, unknown>) {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify(data)}\n\n`),
        );
      }

      try {
        const totalBatches = Math.ceil(segments.length / batchSize);
        send({ type: "start", total: totalBatches, segments: segments.length });

        const { allCodes, errors } = await runOpenCodingBatches({
          segments,
          batchSize,
          concurrency,
          maxOutputTokens,
          maxRetries: 2,
          onBatchDone: (completed, total, codesCount) => {
            send({ type: "progress", completed, total, codesCount });
          },
        });

        const manifest: AuditManifest = {
          step: "open_coding",
          timestamp: new Date().toISOString(),
          prompt_version: OPEN_CODING_PROMPT_VERSION,
          system_prompt: OPEN_CODING_SYSTEM,
          user_prompt: `并发开放编码：${totalBatches} 批，并发度 ${concurrency}`,
          model,
          segments_sent: segments.map((s) => s.segment_id),
          temperature: undefined,
          max_output_tokens: maxOutputTokens,
        };

        if (allCodes.length === 0 && errors.length > 0) {
          send({ type: "error", message: `All batches failed: ${errors.join("; ")}` });
        } else {
          send({
            type: "done",
            codes: allCodes,
            manifest,
            errors: errors.length > 0 ? errors : undefined,
          });
        }
      } catch (e) {
        const message = e instanceof Error ? e.message : "Open coding failed";
        send({ type: "error", message });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
