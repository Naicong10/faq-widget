import assert from "node:assert/strict";
import { test } from "node:test";
import { loadFaq } from "../faq.ts";
import { createKeywordEngine } from "./keyword.ts";

const engine = createKeywordEngine(loadFaq());

test("原题能答对：宿舍几点熄灯", async () => {
  const result = await engine.answer("宿舍几点熄灯？");
  assert.equal(result.handoff, false);
  assert.deepEqual(result.sources, ["faq-06"]);
  assert.match(result.answer, /23:30 熄灯/);
  assert.ok(result.suggestions?.includes("本科生宿舍是几人间，有空调吗？"));
  assert.equal(result.suggestions?.includes("宿舍几点熄灯？"), false);
});

test("原题能答对：校园卡丢了怎么补办", async () => {
  const result = await engine.answer("校园卡丢了怎么补办？");
  assert.equal(result.handoff, false);
  assert.deepEqual(result.sources, ["faq-12"]);
  assert.match(result.answer, /挂失/);
});

test("近似问法能答对：宿舍什么时候熄灯", async () => {
  const result = await engine.answer("宿舍什么时候熄灯");
  assert.equal(result.handoff, false);
  assert.deepEqual(result.sources, ["faq-06"]);
  assert.match(result.answer, /23:30 熄灯/);
});

test("近似问法能答对：晚上宿舍几点关灯", async () => {
  const result = await engine.answer("晚上宿舍几点关灯");
  assert.equal(result.handoff, false);
  assert.deepEqual(result.sources, ["faq-06"]);
});

test("近似问法能答对：校园卡不见了如何补办", async () => {
  const result = await engine.answer("校园卡不见了如何补办");
  assert.equal(result.handoff, false);
  assert.deepEqual(result.sources, ["faq-12"]);
});

test("无关问题转人工：校长手机号", async () => {
  const result = await engine.answer("校长的手机号是多少");
  assert.equal(result.handoff, true);
  assert.deepEqual(result.sources, []);
  assert.equal(result.suggestions, undefined);
});

test("无关问题转人工：明天会下雨吗", async () => {
  const result = await engine.answer("明天会下雨吗");
  assert.equal(result.handoff, true);
  assert.deepEqual(result.sources, []);
});
