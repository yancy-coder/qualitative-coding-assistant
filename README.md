# 质性编码助手 (Qualitative Coding Assistant)

[![Next.js](https://img.shields.io/badge/Next.js-16+-000000?logo=next.js)](https://nextjs.org)
[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript)](https://www.typescriptlang.org)
[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](LICENSE)

基于 **扎根理论 (Grounded Theory)** 三步编码流程的 Web 工具：**开放编码 → 主轴编码 → 选择性编码**。上传访谈稿（DOCX），由服务端调用大模型辅助生成编码草案；可在表格中 **人工编辑与删除** 编码行，变更会写入本地状态并进入 **审计 diff**。支持导出 CSV 与审计元数据，以及通过 OpenRouter 生成理论框架示意图。

![workflow](https://img.shields.io/badge/Workflow-开放编码→主轴编码→选择性编码-success)

---

## ✨ 功能特性

### 📄 文档解析
- 服务端解压 `.docx`，从 `word/document.xml` 抽取正文文本
- 支持 `w:t`、换行与制表等格式，按段落拆成带 `segment_id` 与 `source_file` 的片段列表
- 一次可上传多个文件，结果按顺序 **拼接为同一段落数组**

### 🔄 三步编码流程
- **开放编码 (Open Coding)**：对片段分批请求 LLM，支持并发批处理与 SSE 进度
- **主轴编码 (Axial Coding)**：在已确认的开放编码与证据基础上继续调用 LLM
- **选择性编码 (Selective Coding)**：整合主轴编码结果，生成核心范畴与理论框架

### 📝 表格校对与审计
- 开放/主轴/选择性编码表格支持 **内联编辑** 与 **行删除**
- 操作写入 store 并记录 `source: "user_edit"` 的审计项
- 前端对模型输出做一致性检查，以警告形式展示

### 🖼️ 理论框架图
- 调用 OpenRouter 的 chat completions（`modalities` 含图片）
- 默认使用环境变量中的生图模型，返回 PNG 数据 URL 供页面展示与导出

### 💾 本地持久化
- 项目状态通过 Zustand `persist` 写入 **IndexedDB**
- 支持从旧版 localStorage 一次性迁移

### 📦 审计与导出
- ZIP 内含各步 CSV、`metadata.json`（含 manifests、diffs、冻结快照等）

---

## 🚀 快速开始

### 环境要求
- Node.js 18+（推荐当前 LTS）
- npm / yarn / pnpm 任选其一

### 1. 安装依赖

```bash
npm install
```

### 2. 配置环境变量

复制 `.env.example` 为 `.env`：

```bash
cp .env.example .env
```

按说明填写以下变量：

| 变量 | 说明 | 示例 |
|------|------|------|
| `MOONSHOT_API_KEY` | Moonshot（Kimi）API Key | `sk-...` |
| `MOONSHOT_BASE_URL` | Moonshot API 地址 | `https://api.moonshot.cn/v1` |
| `MOONSHOT_MODEL` | 模型名称 | `kimi-k2.5` |
| `MOONSHOT_TEMPERATURE` | 生成温度 | `1` |
| `OPENROUTER_API_KEY` | OpenRouter API Key | `sk-or-...` |
| `OPENROUTER_BASE_URL` | OpenRouter API 地址 | `https://openrouter.ai/api/v1` |

更多可选配置见 `.env.example`。

### 3. 启动开发服务器

```bash
npm run dev
```

浏览器打开 [http://localhost:3000](http://localhost:3000)。

### 4. 生产构建

```bash
npm run build
npm start
```

---

## 📁 项目结构

```
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── api/               # API 路由
│   │   │   ├── coding/        # 编码相关 API
│   │   │   │   ├── open/      # 开放编码
│   │   │   │   ├── axial/     # 主轴编码
│   │   │   │   └── selective/ # 选择性编码
│   │   │   ├── parse/         # DOCX 解析
│   │   │   ├── diagram/       # 理论框架图生成
│   │   │   └── export/        # 导出功能
│   │   ├── layout.tsx         # 根布局
│   │   └── page.tsx           # 主页面
│   ├── components/            # React 组件
│   │   ├── FileUpload.tsx     # 文件上传
│   │   ├── CodingWorkflow.tsx # 编码工作流
│   │   ├── CodingTable.tsx    # 编码表格
│   │   ├── AuditPanel.tsx     # 审计面板
│   │   └── Stepper.tsx        # 步骤指示器
│   ├── lib/
│   │   ├── qualitative/       # 质性研究相关
│   │   │   ├── types.ts       # TypeScript 类型定义
│   │   │   ├── parseDocx.ts   # DOCX 解析
│   │   │   ├── prompts/       # LLM 提示词
│   │   │   ├── schemas/       # Zod 校验模式
│   │   │   └── audit/         # 审计相关
│   │   ├── server/            # 服务端逻辑
│   │   │   ├── openCodingBatch.ts  # 批量开放编码
│   │   │   ├── openrouter.ts       # OpenRouter 集成
│   │   │   └── parseModelJson.ts   # 模型 JSON 解析
│   │   └── store.ts           # Zustand 状态管理
├── scripts/                   # 工具脚本
├── outputs/                   # 输出目录（保留）
└── .env.example              # 环境变量示例
```

---

## 🔧 可用脚本

| 命令 | 作用 |
|------|------|
| `npm run dev` | 本地开发 |
| `npm run build` | 生产构建 |
| `npm run start` | 启动生产服务 |
| `npm run lint` | ESLint 检查 |
| `npm run test:openrouter` | 检测 OpenRouter 密钥与代理 |
| `npm run test:e2e` | 端到端冒烟测试 |

---

## 🌐 部署

可部署到支持 Node.js 的平台（如 [Vercel](https://vercel.com)）：

1. 在控制台配置与本地一致的 **环境变量**
2. 注意服务端请求额度与超时（部分路由配置了较长 `maxDuration`）
3. 上传体积受 Next 配置中 `serverActions.bodySizeLimit` 限制

---

## ⚠️ 故障排查

### OpenRouter 相关问题

| 错误码 | 原因 | 解决方案 |
|--------|------|----------|
| **401** | 密钥无效 | 检查 `.env` 中的密钥，勿带多余引号 |
| **403** | 地区不可用 | 更换出口网络，或换用其他生图模型 |

本地自检（不启动页面）：

```bash
npm run test:openrouter
```

若使用 Clash 等代理，请在 `.env` 中设置 `HTTPS_PROXY`/`HTTP_PROXY` 指向本地端口。

---

## 📚 核心数据模型

### 片段 (Segment)
```typescript
interface Segment {
  segment_id: string;      // 片段唯一 ID
  source_file: string;     // 来源文件名
  paragraph_index: number; // 段落索引
  verbatim: string;        // 原文内容
  char_start: number;      // 起始字符位置
  char_end: number;        // 结束字符位置
}
```

### 开放编码 (OpenCode)
```typescript
interface OpenCode {
  open_code_id: string;       // 编码 ID
  segment_id: string;         // 关联片段 ID
  code_label: string;         // 编码标签
  concept_definition: string; // 概念定义
  verbatim_quote: string;     // 原文引用
  source_file: string;        // 来源文件
}
```

### 主轴编码 (AxialCode)
```typescript
interface AxialCode {
  axial_id: string;              // 编码 ID
  category: string;              // 范畴
  from_open_code_ids: string[];  // 来源开放编码
  paradigm_slot: ParadigmSlot;   // 范式位置
  relationship_description: string; // 关系描述
  supporting_evidence_refs: string[]; // 证据引用
  source_file: string;
}
```

---

## 📖 使用流程

1. **上传文档**：支持多个 `.docx` 文件，系统自动解析为文本片段
2. **开放编码**：点击"开始开放编码"，系统将分批调用 LLM 生成初始编码
3. **人工校验**：在表格中编辑或删除编码，修改将被记录到审计日志
4. **主轴编码**：基于已确认的开放编码，生成主轴范畴与关系
5. **选择性编码**：整合结果，形成核心理论框架
6. **生成图表**：使用 OpenRouter 生成理论框架可视化图表
7. **导出结果**：下载包含所有编码、审计日志的 ZIP 文件

---

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

---

## 📄 许可

本项目基于 [Apache License 2.0](LICENSE) 开源。

使用 Moonshot、OpenRouter 等第三方 API 时须遵守其服务条款与计费规则。工具输出仅供研究辅助，编码结论与论文表述应由研究者负责审阅与声明。

---

## 🙏 致谢

- 基于 [create-next-app](https://nextjs.org/docs/app/api-reference/create-next-app) 初始化
- 扎根理论方法学参考：Strauss, A., & Corbin, J. (1998). *Basics of Qualitative Research*

---

<div align="center">

**用 AI 辅助质性研究，让编码更高效、更透明**

[开始使用](#快速开始) · [报告问题](../../issues) · [查看示例](#)

</div>
