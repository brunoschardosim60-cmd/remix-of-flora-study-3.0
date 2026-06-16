/**
 * notifications.ts
 * Gerencia permissão e agendamento de notificações push de revisões.
 * Usa Service Worker + Notification API nativa.
 */

export interface ReviewForNotification {
  id: string;
  materia: string;
  scheduled_date: string;
  completed: boolean;
  interval_days: number;
}

const REVISION_NOTIFY_DAY_KEY = "sf-revision-notified-day";
const REVISION_NOTIFY_SNOOZE_KEY = "sf-revision-snoozed-until";

// Janela do digest diário: das 19h às 22h. Antes disso não notifica nada
// (evita o spam de "revisão pendente" durante o dia).
const DIGEST_START_HOUR = 19;
const DIGEST_END_HOUR = 22;

function todayKey(): string {
  return new Date().toISOString().split("T")[0];
}

function isWithinDigestWindow(now = new Date()): boolean {
  const h = now.getHours();
  return h >= DIGEST_START_HOUR && h < DIGEST_END_HOUR;
}

function msUntilNextDigest(now = new Date()): number {
  const next = new Date(now);
  if (now.getHours() < DIGEST_START_HOUR) {
    next.setHours(DIGEST_START_HOUR, 0, 0, 0);
  } else {
    next.setDate(next.getDate() + 1);
    next.setHours(DIGEST_START_HOUR, 0, 0, 0);
  }
  return next.getTime() - now.getTime();
}

function canShowRevisionNotification(): boolean {
  if (typeof localStorage === "undefined") return false;
  try {
    const snoozedUntil = Number(localStorage.getItem(REVISION_NOTIFY_SNOOZE_KEY) || 0);
    if (snoozedUntil && Date.now() < snoozedUntil) return false;
    return localStorage.getItem(REVISION_NOTIFY_DAY_KEY) !== todayKey();
  } catch {
    return false;
  }
}

function markRevisionNotificationShown(): void {
  try {
    localStorage.setItem(REVISION_NOTIFY_DAY_KEY, todayKey());
  } catch { /* ignore */ }
}

// ─── Verifica suporte ─────────────────────────────────────────────────────────
export function notificationsSupported(): boolean {
  return "Notification" in window && "serviceWorker" in navigator;
}

// ─── Solicita permissão ───────────────────────────────────────────────────────
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!notificationsSupported()) return "denied";
  if (Notification.permission === "granted") return "granted";
  return Notification.requestPermission();
}

// ─── Envia lista de revisões ao SW para monitorar ────────────────────────────
export async function scheduleReviewNotifications(reviews: ReviewForNotification[]): Promise<void> {
  if (!notificationsSupported()) return;
  const reg = await navigator.serviceWorker.ready;
  reg.active?.postMessage({ type: "SCHEDULE_REVIEW_NOTIFICATIONS", reviews });

  // Evita loop de avisos: revisão pendente agora é no máximo diária pelo app.
  if ("periodicSync" in reg) {
    try {
      await (reg as any).periodicSync.unregister?.("studyflow-revision-check");
    } catch {
      // pode falhar em navegadores sem suporte total — ignora
    }
  }

  // Fallback: setTimeout local para notificar enquanto a aba está aberta
  scheduleLocalFallback(reviews);
}

// ─── Fallback: verifica revisões atrasadas enquanto aba está aberta ───────────
let _fallbackTimer: ReturnType<typeof setTimeout> | null = null;

function scheduleLocalFallback(reviews: ReviewForNotification[]): void {
  if (_fallbackTimer) clearTimeout(_fallbackTimer);
  if (Notification.permission !== "granted") return;

  const today = todayKey();
  const overdue = reviews.filter(r => !r.completed && r.scheduled_date <= today);
  if (overdue.length === 0) return;

  const now = new Date();
  const inWindow = isWithinDigestWindow(now);
  const delay = inWindow ? 5_000 : msUntilNextDigest(now);

  // Limita timer para o máximo do setTimeout (~24,8 dias). Se ainda for muito
  // longe, simplesmente não agenda — `initNotifications` rodará de novo no
  // próximo login/refresh.
  if (delay > 6 * 60 * 60 * 1000) return;

  _fallbackTimer = setTimeout(async () => {
    if (!canShowRevisionNotification()) return;
    if (!isWithinDigestWindow()) return;
    markRevisionNotificationShown();
    const reg = await navigator.serviceWorker.ready;
    const subjects = [...new Set(overdue.map(r => r.materia))].slice(0, 3).join(", ");
    reg.active?.postMessage({
      type: "SHOW_NOTIFICATION",
      title: `Você tem ${overdue.length} ${overdue.length > 1 ? "revisões pendentes" : "revisão pendente"} hoje`,
      body: `${subjects}. Toque para uma sessão rápida.`,
      url: "/?flashcards=rapid",
    });
  }, delay);
}

// ─── Notificação imediata (ex: ao abrir o app com revisões atrasadas) ─────────
export async function notifyOverdueReviews(reviews: ReviewForNotification[]): Promise<void> {
  if (Notification.permission !== "granted") return;
  // Só dispara o resumo se já entramos na janela das 19h, e no máximo 1x/dia.
  if (!isWithinDigestWindow()) return;
  if (!canShowRevisionNotification()) return;

  const today = todayKey();
  const overdue = reviews.filter(r => !r.completed && r.scheduled_date <= today);
  if (overdue.length === 0) return;
  markRevisionNotificationShown();

  const reg = await navigator.serviceWorker.ready;
  const subjects = [...new Set(overdue.map(r => r.materia))].slice(0, 3).join(", ");
  reg.active?.postMessage({
    type: "SHOW_NOTIFICATION",
    title: `Você tem ${overdue.length} ${overdue.length > 1 ? "revisões pendentes" : "revisão pendente"} hoje`,
    body: `${subjects}. Toque para uma sessão rápida.`,
    url: "/?flashcards=rapid",
  });
}

// ─── Hook de inicialização (chamar no App.tsx) ────────────────────────────────
export async function initNotifications(reviews: ReviewForNotification[]): Promise<void> {
  if (!notificationsSupported()) return;
  const permission = Notification.permission === "default" ? "default" : await requestNotificationPermission();
  if (permission !== "granted") return;
  await scheduleReviewNotifications(reviews);
  await notifyOverdueReviews(reviews);
}
