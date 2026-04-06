export interface Segment {
  segment_id: string;
  source_file: string;
  paragraph_index: number;
  verbatim: string;
  char_start: number;
  char_end: number;
}

export interface OpenCode {
  open_code_id: string;
  segment_id: string;
  code_label: string;
  concept_definition: string;
  verbatim_quote: string;
  source_file: string;
}

export type ParadigmSlot =
  | "causal_cond"
  | "phenomenon"
  | "context"
  | "intervening"
  | "strategy"
  | "consequence"
  | "other";

export interface AxialCode {
  axial_id: string;
  category: string;
  from_open_code_ids: string[];
  paradigm_slot: ParadigmSlot;
  relationship_description: string;
  supporting_evidence_refs: string[];
  source_file: string;
}

export interface SelectiveCode {
  selective_id: string;
  core_category: string;
  central_phenomenon: string;
  storyline: string;
  integration_notes: string;
  links_to_axial_ids: string[];
}

export type PipelineStage =
  | "idle"
  | "parsed"
  | "open_pending"
  | "open_done"
  | "axial_pending"
  | "axial_done"
  | "selective_pending"
  | "selective_done"
  | "diagram_ready";

export interface AuditManifest {
  step: string;
  timestamp: string;
  prompt_version: string;
  system_prompt: string;
  user_prompt: string;
  model: string;
  segments_sent: string[];
  batch_boundaries?: number[];
  temperature?: number;
  max_output_tokens?: number;
}

export interface AuditDiffEntry {
  type: "added" | "removed" | "modified";
  field: string;
  id: string;
  old_value?: string;
  new_value?: string;
  source: "llm" | "user_edit";
  timestamp: string;
}

export interface FrozenSnapshot {
  step: string;
  locked_ids: string[];
  excluded_segment_ids: string[];
  reason?: string;
  timestamp: string;
}

export interface PipelinePlan {
  current_stage: PipelineStage;
  next_action: string;
  next_input_summary: string;
  pending_steps: string[];
}

export interface ProjectState {
  segments: Segment[];
  openCodes: OpenCode[];
  axialCodes: AxialCode[];
  selectiveCodes: SelectiveCode[];
  stage: PipelineStage;
  auditManifests: AuditManifest[];
  auditDiffs: AuditDiffEntry[];
  frozenSnapshots: FrozenSnapshot[];
  pipelinePlan: PipelinePlan;
  frameworkImageUrl: string | null;
}
