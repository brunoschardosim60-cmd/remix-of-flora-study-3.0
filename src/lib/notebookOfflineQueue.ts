import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";

const KEY = "notebook_offline_queue_v2:";
export const NOTEBOOK_QUEUE_CHANGED = "notebook-queue-changed";

export interface PendingPageUpdate {
  pageId: string;
  content: string;
  drawing_data: Json;
  tags: string[];
  queuedAt: number;
  revision: string;
  template?: string;
}

type Queue = Record<string, PendingPageUpdate>;

function read(userId: string): Queue {
  if (!userId) throw new Error("Entre na sua conta para salvar o caderno.");
  const value: unknown = JSON.parse(localStorage.getItem(KEY + userId) || "{}");
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Não foi possível ler a cópia local. Exporte suas anotações antes de sair.");
  return value as Queue;
}

function write(userId: string, q: Queue) {
  // Falhas devem chegar ao editor: sem esta gravação não há cópia local segura.
  localStorage.setItem(KEY + userId, JSON.stringify(q));
  window.dispatchEvent(new Event(NOTEBOOK_QUEUE_CHANGED));
}

export function enqueuePageUpdate(userId: string, update: Omit<PendingPageUpdate, "queuedAt" | "revision">) {
  const q = read(userId);
  const entry = { ...update, queuedAt: Date.now(), revision: crypto.randomUUID() };
  q[update.pageId] = entry;
  write(userId, q);
  return entry;
}

export function pendingCount(userId: string): number {
  return Object.keys(read(userId)).length;
}

export function getPendingPage(userId: string, pageId: string): PendingPageUpdate | undefined {
  return read(userId)[pageId];
}

export function discardPendingPage(userId: string, pageId: string) {
  const queue = read(userId);
  delete queue[pageId];
  write(userId, queue);
}

// Chamar somente depois de confirmar a propriedade da página no servidor.
export function recoverPendingPage(userId: string, pageId: string): PendingPageUpdate | undefined {
  const current = getPendingPage(userId, pageId);
  if (current) return current;
  const legacy = JSON.parse(localStorage.getItem("notebook_offline_queue_v1") || "{}") as Queue;
  if (!legacy[pageId]) return undefined;
  const recovered = enqueuePageUpdate(userId, { ...legacy[pageId], pageId });
  delete legacy[pageId];
  localStorage.setItem("notebook_offline_queue_v1", JSON.stringify(legacy));
  return recovered;
}

async function drainQueue(userId: string): Promise<{ ok: number; fail: number }> {
  const q = read(userId);
  const entries = Object.values(q);
  let ok = 0;
  let fail = 0;
  for (const entry of entries) {
    try {
      const { data, error } = await supabase
        .from("notebook_pages")
        .update({
          content: entry.content,
          drawing_data: entry.drawing_data,
          tags: entry.tags,
          ...(entry.template ? { template: entry.template } : {}),
        })
        .eq("id", entry.pageId).eq("user_id", userId).select("id");
      if (error) throw error;
      if (!data?.some((row) => row.id === entry.pageId)) throw new Error("A gravação da página não foi confirmada pelo servidor.");
      const latest = read(userId);
      // Não descartar edições feitas enquanto a versão anterior era enviada.
      if (latest[entry.pageId]?.revision === entry.revision) {
        delete latest[entry.pageId];
        write(userId, latest);
      }
      ok++;
    } catch (e) {
      console.warn("Flush failed for", entry.pageId, e);
      fail++;
    }
  }
  return { ok, fail };
}

const inFlight = new Map<string, Promise<{ ok: number; fail: number }>>();
export function flushQueue(userId: string): Promise<{ ok: number; fail: number }> {
  const running = inFlight.get(userId);
  if (running) return running;
  const task = drainQueue(userId).finally(() => inFlight.delete(userId));
  inFlight.set(userId, task);
  return task;
}
