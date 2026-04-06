import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const projectRoot = path.dirname(fileURLToPath(import.meta.url));

/**
 * @next/env 的 loadEnvConfig 不会覆盖已存在于 process.env 的同名变量。
 * 当操作系统 / IDE 进程里残留旧值时，.env 里写的新值就永远被忽略。
 * 这里手动解析 .env 并 **强制覆盖** process.env，保证 .env 为唯一真相源。
 */
function forceLoadDotEnv(dir) {
  const envPath = path.join(dir, ".env");
  if (!fs.existsSync(envPath)) return;
  const raw = fs.readFileSync(envPath, "utf8").replace(/^\uFEFF/, "");
  for (const line of raw.split(/\r?\n/)) {
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
    process.env[key] = val;
  }
}

forceLoadDotEnv(projectRoot);

/** @type {import('next').NextConfig} */
const nextConfig = {};

export default nextConfig;
