import { NextResponse } from "next/server";
import { createOpenAI } from "@ai-sdk/openai";
import { generateText } from "ai";
import { OpenCodingResponseSchema } from "@/lib/qualitative/schemas/openCoding";
import {
  OPEN_CODING_SYSTEM,
  OPEN_CODING_PROMPT_VERSION,
  buildOpenCodingUserPrompt,
} from "@/lib/qualitative/prompts/openCoding";
import type { Segment, AuditManifest } from "@/lib/qualitative/types";
import { getMoonshotTemperature } from "@/lib/server/moonshotTemperature";

export const maxDuration = 300;

export async function POST(req: Request) {
  try {
    const { segments } = (await req.json()) as { segments: Segment[] };
    const temperature = getMoonshotTemperature();
    const model = process.env.MOONSHOT_MODEL || "kimi-k2.5";
    const baseURL = process.env.MOONSHOT_BASE_URL || "https://api.moonshot.cn/v1";
    const apiKey = process.env.MOONSHOT_API_KEY || "";

    const provider = createOpenAI({ baseURL, apiKey });
    const segmentsJson = JSON.stringify(
      segments.map((s) => ({
        segment_id: s.segment_id,
        source_file: s.source_file,
        paragraph_index: s.paragraph_index,
        verbatim: s.verbatim,
      })),
      null,
      2,
    );

    const userPrompt = buildOpenCodingUserPrompt(segmentsJson);

    const result = await generateText({
      model: provider.chat(model),
      system: OPEN_CODING_SYSTEM,
      prompt: userPrompt,
      temperature,
      maxOutputTokens: 16000,
    });

    const raw = result.text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const parsed = OpenCodingResponseSchema.parse(JSON.parse(raw));

    const manifest: AuditManifest = {
      step: "open_coding",
      timestamp: new Date().toISOString(),
      prompt_version: OPEN_CODING_PROMPT_VERSION,
      system_prompt: OPEN_CODING_SYSTEM,
      user_prompt: userPrompt,
      model,
      segments_sent: segments.map((s) => s.segment_id),
      temperature,
      max_output_tokens: 16000,
    };

    return NextResponse.json({ codes: parsed.codes, manifest });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Open coding failed";
    console.error("Open coding error:", e);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
