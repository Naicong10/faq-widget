import { createJsonLeadStore } from "./json";
import { createSupabaseLeadStore } from "./supabase";
import type { LeadStore } from "./types";

/** 不写 STORE 时继续用本地 JSON，避免还没配数据库就写不了留言。 */
export function createLeadStore(mode = process.env.STORE?.trim() || "json"): LeadStore {
  if (mode === "json") return createJsonLeadStore();
  if (mode === "supabase") return createSupabaseLeadStore();
  throw new Error(`STORE 只能是 json 或 supabase，当前是 ${mode}`);
}
