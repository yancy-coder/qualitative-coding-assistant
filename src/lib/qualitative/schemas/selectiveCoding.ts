import { z } from "zod";

export const SelectiveCodeItemSchema = z.object({
  selective_id: z.string(),
  core_category: z.string(),
  central_phenomenon: z.string(),
  storyline: z.string(),
  integration_notes: z.string(),
  links_to_axial_ids: z.array(z.string()),
});

export const SelectiveCodingResponseSchema = z.object({
  selective_codes: z.array(SelectiveCodeItemSchema),
});

export type SelectiveCodingResponse = z.infer<typeof SelectiveCodingResponseSchema>;
