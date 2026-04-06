import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  Segment,
  OpenCode,
  AxialCode,
  SelectiveCode,
  PipelineStage,
  AuditManifest,
  AuditDiffEntry,
  FrozenSnapshot,
  PipelinePlan,
  ProjectState,
} from "@/lib/qualitative/types";

function defaultPlan(): PipelinePlan {
  return {
    current_stage: "idle",
    next_action: "上传访谈稿",
    next_input_summary: "",
    pending_steps: ["parse", "open", "axial", "selective", "diagram"],
  };
}

interface Actions {
  setSegments: (s: Segment[]) => void;
  setOpenCodes: (c: OpenCode[]) => void;
  setAxialCodes: (c: AxialCode[]) => void;
  setSelectiveCodes: (c: SelectiveCode[]) => void;
  setStage: (s: PipelineStage) => void;
  addManifest: (m: AuditManifest) => void;
  addDiffs: (d: AuditDiffEntry[]) => void;
  addFrozenSnapshot: (f: FrozenSnapshot) => void;
  updatePlan: (p: Partial<PipelinePlan>) => void;
  setFrameworkImageUrl: (url: string | null) => void;
  reset: () => void;
}

const initialState: ProjectState = {
  segments: [],
  openCodes: [],
  axialCodes: [],
  selectiveCodes: [],
  stage: "idle",
  auditManifests: [],
  auditDiffs: [],
  frozenSnapshots: [],
  pipelinePlan: defaultPlan(),
  frameworkImageUrl: null,
};

export const useProjectStore = create(
  persist<ProjectState & Actions>(
    (set) => ({
      ...initialState,

      setSegments: (segments) =>
        set({
          segments,
          stage: "parsed",
          pipelinePlan: {
            current_stage: "parsed",
            next_action: "开始开放编码",
            next_input_summary: `${segments.length} 个文本段待编码`,
            pending_steps: ["open", "axial", "selective", "diagram"],
          },
        }),

      setOpenCodes: (openCodes) => set({ openCodes }),
      setAxialCodes: (axialCodes) => set({ axialCodes }),
      setSelectiveCodes: (selectiveCodes) => set({ selectiveCodes }),
      setStage: (stage) => set({ stage }),

      addManifest: (m) =>
        set((s) => ({ auditManifests: [...s.auditManifests, m] })),

      addDiffs: (d) =>
        set((s) => ({ auditDiffs: [...s.auditDiffs, ...d] })),

      addFrozenSnapshot: (f) =>
        set((s) => ({ frozenSnapshots: [...s.frozenSnapshots, f] })),

      updatePlan: (p) =>
        set((s) => ({
          pipelinePlan: { ...s.pipelinePlan, ...p },
        })),

      setFrameworkImageUrl: (url) => set({ frameworkImageUrl: url }),

      reset: () =>
        set({
          ...initialState,
          pipelinePlan: defaultPlan(),
        }),
    }),
    { name: "qualitative-coding-store" },
  ),
);
