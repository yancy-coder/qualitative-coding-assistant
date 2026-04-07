"use client";

import { useState, useEffect, useCallback } from "react";
import {
  ChevronDown,
  ChevronRight,
  Eye,
  GitCompare,
  Lock,
  ListTodo,
  Maximize2,
  X,
} from "lucide-react";
import { useProjectStore } from "@/lib/store";
import type { AuditManifest, AuditDiffEntry, FrozenSnapshot } from "@/lib/qualitative/types";

function Section({
  title,
  icon,
  children,
  defaultOpen = false,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-zinc-200 dark:border-zinc-700 rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2 p-3 text-sm font-medium hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors"
      >
        {open ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        {icon}
        {title}
      </button>
      {open && <div className="p-3 pt-0 border-t border-zinc-200 dark:border-zinc-700">{children}</div>}
    </div>
  );
}

function PromptFullscreenModal({
  open,
  onClose,
  manifest,
}: {
  open: boolean;
  onClose: () => void;
  manifest: AuditManifest;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-stretch justify-center p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="prompt-modal-title"
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/60 backdrop-blur-[1px]"
        aria-label="关闭"
        onClick={onClose}
      />
      <div className="relative z-[101] flex h-full max-h-[100dvh] w-full max-w-6xl flex-col bg-white shadow-2xl dark:bg-zinc-950 dark:ring-1 dark:ring-zinc-800 sm:h-auto sm:max-h-[min(92vh,calc(100dvh-2rem))] sm:rounded-xl sm:my-auto">
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
          <div>
            <h2 id="prompt-modal-title" className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              完整提示词 — {manifest.step}
            </h2>
            <p className="mt-0.5 text-xs text-zinc-500">
              {manifest.model} · {manifest.timestamp}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
            aria-label="关闭"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-hidden flex flex-col gap-0 sm:flex-row sm:gap-px sm:bg-zinc-200 dark:sm:bg-zinc-800">
          <section className="flex min-h-0 flex-1 flex-col border-b border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900/40 sm:border-b-0">
            <h3 className="shrink-0 border-b border-zinc-200 bg-white px-4 py-2 text-xs font-medium text-zinc-700 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300">
              系统提示
            </h3>
            <pre className="min-h-[40vh] flex-1 overflow-auto whitespace-pre-wrap p-4 text-xs leading-relaxed text-zinc-800 dark:text-zinc-200 sm:min-h-0">
              {manifest.system_prompt}
            </pre>
          </section>
          <section className="flex min-h-0 flex-1 flex-col bg-zinc-50 dark:bg-zinc-900/40">
            <h3 className="shrink-0 border-b border-zinc-200 bg-white px-4 py-2 text-xs font-medium text-zinc-700 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300">
              用户提示
            </h3>
            <pre className="min-h-[40vh] flex-1 overflow-auto whitespace-pre-wrap p-4 text-xs leading-relaxed text-zinc-800 dark:text-zinc-200 sm:min-h-0">
              {manifest.user_prompt}
            </pre>
          </section>
        </div>
      </div>
    </div>
  );
}

function ManifestPromptDisclosure({ manifest }: { manifest: AuditManifest }) {
  const [expanded, setExpanded] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const closeFullscreen = useCallback(() => setFullscreen(false), []);

  return (
    <div className="mt-2 border-t border-zinc-200 pt-2 dark:border-zinc-700">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center gap-2 rounded-md px-1 py-1.5 text-left text-sm text-emerald-700 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-950/40"
      >
        {expanded ? (
          <ChevronDown className="h-4 w-4 shrink-0" aria-hidden />
        ) : (
          <ChevronRight className="h-4 w-4 shrink-0" aria-hidden />
        )}
        <span className="font-medium">查看完整提示词</span>
        <span className="text-xs font-normal text-zinc-500 dark:text-zinc-400">
          （系统提示 + 用户提示）
        </span>
      </button>
      {expanded && (
        <div className="mt-2 space-y-2 pl-1">
          <p className="text-[11px] leading-snug text-zinc-500 dark:text-zinc-400">
            侧边栏空间有限，请使用全屏查看长提示词；也可在此快速预览前几行。
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            <div>
              <p className="mb-1 text-[11px] font-medium text-zinc-600 dark:text-zinc-400">系统提示（预览）</p>
              <pre className="max-h-28 overflow-y-auto rounded-md bg-zinc-100 p-2 text-[11px] leading-relaxed whitespace-pre-wrap text-zinc-800 dark:bg-zinc-900 dark:text-zinc-300">
                {manifest.system_prompt.slice(0, 800)}
                {manifest.system_prompt.length > 800 ? "…" : ""}
              </pre>
            </div>
            <div>
              <p className="mb-1 text-[11px] font-medium text-zinc-600 dark:text-zinc-400">用户提示（预览）</p>
              <pre className="max-h-28 overflow-y-auto rounded-md bg-zinc-100 p-2 text-[11px] leading-relaxed whitespace-pre-wrap text-zinc-800 dark:bg-zinc-900 dark:text-zinc-300">
                {manifest.user_prompt.slice(0, 800)}
                {manifest.user_prompt.length > 800 ? "…" : ""}
              </pre>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setFullscreen(true)}
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm font-medium text-emerald-800 hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-200 dark:hover:bg-emerald-900/40"
          >
            <Maximize2 className="h-4 w-4 shrink-0" aria-hidden />
            全屏查看完整提示词
          </button>
        </div>
      )}
      <PromptFullscreenModal
        open={fullscreen}
        onClose={closeFullscreen}
        manifest={manifest}
      />
    </div>
  );
}

