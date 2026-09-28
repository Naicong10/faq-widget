import { createHash, createHmac, timingSafeEqual } from "node:crypto";

export const ADMIN_COOKIE = "admin_session";
export const ADMIN_SESSION_MAX_AGE = 7 * 24 * 60 * 60;

function requireSecret(): string | null {
  const secret = process.env.ADMIN_SESSION_SECRET?.trim();
  return secret || null;
}

/** 两边都先哈希成同样长的字节，再恒定时间比较，避免用时长短把密码长度漏出去。 */
export function passwordsMatch(given: string, expected: string): boolean {
  const left = createHash("sha256").update(given).digest();
  const right = createHash("sha256").update(expected).digest();
  return timingSafeEqual(left, right);
}

function tokensMatch(given: string, expected: string): boolean {
  const left = Buffer.from(given);
  const right = Buffer.from(expected);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

/**
 * Cookie 用独立密钥做 HMAC，不再放密码的 sha256。
 * 别人就算偷到 cookie，没有密钥也没法反推或撞出密码。
 */
export function adminToken() {
  const password = process.env.ADMIN_PASSWORD;
  const secret = requireSecret();
  if (!password || !secret) return null;
  return createHmac("sha256", secret).update(password).digest("hex");
}

export function isAdmin(request: Request) {
  const token = adminToken();
  if (!token) return false;
  const header = request.headers.get("cookie") ?? "";
  for (const part of header.split(";")) {
    const [name, ...rest] = part.trim().split("=");
    if (name === ADMIN_COOKIE && tokensMatch(rest.join("="), token)) return true;
  }
  return false;
}
