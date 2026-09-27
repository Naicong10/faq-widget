import { loadFaq } from "../faq";
import { createKeywordEngine } from "./keyword";
import { createRagEngine, loadEmbeddings } from "./rag";
import type { AnswerEngine } from "./types";

/**
 * 没写 ANSWER_MODE 时用关键词版。
 * 这样本地不配密钥也能继续演示，只有明确写成 rag 才调用付费接口。
 */
export function createAnswerEngine(mode = process.env.ANSWER_MODE?.trim() || "keyword"): AnswerEngine {
  const faqs = loadFaq();
  if (mode === "keyword") return createKeywordEngine(faqs);
  if (mode === "rag") return createRagEngine(faqs, loadEmbeddings());
  throw new Error(`ANSWER_MODE 只能是 keyword 或 rag，当前是 ${mode}`);
}
