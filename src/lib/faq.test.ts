import assert from "node:assert/strict";
import { test } from "node:test";
import { loadFaq } from "./faq.ts";

test("解析后的条数和关键内容正确", () => {
  const items = loadFaq();

  assert.equal(items.length, 40);
  assert.equal(items[0]?.id, "faq-01");
  assert.equal(items[0]?.question, "新生什么时候报到？");
  assert.match(items[0]?.answer ?? "", /9 月 1 日和 9 月 2 日/);

  const lightsOut = items.find((item) => item.question === "宿舍几点熄灯？");
  assert.ok(lightsOut);
  assert.equal(lightsOut.id, "faq-06");
  assert.match(lightsOut.answer, /23:30 熄灯/);

  assert.equal(new Set(items.map((item) => item.id)).size, items.length);
  for (const item of items) {
    assert.ok(item.question.length > 0);
    assert.ok(item.answer.length > 0);
  }
});
