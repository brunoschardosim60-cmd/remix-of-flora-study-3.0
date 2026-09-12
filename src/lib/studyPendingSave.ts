import type { StudyStateSnapshot } from "./studyData";

const prefix = "studyflow.pending-study-save:";
export function pendingStudySave(userId: string): { revision: string; state: StudyStateSnapshot } | null {
  const raw = localStorage.getItem(prefix + userId);
  return raw ? JSON.parse(raw) : null;
}
export function stageStudySave(userId: string, state: StudyStateSnapshot) {
  const entry = { revision: crypto.randomUUID(), state };
  localStorage.setItem(prefix + userId, JSON.stringify(entry));
  return entry;
}
const running = new Map<string, Promise<void>>();
export function flushStudySave(userId: string, save: (state: StudyStateSnapshot) => Promise<void>): Promise<void> {
  const active = running.get(userId);
  if (active) return active;
  const task = (async () => {
    while (navigator.onLine) {
      const entry = pendingStudySave(userId);
      if (!entry) return;
      await save(entry.state);
      if (pendingStudySave(userId)?.revision === entry.revision) localStorage.removeItem(prefix + userId);
    }
  })().finally(() => running.delete(userId));
  running.set(userId, task);
  return task;
}
