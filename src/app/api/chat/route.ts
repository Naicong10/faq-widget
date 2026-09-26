import { NextResponse } from "next/server";
import { createKeywordEngine } from "@/lib/answer/keyword";
import type { ChatResponse } from "@/lib/answer/types";
import { loadFaq } from "@/lib/faq";

// 常见问题都很短。超长文本多半是误粘贴，接上模型后也会白白消耗额度。
const MAX_QUESTION_LENGTH = 200;

const engine = createKeywordEngine(loadFaq());

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "请求体不是合法的 JSON" }, { status: 400 });
  }

  if (typeof body !== "object" || body === null || !("question" in body)) {
    return NextResponse.json({ error: "缺少 question 字段" }, { status: 400 });
  }

  const { question } = body;
  if (typeof question !== "string") {
    return NextResponse.json({ error: "question 必须是字符串" }, { status: 400 });
  }

  const trimmed = question.trim();
  if (!trimmed) {
    return NextResponse.json({ error: "问题不能为空" }, { status: 400 });
  }
  if (trimmed.length > MAX_QUESTION_LENGTH) {
    return NextResponse.json(
      { error: `问题不能超过 ${MAX_QUESTION_LENGTH} 个字` },
      { status: 400 },
    );
  }

  const result: ChatResponse = await engine.answer(trimmed);
  return NextResponse.json(result);
}
