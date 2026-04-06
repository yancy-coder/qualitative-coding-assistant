import { NextResponse } from "next/server";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import {
  allowLocalFileOutputs,
  getDatedOutputDir,
  getOutputTimestampPrefix,
} from "@/lib/server/localOutputs";

export const maxDuration = 60;

/**
 * 将导出内容写入项目 outputs/YYYY-MM-DD/，文件名带输出时间戳。
 * - multipart：字段名 `file`，保存为 zip（编码包）
 * - application/json：{ filename, content }，保存为文本（如 mermaid）
 * 仅在 development 或 ALLOW_LOCAL_OUTPUTS=true 时启用。
 */
export async function POST(req: Request) {
  if (!allowLocalFileOutputs()) {
    return NextResponse.json(
      { error: "Local file output disabled" },
      { status: 403 },
    );
  }

  const ct = req.headers.get("content-type") || "";

  if (ct.includes("multipart/form-data")) {
    const form = await req.formData();
    const file = form.get("file");
    if (!file || typeof file === "string") {
      return NextResponse.json({ error: "Missing file field" }, { status: 400 });
    }
    const buf = Buffer.from(await file.arrayBuffer());
    const dir = getDatedOutputDir();
    await mkdir(dir, { recursive: true });
    const name = `${getOutputTimestampPrefix()}_coding_package.zip`;
    const fullPath = path.join(dir, name);
    await writeFile(fullPath, buf);
    const rel = path.relative(process.cwd(), fullPath);
    return NextResponse.json({ ok: true, path: rel });
  }

  if (ct.includes("application/json")) {
    const body = (await req.json()) as { filename?: string; content?: string };
    if (!body.filename || body.content === undefined) {
      return NextResponse.json(
        { error: "Missing filename or content" },
        { status: 400 },
      );
    }
    const safe = path.basename(body.filename);
    const dir = getDatedOutputDir();
    await mkdir(dir, { recursive: true });
    const name = `${getOutputTimestampPrefix()}_${safe}`;
    const fullPath = path.join(dir, name);
    await writeFile(fullPath, body.content, "utf8");
    const rel = path.relative(process.cwd(), fullPath);
    return NextResponse.json({ ok: true, path: rel });
  }

  return NextResponse.json(
    { error: "Use multipart/form-data or application/json" },
    { status: 415 },
  );
}
