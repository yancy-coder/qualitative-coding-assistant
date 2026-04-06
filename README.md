# 质性编码助手

基于 **扎根理论** 三步编码流程的 Web 工具：**开放编码 → 主轴编码 → 选择性编码**。上传访谈或观察类文档（DOCX），借助大模型辅助完成编码，并支持导出与审计轨迹。

技术栈为 [Next.js](https://nextjs.org)（App Router）。

## 功能概览

- **文档解析**：上传 DOCX，提取正文供后续步骤使用。
- **开放编码**：从原始片段中归纳概念与初始范畴。
- **主轴编码**：按范式维度（因果条件、现象、策略、结果等）组织范畴关系。
- **选择性编码**：提炼核心范畴与故事线。
- **理论框架图**：通过 **OpenRouter** 调用 **Gemini 3 Pro Image Preview** 直接生成学术风格的理论框架图图片（PNG），无需手动渲染。
- **审计与导出**：便于核对模型输出与整理材料。

## 环境要求

- Node.js 18+（推荐当前 LTS）
- npm / yarn / pnpm 任选其一

## 快速开始

1. **安装依赖**

```bash
npm install
```

2. **配置环境变量**

复制 `.env.example` 为 `.env`，按说明填写密钥（勿将 `.env` 提交到版本库）。

| 变量 | 说明 |
|------|------|
| `MOONSHOT_API_KEY` | 月之暗面 Kimi API（OpenAI 兼容），用于开放 / 主轴 / 选择性编码 |
| `MOONSHOT_BASE_URL` | 一般为 `https://api.moonshot.cn/v1` |
| `MOONSHOT_MODEL` | 例如 `kimi-k2.5`（编码链路默认模型） |
| `MOONSHOT_TEMPERATURE` | 默认 `1`（`kimi-k2.5` 要求）；换模型时可调整 |
| `MOONSHOT_AXIAL_MAX_OUTPUT_TOKENS` | 主轴编码输出上限，默认 `32000` |
| `OPENROUTER_API_KEY` | OpenRouter API 密钥，用于理论框架图（AI 生图） |
| `OPENROUTER_IMAGE_MODEL` | 图片生成模型，默认 `google/gemini-3-pro-image-preview` |
| `OPENROUTER_IMAGE_SIZE` | 图片尺寸：`1K` / `2K` / `4K`，默认 `2K` |
| `OPENROUTER_IMAGE_ASPECT_RATIO` | 图片比例，默认 `4:3` |

3. **启动开发服务器**

```bash
npm run dev
```

在浏览器中打开 [http://localhost:3000](http://localhost:3000) 使用应用。

4. **生产构建**

```bash
npm run build
npm start
```

## 脚本说明

| 命令 | 作用 |
|------|------|
| `npm run dev` | 本地开发（热更新） |
| `npm run build` | 生产构建 |
| `npm start` | 启动生产服务器（需先 `build`） |
| `npm run lint` | 运行 ESLint |
| `npm run test:openrouter` | 检测 OpenRouter 密钥与地区/模型是否可用（需 `.env`） |

## 项目结构（节选）

- `src/app/` — 页面与 API 路由（`/api/parse`、`/api/coding/*`、`/api/diagram` 等）
- `src/components/` — 界面组件（步骤条、上传、编码工作流、审计面板等）
- `src/lib/qualitative/` — 质性研究相关类型、提示词、校验与导出逻辑

## 部署说明

可将本应用部署到 [Vercel](https://vercel.com) 等支持 Node.js 的平台；在控制台配置与本地一致的 **环境变量**，并注意服务端接口的密钥安全与用量限制。

## 故障排查：OpenRouter

### `401 User not found`

表示 **OpenRouter 未接受当前 API Key**。处理：在 [OpenRouter Keys](https://openrouter.ai/keys) 重新生成密钥；`.env` 里只写 `sk-or-v1-...`、无引号；改后重启 `npm run dev`。密钥勿发到聊天或提交 Git。

### `403` / `This model is not available in your region`

与 **余额是否充足无关**，是 **当前网络所在地区** 不允许使用部分模型（Google Gemini 等常受限）。处理思路：

1. 更换 **网络出口**（例如部分地区需使用合规 VPN 到美国/欧洲等 OpenRouter 允许的出口）。
2. 或在 `.env` 中把 `OPENROUTER_IMAGE_MODEL` 换成 **在你地区可用的生图模型**（在 [OpenRouter Models](https://openrouter.ai/models) 筛选带 Image 输出的模型后试跑）。

**本地自检**（不启动网页即可看 HTTP 状态）：

```bash
npm run test:openrouter
```

会先请求轻量文本模型、再请求与「理论框架图」相同的生图参数，便于区分「密钥问题」与「地区/模型问题」。

### Clash / 本地代理（127.0.0.1:7890）

**Windows「用户环境变量」里若已设置 `HTTP_PROXY`/`HTTPS_PROXY`，仅代表部分软件会读；Node.js 自带的 `fetch` 默认不会走代理**，因此此前即使用 Clash，Next.js 服务端请求 OpenRouter 仍可能直连并出现地区限制。

**推荐配置（与代码行为一致）：**

1. Clash 中开启 **System Proxy（系统代理）** 或 **TUN 模式**（二选一或同时开，视你客户端而定），保证浏览器与其它走系统代理的程序能出国。
2. 在项目根目录 **`.env`** 中增加两行（端口与 Clash 一致即可）：

   ```env
   HTTPS_PROXY=http://127.0.0.1:7890
   HTTP_PROXY=http://127.0.0.1:7890
   ```

3. **重启** `npm run dev`，再运行 `npm run test:openrouter`。若脚本开头打印「使用代理」，且测试 A/B 不再是「直连才出现的地区错误」，则说明服务端已走 Clash。

本项目的 `/api/diagram` 已通过 `undici` 的 `ProxyAgent` 读取上述变量；勿将代理地址提交到公开仓库。

本仓库对 `OPENROUTER_API_KEY` 会做去空白、去误写的 `Bearer` 前缀与引号，并默认附带官方文档中的 `HTTP-Referer` / `X-OpenRouter-Title` 请求头。

## 许可与说明

本项目基于 `create-next-app` 初始化；使用 Moonshot Kimi API 及 OpenRouter API 时须遵守其各自的服务条款与计费规则。
