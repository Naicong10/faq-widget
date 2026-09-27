# TASKS

> 规则：一次只做一项；完成后移到 `DONE.md`。每个阶段结束都应该能演示。

## 交接说明

- 当前：T0–T5.3 已完成。下一步做 T5.4：录 30 秒演示视频（FAQ 命中 → 换说法命中 → 未知问题转人工 → 后台看到留言）。README 在仓库根目录，截图是 `doc/screenshots/home.png`（只有首页和气泡，没有展开后的聊天窗）。
- 线上：仓库 https://github.com/Naicong10/faq-widget ，分支 `master`。Vercel 项目 `faq-widget`，正式地址 https://faq-widget-naicongh-2112.vercel.app 。线上 `ANSWER_MODE=rag`、`STORE=supabase`。GitHub 还没连上 Vercel，推送不会自动部署。
- 关键词：`src/lib/answer/keyword.ts` 用汉字二元组 Dice。命中阈值 0.3，建议阈值 0.18，最多 3 条。停用字在 `STOP_CHARS`，避免「怎么、什么」把无关问题配上。
- 频率限制：`src/lib/rateLimit.ts` 内存计数。提问每地址每分钟 20 次，留言 5 次，超出返回 429。只限制 POST；GET 留言和 OPTIONS 不限。重启进程后清空。`x-forwarded-for` 可伪造，只防普通连刷。
- 管理登录：cookie 名 `admin_session`，值是 `ADMIN_PASSWORD` 的 sha256，不存明文。httpOnly、SameSite=Lax，只在生产环境加 `secure`。密码只在 `.env.local`。
- 小部件：首页用原生 `<script src="/widget.js" defer>`。`next/script` 只会预加载、不执行。接口地址从脚本 `src` 推断。CORS 只加在公开的 POST 上。
- 本地：用 http://localhost:3000，不要用 127.0.0.1（Next 会拦截）。项目路径含 `&`，npm 脚本必须写成 `node ./node_modules/...`，不要改回 `.bin`。
- RAG：`src/lib/answer/rag.ts`。问题向量和 FAQ 算余弦相似度，取得分最高的 3 条；最高分低于 0.55 不调用模型，直接转人工。过线后把这 3 条发给 `deepseek-flash`（`temperature` 0.2，思考模式关闭）。回复含 `[NO_ANSWER]` 也转人工。向量请求在 `src/lib/embedding.ts`，和生成脚本共用。用 `fetch`，没有安装 `openai` 包。`ARCHITECTURE.md` 仍写着 `deepseek-chat` 和 `openai` 包，文档还没改。
- 不要提交 `.env.local` 和 `data/leads.json`。本地 `STORE=supabase`，密钥是服务端 JWT，不是 `sb_publishable_`。`src/lib/store/supabase.ts` 用 REST，没有装 supabase 包。表 `leads` 已开行级安全。不写 `STORE` 时仍用本地 JSON。提问接口读 `ANSWER_MODE`，不写时是 `keyword`。

## 阶段 5：上线
- [ ] T5.4 录 30 秒演示视频：FAQ 命中 → 换说法命中 → 未知问题转人工 → 后台看到留言。
