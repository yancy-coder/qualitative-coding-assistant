# 质性编码助手

基于 **扎根理论** 三步编码流程的 Web 工具：**开放编码 → 主轴编码 → 选择性编码**。上传访谈稿（DOCX），由服务端调用大模型辅助生成编码草案；可在表格中 **人工编辑与删除** 编码行，变更会写入本地状态并进入 **审计 diff**。支持导出 CSV 与审计元数据，以及通过 OpenRouter 生成理论框架示意图。

技术栈：[Next.js](https://nextjs.org)（App Router）、React、Zustand。

## 功能概览

- **DOCX 解析**：服务端解压 `.docx`，从 `word/document.xml` 抽取正文文本（`w:t`、换行与制表等），按段落拆成带 `segment_id` 与 `source_file` 的片段列表。一次可上传多个文件，结果按顺序 **拼接为同一段落数组**（非合并为单个物理文件），每条片段仍保留来源文件名以便追溯。
- **开放编码**：对片段分批请求 LLM，支持并发批处理与 SSE 进度；产出带 `open_code_id`、`segment_id`、`source_file` 的开放编码。
- **主轴编码 / 选择性编码**：在已确认的开放编码与证据基础上继续调用 LLM。
- **表格校对**：开放 / 主轴 / 选择性编码表格支持内联编辑与行删除；操作写入 store 并记录 `source: "user_edit"` 的审计项。
- **校验提示**：前端会对模型输出做一致性检查（如原文引用与片段不完全匹配等），以警告形式展示，需人工判断。
- **理论框架图**：调用 OpenRouter 的 chat completions（`modalities` 含图片），默认使用环境变量中的生图模型，返回 PNG 数据 URL 供页面展示与导出。
- **本地持久化**：项目状态通过 Zustand `persist` 写入 **IndexedDB**（大项目可避免 localStorage 容量问题），并支持从旧版 localStorage 一次性迁移。
- **审计与导出**：ZIP 内含各步 CSV、`metadata.json`（含 manifests、diffs、冻结快照等）。

## 环境要求

- Node.js 18+（推荐当前 LTS）
- npm / yarn / pnpm 任选其一

## 快速开始

1. **安装依赖**

```bash
npm install
```

2. **配置环境变量**

复制 `.env.example` 为 `.env`，按说明填写（勿将 `.env` 提交到版本库）。

| 变量 | 说明 |
|------|------|
| `MOONSHOT_API_KEY` | Moonshot（Kimi）API，OpenAI 兼容接口，用于三步编码 |
| `MOONSHOT_BASE_URL` | 一般为 `https://api.moonshot.cn/v1` |
| `MOONSHOT_MODEL` | 例如 `kimi-k2.5` |
| `MOONSHOT_TEMPERATURE` | 温度；部分模型仅允许 `1`，见运行时校验逻辑 |
| `MOONSHOT_AXIAL_MAX_OUTPUT_TOKENS` | 主轴编码单次输出上限（可选，默认见代码） |
| `OPEN_CODING_BATCH_SIZE` | 开放编码每批片段数（可选，默认 `20`） |
| `OPEN_CODING_CONCURRENCY` | 开放编码并发批次数（可选，默认 `5`） |
| `OPEN_CODING_MAX_OUTPUT_TOKENS` | 开放编码每批调用的输出上限（可选，默认见代码） |
| `OPENROUTER_API_KEY` | OpenRouter，用于理论框架图 |
| `OPENROUTER_BASE_URL` | 一般为 `https://openrouter.ai/api/v1` |
| `OPENROUTER_IMAGE_MODEL` | 生图模型 ID（可选，代码内有默认值） |
| `OPENROUTER_IMAGE_SIZE` | `1K` / `2K` / `4K` |
| `OPENROUTER_IMAGE_ASPECT_RATIO` | 例如 `4:3` |
| `HTTPS_PROXY` / `HTTP_PROXY` | 若服务端需走本地代理访问 OpenRouter，在 `.env` 中显式设置（Node 默认不自动使用系统代理） |

3. **启动开发服务器**

```bash
npm run dev
```

浏览器打开 [http://localhost:3000](http://localhost:3000)。

4. **生产构建**

```bash
npm run build
npm start
```

## 脚本说明

| 命令 | 作用 |
|------|------|
| `npm run dev` | 本地开发 |
| `npm run build` | 生产构建 |
| `npm start` | 启动生产服务（需先 `build`） |
| `npm run lint` | ESLint |
| `npm run test:openrouter` | 检测 OpenRouter 密钥与代理/地区（需 `.env`） |
| `npm run test:e2e` | 端到端冒烟脚本（见 `scripts/e2e-smoke.mjs`） |

## 项目结构（节选）

- `src/app/` — 页面与 API：`/api/parse`、`/api/coding/*`、`/api/diagram` 等
- `src/components/` — 上传、编码工作流、审计面板、编码表格等
- `src/lib/qualitative/` — 类型、解析、校验、CSV 导出
- `src/lib/server/` — 开放编码批处理、OpenRouter 与代理等服务端逻辑
- `src/lib/store.ts` — Zustand 状态与持久化

## 部署说明

可部署到支持 Node.js 的平台（如 Vercel）；在控制台配置与本地一致的 **环境变量**，注意服务端请求额度、超时（部分路由配置了较长 `maxDuration`）与密钥安全。上传体积受 Next 配置中 `serverActions.bodySizeLimit` 等限制，大批量 DOCX 时请留意单次请求大小。

## 故障排查：OpenRouter

- **401**：密钥无效或未正确写入 `.env`；勿带多余引号或泄露密钥。
- **403 / 地区不可用**：与余额无关时，多为模型在你所在网络区域不可用；可更换出口网络、或在环境变量中换用 OpenRouter 上可用的生图模型。

本地自检（不启动页面）：

```bash
npm run test:openrouter
```

若使用 Clash 等代理，请在 `.env` 中设置 `HTTPS_PROXY`/`HTTP_PROXY` 指向本地端口；详见代码中 `undici` 与 `ProxyAgent` 的用法。

## 许可与说明

本项目基于 `create-next-app` 初始化。使用 Moonshot、OpenRouter 等第三方 API 时须遵守其服务条款与计费规则。工具输出仅供研究辅助，编码结论与论文表述应由研究者负责审阅与声明。
