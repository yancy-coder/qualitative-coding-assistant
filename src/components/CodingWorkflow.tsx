"use client";

import { useState, useEffect } from "react";
import { Loader2, Play, Download, RefreshCw, Image as ImageIcon } from "lucide-react";
import { useProjectStore } from "@/lib/store";
import { OpenCodingTable, AxialCodingTable, SelectiveCodingTable } from "./CodingTable";
import { computeDiffs } from "@/lib/qualitative/audit/manifest";
import {
  openCodesToCsv,
  axialCodesToCsv,
  selectiveCodesToCsv,
  integratedLongCsv,
} from "@/lib/qualitative/csvExport";
import {
  validateOpenCodes,
  validateAxialCodes,
  type ValidationWarning,
} from "@/lib/qualitative/validation";
import JSZip from "jszip";
import type { OpenCode, AxialCode, AuditDiffEntry, FrozenSnapshot } from "@/lib/qualitative/types";

/** 按输出时间年月日时分秒命名：coding_package_YYYY-MM-DD_HHmmss.zip */
function formatExportZipFilename(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const h = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  const s = String(d.getSeconds()).padStart(2, "0");
  return `coding_package_${y}-${m}-${day}_${h}${min}${s}.zip`;
}

/** 写入项目 outputs/YYYY-MM-DD/（仅本地 dev 或 ALLOW_LOCAL_OUTPUTS=true） */
async function saveZipToProjectOutputs(blob: Blob, filename: string): Promise<void> {
  const fd = new FormData();
  fd.append("file", blob, filename);
  const res = await fetch("/api/export/save", { method: "POST", body: fd });
  if (!res.ok && res.status !== 403) {
    console.warn("写入 outputs 失败:", await res.text());
  }
}

function ActionButton({
  onClick,
  loading,
  disabled,
  children,
}: {
  onClick: () => void;
  loading: boolean;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 text-white font-medium text-sm hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
    >
      {loading && <Loader2 className="w-4 h-4 animate-spin" />}
      {children}
    </button>
  );
}

