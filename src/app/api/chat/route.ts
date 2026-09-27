import { NextResponse } from "next/server";
import { createKeywordEngine } from "@/lib/answer/keyword";
import type { ChatResponse } from "@/lib/answer/types";
import { loadFaq } from "@/lib/faq";
import { allowRequest, clientAddress } from "@/lib/rateLimit";

// 常见问题都很短。超长文本多半是误粘贴，接上模型后也会白白消耗额度。
const MAX_QUESTION_LENGTH = 200;
// 正常访客一分钟问不了这么多。挡住脚本连刷，避免以后接上模型时把额度打光。
const CHAT_LIMIT = 20;
const WINDOW_MS = 60_000;

const engine = createKeywordEngine(loadFaq());

// 小部件会嵌在别的网站上，浏览器默认禁止跨域读接口。允许任意来源调用这个公开接口。
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

function json(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: CORS_HEADERS });
}

export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

export async function POST(request: Request) {
  if (!allowRequest(`chat:${clientAddress(request)}`, CHAT_LIMIT, WINDOW_MS)) {
    return json({ error: "请求太频繁，请稍后再试" }, 429);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ error: "请求体不是合法的 JSON" }, 400);
  }

  if (typeof body !== "object" || body === null || !("question" in body)) {
    return json({ error: "缺少 question 字段" }, 400);
  }

  const { question } = body;
  if (typeof question !== "string") {
    return json({ error: "question 必须是字符串" }, 400);
  }

  const trimmed = question.trim();
  if (!trimmed) {
    return json({ error: "问题不能为空" }, 400);
  }
  if (trimmed.length > MAX_QUESTION_LENGTH) {
    return json({ error: `问题不能超过 ${MAX_QUESTION_LENGTH} 个字` }, 400);
  }

  const result: ChatResponse = await engine.answer(trimmed);
  return json(result);
}
