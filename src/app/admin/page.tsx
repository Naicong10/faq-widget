"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";

type Lead = {
  id: string;
  email: string;
  question: string;
  botAnswer?: string;
  createdAt: string;
};

export default function AdminPage() {
  const [leads, setLeads] = useState<Lead[] | null>(null);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  async function applyResponse(response: Response) {
    if (response.status === 401) {
      setLeads(null);
      return;
    }
    if (!response.ok) {
      setError("读取留言失败");
      return;
    }
    setLeads((await response.json()) as Lead[]);
  }

  async function load() {
    const response = await fetch("/api/leads");
    await applyResponse(response);
  }

  useEffect(() => {
    let cancelled = false;
    fetch("/api/leads")
      .then((response) => {
        if (!cancelled) return applyResponse(response);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const response = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    if (!response.ok) {
      setError("密码错误");
      return;
    }
    setPassword("");
    await load();
  }

  return (
    <div className="min-h-full bg-[#f3efe6] text-[#1c2833]">
      <header className="border-b border-[#1d4e89]/20">
        <div className="mx-auto flex max-w-5xl items-baseline justify-between px-6 py-5">
          <p className="text-lg font-semibold">星河大学 · 留言</p>
          <Link className="text-sm text-[#1d4e89]" href="/">
            返回首页
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-6 py-10">
        {loading ? <p>正在读取…</p> : null}
        {!loading && leads === null ? (
          <form onSubmit={onSubmit} className="mx-auto flex max-w-sm flex-col gap-3">
            <h1 className="text-2xl font-semibold">管理员登录</h1>
            <p className="text-sm text-[#5c6b7a]">密码来自环境变量 ADMIN_PASSWORD，不会写进页面。</p>
            <label className="text-sm" htmlFor="password">
              密码
            </label>
            <input
              id="password"
              type="password"
              value={password}
              autoComplete="current-password"
              onChange={(event) => setPassword(event.target.value)}
              className="rounded border border-[#1d4e89]/30 bg-white px-3 py-2"
            />
            {error ? <p className="text-sm text-[#9b2c2c]">{error}</p> : null}
            <button type="submit" className="w-fit rounded bg-[#1d4e89] px-4 py-2 text-white">
              登录
            </button>
          </form>
        ) : null}
        {!loading && leads ? (
          <section>
            <h1 className="text-2xl font-semibold">转人工留言</h1>
            {leads.length === 0 ? <p className="mt-4 text-sm text-[#5c6b7a]">还没有留言。</p> : null}
            <ul className="mt-6 flex flex-col gap-4">
              {leads.map((lead) => (
                <li key={lead.id} className="rounded border border-[#1d4e89]/20 bg-white p-4">
                  <p className="text-sm text-[#5c6b7a]">
                    {new Date(lead.createdAt).toLocaleString("zh-CN")} · {lead.email}
                  </p>
                  <p className="mt-2">{lead.question}</p>
                  {lead.botAnswer ? (
                    <p className="mt-2 text-sm text-[#3d4c5c]">机器人：{lead.botAnswer}</p>
                  ) : null}
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </main>
    </div>
  );
}
