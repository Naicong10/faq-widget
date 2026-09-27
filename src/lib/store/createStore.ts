import { createJsonLeadStore } from "./json";
import { createSupabaseLeadStore } from "./supabase";
import type { LeadStore } from "./types";

/** 不写 STORE 时继续用本地 JSON，避免还没配数据库就写不了留言。 */
export function createLeadStore(mode = process.env.STORE?.trim() || "json"): LeadStore {
  // Vercel 文件系统只读且每次部署会换机器，JSON 文件写了也留不住。
  if (process.env.VERCEL && mode !== "supabase") {
    console.warn("Vercel 上 JSON 文件无法写入，请设置 STORE=supabase");
  }
  if (mode === "json") return createJsonLeadStore();
  if (mode === "supabase") return createSupabaseLeadStore();
  throw new Error(`STORE 只能是 json 或 supabase，当前是 ${mode}`);
}
