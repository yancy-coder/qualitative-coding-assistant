"use client";

import type { OpenCode, AxialCode, SelectiveCode } from "@/lib/qualitative/types";

const PARADIGM_LABELS: Record<string, string> = {
  causal_cond: "因果条件",
  phenomenon: "现象",
  context: "脉络/情境",
  intervening: "中介条件",
  strategy: "行动策略",
  consequence: "结果",
  other: "其他",
};

export function OpenCodingTable({ codes }: { codes: OpenCode[] }) {
  if (codes.length === 0) return null;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="bg-zinc-100 dark:bg-zinc-800">
            <th className="p-2 text-left w-12">序号</th>
            <th className="p-2 text-left">编码ID</th>
            <th className="p-2 text-left">概念标签</th>
            <th className="p-2 text-left">概念定义</th>
            <th className="p-2 text-left max-w-xs">原文引用</th>
            <th className="p-2 text-left">来源文件</th>
          </tr>
        </thead>
        <tbody>
          {codes.map((c, i) => (
            <tr
              key={c.open_code_id}
              className="border-b border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
            >
              <td className="p-2 text-zinc-500">{i + 1}</td>
              <td className="p-2 font-mono text-xs">{c.open_code_id}</td>
              <td className="p-2 font-medium">{c.code_label}</td>
              <td className="p-2 text-zinc-600 dark:text-zinc-400">
                {c.concept_definition}
              </td>
              <td className="p-2 max-w-xs">
                <span className="text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 px-1.5 py-0.5 rounded text-xs leading-relaxed">
                  &ldquo;{c.verbatim_quote}&rdquo;
                </span>
              </td>
              <td className="p-2 text-zinc-500 text-xs">{c.source_file}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function AxialCodingTable({ codes }: { codes: AxialCode[] }) {
  if (codes.length === 0) return null;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="bg-zinc-100 dark:bg-zinc-800">
            <th className="p-2 text-left w-12">序号</th>
            <th className="p-2 text-left">编码ID</th>
            <th className="p-2 text-left">范畴</th>
            <th className="p-2 text-left">范式维度</th>
            <th className="p-2 text-left">关系描述</th>
            <th className="p-2 text-left">来源编码</th>
            <th className="p-2 text-left">来源文件</th>
          </tr>
        </thead>
        <tbody>
          {codes.map((c, i) => (
            <tr
              key={c.axial_id}
              className="border-b border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
            >
              <td className="p-2 text-zinc-500">{i + 1}</td>
              <td className="p-2 font-mono text-xs">{c.axial_id}</td>
              <td className="p-2 font-medium">{c.category}</td>
              <td className="p-2">
                <span className="px-2 py-0.5 rounded-full text-xs bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                  {PARADIGM_LABELS[c.paradigm_slot] || c.paradigm_slot}
                </span>
              </td>
              <td className="p-2 text-zinc-600 dark:text-zinc-400">
                {c.relationship_description}
              </td>
              <td className="p-2 font-mono text-xs">
                {c.from_open_code_ids.join(", ")}
              </td>
              <td className="p-2 text-zinc-500 text-xs">{c.source_file}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function SelectiveCodingTable({ codes }: { codes: SelectiveCode[] }) {
  if (codes.length === 0) return null;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="bg-zinc-100 dark:bg-zinc-800">
            <th className="p-2 text-left w-12">序号</th>
            <th className="p-2 text-left">编码ID</th>
            <th className="p-2 text-left">核心范畴</th>
            <th className="p-2 text-left">中心现象</th>
            <th className="p-2 text-left max-w-md">故事线</th>
            <th className="p-2 text-left">关联主轴编码</th>
          </tr>
        </thead>
        <tbody>
          {codes.map((c, i) => (
            <tr
              key={c.selective_id}
              className="border-b border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
            >
              <td className="p-2 text-zinc-500">{i + 1}</td>
              <td className="p-2 font-mono text-xs">{c.selective_id}</td>
              <td className="p-2 font-medium">{c.core_category}</td>
              <td className="p-2">{c.central_phenomenon}</td>
              <td className="p-2 max-w-md text-zinc-600 dark:text-zinc-400 text-xs leading-relaxed">
                {c.storyline}
              </td>
              <td className="p-2 font-mono text-xs">
                {c.links_to_axial_ids.join(", ")}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
