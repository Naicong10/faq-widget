type Bucket = {
  count: number;
  resetAt: number;
};

const buckets = new Map<string, Bucket>();

function memoryAllow(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const bucket = buckets.get(key);
  if (!bucket || now >= bucket.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (bucket.count >= limit) return false;
  bucket.count += 1;
  return true;
}

function supabaseConfigured(): boolean {
  return Boolean(process.env.SUPABASE_URL?.trim() && process.env.SUPABASE_SERVICE_ROLE_KEY?.trim());
}

let warnedMissingRpc = false;

function isMissingRpc(error: unknown): boolean {
  const text = error instanceof Error ? error.message : String(error);
  return text.includes("Could not find the function") && text.includes("allow_request");
}

/**
 * 多实例必须把计数放进数据库，否则每台机器各自放行一遍限额。
 * 没配 Supabase 时仍用内存，方便本地不连库也能跑。
 */
export async function allowRequest(key: string, limit: number, windowMs: number): Promise<boolean> {
  if (!supabaseConfigured()) {
    if (process.env.VERCEL) {
      console.warn("Vercel 上内存频率限制不可靠，请配置 SUPABASE_URL 并执行 ARCHITECTURE 里的计数表 SQL");
    }
    return memoryAllow(key, limit, windowMs);
  }

  try {
    return await supabaseAllow(key, limit, windowMs);
  } catch (error) {
    if (isMissingRpc(error)) {
      if (!warnedMissingRpc) {
        warnedMissingRpc = true;
        console.warn("还没有 allow_request 函数，暂时用内存计数。请在 Supabase SQL Editor 执行 ARCHITECTURE.md 第 8 节的 SQL。");
      }
      return memoryAllow(key, limit, windowMs);
    }
    console.error("频率限制查询失败：", error);
    // 线上查库失败则拒绝，避免刷额度；本地回退内存，方便继续开发。
    if (process.env.VERCEL) return false;
    return memoryAllow(key, limit, windowMs);
  }
}

async function supabaseAllow(key: string, limit: number, windowMs: number): Promise<boolean> {
  const baseUrl = process.env.SUPABASE_URL!.replace(/\/$/, "");
  const apiKey = process.env.SUPABASE_SERVICE_ROLE_KEY!.trim();
  const response = await fetch(`${baseUrl}/rest/v1/rpc/allow_request`, {
    method: "POST",
    headers: {
      apikey: apiKey,
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    signal: AbortSignal.timeout(5_000),
    body: JSON.stringify({ p_key: key, p_limit: limit, p_window_ms: windowMs }),
  });

  const body: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const message =
      typeof body === "object" && body !== null && "message" in body
        ? String((body as { message: unknown }).message)
        : response.statusText;
    throw new Error(`Supabase 返回 ${response.status}：${message}`);
  }
  if (typeof body !== "boolean") {
    throw new Error("allow_request 没有返回布尔值");
  }
  return body;
}

// 反向代理会把真实地址放在这个头的第一段。本地开发没有代理时，所有请求算同一个来源。
export function clientAddress(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  const first = forwarded?.split(",")[0]?.trim();
  return first || request.headers.get("x-real-ip") || "local";
}
