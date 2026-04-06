"use client";

import { Stepper } from "@/components/Stepper";
import { FileUpload } from "@/components/FileUpload";
import { CodingWorkflow } from "@/components/CodingWorkflow";
import { AuditPanel } from "@/components/AuditPanel";
import { useProjectStore } from "@/lib/store";
import { RotateCcw } from "lucide-react";

export default function Home() {
  const stage = useProjectStore((s) => s.stage);
  const segmentCount = useProjectStore((s) => s.segments.length);
  const reset = useProjectStore((s) => s.reset);

  const hasWork = segmentCount > 0 || stage !== "idle";

  const handleClearWorkspace = () => {
    if (
      !confirm(
        "将清空：已解析文档、全部编码结果、审计记录与理论框架图（含本地缓存）。此操作不可恢复，确定继续？",
      )
    ) {
      return;
    }
    reset();
  };

  return (
    <main className="min-h-screen">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              质性编码助手
            </h1>
            <p className="text-sm text-zinc-500 mt-1">
              扎根理论三步编码：开放编码 → 主轴编码 → 选择性编码
            </p>
          </div>
          {hasWork && (
            <button
              type="button"
              onClick={handleClearWorkspace}
              className="inline-flex items-center gap-2 self-start px-3 py-2 text-sm rounded-lg border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800 transition-colors shrink-0"
              title="清空当前项目并回到上传文档"
            >
              <RotateCcw className="w-4 h-4" />
              清空工作区
            </button>
          )}
        </div>

        <Stepper />

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Main content */}
          <div className="lg:col-span-3 space-y-6">
            {stage === "idle" && <FileUpload />}
            <CodingWorkflow />
          </div>

          {/* Audit sidebar */}
          <aside className="lg:col-span-1">
            <div className="sticky top-8">
              <AuditPanel />
            </div>
          </aside>
        </div>

        {/* Footer disclaimer */}
        <footer className="mt-16 pt-6 border-t border-zinc-200 dark:border-zinc-800">
          <p className="text-xs text-zinc-400 leading-relaxed max-w-2xl">
            本工具使用 LLM 辅助质性研究编码，仅作辅助参考。理论饱和、反思性与审计轨迹的最终判断应由研究者主导。
            建议在论文中声明 AI 辅助编码流程与人工校验比例。
          </p>
        </footer>
      </div>
    </main>
  );
}
