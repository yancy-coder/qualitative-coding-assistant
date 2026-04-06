import { NextResponse } from "next/server";
import { createOpenAI } from "@ai-sdk/openai";
import { generateText } from "ai";
import { SelectiveCodingResponseSchema } from "@/lib/qualitative/schemas/selectiveCoding";
import {
  SELECTIVE_CODING_SYSTEM,
  SELECTIVE_CODING_PROMPT_VERSION,
  buildSelectiveCodingUserPrompt,
} from "@/lib/qualitative/prompts/selectiveCoding";
import type { AxialCode, AuditManifest } from "@/lib/qualitative/types";
import { getMoonshotTemperature } from "@/lib/server/moonshotTemperature";

export const maxDuration = 300;

export async function POST(req: Request) {
  try {
    const { axialCodes } = (await req.json()) as { axialCodes: AxialCode[] };

    const temperature = getMoonshotTemperature();
    const model = process.env.MOONSHOT_MODEL || "kimi-k2.5";
    const baseURL = process.env.MOONSHOT_BASE_URL || "https://api.moonshot.cn/v1";
    const apiKey = process.env.MOONSHOT_API_KEY || "";

    const provider = createOpenAI({ baseURL, apiKey });
    const axialCodesJson = JSON.stringify(axialCodes, null, 2);
    const userPrompt = buildSelectiveCodingUserPrompt(axialCodesJson);

    const result = await generateText({
      model: provider.chat(model),
      system: SELECTIVE_CODING_SYSTEM,
      prompt: userPrompt,
      temperature,
      maxOutputTokens: 8000,
    });

    const raw = result.text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const parsed = SelectiveCodingResponseSchema.parse(JSON.parse(raw));

    const manifest: AuditManifest = {
      step: "selective_coding",
      timestamp: new Date().toISOString(),
      prompt_version: SELECTIVE_CODING_PROMPT_VERSION,
      system_prompt: SELECTIVE_CODING_SYSTEM,
      user_prompt: userPrompt,
      model,
      segments_sent: [],
      temperature,
      max_output_tokens: 8000,
    };

    return NextResponse.json({
      selective_codes: parsed.selective_codes,
      manifest,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Selective coding failed";
    console.error("Selective coding error:", e);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
