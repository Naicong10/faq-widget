# DONE

> 已完成的任务从 `TASKS.md` 移到这里。

## 阶段 0：准备
- [x] T0.1 用 `create-next-app` 创建项目（TypeScript、App Router、Tailwind、ESLint），初始化 git，添加 `.gitignore`（含 `.env*`、`data/leads.json`）和 `.env.example`。（完成于 2026-09-27）
- [x] T0.2 编写 `data/faq.md`：虚构「星河大学」FAQ 30–50 条，覆盖报到、宿舍、校园卡、选课、食堂、奖助学金、校园网、快递、校医院。格式统一为 `## Q:` / `A:`。（完成于 2026-09-27）
- [x] T0.3 实现 `src/lib/faq.ts` 解析 FAQ，并写一个小测试确认条数和内容正确。（完成于 2026-09-27）

## 阶段 1：关键词版跑通（零成本）
- [x] T1.1 实现 `AnswerEngine` 接口和关键词引擎 `keyword.ts`（中文二元组相似度 + 阈值 + 相关问题建议），写 5 个以上测试用例（原题、近似问法、无关问题）。（完成于 2026-09-27）
- [x] T1.2 实现 `POST /api/chat`（输入校验、长度限制、统一返回 `ChatResponse`）。（完成于 2026-09-27）
- [x] T1.3 做一个临时测试页面，能输入问题并显示接口返回，确认端到端可用。（完成于 2026-09-27）

## 阶段 2：嵌入小部件
- [x] T2.1 在 `widget/src/widget.ts` 实现聊天气泡和聊天窗口（Shadow DOM、移动端适配），构建为 `public/widget.js`。（完成于 2026-09-27）
- [x] T2.2 接口加 CORS；新建一个独立的空白 HTML 文件，只加一行 `<script>`，验证小部件能用。（完成于 2026-09-27）
- [x] T2.3 做「星河大学」演示首页 `page.tsx`，嵌入小部件，删除 T1.3 的临时页面。（完成于 2026-09-27）

## 阶段 3：转人工与留言
- [x] T3.1 实现 `LeadStore` 接口和本地 JSON 实现。（完成于 2026-09-27）
- [x] T3.2 实现 `POST /api/leads`（邮箱格式校验、长度限制）。（完成于 2026-09-27）
- [x] T3.3 小部件在 `handoff: true` 时显示留言表单，提交后显示成功提示。（完成于 2026-09-27）
- [x] T3.4 实现 `/admin` 密码登录（httpOnly cookie）和留言列表页。（完成于 2026-09-27）
- [x] T3.5 给 `/api/chat` 和 `/api/leads` 加简单频率限制。（完成于 2026-09-27）

## 阶段 4：AI 版（RAG）
- [x] T4.1 注册 DeepSeek 和阿里云百炼，拿到密钥，写进 `.env.local`（我自己操作，AI 只提示步骤）。（完成于 2026-09-27）
- [x] T4.2 编写 `scripts/build-embeddings.ts`，生成 `data/faq-embeddings.json`。（完成于 2026-09-27）
