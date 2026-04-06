import { NextResponse } from "next/server";
import { createOpenAI } from "@ai-sdk/openai";
import { generateText } from "ai";
import { AxialCodingResponseSchema } from "@/lib/qualitative/schemas/axialCoding";
import {
  AXIAL_CODING_SYSTEM,
  AXIAL_CODING_PROMPT_VERSION,
  buildAxialCodingUserPrompt,
} from "@/lib/qualitative/prompts/axialCoding";
import type { OpenCode, Segment, AuditManifest } from "@/lib/qualitative/types";
import {
  getMoonshotTemperature,
  getMoonshotAxialMaxOutputTokens,
} from "@/lib/server/moonshotTemperature";

export const maxDuration = 600;

export async function POST(req: Request) {
  try {
    const { openCodes, segments } = (await req.json()) as {
      openCodes: OpenCode[];
      segments: Segment[];
    };

    const temperature = getMoonshotTemperature();
    const maxOutputTokens = getMoonshotAxialMaxOutputTokens();
    const model = process.env.MOONSHOT_MODEL || "kimi-k2.5";
    const baseURL = process.env.MOONSHOT_BASE_URL || "https://api.moonshot.cn/v1";
    const apiKey = process.env.MOONSHOT_API_KEY || "";

    const provider = createOpenAI({ baseURL, apiKey });

    const openCodesJson = JSON.stringify(openCodes, null, 2);
    const segmentsSummary = JSON.stringify(
      segments.slice(0, 50).map((s) => ({
        segment_id: s.segment_id,
        verbatim: s.verbatim.slice(0, 200),
        source_file: s.source_file,
      })),
      null,
      2,
    );

    const userPrompt = buildAxialCodingUserPrompt(openCodesJson, segmentsSummary);

    const result = await generateText({
      model: provider.chat(model),
      system: AXIAL_CODING_SYSTEM,
      prompt: userPrompt,
      temperature,
      maxOutputTokens,
    });

    const raw = result.text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const parsed = AxialCodingResponseSchema.parse(JSON.parse(raw));

    const manifest: AuditManifest = {
      step: "axial_coding",
      timestamp: new Date().toISOString(),
      prompt_version: AXIAL_CODING_PROMPT_VERSION,
      system_prompt: AXIAL_CODING_SYSTEM,
      user_prompt: userPrompt,
      model,
      segments_sent: segments.map((s) => s.segment_id),
      temperature,
      max_output_tokens: maxOutputTokens,
    };

    return NextResponse.json({ axial_codes: parsed.axial_codes, manifest });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Axial coding failed";
    console.error("Axial coding error:", e);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
