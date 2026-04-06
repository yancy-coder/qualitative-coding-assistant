/**
 * 对运行中的 Next 开发/生产服务做端到端 API 烟测（需 .env 中已配置密钥）。
 * 用法：先 `npm run dev`，再 `node scripts/e2e-smoke.mjs`
 * 结果写入 outputs/YYYY-MM-DD/e2e-smoke.json（每次运行覆盖同文件）
 */
import {
  readFileSync,
  existsSync,
  mkdirSync,
  writeFileSync,
  readdirSync,
  unlinkSync,
} from "fs";
import { Blob } from "buffer";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

const base = (process.env.TEST_BASE_URL || "http://localhost:3000").replace(
  /\/$/,
  "",
);

function resolveDocxPath() {
  const candidates = [
    path.join(root, "test.docx"),
    path.join(root, "test .docx"),
    path.join(root, "inputs", "test.docx"),
  ];
  for (const p of candidates) {
    if (existsSync(p)) return p;
  }
  throw new Error(
    "未找到测试文档。请在项目根目录放置 test.docx（或 test .docx、inputs/test.docx）。",
  );
}

function getDatedOutputDir(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return path.join(root, "outputs", `${y}-${m}-${day}`);
}

function writeReport(payload) {
  const dir = getDatedOutputDir();
  mkdirSync(dir, { recursive: true });
  try {
    for (const f of readdirSync(dir)) {
      if (f.startsWith("e2e-smoke_") && f.endsWith(".json")) {
        unlinkSync(path.join(dir, f));
      }
    }
  } catch {
    /* ignore */
  }
  const full = path.join(dir, "e2e-smoke.json");
  writeFileSync(full, JSON.stringify(payload, null, 2), "utf8");
  console.log("\n报告已写入（覆盖）:", path.relative(root, full));
}

async function main() {
  const docxPath = resolveDocxPath();
  console.log("使用文档:", path.relative(root, docxPath));

  const docx = readFileSync(docxPath);
  const form = new FormData();
  form.append("files", new Blob([docx]), path.basename(docxPath));

  const report = {
    docx: path.relative(root, docxPath),
    started_at: new Date().toISOString(),
    base_url: base,
    steps: [],
    ok: false,
    error: null,
  };

  try {
    console.log("→ POST /api/parse");
    const r1 = await fetch(`${base}/api/parse`, { method: "POST", body: form });
    const parseData = await r1.json();
    report.steps.push({ name: "parse", status: r1.ok, body: parseData });
    if (!r1.ok) throw new Error(`parse: ${parseData.error || r1.status}`);
    console.log("  segments:", parseData.segments?.length ?? 0);

    console.log("→ POST /api/coding/open");
    const r2 = await fetch(`${base}/api/coding/open`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ segments: parseData.segments }),
    });
    const openData = await r2.json();
    report.steps.push({ name: "open", status: r2.ok, body: openData });
    if (!r2.ok) {
      throw new Error(
        `open: HTTP ${r2.status} — ${openData.error ?? JSON.stringify(openData)}`,
      );
    }
    console.log("  open codes:", openData.codes?.length ?? 0);

    console.log("→ POST /api/coding/axial");
    const r3 = await fetch(`${base}/api/coding/axial`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        openCodes: openData.codes,
        segments: parseData.segments,
      }),
    });
    const axialData = await r3.json();
    report.steps.push({ name: "axial", status: r3.ok, body: axialData });
    if (!r3.ok) {
      throw new Error(
        `axial: HTTP ${r3.status} — ${axialData.error ?? JSON.stringify(axialData)}`,
      );
    }
    console.log("  axial codes:", axialData.axial_codes?.length ?? 0);

    console.log("→ POST /api/coding/selective");
    const r4 = await fetch(`${base}/api/coding/selective`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ axialCodes: axialData.axial_codes }),
    });
    const selData = await r4.json();
    report.steps.push({ name: "selective", status: r4.ok, body: selData });
    if (!r4.ok) {
      throw new Error(
        `selective: HTTP ${r4.status} — ${selData.error ?? JSON.stringify(selData)}`,
      );
    }
    console.log("  selective codes:", selData.selective_codes?.length ?? 0);

    console.log("→ POST /api/diagram");
    const r5 = await fetch(`${base}/api/diagram`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        axialCodes: axialData.axial_codes,
        selectiveCodes: selData.selective_codes,
      }),
    });
    const diagData = await r5.json();
    const diagSummary = diagData.imageDataUrl
      ? { imageDataUrl: diagData.imageDataUrl.slice(0, 80) + "..." }
      : diagData;
    report.steps.push({ name: "diagram", status: r5.ok, body: diagSummary });
    if (!r5.ok) {
      throw new Error(
        `diagram: HTTP ${r5.status} — ${diagData.error ?? JSON.stringify(diagData)}`,
      );
    }
    const imgUrl = diagData.imageDataUrl || "";
    if (!imgUrl.startsWith("data:image")) {
      throw new Error("diagram: 返回的 imageDataUrl 格式异常");
    }
    console.log("  image data url length:", imgUrl.length);

    const imgBase64 = imgUrl.split(",")[1];
    if (imgBase64) {
      const imgBuf = Buffer.from(imgBase64, "base64");
      const imgDir = getDatedOutputDir();
      mkdirSync(imgDir, { recursive: true });
      const imgPath = path.join(imgDir, "e2e-diagram.png");
      writeFileSync(imgPath, imgBuf);
      console.log("  diagram saved:", path.relative(root, imgPath));
    }

    report.ok = true;
    report.finished_at = new Date().toISOString();
    console.log("\n全流程 API 烟测通过。");
  } catch (e) {
    report.error = e instanceof Error ? e.message : String(e);
    report.finished_at = new Date().toISOString();
    throw e;
  } finally {
    writeReport(report);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
