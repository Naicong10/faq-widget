import { NextResponse } from "next/server";
import { ADMIN_COOKIE, adminToken } from "@/lib/adminAuth";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "请求体不是合法的 JSON" }, { status: 400 });
  }

  const password =
    typeof body === "object" && body !== null && "password" in body
      ? (body as { password: unknown }).password
      : undefined;
  const expected = process.env.ADMIN_PASSWORD;
  const token = adminToken();
  if (!expected || !token || typeof password !== "string" || password !== expected) {
    return NextResponse.json({ error: "密码错误" }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true });
  // httpOnly：页面里的 JavaScript 读不到这张 cookie，只能由浏览器在访问接口时自动带上。
  response.cookies.set({
    name: ADMIN_COOKIE,
    value: token,
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: process.env.NODE_ENV === "production",
  });
  return response;
}
