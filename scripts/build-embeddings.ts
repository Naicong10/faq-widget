import { writeFileSync } from "node:fs";
import path from "node:path";
import { EMBEDDING_DIMENSIONS, EMBEDDING_MODEL, embedTexts } from "../src/lib/embedding.ts";
import { loadFaq } from "../src/lib/faq.ts";

// 官方限制：text-embedding-v4 一次最多 10 条。
const BATCH_SIZE = 10;

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

async function main() {
  const apiKey = requireApiKey();
  const faqs = loadFaq();
  const items: { id: string; embedding: number[] }[] = [];

  for (let start = 0; start < faqs.length; start += BATCH_SIZE) {
    const batch = faqs.slice(start, start + BATCH_SIZE);
    const vectors = await embedTexts(
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
    `${JSON.stringify({ model: EMBEDDING_MODEL, dimensions: EMBEDDING_DIMENSIONS, items })}\n`,
  );
  console.log(`写入 ${filePath}，共 ${items.length} 条`);
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exitCode = 1;
});
