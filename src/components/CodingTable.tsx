"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Trash2 } from "lucide-react";
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

const PARADIGM_OPTIONS = Object.entries(PARADIGM_LABELS);

/* ------------------------------------------------------------------ */
/*  EditableCell                                                       */
/* ------------------------------------------------------------------ */

function EditableCell({
  value,
  onCommit,
}: {
  value: string;
  onCommit: (v: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [edited, setEdited] = useState(false);
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (editing && ref.current) {
      ref.current.focus();
      ref.current.select();
    }
  }, [editing]);

  const commit = useCallback(() => {
    const trimmed = draft.trim();
    if (trimmed && trimmed !== value) {
      onCommit(trimmed);
      setEdited(true);
    } else {
      setDraft(value);
    }
    setEditing(false);
  }, [draft, value, onCommit]);

  const cancel = useCallback(() => {
    setDraft(value);
    setEditing(false);
  }, [value]);

  if (!editing) {
    return (
      <div
        onClick={() => {
          setDraft(value);
          setEditing(true);
        }}
        className={`cursor-pointer rounded px-1 -mx-1 hover:bg-zinc-100 dark:hover:bg-zinc-700/50 transition-colors ${
          edited ? "border-l-2 border-amber-400 pl-1.5" : ""
        }`}
        title={edited ? "已人工修改" : "点击编辑"}
      >
        {value}
      </div>
    );
  }

  const useTextarea = value.length > 40;

  return useTextarea ? (
    <textarea
      ref={ref}
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Escape") cancel();
        if (e.key === "Enter" && !e.shiftKey) {
          e.preventDefault();
          commit();
        }
      }}
      rows={3}
      className="w-full px-1.5 py-1 text-sm border border-blue-400 rounded bg-white dark:bg-zinc-900 outline-none resize-y"
    />
  ) : (
    <input
      ref={ref as unknown as React.Ref<HTMLInputElement>}
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Escape") cancel();
        if (e.key === "Enter") {
          e.preventDefault();
          commit();
        }
      }}
      className="w-full px-1.5 py-1 text-sm border border-blue-400 rounded bg-white dark:bg-zinc-900 outline-none"
    />
  );
}

/* ------------------------------------------------------------------ */
/*  ParadigmSelect                                                     */
/* ------------------------------------------------------------------ */

