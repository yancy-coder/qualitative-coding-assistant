"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight, Eye, GitCompare, Lock, ListTodo } from "lucide-react";
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
          <details className="mt-1">
            <summary className="cursor-pointer text-emerald-600 dark:text-emerald-400 hover:underline">
              查看完整提示词
            </summary>
            <div className="mt-2 space-y-2">
              <div>
                <p className="font-medium mb-1">系统提示</p>
                <pre className="bg-zinc-100 dark:bg-zinc-900 p-2 rounded text-xs whitespace-pre-wrap max-h-40 overflow-y-auto">
                  {m.system_prompt}
                </pre>
              </div>
              <div>
                <p className="font-medium mb-1">用户提示</p>
                <pre className="bg-zinc-100 dark:bg-zinc-900 p-2 rounded text-xs whitespace-pre-wrap max-h-40 overflow-y-auto">
                  {m.user_prompt}
                </pre>
              </div>
            </div>
          </details>
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
