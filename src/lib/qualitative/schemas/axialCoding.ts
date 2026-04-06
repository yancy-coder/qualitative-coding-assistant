import { z } from "zod";

export const ParadigmSlotEnum = z.enum([
  "causal_cond",
  "phenomenon",
  "context",
  "intervening",
  "strategy",
  "consequence",
  "other",
]);

export const AxialCodeItemSchema = z.object({
  axial_id: z.string(),
  category: z.string(),
  from_open_code_ids: z.array(z.string()),
  paradigm_slot: ParadigmSlotEnum,
  relationship_description: z.string(),
  supporting_evidence_refs: z.array(z.string()),
  source_file: z.string(),
});

export const AxialCodingResponseSchema = z.object({
  axial_codes: z.array(AxialCodeItemSchema),
});

export type AxialCodingResponse = z.infer<typeof AxialCodingResponseSchema>;
