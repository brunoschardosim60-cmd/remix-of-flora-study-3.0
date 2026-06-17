/**
 * Dedup de mensagens/banners exibidos ao aluno.
 *
 * Evita que avisos (badge "Ritmo em dia", "Bem-vindo de volta", sugestões da Flora etc.)
 * apareçam toda vez que o aluno volta ao dashboard. Mostra 1x por dia por chave/usuário,
 * usando localStorage. Limpa chaves de dias anteriores sob demanda.
 */

const PREFIX = "studyflow:msg-seen:";

function todayKey(): string {
  return new Date().toISOString().split("T")[0];
}

function fullKey(userId: string | undefined, key: string): string {
  return `${PREFIX}${userId || "anon"}:${key}:${todayKey()}`;
}

export function seenToday(userId: string | undefined, key: string): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(fullKey(userId, key)) === "1";
  } catch {
    return false;
  }
}

export function markSeenToday(userId: string | undefined, key: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(fullKey(userId, key), "1");
    pruneOldKeys(userId);
  } catch { /* localStorage cheio — ignora */ }
}

export function clearSeen(userId: string | undefined, key: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(fullKey(userId, key));
  } catch { /* silent */ }
}

function pruneOldKeys(userId: string | undefined): void {
  if (typeof window === "undefined") return;
  const today = todayKey();
  const userPrefix = `${PREFIX}${userId || "anon"}:`;
  try {
    const toRemove: string[] = [];
    for (let i = 0; i < window.localStorage.length; i++) {
      const k = window.localStorage.key(i);
      if (!k || !k.startsWith(userPrefix)) continue;
      // chave: prefix + msgKey + ":" + YYYY-MM-DD
      const date = k.slice(-10);
      if (date !== today) toRemove.push(k);
    }
    toRemove.forEach((k) => window.localStorage.removeItem(k));
  } catch { /* silent */ }
}
