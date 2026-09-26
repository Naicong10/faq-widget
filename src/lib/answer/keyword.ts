import type { FaqItem } from "../faq";
import type { AnswerEngine, ChatResponse } from "./types";

// 原题接近 1，换一种说法大约 0.3–0.5，无关问题通常更低。低于此线就转人工，避免只靠个别相同的字乱答。
const MATCH_THRESHOLD = 0.3;
// 没达到答题线、但重合还比较多的问题，用来做「你可能还想问」。
const SUGGEST_THRESHOLD = 0.18;
const SUGGEST_LIMIT = 3;

const NO_ANSWER = "我没有在现有 FAQ 里找到这个问题的答案。";

// 「什么、怎么、哪里、时候」几乎每句都有。先去掉这些字，避免不相关的问题只因为套话撞在一起。
const STOP_CHARS = "的了吗呢吧啊呀嘛是在有和与或这那怎么什么时候哪里何如";

/** 只留下汉字、数字和英文，避免标点把相邻两个字拆开。 */
function compact(text: string): string[] {
  const kept = text
    .toLowerCase()
    .replace(/[^\p{Script=Han}\p{N}a-z]/gu, "")
    .replace(new RegExp(`[${STOP_CHARS}]`, "g"), "");
  return [...kept];
}

/** 中文没有空格，按相邻两个字切成二元组，才能比较两句话像不像。 */
function bigrams(text: string): Set<string> {
  const tokens = compact(text);
  const grams = new Set<string>();
  for (let i = 0; i < tokens.length - 1; i++) {
    grams.add(tokens[i] + tokens[i + 1]);
  }
  return grams;
}

/** Dice 系数：重合二元组越多越接近 1，问句长短不同时也不会只偏向长句。 */
export function bigramSimilarity(left: string, right: string): number {
  const a = bigrams(left);
  const b = bigrams(right);
  if (a.size === 0 || b.size === 0) return 0;

  let overlap = 0;
  for (const gram of a) {
    if (b.has(gram)) overlap++;
  }
  return (2 * overlap) / (a.size + b.size);
}

export function createKeywordEngine(items: FaqItem[]): AnswerEngine {
  return {
    async answer(question: string): Promise<ChatResponse> {
      const ranked = items
        .map((item) => ({
          item,
          score: bigramSimilarity(question, item.question),
        }))
        .sort((a, b) => b.score - a.score);

      const best = ranked[0];
      const matched = best !== undefined && best.score >= MATCH_THRESHOLD;
      const suggestions = (matched ? ranked.slice(1) : ranked)
        .filter((row) => row.score >= SUGGEST_THRESHOLD)
        .slice(0, SUGGEST_LIMIT)
        .map((row) => row.item.question);

      if (!matched || best === undefined) {
        return {
          answer: NO_ANSWER,
          handoff: true,
          sources: [],
          ...(suggestions.length > 0 ? { suggestions } : {}),
        };
      }

      return {
        answer: best.item.answer,
        handoff: false,
        sources: [best.item.id],
        ...(suggestions.length > 0 ? { suggestions } : {}),
      };
    },
  };
}
