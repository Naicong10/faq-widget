# TASKS

> 规则：一次只做一项；完成后移到 `DONE.md`。每个阶段结束都应该能演示。

## 阶段 1：关键词版跑通（零成本）
- [ ] T1.2 实现 `POST /api/chat`（输入校验、长度限制、统一返回 `ChatResponse`）。
- [ ] T1.3 做一个临时测试页面，能输入问题并显示接口返回，确认端到端可用。

## 阶段 2：嵌入小部件
- [ ] T2.1 在 `widget/src/widget.ts` 实现聊天气泡和聊天窗口（Shadow DOM、移动端适配），构建为 `public/widget.js`。
- [ ] T2.2 接口加 CORS；新建一个独立的空白 HTML 文件，只加一行 `<script>`，验证小部件能用。
- [ ] T2.3 做「星河大学」演示首页 `page.tsx`，嵌入小部件，删除 T1.3 的临时页面。

## 阶段 3：转人工与留言
- [ ] T3.1 实现 `LeadStore` 接口和本地 JSON 实现。
- [ ] T3.2 实现 `POST /api/leads`（邮箱格式校验、长度限制）。
- [ ] T3.3 小部件在 `handoff: true` 时显示留言表单，提交后显示成功提示。
- [ ] T3.4 实现 `/admin` 密码登录（httpOnly cookie）和留言列表页。
- [ ] T3.5 给 `/api/chat` 和 `/api/leads` 加简单频率限制。

## 阶段 4：AI 版（RAG）
- [ ] T4.1 注册 DeepSeek 和阿里云百炼，拿到密钥，写进 `.env.local`（我自己操作，AI 只提示步骤）。
- [ ] T4.2 编写 `scripts/build-embeddings.ts`，生成 `data/faq-embeddings.json`。
- [ ] T4.3 实现 `rag.ts`：问题向量化 → 余弦相似度取前 3 → 低于阈值直接转人工 → 调 DeepSeek（防编造提示词、`[NO_ANSWER]` 标记）。
- [ ] T4.4 用 `ANSWER_MODE` 切换两种引擎；准备 10 个测试问题，对比关键词版和 AI 版的结果，记录到 `doc/COMPARE.md`。

## 阶段 5：上线
- [ ] T5.1 创建 Supabase 项目和 `leads` 表，实现 `supabase.ts`，用 `STORE` 切换。
- [ ] T5.2 推送到 GitHub，部署到 Vercel，配置环境变量，线上验证全部验收标准。
- [ ] T5.3 写 README（项目介绍、架构图、防编造做法、本地运行、截图）。
- [ ] T5.4 录 30 秒演示视频：FAQ 命中 → 换说法命中 → 未知问题转人工 → 后台看到留言。
