"use client";

import { useState, type FormEvent } from "react";

type ChatResponse = {
  answer: string;
  handoff: boolean;
  sources: string[];
  suggestions?: string[];
};

function isChatResponse(value: unknown): value is ChatResponse {
  if (typeof value !== "object" || value === null) return false;
  const record = value as Record<string, unknown>;
  return typeof record.answer === "string" && typeof record.handoff === "boolean";
}

export default function TryPage() {
  const [question, setQuestion] = useState("宿舍几点熄灯？");
  const [result, setResult] = useState<ChatResponse | null>(null);
  const [raw, setRaw] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // 页面不能直接调用回答函数，必须走 HTTP，才能确认从前端到接口是通的。
  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setResult(null);
    setRaw("");

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question }),
      });
      const data: unknown = await response.json();
      if (!response.ok) {
        const message =
          typeof data === "object" &&
          data !== null &&
          "error" in data &&
          typeof data.error === "string"
            ? data.error
            : "请求失败";
        setError(message);
        return;
      }
      setRaw(JSON.stringify(data, null, 2));
      if (isChatResponse(data)) setResult(data);
    } catch {
      setError("网络请求失败");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-4 p-6">
      <h1 className="text-2xl font-semibold">接口测试</h1>
      <p className="text-sm opacity-70">
        临时页面，用来确认提问接口是否可用。正式首页做好后会删掉。
      </p>
      <form onSubmit={onSubmit} className="flex flex-col gap-3">
        <label htmlFor="question" className="text-sm">
          问题
        </label>
        <textarea
          id="question"
          name="question"
          value={question}
          rows={3}
          onChange={(event) => setQuestion(event.target.value)}
          className="rounded border border-current/20 bg-transparent p-2"
        />
        <button
          type="submit"
          disabled={loading}
          className="w-fit rounded bg-foreground px-4 py-2 text-background disabled:opacity-50"
        >
          {loading ? "提问中…" : "提问"}
        </button>
      </form>
      {error ? <p className="text-red-600">{error}</p> : null}
      {result ? (
        <section className="flex flex-col gap-2 text-sm">
          <p>{result.answer}</p>
          <p>转人工：{result.handoff ? "是" : "否"}</p>
          <p>来源：{result.sources.join("、") || "无"}</p>
          {result.suggestions && result.suggestions.length > 0 ? (
            <p>相关问题：{result.suggestions.join("、")}</p>
          ) : null}
        </section>
      ) : null}
      {raw ? (
        <pre className="overflow-auto rounded bg-black/5 p-4 text-sm">{raw}</pre>
      ) : null}
    </main>
  );
}