export function CodingWorkflow() {
  const store = useProjectStore();
  const segmentCount = useProjectStore((s) => s.segments.length);
  const stage = useProjectStore((s) => s.stage);
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [diagramImageUrl, setDiagramImageUrl] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<ValidationWarning[]>([]);
  const [batchProgress, setBatchProgress] = useState<{
    completed: number;
    total: number;
    codesCount: number;
  } | null>(null);

  /** 与「清空工作区」同步：重置后清掉仅存在组件内的状态（框架图、校验提示等） */
  useEffect(() => {
    if (stage === "idle" && segmentCount === 0) {
      setDiagramImageUrl(null);
      setWarnings([]);
      setError(null);
      setLoading(null);
      setBatchProgress(null);
    }
  }, [stage, segmentCount]);

  const runOpenCoding = async () => {
    setLoading("open");
    setError(null);
    setBatchProgress(null);
    try {
      store.setStage("open_pending");
      store.updatePlan({
        current_stage: "open_pending",
        next_action: "LLM 正在进行开放编码...",
        next_input_summary: `${store.segments.length} 个段落`,
        pending_steps: ["axial", "selective", "diagram"],
      });

      const res = await fetch("/api/coding/open/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ segments: store.segments }),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `HTTP ${res.status}`);
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error("No response stream");

      const decoder = new TextDecoder();
      let buffer = "";
      let finalData: { codes: OpenCode[]; manifest: unknown } | null = null;

      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const json = line.slice(6);
          try {
            const evt = JSON.parse(json) as Record<string, unknown>;
            if (evt.type === "progress") {
              setBatchProgress({
                completed: evt.completed as number,
                total: evt.total as number,
                codesCount: evt.codesCount as number,
              });
            } else if (evt.type === "done") {
              finalData = {
                codes: evt.codes as OpenCode[],
                manifest: evt.manifest,
              };
            } else if (evt.type === "error") {
              throw new Error(evt.message as string);
            }
          } catch (e) {
            if (e instanceof SyntaxError) continue;
            throw e;
          }
        }
      }

      if (!finalData) throw new Error("Stream ended without results");

      const oldCodes = store.openCodes;
      const newCodes = finalData.codes;
      const diffs = computeDiffs(oldCodes, newCodes, "open_code_id", "open_coding");

      store.setOpenCodes(newCodes);
      store.addManifest(finalData.manifest as Parameters<typeof store.addManifest>[0]);
      store.addDiffs(diffs);

      const openWarnings = validateOpenCodes(newCodes, store.segments);
      setWarnings(openWarnings);

      store.setStage("open_done");
      store.updatePlan({
        current_stage: "open_done",
        next_action: "确认开放编码后开始主轴编码",
        next_input_summary: `${newCodes.length} 个开放编码待分析${openWarnings.length > 0 ? `（${openWarnings.length} 个校验警告）` : ""}`,
        pending_steps: ["axial", "selective", "diagram"],
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "开放编码失败");
      store.setStage("parsed");
    } finally {
      setLoading(null);
      setBatchProgress(null);
    }
  };

  const runAxialCoding = async () => {
    setLoading("axial");
    setError(null);
    try {
      const frozenSnapshot: FrozenSnapshot = {
        step: "open_coding",
        locked_ids: store.openCodes.map((c) => c.open_code_id),
        excluded_segment_ids: [],
        reason: "开放编码确认锁定，进入主轴编码",
        timestamp: new Date().toISOString(),
      };
      store.addFrozenSnapshot(frozenSnapshot);
      store.setStage("axial_pending");
      store.updatePlan({
        current_stage: "axial_pending",
        next_action: "LLM 正在进行主轴编码...",
        next_input_summary: `${store.openCodes.length} 个开放编码 + ${store.segments.length} 个证据段落`,
        pending_steps: ["selective", "diagram"],
      });

      const res = await fetch("/api/coding/axial", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          openCodes: store.openCodes,
          segments: store.segments,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      const oldCodes = store.axialCodes;
      const newCodes: AxialCode[] = data.axial_codes;
      const diffs = computeDiffs(oldCodes, newCodes, "axial_id", "axial_coding");

      store.setAxialCodes(newCodes);
      store.addManifest(data.manifest);
      store.addDiffs(diffs);

      const axialWarnings = validateAxialCodes(newCodes, store.openCodes);
      setWarnings((prev) => [...prev, ...axialWarnings]);

      store.setStage("axial_done");
      store.updatePlan({
        current_stage: "axial_done",
        next_action: "确认主轴编码后开始选择性编码",
        next_input_summary: `${newCodes.length} 个主轴编码待整合${axialWarnings.length > 0 ? `（${axialWarnings.length} 个校验警告）` : ""}`,
        pending_steps: ["selective", "diagram"],
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "主轴编码失败");
      store.setStage("open_done");
    } finally {
      setLoading(null);
    }
  };

  const runSelectiveCoding = async () => {
    setLoading("selective");
    setError(null);
    try {
      const frozenSnapshot: FrozenSnapshot = {
        step: "axial_coding",
        locked_ids: store.axialCodes.map((c) => c.axial_id),
        excluded_segment_ids: [],
        reason: "主轴编码确认锁定，进入选择性编码",
        timestamp: new Date().toISOString(),
      };
      store.addFrozenSnapshot(frozenSnapshot);
      store.setStage("selective_pending");
      store.updatePlan({
        current_stage: "selective_pending",
        next_action: "LLM 正在进行选择性编码...",
        next_input_summary: `${store.axialCodes.length} 个主轴编码`,
        pending_steps: ["diagram"],
      });

      const res = await fetch("/api/coding/selective", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ axialCodes: store.axialCodes }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      store.setSelectiveCodes(data.selective_codes);
      store.addManifest(data.manifest);
      store.setStage("selective_done");
      store.updatePlan({
        current_stage: "selective_done",
        next_action: "生成理论框架图或导出结果",
        next_input_summary: `${data.selective_codes.length} 个核心范畴`,
        pending_steps: ["diagram"],
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "选择性编码失败");
      store.setStage("axial_done");
    } finally {
      setLoading(null);
    }
  };

  const generateDiagram = async () => {
    setLoading("diagram");
    setError(null);
    try {
      const res = await fetch("/api/diagram", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          axialCodes: store.axialCodes,
          selectiveCodes: store.selectiveCodes,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setDiagramImageUrl(data.imageDataUrl);
      store.setStage("diagram_ready");
      store.updatePlan({
        current_stage: "diagram_ready",
        next_action: "全部完成，可导出结果",
        next_input_summary: "",
        pending_steps: [],
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "生成框架图失败");
    } finally {
      setLoading(null);
    }
  };

  const downloadCsvZip = async () => {
    const zip = new JSZip();

    zip.file("open_coding.csv", "\uFEFF" + openCodesToCsv(store.openCodes));
    zip.file("axial_coding.csv", "\uFEFF" + axialCodesToCsv(store.axialCodes));
    zip.file("selective_coding.csv", "\uFEFF" + selectiveCodesToCsv(store.selectiveCodes));
    zip.file(
      "integrated_long.csv",
      "\uFEFF" + integratedLongCsv(store.openCodes, store.axialCodes, store.selectiveCodes),
    );

    zip.file(
      "metadata.json",
      JSON.stringify(
        {
          exported_at: new Date().toISOString(),
          run_manifests: store.auditManifests,
          diffs: store.auditDiffs,
          frozen_snapshots: store.frozenSnapshots,
          pipeline_plan: store.pipelinePlan,
        },
        null,
        2,
      ),
    );

    if (diagramImageUrl) {
      const base64 = diagramImageUrl.split(",")[1];
      if (base64) {
        const raw = atob(base64);
        const bytes = new Uint8Array(raw.length);
        for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
        zip.file("framework_diagram.png", bytes, { binary: true });
      }
    }

    const blob = await zip.generateAsync({ type: "blob" });
    const zipName = formatExportZipFilename();
    void saveZipToProjectOutputs(blob, zipName);
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = zipName;
    a.click();
    URL.revokeObjectURL(url);
  };

  /* ---- User edit / delete helpers ---- */

  const mkDiff = (
    type: AuditDiffEntry["type"],
    field: string,
    id: string,
    oldVal?: string,
    newVal?: string,
  ): AuditDiffEntry => ({
    type,
    field,
    id,
    old_value: oldVal,
    new_value: newVal,
    source: "user_edit",
    timestamp: new Date().toISOString(),
  });

  const handleOpenUpdate = (index: number, field: string, value: string) => {
    const codes = [...store.openCodes];
    const old = codes[index];
    const oldVal = (old as unknown as Record<string, unknown>)[field] as string;
    codes[index] = { ...old, [field]: value };
    store.setOpenCodes(codes);
    store.addDiffs([mkDiff("modified", field, old.open_code_id, oldVal, value)]);
  };

  const handleOpenDelete = (index: number) => {
    const codes = [...store.openCodes];
    const removed = codes.splice(index, 1)[0];
    store.setOpenCodes(codes);
    store.addDiffs([mkDiff("removed", "open_coding", removed.open_code_id, JSON.stringify(removed))]);
  };

  const handleAxialUpdate = (index: number, field: string, value: string) => {
    const codes = [...store.axialCodes];
    const old = codes[index];
    const oldVal = (old as unknown as Record<string, unknown>)[field] as string;
    codes[index] = { ...old, [field]: value };
    store.setAxialCodes(codes);
    store.addDiffs([mkDiff("modified", field, old.axial_id, oldVal, value)]);
  };

  const handleAxialDelete = (index: number) => {
    const codes = [...store.axialCodes];
    const removed = codes.splice(index, 1)[0];
    store.setAxialCodes(codes);
    store.addDiffs([mkDiff("removed", "axial_coding", removed.axial_id, JSON.stringify(removed))]);
  };

  const handleSelectiveUpdate = (index: number, field: string, value: string) => {
    const codes = [...store.selectiveCodes];
    const old = codes[index];
    const oldVal = (old as unknown as Record<string, unknown>)[field] as string;
    codes[index] = { ...old, [field]: value };
    store.setSelectiveCodes(codes);
    store.addDiffs([mkDiff("modified", field, old.selective_id, oldVal, value)]);
  };

  const handleSelectiveDelete = (index: number) => {
    const codes = [...store.selectiveCodes];
    const removed = codes.splice(index, 1)[0];
    store.setSelectiveCodes(codes);
    store.addDiffs([mkDiff("removed", "selective_coding", removed.selective_id, JSON.stringify(removed))]);
  };

  const stageIdx = [
    "idle",
    "parsed",
    "open_pending",
    "open_done",
    "axial_pending",
    "axial_done",
    "selective_pending",
    "selective_done",
    "diagram_ready",
  ].indexOf(store.stage);

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 text-sm text-red-700 dark:text-red-300">
          {error}
        </div>
      )}

      {batchProgress && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-blue-700 dark:text-blue-300 font-medium">
              正在编码：第 {batchProgress.completed}/{batchProgress.total} 批完成
            </span>
            <span className="text-blue-600 dark:text-blue-400">
              已产出 {batchProgress.codesCount} 个编码
            </span>
          </div>
          <div className="w-full bg-blue-200 dark:bg-blue-800 rounded-full h-2.5">
            <div
              className="bg-blue-600 dark:bg-blue-400 h-2.5 rounded-full transition-all duration-300"
              style={{
                width: `${Math.round((batchProgress.completed / batchProgress.total) * 100)}%`,
              }}
            />
          </div>
          <p className="text-xs text-blue-500 dark:text-blue-400">
            {Math.round((batchProgress.completed / batchProgress.total) * 100)}% — 并发处理中
          </p>
        </div>
      )}

      {warnings.length > 0 && (
        <details className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
          <summary className="text-sm font-medium text-amber-700 dark:text-amber-300 cursor-pointer">
            校验警告 ({warnings.length})
          </summary>
          <ul className="mt-2 space-y-1">
            {warnings.map((w, i) => (
              <li key={i} className="text-xs text-amber-600 dark:text-amber-400">
                [{w.type}] {w.id}: {w.message}
              </li>
            ))}
          </ul>
        </details>
      )}

      {/* Parsed segments preview */}
      {store.segments.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">
              已解析段落
              <span className="ml-2 text-sm font-normal text-zinc-500">
                ({store.segments.length} 段)
              </span>
            </h2>
            {stageIdx >= 1 && stageIdx < 3 && (
              <ActionButton onClick={runOpenCoding} loading={loading === "open"}>
                <Play className="w-4 h-4" />
                开始开放编码
              </ActionButton>
            )}
          </div>
          <div className="max-h-60 overflow-y-auto bg-zinc-50 dark:bg-zinc-800/50 rounded-lg p-3">
            {store.segments.slice(0, 20).map((s) => (
              <div key={s.segment_id} className="flex gap-2 py-1 text-xs border-b border-zinc-200 dark:border-zinc-700 last:border-0">
                <span className="font-mono text-zinc-400 w-32 shrink-0">{s.segment_id}</span>
                <span className="truncate">{s.verbatim}</span>
              </div>
            ))}
            {store.segments.length > 20 && (
              <p className="text-xs text-zinc-400 mt-2">
                ... 还有 {store.segments.length - 20} 段
              </p>
            )}
          </div>
        </section>
      )}

      {/* Open coding */}
      {store.openCodes.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">
              开放编码
              <span className="ml-2 text-sm font-normal text-zinc-500">
                ({store.openCodes.length} 个编码)
              </span>
            </h2>
            <div className="flex gap-2">
              {stageIdx >= 3 && stageIdx < 5 && (
                <ActionButton onClick={runAxialCoding} loading={loading === "axial"}>
                  <Play className="w-4 h-4" />
                  开始主轴编码
                </ActionButton>
              )}
              <ActionButton onClick={runOpenCoding} loading={loading === "open"} disabled={stageIdx > 3}>
                <RefreshCw className="w-4 h-4" />
                重跑
              </ActionButton>
            </div>
          </div>
          <OpenCodingTable codes={store.openCodes} onUpdate={handleOpenUpdate} onDelete={handleOpenDelete} />
        </section>
      )}

      {/* Axial coding */}
      {store.axialCodes.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">
              主轴编码
              <span className="ml-2 text-sm font-normal text-zinc-500">
                ({store.axialCodes.length} 个编码)
              </span>
            </h2>
            <div className="flex gap-2">
              {stageIdx >= 5 && stageIdx < 7 && (
                <ActionButton onClick={runSelectiveCoding} loading={loading === "selective"}>
                  <Play className="w-4 h-4" />
                  开始选择性编码
                </ActionButton>
              )}
            </div>
          </div>
          <AxialCodingTable codes={store.axialCodes} onUpdate={handleAxialUpdate} onDelete={handleAxialDelete} />
        </section>
      )}

      {/* Selective coding */}
      {store.selectiveCodes.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">选择性编码</h2>
            <div className="flex gap-2">
              {store.stage === "selective_done" && (
                <ActionButton onClick={generateDiagram} loading={loading === "diagram"}>
                  <ImageIcon className="w-4 h-4" />
                  生成框架图
                </ActionButton>
              )}
            </div>
          </div>
          <SelectiveCodingTable codes={store.selectiveCodes} onUpdate={handleSelectiveUpdate} onDelete={handleSelectiveDelete} />
        </section>
      )}

      {/* Framework diagram */}
      {diagramImageUrl && (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">理论框架图</h2>
          <div className="bg-zinc-50 dark:bg-zinc-800/50 rounded-lg p-4 flex flex-col items-center">
            <img
              src={diagramImageUrl}
              alt="理论框架图"
              className="max-w-full rounded-lg shadow-md"
            />
            <button
              onClick={() => {
                const a = document.createElement("a");
                a.href = diagramImageUrl;
                a.download = "framework_diagram.png";
                a.click();
              }}
              className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 rounded bg-zinc-200 dark:bg-zinc-700 text-sm hover:opacity-80 transition-opacity"
            >
              <Download className="w-4 h-4" />
              下载框架图
            </button>
          </div>
        </section>
      )}

      {/* Export */}
      {store.openCodes.length > 0 && (
        <div className="flex justify-end pt-4 border-t border-zinc-200 dark:border-zinc-700">
          <button
            onClick={downloadCsvZip}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-zinc-800 text-white dark:bg-zinc-200 dark:text-zinc-900 font-medium text-sm hover:opacity-90 transition-opacity"
          >
            <Download className="w-4 h-4" />
            下载编码包 (CSV + 审计数据)
          </button>
        </div>
      )}
    </div>
  );
}
