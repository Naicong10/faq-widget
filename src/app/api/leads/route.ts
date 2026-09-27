import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/adminAuth";
import { allowRequest, clientAddress } from "@/lib/rateLimit";
import { createLeadStore } from "@/lib/store/createStore";

const MAX_EMAIL_LENGTH = 254;
const MAX_QUESTION_LENGTH = 200;
const MAX_BOT_ANSWER_LENGTH = 2000;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// 留言是人手填的，一分钟提交几次已经很多。再多就当成刷留言。
const LEAD_LIMIT = 5;
const WINDOW_MS = 60_000;

const store = createLeadStore();

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
  if (!(await allowRequest(`leads:${clientAddress(request)}`, LEAD_LIMIT, WINDOW_MS))) {
    return json({ error: "请求太频繁，请稍后再试" }, 429);
  }

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

  try {
    const lead = await store.add({ email, question, ...(botAnswer ? { botAnswer } : {}) });
    return json(lead, 201);
  } catch (error) {
    // 磁盘写不进或数据库挂了时，不要把内部报错丢给访客。
    console.error("留言保存失败：", error);
    return json({ error: "留言保存失败，请稍后再试" }, 500);
  }
}

export async function GET(request: Request) {
  if (!isAdmin(request)) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }
  try {
    return NextResponse.json(await store.list());
  } catch (error) {
    console.error("留言列表读取失败：", error);
    return NextResponse.json({ error: "留言保存失败，请稍后再试" }, { status: 500 });
  }
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
