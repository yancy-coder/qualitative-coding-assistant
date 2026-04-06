"use client";

import { useState, useCallback } from "react";
import { Upload, FileText, Loader2 } from "lucide-react";
import { useProjectStore } from "@/lib/store";

export function FileUpload() {
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fileNames, setFileNames] = useState<string[]>([]);
  const setSegments = useProjectStore((s) => s.setSegments);

  const handleFiles = useCallback(
    async (files: FileList | File[]) => {
      const docxFiles = Array.from(files).filter(
        (f) =>
          f.name.endsWith(".docx") ||
          f.type ===
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      );
      if (docxFiles.length === 0) {
        setError("请上传 .docx 格式的文件");
        return;
      }

      setLoading(true);
      setError(null);
      setFileNames(docxFiles.map((f) => f.name));

      const formData = new FormData();
      docxFiles.forEach((f) => formData.append("files", f));

      try {
        const res = await fetch("/api/parse", { method: "POST", body: formData });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "解析失败");
        setSegments(data.segments);
      } catch (e) {
        setError(e instanceof Error ? e.message : "解析失败");
      } finally {
        setLoading(false);
      }
    },
    [setSegments],
  );

  return (
    <div className="space-y-4">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          handleFiles(e.dataTransfer.files);
        }}
        className={`border-2 border-dashed rounded-xl p-12 text-center transition-colors cursor-pointer ${
          dragging
            ? "border-emerald-400 bg-emerald-50 dark:bg-emerald-900/20"
            : "border-zinc-300 dark:border-zinc-600 hover:border-emerald-300"
        }`}
        onClick={() => {
          const input = document.createElement("input");
          input.type = "file";
          input.accept = ".docx";
          input.multiple = true;
          input.onchange = () => input.files && handleFiles(input.files);
          input.click();
        }}
      >
        {loading ? (
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="w-10 h-10 text-emerald-500 animate-spin" />
            <p className="text-zinc-600 dark:text-zinc-300">
              正在解析 {fileNames.join(", ")}...
            </p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3">
            <Upload className="w-10 h-10 text-zinc-400" />
            <p className="text-zinc-600 dark:text-zinc-300">
              拖放 .docx 访谈稿到此处，或点击上传
            </p>
            <p className="text-xs text-zinc-400">支持同时上传多个文件</p>
          </div>
        )}
      </div>

      {fileNames.length > 0 && !loading && (
        <div className="flex flex-wrap gap-2">
          {fileNames.map((n) => (
            <span
              key={n}
              className="inline-flex items-center gap-1 px-3 py-1 bg-zinc-100 dark:bg-zinc-800 rounded-full text-sm"
            >
              <FileText className="w-3.5 h-3.5" />
              {n}
            </span>
          ))}
        </div>
      )}

      {error && (
        <p className="text-sm text-red-500 bg-red-50 dark:bg-red-900/20 p-3 rounded-lg">
          {error}
        </p>
      )}
    </div>
  );
}
