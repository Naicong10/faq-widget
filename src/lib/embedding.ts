// 必须和 data/faq-embeddings.json 里的模型一致，否则余弦相似度没有意义。
export const EMBEDDING_MODEL = "text-embedding-v4";
export const EMBEDDING_DIMENSIONS = 1024;
export const EMBEDDING_ENDPOINT =
  "https://dashscope.aliyuncs.com/compatible-mode/v1/embeddings";

type EmbeddingRow = { index: number; embedding: number[] };

type EmbeddingResponse = {
  data?: EmbeddingRow[];
  error?: { message?: string };
  message?: string;
};

/** 调用百炼，把几段文字变成向量。一次不要超过官方上限 10 条。 */
export async function embedTexts(apiKey: string, texts: string[]): Promise<number[][]> {
  const response = await fetch(EMBEDDING_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    // 向量接口卡住时同样超时，错误交给提问接口统一转人工。
    signal: AbortSignal.timeout(10_000),
    body: JSON.stringify({
      model: EMBEDDING_MODEL,
      input: texts,
      dimensions: EMBEDDING_DIMENSIONS,
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
    if (row.index !== index || row.embedding.length !== EMBEDDING_DIMENSIONS) {
      throw new Error(`第 ${index + 1} 条向量格式不对`);
    }
    return row.embedding;
  });
}
