// Persistência local de rascunhos de redação (sobrevivência offline).
// - Salva/recupera por essayId no localStorage (instantâneo).
// - Mantém uma fila de IDs pendentes para flush ao backend quando reconectar.

const DRAFT_PREFIX = "studyflow.essay-draft.";
const PENDING_KEY = "studyflow.essay-draft.pending";

export interface LocalEssayDraft {
  tema: string;
  texto: string;
  savedAt: number;
}

function safeWindow(): Window | null {
  return typeof window === "undefined" ? null : window;
}

export function saveLocalDraft(essayId: string, draft: { tema: string; texto: string }) {
  const w = safeWindow();
  if (!w) return;
  try {
    const payload: LocalEssayDraft = { ...draft, savedAt: Date.now() };
    w.localStorage.setItem(DRAFT_PREFIX + essayId, JSON.stringify(payload));
  } catch {}
}

export function loadLocalDraft(essayId: string): LocalEssayDraft | null {
  const w = safeWindow();
  if (!w) return null;
  try {
    const raw = w.localStorage.getItem(DRAFT_PREFIX + essayId);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as LocalEssayDraft;
    if (typeof parsed?.tema !== "string" || typeof parsed?.texto !== "string") return null;
    return parsed;
  } catch {
    return null;
  }
}

export function clearLocalDraft(essayId: string) {
  const w = safeWindow();
  if (!w) return;
  try {
    w.localStorage.removeItem(DRAFT_PREFIX + essayId);
  } catch {}
}

function readPending(): string[] {
  const w = safeWindow();
  if (!w) return [];
  try {
    const raw = w.localStorage.getItem(PENDING_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

function writePending(ids: string[]) {
  const w = safeWindow();
  if (!w) return;
  try {
    w.localStorage.setItem(PENDING_KEY, JSON.stringify(Array.from(new Set(ids))));
  } catch {}
}

export function markPending(essayId: string) {
  const list = readPending();
  if (!list.includes(essayId)) {
    list.push(essayId);
    writePending(list);
  }
}

export function clearPending(essayId: string) {
  writePending(readPending().filter((id) => id !== essayId));
}

export function getPendingDraftIds(): string[] {
  return readPending();
}

export function isOnline(): boolean {
  const w = safeWindow();
  return !w ? true : w.navigator.onLine !== false;
}