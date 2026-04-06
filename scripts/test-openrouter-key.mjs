/**
 * 本地验证 OPENROUTER_API_KEY 是否被 OpenRouter 接受（最小文本请求，不含生图）。
 * 用法：node scripts/test-openrouter-key.mjs
 * 从项目根目录 .env 读取（需已配置 OPENROUTER_API_KEY）
 * Node 的 fetch 不读代理，若使用 Clash 请在 .env 设 HTTPS_PROXY=http://127.0.0.1:7890
 */
import { readFileSync, existsSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { ProxyAgent, fetch as undiciFetch } from "undici";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const envPath = path.join(root, ".env");

function parseEnvFile(filePath) {
  const out = {};
  if (!existsSync(filePath)) return out;
  const raw = readFileSync(filePath, "utf8").replace(/^\uFEFF/, "");
  for (const line of raw.split(/\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq <= 0) continue;
    const key = t.slice(0, eq).trim();
    let val = t.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    out[key] = val;
  }
  return out;
}

const env = parseEnvFile(envPath);
let apiKey = env.OPENROUTER_API_KEY?.trim();
if (apiKey?.toLowerCase().startsWith("bearer ")) {
  apiKey = apiKey.slice(7).trim();
}

if (!apiKey) {
  console.error("未在 .env 中找到 OPENROUTER_API_KEY");
  process.exit(1);
}

const base = (env.OPENROUTER_BASE_URL || "https://openrouter.ai/api/v1").replace(
  /\/$/,
  "",
);

function proxyInit() {
  const url =
    env.HTTPS_PROXY?.trim() ||
    env.HTTP_PROXY?.trim() ||
    process.env.HTTPS_PROXY?.trim() ||
    process.env.HTTP_PROXY?.trim();
  if (!url) return {};
  return { dispatcher: new ProxyAgent(url) };
}

async function main() {
  const px =
    env.HTTPS_PROXY?.trim() ||
    env.HTTP_PROXY?.trim() ||
    process.env.HTTPS_PROXY?.trim() ||
    process.env.HTTP_PROXY?.trim();
  if (px) {
    console.log("使用代理（undici ProxyAgent）:", px, "\n");
  } else {
    console.log(
      "未设置 HTTPS_PROXY/HTTP_PROXY：Node 将直连。若需 Clash，请在 .env 添加 HTTPS_PROXY=http://127.0.0.1:7890\n",
    );
  }

  const headers = {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
    "HTTP-Referer": env.OPENROUTER_HTTP_REFERER || "http://localhost:3000",
    "X-OpenRouter-Title":
      env.OPENROUTER_APP_TITLE || "qualitative-coding-assistant",
  };

  console.log("请求:", `${base}/chat/completions\n`);

  // 1) 轻量文本模型：验证 Key 是否被接受
  console.log("--- 测试 A：openai/gpt-4o-mini（文本）---");
  const resA = await undiciFetch(`${base}/chat/completions`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      model: "openai/gpt-4o-mini",
      messages: [{ role: "user", content: "Reply with exactly: OK" }],
    }),
    ...proxyInit(),
  });
  const textA = await resA.text();
  console.log("HTTP", resA.status);
  console.log(textA.slice(0, 500));
  if (resA.status === 403 && textA.includes("region")) {
    console.log(
      "\n提示: 403「not available in your region」= 该地区不可用部分模型，与余额无关。可换模型或使用合规网络出口。\n",
    );
  }
  if (resA.status === 401) {
    console.log(
      "\n说明: 401 = OpenRouter 不认此 Key，请到 openrouter.ai/keys 重新生成。\n",
    );
    return;
  }

  // 2) 与项目一致：生图模型（仅发请求看 HTTP，成功则会有 base64，体积大）
  const imageModel =
    env.OPENROUTER_IMAGE_MODEL || "google/gemini-3-pro-image-preview";
  console.log("\n--- 测试 B：", imageModel, "（与 /api/diagram 一致，含 modalities）---");
  const resB = await undiciFetch(`${base}/chat/completions`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      model: imageModel,
      messages: [
        {
          role: "user",
          content: "Minimal flat gray square, no text. Academic diagram style.",
        },
      ],
      modalities: ["image", "text"],
      image_config: { aspect_ratio: "1:1", image_size: "1K" },
    }),
    ...proxyInit(),
  });
  const textB = await resB.text();
  console.log("HTTP", resB.status);
  console.log(textB.slice(0, 800));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
