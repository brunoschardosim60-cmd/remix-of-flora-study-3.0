import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";

const KEY = "notebook_offline_queue_v1";

export interface PendingPageUpdate {
  pageId: string;
  content: string;
  drawing_data: Json;
  tags: string[];
  queuedAt: number;
}

type Queue = Record<string, PendingPageUpdate>;

function read(): Queue {
  try {
    return JSON.parse(localStorage.getItem(KEY) || "{}") as Queue;
  } catch {
    return {};
  }
}

function write(q: Queue) {
  try {
    localStorage.setItem(KEY, JSON.stringify(q));
  } catch (e) {
    console.warn("Offline queue full:", e);
  }
}

export function enqueuePageUpdate(update: Omit<PendingPageUpdate, "queuedAt">) {
  const q = read();
  q[update.pageId] = { ...update, queuedAt: Date.now() };
  write(q);
}

export function pendingCount(): number {
  return Object.keys(read()).length;
}

export function hasPending(pageId: string): boolean {
  return Boolean(read()[pageId]);
}

export async function flushQueue(): Promise<{ ok: number; fail: number }> {
  const q = read();
  const entries = Object.values(q);
  let ok = 0;
  let fail = 0;
  for (const entry of entries) {
    try {
      const { error } = await supabase
        .from("notebook_pages")
        .update({
          content: entry.content,
          drawing_data: entry.drawing_data,
          tags: entry.tags,
        })
        .eq("id", entry.pageId);
      if (error) throw error;
      delete q[entry.pageId];
      ok++;
    } catch (e) {
      console.warn("Flush failed for", entry.pageId, e);
      fail++;
    }
  }
  write(q);
  return { ok, fail };
}