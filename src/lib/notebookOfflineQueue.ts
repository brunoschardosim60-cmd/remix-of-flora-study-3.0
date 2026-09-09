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
  baseUpdatedAt?: string;
}

type Queue = Record<string, PendingPageUpdate>;
const confirmedVersions = new Map<string, string>();
const queueErrors = new Map<string, string>();
export function rememberNotebookVersion(userId: string, pageId: string, version: string) {
  confirmedVersions.set(`${userId}:${pageId}`, version);
}
export function notebookQueueError(userId: string) { return queueErrors.get(userId) ?? ""; }

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
  const baseUpdatedAt = q[update.pageId] ? q[update.pageId].baseUpdatedAt : confirmedVersions.get(`${userId}:${update.pageId}`) ?? update.baseUpdatedAt;
  const entry = { ...update, baseUpdatedAt, queuedAt: Date.now(), revision: crypto.randomUUID() };
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
  if (!Object.keys(queue).length) queueErrors.delete(userId);
  write(userId, queue);
}

// Chamar somente depois de confirmar a propriedade da página no servidor.
export function recoverPendingPage(userId: string, pageId: string): PendingPageUpdate | undefined {
  const current = getPendingPage(userId, pageId);
  if (current) return current;
  const legacy = JSON.parse(localStorage.getItem("notebook_offline_queue_v1") || "{}") as Queue;
  if (!legacy[pageId]) return undefined;
  // A legacy draft has no proven base version, even if a newer server row was read.
  const queue = read(userId);
  const recovered = { ...legacy[pageId], pageId, baseUpdatedAt: undefined, queuedAt: Date.now(), revision: crypto.randomUUID() };
  queue[pageId] = recovered;
  write(userId, queue);
  delete legacy[pageId];
  localStorage.setItem("notebook_offline_queue_v1", JSON.stringify(legacy));
  return recovered;
}

async function drainQueue(userId: string): Promise<{ ok: number; fail: number }> {
  const q = read(userId);
  const entries = Object.values(q);
  let ok = 0;
  let fail = 0;
  queueErrors.delete(userId);
  for (const entry of entries) {
    try {
      if (!entry.baseUpdatedAt) throw new Error("Esta cópia local é anterior à proteção de versões. Exporte o caderno antes de reconciliar com o servidor; nenhum conteúdo foi sobrescrito.");
      const { data, error } = await supabase
        .from("notebook_pages")
        .update({
          content: entry.content,
          drawing_data: entry.drawing_data,
          tags: entry.tags,
          updated_at: new Date().toISOString(),
          ...(entry.template ? { template: entry.template } : {}),
        })
        .eq("id", entry.pageId).eq("user_id", userId).eq("updated_at", entry.baseUpdatedAt).select("id,updated_at");
      if (error) throw error;
      if (!data?.some((row) => row.id === entry.pageId)) throw new Error("A página mudou em outro dispositivo ou não está mais disponível. Sua cópia local foi preservada. Exporte-a antes de comparar as versões; o servidor não foi sobrescrito.");
      const version = data.find((row) => row.id === entry.pageId)?.updated_at;
      if (version) rememberNotebookVersion(userId, entry.pageId, version);
      const latest = read(userId);
      // Não descartar edições feitas enquanto a versão anterior era enviada.
      if (latest[entry.pageId]?.revision === entry.revision) {
        delete latest[entry.pageId];
        write(userId, latest);
      } else if (latest[entry.pageId] && version) {
        latest[entry.pageId].baseUpdatedAt = version;
        write(userId, latest);
      }
      ok++;
    } catch (e) {
      queueErrors.set(userId, e instanceof Error ? e.message : "Não foi possível confirmar o salvamento.");
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