function ParadigmSelect({
  value,
  onCommit,
}: {
  value: string;
  onCommit: (v: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [edited, setEdited] = useState(false);

  if (!editing) {
    return (
      <span
        onClick={() => setEditing(true)}
        className={`cursor-pointer px-2 py-0.5 rounded-full text-xs bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 hover:ring-2 hover:ring-blue-300 transition ${
          edited ? "ring-2 ring-amber-400" : ""
        }`}
        title={edited ? "已人工修改" : "点击编辑"}
      >
        {PARADIGM_LABELS[value] || value}
      </span>
    );
  }

  return (
    <select
      autoFocus
      value={value}
      onChange={(e) => {
        if (e.target.value !== value) {
          onCommit(e.target.value);
          setEdited(true);
        }
        setEditing(false);
      }}
      onBlur={() => setEditing(false)}
      className="text-xs border border-blue-400 rounded bg-white dark:bg-zinc-900 outline-none px-1 py-0.5"
    >
      {PARADIGM_OPTIONS.map(([k, label]) => (
        <option key={k} value={k}>
          {label}
        </option>
      ))}
    </select>
  );
}

/* ------------------------------------------------------------------ */
/*  DeleteButton                                                       */
/* ------------------------------------------------------------------ */

function DeleteButton({ onDelete }: { onDelete: () => void }) {
  return (
    <button
      onClick={() => {
        if (window.confirm("确认删除这条编码？此操作不可撤销。")) {
          onDelete();
        }
      }}
      className="p-1 rounded text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors"
      title="删除此编码"
    >
      <Trash2 className="w-4 h-4" />
    </button>
  );
}

/* ------------------------------------------------------------------ */
/*  OpenCodingTable                                                    */
/* ------------------------------------------------------------------ */

export function OpenCodingTable({
  codes,
  onUpdate,
  onDelete,
}: {
  codes: OpenCode[];
  onUpdate?: (index: number, field: string, value: string) => void;
  onDelete?: (index: number) => void;
}) {
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
            {onDelete && <th className="p-2 text-left w-14">操作</th>}
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
              <td className="p-2 font-medium">
                {onUpdate ? (
                  <EditableCell
                    value={c.code_label}
                    onCommit={(v) => onUpdate(i, "code_label", v)}
                  />
                ) : (
                  c.code_label
                )}
              </td>
              <td className="p-2 text-zinc-600 dark:text-zinc-400">
                {onUpdate ? (
                  <EditableCell
                    value={c.concept_definition}
                    onCommit={(v) => onUpdate(i, "concept_definition", v)}
                  />
                ) : (
                  c.concept_definition
                )}
              </td>
              <td className="p-2 max-w-xs">
                {onUpdate ? (
                  <EditableCell
                    value={c.verbatim_quote}
                    onCommit={(v) => onUpdate(i, "verbatim_quote", v)}
                  />
                ) : (
                  <span className="text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 px-1.5 py-0.5 rounded text-xs leading-relaxed">
                    &ldquo;{c.verbatim_quote}&rdquo;
                  </span>
                )}
              </td>
              <td className="p-2 text-zinc-500 text-xs">{c.source_file}</td>
              {onDelete && (
                <td className="p-2">
                  <DeleteButton onDelete={() => onDelete(i)} />
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  AxialCodingTable                                                   */
/* ------------------------------------------------------------------ */

export function AxialCodingTable({
  codes,
  onUpdate,
  onDelete,
}: {
  codes: AxialCode[];
  onUpdate?: (index: number, field: string, value: string) => void;
  onDelete?: (index: number) => void;
}) {
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
            {onDelete && <th className="p-2 text-left w-14">操作</th>}
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
              <td className="p-2 font-medium">
                {onUpdate ? (
                  <EditableCell
                    value={c.category}
                    onCommit={(v) => onUpdate(i, "category", v)}
                  />
                ) : (
                  c.category
                )}
              </td>
              <td className="p-2">
                {onUpdate ? (
                  <ParadigmSelect
                    value={c.paradigm_slot}
                    onCommit={(v) => onUpdate(i, "paradigm_slot", v)}
                  />
                ) : (
                  <span className="px-2 py-0.5 rounded-full text-xs bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                    {PARADIGM_LABELS[c.paradigm_slot] || c.paradigm_slot}
                  </span>
                )}
              </td>
              <td className="p-2 text-zinc-600 dark:text-zinc-400">
                {onUpdate ? (
                  <EditableCell
                    value={c.relationship_description}
                    onCommit={(v) => onUpdate(i, "relationship_description", v)}
                  />
                ) : (
                  c.relationship_description
                )}
              </td>
              <td className="p-2 font-mono text-xs">
                {c.from_open_code_ids.join(", ")}
              </td>
              <td className="p-2 text-zinc-500 text-xs">{c.source_file}</td>
              {onDelete && (
                <td className="p-2">
                  <DeleteButton onDelete={() => onDelete(i)} />
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  SelectiveCodingTable                                               */
/* ------------------------------------------------------------------ */

export function SelectiveCodingTable({
  codes,
  onUpdate,
  onDelete,
}: {
  codes: SelectiveCode[];
  onUpdate?: (index: number, field: string, value: string) => void;
  onDelete?: (index: number) => void;
}) {
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
            {onDelete && <th className="p-2 text-left w-14">操作</th>}
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
              <td className="p-2 font-medium">
                {onUpdate ? (
                  <EditableCell
                    value={c.core_category}
                    onCommit={(v) => onUpdate(i, "core_category", v)}
                  />
                ) : (
                  c.core_category
                )}
              </td>
              <td className="p-2">
                {onUpdate ? (
                  <EditableCell
                    value={c.central_phenomenon}
                    onCommit={(v) => onUpdate(i, "central_phenomenon", v)}
                  />
                ) : (
                  c.central_phenomenon
                )}
              </td>
              <td className="p-2 max-w-md text-zinc-600 dark:text-zinc-400 text-xs leading-relaxed">
                {onUpdate ? (
                  <EditableCell
                    value={c.storyline}
                    onCommit={(v) => onUpdate(i, "storyline", v)}
                  />
                ) : (
                  c.storyline
                )}
              </td>
              <td className="p-2 font-mono text-xs">
                {c.links_to_axial_ids.join(", ")}
              </td>
              {onDelete && (
                <td className="p-2">
                  <DeleteButton onDelete={() => onDelete(i)} />
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
