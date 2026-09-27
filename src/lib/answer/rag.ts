import { readFileSync } from "node:fs";
import path from "node:path";
import { embedTexts } from "../embedding";
import type { FaqItem } from "../faq";
import type { AnswerEngine, ChatResponse } from "./types";

// 实测：原题约 0.90，换种说法约 0.85；「怎么办理护照」最高 0.47，「天气」约 0.28。
// 0.55 落在中间，套话问题不会拿去调用模型。
const MATCH_THRESHOLD = 0.55;
const TOP_K = 3;
const CHAT_MODEL = "deepseek-flash";
const NO_ANSWER_MARK = "[NO_ANSWER]";
const NO_ANSWER = "我没有在现有 FAQ 里找到这个问题的答案。";

const SYSTEM_PROMPT = [
  "你是星河大学的招生答疑助手。只能根据用户消息里的「资料」回答。",
  "不得猜测或补充资料里没有的电话、日期、金额、地点等具体信息。",
  "如果资料不足以回答这个问题，只输出 [NO_ANSWER]，不要输出其他文字。",
].join("\n");

export type StoredEmbedding = {
  id: string;
  embedding: number[];
};

type EmbeddingsFile = {
  model: string;
  dimensions: number;
  items: StoredEmbedding[];
};

type ChatCompletion = {
  choices?: { message?: { content?: string | null } }[];
  error?: { message?: string };
  message?: string;
};

/** 点积除以两段长度。两段越同向越接近 1，和句子长短无关。 */
export function cosineSimilarity(left: number[], right: number[]): number {
  if (left.length !== right.length || left.length === 0) return 0;

  let dot = 0;
  let leftNorm = 0;
  let rightNorm = 0;
  for (let i = 0; i < left.length; i++) {
    const a = left[i] ?? 0;
    const b = right[i] ?? 0;
    dot += a * b;
    leftNorm += a * a;
    rightNorm += b * b;
  }

  const denom = Math.sqrt(leftNorm) * Math.sqrt(rightNorm);
  return denom === 0 ? 0 : dot / denom;
}

export function loadEmbeddings(
  filePath = path.join(process.cwd(), "data", "faq-embeddings.json"),
): StoredEmbedding[] {
  const file = JSON.parse(readFileSync(filePath, "utf8")) as EmbeddingsFile;
  if (file.model !== "text-embedding-v4" || file.dimensions !== 1024) {
    throw new Error("faq-embeddings.json 的模型或维度和当前代码不一致，请重新运行 npm run build:embeddings");
  }
  return file.items;
}

function requireEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`缺少环境变量 ${name}`);
  }
  return value;
}

function handoff(sources: string[] = []): ChatResponse {
  return { answer: NO_ANSWER, handoff: true, sources };
}

async function askDeepSeek(question: string, contexts: FaqItem[]): Promise<string> {
  const apiKey = requireEnv("DEEPSEEK_API_KEY");
  const baseUrl = (process.env.DEEPSEEK_BASE_URL?.trim() || "https://api.deepseek.com").replace(
    /\/$/,
    "",
  );
  const material = contexts
    .map((item) => `[${item.id}]\n问题：${item.question}\n答案：${item.answer}`)
    .join("\n\n");

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: CHAT_MODEL,
      temperature: 0.2,
      // 默认会先写很长的思考过程，并且忽略 temperature。FAQ 问答不需要思考。
      thinking: { type: "disabled" },
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: `资料：\n${material}\n\n问题：${question}` },
      ],
    }),
  });

  const body = (await response.json()) as ChatCompletion;
  if (!response.ok) {
    const message = body.error?.message ?? body.message ?? response.statusText;
    throw new Error(`DeepSeek 返回 ${response.status}：${message}`);
  }

  return body.choices?.[0]?.message?.content?.trim() ?? "";
}

export function createRagEngine(faqs: FaqItem[], embeddings: StoredEmbedding[]): AnswerEngine {
  const byId = new Map(faqs.map((item) => [item.id, item]));
  const rows = embeddings.flatMap((record) => {
    const item = byId.get(record.id);
    return item ? [{ item, embedding: record.embedding }] : [];
  });
  if (rows.length !== faqs.length) {
    throw new Error("向量条数和 FAQ 对不上，请重新运行 npm run build:embeddings");
  }

  return {
    async answer(question: string): Promise<ChatResponse> {
      const [queryVector] = await embedTexts(requireEnv("DASHSCOPE_API_KEY"), [question]);
      if (!queryVector) {
        throw new Error("问题向量化失败");
      }

      const ranked = rows
        .map((row) => ({
          item: row.item,
          score: cosineSimilarity(queryVector, row.embedding),
        }))
        .sort((a, b) => b.score - a.score);
      const best = ranked[0];
      const top = ranked.slice(0, TOP_K);

      // 最高分都不够像，就不要花钱调用大模型，也避免它拿着不相关资料硬编。
      if (!best || best.score < MATCH_THRESHOLD) {
        return handoff();
      }

      const answer = await askDeepSeek(
        question,
        top.map((row) => row.item),
      );
      const sources = top.map((row) => row.item.id);
      if (!answer || answer.includes(NO_ANSWER_MARK)) {
        return handoff(sources);
      }

      return { answer, handoff: false, sources };
    },
  };
}