function ManifestView({ manifests }: { manifests: AuditManifest[] }) {
  if (manifests.length === 0)
    return <p className="text-sm text-zinc-400 py-2">暂无运行记录</p>;

  return (
    <div className="space-y-3 mt-2">
      {manifests.map((m, i) => (
        <div
          key={i}
          className="bg-zinc-50 dark:bg-zinc-800/50 rounded-lg p-3 text-xs space-y-1"
        >
          <div className="flex justify-between">
            <span className="font-medium">{m.step}</span>
            <span className="text-zinc-400">{m.timestamp}</span>
          </div>
          <div>
            模型: <span className="font-mono">{m.model}</span> | 提示词版本:{" "}
            <span className="font-mono">{m.prompt_version}</span>
          </div>
          <div>
            输入段落: {m.segments_sent.length} 个
            {m.temperature !== undefined && ` | temperature: ${m.temperature}`}
            {m.max_output_tokens !== undefined && ` | max_output_tokens: ${m.max_output_tokens}`}
          </div>
          <ManifestPromptDisclosure manifest={m} />
        </div>
      ))}
    </div>
  );
}

function DiffView({ diffs }: { diffs: AuditDiffEntry[] }) {
  if (diffs.length === 0)
    return <p className="text-sm text-zinc-400 py-2">暂无变更记录</p>;

  return (
    <div className="space-y-2 mt-2">
      {diffs.map((d, i) => (
        <div
          key={i}
          className={`rounded-lg p-2 text-xs ${
            d.type === "added"
              ? "bg-green-50 dark:bg-green-900/20 border-l-2 border-green-500"
              : d.type === "removed"
                ? "bg-red-50 dark:bg-red-900/20 border-l-2 border-red-500"
                : "bg-yellow-50 dark:bg-yellow-900/20 border-l-2 border-yellow-500"
          }`}
        >
          <div className="flex justify-between">
            <span className="font-medium">
              {d.type === "added" ? "新增" : d.type === "removed" ? "移除" : "修改"}{" "}
              [{d.id}] {d.field}
            </span>
            <span className="text-zinc-400">
              {d.source === "llm" ? "LLM" : "用户编辑"} | {d.timestamp}
            </span>
          </div>
          {d.old_value && (
            <div className="mt-1">
              <span className="text-red-600">- </span>
              <span className="opacity-70">{d.old_value.slice(0, 200)}</span>
            </div>
          )}
          {d.new_value && (
            <div>
              <span className="text-green-600">+ </span>
              <span className="opacity-70">{d.new_value.slice(0, 200)}</span>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function FrozenView({ snapshots }: { snapshots: FrozenSnapshot[] }) {
  if (snapshots.length === 0)
    return <p className="text-sm text-zinc-400 py-2">暂无冻结记录</p>;

  return (
    <div className="space-y-2 mt-2">
      {snapshots.map((f, i) => (
        <div
          key={i}
          className="bg-zinc-50 dark:bg-zinc-800/50 rounded-lg p-2 text-xs"
        >
          <div className="flex justify-between">
            <span className="font-medium">{f.step} - 已锁定</span>
            <span className="text-zinc-400">{f.timestamp}</span>
          </div>
          <div>锁定 ID: {f.locked_ids.length} 个</div>
          {f.excluded_segment_ids.length > 0 && (
            <div>排除段落: {f.excluded_segment_ids.length} 个</div>
          )}
          {f.reason && <div className="text-zinc-500 mt-1">{f.reason}</div>}
        </div>
      ))}
    </div>
  );
}

export function AuditPanel() {
  const manifests = useProjectStore((s) => s.auditManifests);
  const diffs = useProjectStore((s) => s.auditDiffs);
  const frozen = useProjectStore((s) => s.frozenSnapshots);
  const plan = useProjectStore((s) => s.pipelinePlan);

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider">
        审计轨迹
      </h3>

      <Section
        title="读了什么"
        icon={<Eye className="w-4 h-4 text-blue-500" />}
        defaultOpen
      >
        <ManifestView manifests={manifests} />
      </Section>

      <Section
        title="改了什么"
        icon={<GitCompare className="w-4 h-4 text-yellow-500" />}
      >
        <DiffView diffs={diffs} />
      </Section>

      <Section
        title="保留了什么"
        icon={<Lock className="w-4 h-4 text-purple-500" />}
      >
        <FrozenView snapshots={frozen} />
      </Section>

      <Section
        title="下一步做什么"
        icon={<ListTodo className="w-4 h-4 text-emerald-500" />}
        defaultOpen
      >
        <div className="mt-2 text-xs space-y-2">
          <div className="flex items-center gap-2">
            <span className="font-medium">当前阶段:</span>
            <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200">
              {plan.current_stage}
            </span>
          </div>
          <div>
            <span className="font-medium">下一动作:</span> {plan.next_action}
          </div>
          {plan.next_input_summary && (
            <div>
              <span className="font-medium">输入摘要:</span>{" "}
              {plan.next_input_summary}
            </div>
          )}
          {plan.pending_steps.length > 0 && (
            <div>
              <span className="font-medium">待执行:</span>{" "}
              {plan.pending_steps.join(" → ")}
            </div>
          )}
        </div>
      </Section>
    </div>
  );
}
