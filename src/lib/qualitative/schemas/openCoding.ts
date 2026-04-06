import { z } from "zod";

export const OpenCodeItemSchema = z.object({
  open_code_id: z.string(),
  segment_id: z.string(),
  code_label: z.string(),
  concept_definition: z.string(),
  verbatim_quote: z.string(),
  source_file: z.string(),
});

export const OpenCodingResponseSchema = z.object({
  codes: z.array(OpenCodeItemSchema),
});

export type OpenCodingResponse = z.infer<typeof OpenCodingResponseSchema>;
