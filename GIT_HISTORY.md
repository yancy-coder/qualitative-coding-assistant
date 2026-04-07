# Git 提交历史记录

> 由 AI 助手自动记录，方便追踪项目变更
> 最后更新: 2026-04-07

---

## 提交概览

```
dbc0884 docs: 优化 README 文档，添加详细说明与使用指南
37dda53 feat: 完善质性编码助手核心功能
b7858c2 chore: add .cursor to .gitignore
e984833 Initial commit with Apache 2.0 license
```

---

## 详细提交记录

### commit dbc08846aef6aa31afad1cafa9250b07f5e23305
**作者**: User  
**日期**: 2026-04-07 12:26:12 +0800  
**提交信息**: docs: 优化 README 文档，添加详细说明与使用指南

**变更文件**:
- `README.md` | 207 行新增, 56 行删除

**变更说明**: 全面重写 README，添加徽章、项目结构图、核心数据模型、详细使用流程等

---

### commit 37dda539a7608ed738589f7e2bbf2ee150847747
**作者**: User  
**日期**: 2026-04-07 12:25:17 +0800  
**提交信息**: feat: 完善质性编码助手核心功能

**功能列表**:
- 优化 DOCX 解析逻辑，支持更复杂的文档结构
- 新增开放编码流式接口 (/api/coding/open/stream)
- 实现批量开放编码处理 (openCodingBatch)
- 增强编码表格编辑功能，支持人工校验与修改
- 完善审计日志与 diff 记录
- 新增模型 JSON 解析工具
- 更新 README 完善使用说明

**变更文件** (13 个文件, +1093/-251):
- `README.md` | 100 行修改
- `next.config.mjs` | 8 行修改
- `package-lock.json` | 193 行修改
- `package.json` | 3 行修改
- `src/app/api/coding/open/route.ts` | 59 行修改
- `src/app/api/coding/open/stream/route.ts` | **新增** (88 行)
- `src/app/api/parse/route.ts` | 2 行修改
- `src/components/CodingTable.tsx` | 324 行修改 (大量增强)
- `src/components/CodingWorkflow.tsx` | 162 行修改
- `src/lib/qualitative/parseDocx.ts` | 133 行修改
- `src/lib/server/openCodingBatch.ts` | **新增** (175 行)
- `src/lib/server/parseModelJson.ts` | **新增** (25 行)
- `src/lib/store.ts` | 72 行修改

---

### commit b7858c24ec3582bca050024c9a82bf6bd8860877
**作者**: User  
**日期**: 2026-04-07 12:23:16 +0800  
**提交信息**: chore: add .cursor to .gitignore

**变更文件**:
- `.gitignore` | +1 行

---

### commit e984833772c39775102df3c346507c8d1bb49a0e
**作者**: User  
**日期**: 2026-04-06 20:35:37 +0800  
**提交信息**: Initial commit with Apache 2.0 license

**初始项目结构** (46 个文件, +10384 行):
- 基础配置: `.env.example`, `.eslintrc.json`, `.gitignore`, `LICENSE`
- Next.js 配置: `next.config.mjs`, `postcss.config.mjs`, `tailwind.config.ts`, `tsconfig.json`
- 包管理: `package.json`, `package-lock.json`
- 脚本: `scripts/create-test-docx.mjs`, `scripts/e2e-smoke.mjs`, `scripts/test-openrouter-key.mjs`
- API 路由: `src/app/api/coding/axial/route.ts`, `src/app/api/coding/open/route.ts`, `src/app/api/coding/selective/route.ts`, `src/app/api/diagram/route.ts`, `src/app/api/export/save/route.ts`, `src/app/api/parse/route.ts`
- 页面: `src/app/layout.tsx`, `src/app/page.tsx`, `src/app/globals.css`, `src/app/favicon.ico`
- 组件: `src/components/AuditPanel.tsx`, `src/components/CodingTable.tsx`, `src/components/CodingWorkflow.tsx`, `src/components/FileUpload.tsx`, `src/components/Stepper.tsx`
- 工具库: `src/lib/qualitative/` (types, parseDocx, csvExport, validation, audit, prompts, schemas)
- 服务端: `src/lib/server/` (localOutputs, moonshotTemperature, openrouter)
- 状态管理: `src/lib/store.ts`

---

## 功能演进时间线

| 时间 | 提交 | 里程碑 |
|------|------|--------|
| 2026-04-06 | e984833 | 项目初始化，完成基础三步编码框架 |
| 2026-04-07 | b7858c2 | 添加 .cursor 到 gitignore |
| 2026-04-07 | 37dda53 | 核心功能完善：流式接口、批量处理、表格编辑增强 |
| 2026-04-07 | dbc0884 | 文档完善，README 全面重写 |

---

## 下次更新时对比命令

```bash
# 查看远程分支最新提交
git log origin/master --oneline -5

# 查看本地未推送的提交
git log origin/master..HEAD --oneline

# 查看工作区未提交的变更
git status

# 查看详细的文件变更统计
git diff origin/master --stat
```

---

## 新增的关键功能模块

### 1. 流式开放编码 (`src/app/api/coding/open/stream/route.ts`)
- SSE (Server-Sent Events) 实时进度推送
- 支持前端实时显示编码进度

### 2. 批量编码处理 (`src/lib/server/openCodingBatch.ts`)
- 分批处理大量文档片段
- 并发控制与错误重试机制
- 支持进度回调

### 3. 模型 JSON 解析 (`src/lib/server/parseModelJson.ts`)
- 处理 LLM 返回的 JSON 数据
- 错误处理和格式校验

### 4. 增强的编码表格 (`src/components/CodingTable.tsx`)
- 内联编辑功能
- 行删除与恢复
- 审计日志记录

---

*此文件由 AI 助手生成，用于追踪项目变更历史*
