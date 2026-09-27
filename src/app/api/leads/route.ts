import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/adminAuth";
import { createJsonLeadStore } from "@/lib/store/json";

const MAX_EMAIL_LENGTH = 254;
const MAX_QUESTION_LENGTH = 200;
const MAX_BOT_ANSWER_LENGTH = 2000;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const store = createJsonLeadStore();

// 和提问接口一样，小部件会从别的网站提交留言。
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
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ error: "请求体不是合法的 JSON" }, 400);
  }

  if (typeof body !== "object" || body === null) {
    return json({ error: "请求体格式不正确" }, 400);
  }

  const record = body as Record<string, unknown>;
  const email = readText(record.email, "email", MAX_EMAIL_LENGTH);
  if (email instanceof NextResponse) return email;
  if (!EMAIL_PATTERN.test(email)) {
    return json({ error: "邮箱格式不正确" }, 400);
  }

  const question = readText(record.question, "question", MAX_QUESTION_LENGTH);
  if (question instanceof NextResponse) return question;

  let botAnswer: string | undefined;
  if (record.botAnswer != null && record.botAnswer !== "") {
    const answer = readText(record.botAnswer, "botAnswer", MAX_BOT_ANSWER_LENGTH);
    if (answer instanceof NextResponse) return answer;
    botAnswer = answer;
  }

  const lead = await store.add({ email, question, ...(botAnswer ? { botAnswer } : {}) });
  return json(lead, 201);
}

export async function GET(request: Request) {
  if (!isAdmin(request)) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }
  return NextResponse.json(await store.list());
}

function readText(value: unknown, field: string, maxLength: number): string | NextResponse {
  if (typeof value !== "string") {
    return json({ error: `${field} 必须是字符串` }, 400);
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return json({ error: `${field} 不能为空` }, 400);
  }
  if (trimmed.length > maxLength) {
    return json({ error: `${field} 不能超过 ${maxLength} 个字` }, 400);
  }
  return trimmed;
}
