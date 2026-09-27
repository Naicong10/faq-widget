import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { Lead, LeadStore } from "./types";

const defaultFile = path.join(process.cwd(), "data", "leads.json");

export function createJsonLeadStore(filePath = defaultFile): LeadStore {
  // 两次保存如果同时读文件，后写入的会盖掉先写入的。排成一队，避免丢掉留言。
  let queue = Promise.resolve();

  function enqueue<T>(task: () => Promise<T>): Promise<T> {
    const run = queue.then(task, task);
    queue = run.then(
      () => undefined,
      () => undefined,
    );
    return run;
  }

  return {
    add(input) {
      return enqueue(async () => {
        const leads = await readAll(filePath);
        const lead: Lead = {
          id: crypto.randomUUID(),
          email: input.email,
          question: input.question,
          ...(input.botAnswer !== undefined ? { botAnswer: input.botAnswer } : {}),
          createdAt: new Date().toISOString(),
        };
        leads.push(lead);
        await writeAll(filePath, leads);
        return lead;
      });
    },
    list() {
      return enqueue(async () => {
        const leads = await readAll(filePath);
        return leads.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      });
    },
  };
}

async function readAll(filePath: string): Promise<Lead[]> {
  try {
    const text = await readFile(filePath, "utf8");
    const parsed: unknown = JSON.parse(text);
    if (!Array.isArray(parsed)) {
      throw new Error("leads.json 的内容必须是数组");
    }
    return parsed as Lead[];
  } catch (error) {
    if (isNotFound(error)) return [];
    throw error;
  }
}

async function writeAll(filePath: string, leads: Lead[]) {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(leads, null, 2)}\n`, "utf8");
}

function isNotFound(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code: unknown }).code === "ENOENT"
  );
}
