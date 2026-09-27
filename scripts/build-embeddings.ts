import { writeFileSync } from "node:fs";
import path from "node:path";
import { loadFaq } from "../src/lib/faq.ts";

// 北京地域的旧域名仍可用，这样不必再要业务空间 ID。
const ENDPOINT = "https://dashscope.aliyuncs.com/compatible-mode/v1/embeddings";
const MODEL = "text-embedding-v4";
const DIMENSIONS = 1024;
// 官方限制：这个模型一次最多 10 条。
const BATCH_SIZE = 10;

type EmbeddingRow = { index: number; embedding: number[] };

type EmbeddingResponse = {
  data?: EmbeddingRow[];
  error?: { message?: string };
  message?: string;
};

/**
 * 问题和答案拼在一起再向量化。
 * 用户换种说法时，答案里的词也能被对上；只向量化问题会丢掉答案里的事实。
 */
function embeddingText(question: string, answer: string): string {
  return `${question}\n${answer}`;
}

function requireApiKey(): string {
  const apiKey = process.env.DASHSCOPE_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("缺少环境变量 DASHSCOPE_API_KEY。请写在 .env.local，并用 --env-file 启动。");
  }
  return apiKey;
}

async function embedBatch(apiKey: string, texts: string[]): Promise<number[][]> {
  const response = await fetch(ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL,
      input: texts,
      dimensions: DIMENSIONS,
      encoding_format: "float",
    }),
  });

  const body = (await response.json()) as EmbeddingResponse;
  if (!response.ok) {
    const message = body.error?.message ?? body.message ?? response.statusText;
    throw new Error(`向量接口返回 ${response.status}：${message}`);
  }

  const rows = body.data;
  if (!rows || rows.length !== texts.length) {
    throw new Error(`向量条数不对：期望 ${texts.length}，实际 ${rows?.length ?? 0}`);
  }

  const ordered = [...rows].sort((a, b) => a.index - b.index);
  return ordered.map((row, index) => {
    if (row.index !== index || row.embedding.length !== DIMENSIONS) {
      throw new Error(`第 ${index + 1} 条向量格式不对`);
    }
    return row.embedding;
  });
}

async function main() {
  const apiKey = requireApiKey();
  const faqs = loadFaq();
  const items: { id: string; embedding: number[] }[] = [];

  for (let start = 0; start < faqs.length; start += BATCH_SIZE) {
    const batch = faqs.slice(start, start + BATCH_SIZE);
    const vectors = await embedBatch(
      apiKey,
      batch.map((item) => embeddingText(item.question, item.answer)),
    );
    batch.forEach((item, index) => {
      const embedding = vectors[index];
      if (!embedding) {
        throw new Error(`缺少 ${item.id} 的向量`);
      }
      items.push({ id: item.id, embedding });
    });
    console.log(`已向量化 ${Math.min(start + BATCH_SIZE, faqs.length)}/${faqs.length}`);
  }

  const filePath = path.join(process.cwd(), "data", "faq-embeddings.json");
  // 改了 faq.md 后要重新跑本脚本，否则 id 还在，向量已经和原文对不上。
  writeFileSync(
    filePath,
    `${JSON.stringify({ model: MODEL, dimensions: DIMENSIONS, items })}\n`,
  );
  console.log(`写入 ${filePath}，共 ${items.length} 条`);
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exitCode = 1;
});
