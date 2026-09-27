import { createHash } from "node:crypto";

export const ADMIN_COOKIE = "admin_session";

/** Cookie 里只放密码的摘要，不放密码本身。没配置密码时不能登录。 */
export function adminToken() {
  const password = process.env.ADMIN_PASSWORD;
  if (!password) return null;
  return createHash("sha256").update(password).digest("hex");
}

export function isAdmin(request: Request) {
  const token = adminToken();
  if (!token) return false;
  const header = request.headers.get("cookie") ?? "";
  for (const part of header.split(";")) {
    const [name, ...rest] = part.trim().split("=");
    if (name === ADMIN_COOKIE && rest.join("=") === token) return true;
  }
  return false;
}
