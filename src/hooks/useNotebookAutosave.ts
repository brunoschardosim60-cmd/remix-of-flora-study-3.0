import { useCallback, useEffect, useState } from "react";
import { enqueuePageUpdate, flushQueue, pendingCount, NOTEBOOK_QUEUE_CHANGED, type PendingPageUpdate } from "@/lib/notebookOfflineQueue";
import { notebookQueueError } from "@/lib/notebookOfflineQueue";

type Snapshot = Omit<PendingPageUpdate, "queuedAt" | "revision">;
type SaveStatus = "idle" | "saving" | "saved" | "error" | "offline";
// Conserva edições em memória quando o dispositivo está sem espaço, inclusive
// ao navegar entre páginas. A interface avisa que elas ainda não estão protegidas.
const unsaved = new Map<string, Map<string, Snapshot>>();
let unloadGuardInstalled = false;
function protectMemory(event: BeforeUnloadEvent) {
  if (![...unsaved.values()].some((pages) => pages.size)) return;
  event.preventDefault();
  event.returnValue = "";
}
function syncUnloadProtection() {
  const hasUnsaved = [...unsaved.values()].some((pages) => pages.size > 0);
  if (hasUnsaved && !unloadGuardInstalled) window.addEventListener("beforeunload", protectMemory);
  if (!hasUnsaved && unloadGuardInstalled) window.removeEventListener("beforeunload", protectMemory);
  unloadGuardInstalled = hasUnsaved;
}
function volatileFor(userId: string) {
  if (!unsaved.has(userId)) unsaved.set(userId, new Map());
  return unsaved.get(userId)!;
}

export function getUnsavedPageSnapshot(userId: string, pageId: string) {
  return volatileFor(userId).get(pageId);
}

export function discardUnsavedPage(userId: string, pageId: string) {
  volatileFor(userId).delete(pageId);
  syncUnloadProtection();
}

export function useNotebookAutosave(userId: string | undefined, snapshot: Snapshot | null) {
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [pendingOffline, setPendingOffline] = useState(0);
  const [saveError, setSaveError] = useState("");
  const signature = JSON.stringify(snapshot);

  const refresh = useCallback(() => {
    if (!userId) return;
    try {
      const count = pendingCount(userId);
      setPendingOffline(count);
      if (notebookQueueError(userId)) { setSaveStatus("error"); setSaveError(notebookQueueError(userId)); }
      else if (volatileFor(userId).size) setSaveStatus("error");
      else setSaveStatus(count ? "offline" : "saved");
    } catch {
      setSaveStatus("error");
      setSaveError("Não foi possível ler a cópia local. Exporte o caderno antes de sair.");
    }
  }, [userId]);

  const retrySave = useCallback(async () => {
    if (!userId) return;
    try {
      const pending = volatileFor(userId);
      for (const [pageId, update] of pending) {
        enqueuePageUpdate(userId, update);
        pending.delete(pageId);
        syncUnloadProtection();
      }
      if (navigator.onLine && pendingCount(userId)) {
        setSaveStatus("saving");
        await flushQueue(userId);
      }
      setSaveError("");
      refresh();
    } catch {
      setSaveStatus("error");
      setSaveError("Não foi possível proteger a cópia local. Libere espaço ou exporte o caderno antes de sair.");
    }
  }, [refresh, userId]);

  useEffect(() => {
    if (!userId || signature === "null") return;
    const update = JSON.parse(signature) as Snapshot;
    const pending = volatileFor(userId);
    pending.set(update.pageId, update);
    syncUnloadProtection();
    try {
      enqueuePageUpdate(userId, update);
      pending.delete(update.pageId);
      syncUnloadProtection();
      setSaveError("");
      setSaveStatus(navigator.onLine ? "saving" : "offline");
      setPendingOffline(pendingCount(userId));
    } catch {
      setSaveStatus("error");
      setSaveError("Não foi possível proteger a cópia local. Libere espaço ou exporte o caderno antes de sair.");
    }
    const timer = window.setTimeout(() => void retrySave(), 800);
    // Trocar de página cancela só o envio; a edição já está na fila persistida.
    return () => window.clearTimeout(timer);
  }, [signature, userId, retrySave]);

  useEffect(() => {
    const onOnline = () => void retrySave();
    const onHidden = () => { if (document.visibilityState === "hidden") void retrySave(); };
    const timer = window.setInterval(onOnline, 15000);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", refresh);
    window.addEventListener(NOTEBOOK_QUEUE_CHANGED, refresh);
    document.addEventListener("visibilitychange", onHidden);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", refresh);
      window.removeEventListener(NOTEBOOK_QUEUE_CHANGED, refresh);
      document.removeEventListener("visibilitychange", onHidden);
    };
  }, [refresh, retrySave, userId]);

  return { saveStatus, pendingOffline, saveError, retrySave };
}
