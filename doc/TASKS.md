# TASKS

> 规则：一次只做一项；完成后移到 `DONE.md`。每个阶段结束都应该能演示。

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
