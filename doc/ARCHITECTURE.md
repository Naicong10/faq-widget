# ARCHITECTURE：星河大学 FAQ 智能客服小部件

## 1. 技术栈
| 部分 | 选择 | 说明 |
|---|---|---|
| 框架 | Next.js（App Router）+ TypeScript | 前端页面和后端接口在同一个项目 |
| 样式 | Tailwind CSS（仅演示站和 /admin） | 小部件本身用内联 CSS + Shadow DOM |
| 嵌入小部件 | 原生 JavaScript（TypeScript 编译为单文件） | 不依赖 React，能嵌入任意网站 |
| 关键词检索 | 自己实现的字符 n-gram 相似度（中文按字/二元组） | 零依赖，便于理解 |
| 向量接口 | 阿里云百炼 文本向量（text-embedding 系列） | OpenAI 兼容接口 |
| 大模型 | DeepSeek（`deepseek-chat`） | OpenAI 兼容接口，用 `openai` npm 包调用 |
| 存储 | 本地 JSON 文件 / Supabase（Postgres） | 由环境变量切换 |
| 部署 | Vercel | |

## 2. 目录结构
```
faq-widget/
├─ doc/                    # AGENTS / ARCHITECTURE / REQUIREMENTS / TASKS / DONE
├─ data/
│  ├─ faq.md               # 星河大学 FAQ 原始资料（问答对）
│  ├─ faq-embeddings.json  # 预先算好的向量（脚本生成，可提交）
│  └─ leads.json           # 本地开发时的留言（不提交 git）
├─ scripts/
│  └─ build-embeddings.ts  # 读取 faq.md，调用向量接口，生成 faq-embeddings.json
├─ widget/
│  └─ src/widget.ts        # 嵌入小部件源码，构建输出到 public/widget.js
├─ public/
│  └─ widget.js            # 构建产物，对外提供
├─ src/
│  ├─ app/
│  │  ├─ page.tsx          # 星河大学演示首页（引入 widget.js）
│  │  ├─ admin/page.tsx    # 留言查看页（密码保护）
│  │  └─ api/
│  │     ├─ chat/route.ts  # POST 提问
│  │     ├─ leads/route.ts # POST 提交留言；GET 查看留言（需密码）
│  │     └─ admin/login/route.ts # 校验密码，设置 cookie
│  └─ lib/
│     ├─ faq.ts            # 解析 faq.md 为 FaqItem[]
│     ├─ answer/
│     │  ├─ types.ts       # AnswerEngine 接口
│     │  ├─ keyword.ts     # 关键词引擎
│     │  └─ rag.ts         # RAG 引擎（向量检索 + DeepSeek）
│     ├─ store/
│     │  ├─ types.ts       # LeadStore 接口
│     │  ├─ json.ts        # 本地 JSON 实现
│     │  └─ supabase.ts    # Supabase 实现
│     ├─ rateLimit.ts      # 简单的内存频率限制
│     └─ config.ts         # 读取并校验环境变量
└─ .env.example
```

## 3. 数据流
### 3.1 提问
1. 访客在小部件里输入问题，小部件 `POST /api/chat`，内容 `{ question }`。
2. 接口做长度校验和频率限制。
3. 根据 `ANSWER_MODE` 选择引擎：
   - `keyword`：计算问题与每条 FAQ 问题的相似度，取最高分；高于阈值返回答案，否则 `handoff: true`。
   - `rag`：调用向量接口得到问题向量 → 与 `faq-embeddings.json` 计算余弦相似度取前 3 条 → 最高分低于阈值直接 `handoff: true` → 否则把这 3 条作为资料发给 DeepSeek → 模型若回复约定标记 `[NO_ANSWER]` 则 `handoff: true`。
4. 返回统一格式给小部件，小部件显示回答；`handoff` 为真时展示留言表单。

### 3.2 转人工
1. 访客填写邮箱和问题，小部件 `POST /api/leads`。
2. 接口校验邮箱格式和长度，调用 `LeadStore.add()` 保存。
3. `/admin` 页面输入密码 → `/api/admin/login` 校验 `ADMIN_PASSWORD`，成功后设置 httpOnly cookie → 页面调用 `GET /api/leads` 获取列表。

## 4. 核心接口（TypeScript）
```ts
type FaqItem = { id: string; question: string; answer: string; category?: string };

type ChatResponse = {
  answer: string;
  handoff: boolean;          // 是否需要转人工
  sources: string[];         // 命中的 FaqItem.id
  suggestions?: string[];    // 相关问题（关键词版）
};

interface AnswerEngine {
  answer(question: string): Promise<ChatResponse>;
}

type Lead = {
  id: string;
  email: string;
  question: string;
  botAnswer?: string;
  createdAt: string;         // ISO 时间
};

interface LeadStore {
  add(lead: Omit<Lead, 'id' | 'createdAt'>): Promise<Lead>;
  list(): Promise<Lead[]>;   // 按时间倒序
}
```

## 5. 嵌入小部件
- 引入方式：`<script src="https://<域名>/widget.js" data-title="星河大学智能助手" defer></script>`。
- 小部件从自身 `src` 推断接口地址，也可用 `data-api` 覆盖。
- 用 Shadow DOM 挂载，样式写在 Shadow DOM 内部，与宿主页面互不影响。
- 接口需要允许跨域（CORS），因为小部件会被嵌在其他域名的网站上。

## 6. 防编造（AI 版）
- 系统提示要求：只能依据「资料」回答；资料中没有就只输出 `[NO_ANSWER]`；不得猜测电话、日期、金额等具体信息。
- 检索相似度低于阈值时不调用模型，直接转人工（省钱也更安全）。
- `temperature` 设低（如 0.2）。
- 回答附带来源 FAQ id，便于调试。

## 7. 环境变量（`.env.example`）
```
ANSWER_MODE=keyword            # keyword | rag
STORE=json                     # json | supabase
ADMIN_PASSWORD=
DEEPSEEK_API_KEY=
DEEPSEEK_BASE_URL=https://api.deepseek.com
DASHSCOPE_API_KEY=             # 阿里云百炼，用于文本向量
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=     # 仅服务端使用，绝不暴露到前端
```

## 8. Supabase 表结构
```sql
create table leads (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  question text not null,
  bot_answer text,
  created_at timestamptz not null default now()
);
alter table leads enable row level security; -- 只通过服务端密钥访问
```
