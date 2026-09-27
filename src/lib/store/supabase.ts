import type { Lead, LeadStore } from "./types";

type LeadRow = {
  id: string;
  email: string;
  question: string;
  bot_answer: string | null;
  created_at: string;
};

function requireEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`缺少环境变量 ${name}`);
  }
  return value;
}

function toLead(row: LeadRow): Lead {
  return {
    id: row.id,
    email: row.email,
    question: row.question,
    ...(row.bot_answer ? { botAnswer: row.bot_answer } : {}),
    createdAt: row.created_at,
  };
}

/**
 * 表开了行级安全，浏览器用的 anon key 读不到数据。
 * 这里只用服务端的 service_role，它能绕过这道限制。
 */
async function rest(path: string, init: RequestInit = {}): Promise<LeadRow[]> {
  const baseUrl = requireEnv("SUPABASE_URL").replace(/\/$/, "");
  const apiKey = requireEnv("SUPABASE_SERVICE_ROLE_KEY");
  const response = await fetch(`${baseUrl}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: apiKey,
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      ...init.headers,
    },
  });

  const body: unknown = await response.json();
  if (!response.ok) {
    const message =
      typeof body === "object" && body !== null && "message" in body
        ? String((body as { message: unknown }).message)
        : response.statusText;
    throw new Error(`Supabase 返回 ${response.status}：${message}`);
  }
  if (!Array.isArray(body)) {
    throw new Error("Supabase 返回的不是留言数组");
  }
  return body as LeadRow[];
}

export function createSupabaseLeadStore(): LeadStore {
  return {
    async add(input) {
      const rows = await rest("leads", {
        method: "POST",
        headers: { Prefer: "return=representation" },
        body: JSON.stringify({
          email: input.email,
          question: input.question,
          ...(input.botAnswer !== undefined ? { bot_answer: input.botAnswer } : {}),
        }),
      });
      const row = rows[0];
      if (!row) {
        throw new Error("Supabase 没有返回刚写入的留言");
      }
      return toLead(row);
    },
    async list() {
      const rows = await rest(
        "leads?select=id,email,question,bot_answer,created_at&order=created_at.desc",
      );
      return rows.map(toLead);
    },
  };
}
