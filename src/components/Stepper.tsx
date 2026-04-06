"use client";

import { useProjectStore } from "@/lib/store";
import type { PipelineStage } from "@/lib/qualitative/types";
import clsx from "clsx";

const STEPS: { key: PipelineStage; label: string }[] = [
  { key: "idle", label: "上传" },
  { key: "parsed", label: "解析" },
  { key: "open_done", label: "开放编码" },
  { key: "axial_done", label: "主轴编码" },
  { key: "selective_done", label: "选择性编码" },
  { key: "diagram_ready", label: "框架图" },
];

const stageOrder: PipelineStage[] = [
  "idle",
  "parsed",
  "open_pending",
  "open_done",
  "axial_pending",
  "axial_done",
  "selective_pending",
  "selective_done",
  "diagram_ready",
];

function stageIndex(s: PipelineStage) {
  return stageOrder.indexOf(s);
}

export function Stepper() {
  const stage = useProjectStore((s) => s.stage);
  const currentIdx = stageIndex(stage);

  return (
    <nav className="flex items-center gap-1 mb-8 overflow-x-auto py-2">
      {STEPS.map((step, i) => {
        const stepIdx = stageIndex(step.key);
        const done = currentIdx >= stepIdx && currentIdx > 0;
        const active =
          (step.key === "idle" && stage === "idle") ||
          (step.key === "parsed" && (stage === "parsed" || stage === "open_pending")) ||
          (step.key === "open_done" && (stage === "open_done" || stage === "axial_pending")) ||
          (step.key === "axial_done" && (stage === "axial_done" || stage === "selective_pending")) ||
          (step.key === "selective_done" && (stage === "selective_done")) ||
          (step.key === "diagram_ready" && stage === "diagram_ready");

        return (
          <div key={step.key} className="flex items-center">
            {i > 0 && (
              <div
                className={clsx(
                  "h-0.5 w-8 mx-1",
                  done ? "bg-emerald-500" : "bg-zinc-300 dark:bg-zinc-600",
                )}
              />
            )}
            <div
              className={clsx(
                "flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors",
                active
                  ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200"
                  : done
                    ? "bg-emerald-500 text-white"
                    : "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400",
              )}
            >
              <span
                className={clsx(
                  "w-5 h-5 rounded-full flex items-center justify-center text-xs",
                  done
                    ? "bg-white text-emerald-600"
                    : "bg-zinc-200 text-zinc-600 dark:bg-zinc-700 dark:text-zinc-300",
                )}
              >
                {done ? "✓" : i + 1}
              </span>
              {step.label}
            </div>
          </div>
        );
      })}
    </nav>
  );
}
