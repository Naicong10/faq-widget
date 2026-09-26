import { readFileSync } from "node:fs";
import path from "node:path";

export type FaqItem = {
  id: string;
  question: string;
  answer: string;
  category?: string;
};

/**
 * 按「## Q:」切开。文件里没有别的二级标题，答案以后写成多行时也不会串到下一条。
 * id 按文件顺序编号，不改顺序时同一条问答的 id 保持不变。
 */
export function parseFaq(markdown: string): FaqItem[] {
  const normalized = markdown.replace(/^\uFEFF/, "").replace(/\r\n/g, "\n");
  const blocks = normalized.split(/^## Q:[ \t]*/m).slice(1);

  return blocks.map((block, index) => {
    const trimmed = block.trim();
    const newlineAt = trimmed.indexOf("\n");
    const question = (newlineAt === -1 ? trimmed : trimmed.slice(0, newlineAt)).trim();
    const rest = newlineAt === -1 ? "" : trimmed.slice(newlineAt + 1).trim();

    if (!question || !rest.startsWith("A:")) {
      throw new Error(
        `第 ${index + 1} 条 FAQ 格式不对，需要「## Q:」并且下一行以「A:」开头`,
      );
    }

    const answer = rest.slice(2).trim();
    if (!answer) {
      throw new Error(`第 ${index + 1} 条 FAQ 没有答案：${question}`);
    }

    return {
      id: `faq-${String(index + 1).padStart(2, "0")}`,
      question,
      answer,
    };
  });
}

/** Next 和 npm test 都从项目根目录启动，所以用当前工作目录找资料文件。 */
export function loadFaq(
  filePath = path.join(process.cwd(), "data", "faq.md"),
): FaqItem[] {
  return parseFaq(readFileSync(filePath, "utf8"));
}
