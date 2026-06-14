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

  // Registra periodic sync se suportado (Chrome/Android)
  if ("periodicSync" in reg) {
    try {
      await (reg as any).periodicSync.register("studyflow-revision-check", {
        minInterval: 30 * 60 * 1000, // 30 min
      });
    } catch {
      // periodicSync pode falhar se permissão não dada — fallback abaixo
    }
  }

  // Fallback: setTimeout local para notificar enquanto a aba está aberta
  scheduleLocalFallback(reviews);
}

// ─── Fallback: verifica revisões atrasadas enquanto aba está aberta ───────────
let _fallbackTimer: ReturnType<typeof setTimeout> | null = null;

function scheduleLocalFallback(reviews: ReviewForNotification[]): void {
  if (_fallbackTimer) clearTimeout(_fallbackTimer);

  const today = new Date().toISOString().split("T")[0];
  const overdue = reviews.filter(r => !r.completed && r.scheduled_date <= today);

  // Throttle: no máximo uma notificação por dia, por aba/sessão.
  const today2 = new Date().toISOString().split("T")[0];
  const flagKey = `sf-revision-notified-${today2}`;
  const alreadyNotified = typeof sessionStorage !== "undefined" && sessionStorage.getItem(flagKey);

  if (overdue.length > 0 && Notification.permission === "granted" && !alreadyNotified) {
    _fallbackTimer = setTimeout(async () => {
      try { sessionStorage.setItem(flagKey, "1"); } catch { /* ignore */ }
      const reg = await navigator.serviceWorker.ready;
      const subjects = [...new Set(overdue.map(r => r.materia))].slice(0, 3).join(", ");
      reg.active?.postMessage({
        type: "SHOW_NOTIFICATION",
        title: `${overdue.length} ${overdue.length > 1 ? "revisões" : "revisão"} pendente${overdue.length > 1 ? "s" : ""}`,
        body: `Matérias: ${subjects}. Clique para revisar.`,
        url: "/?revisar=hoje",
      });
    }, 5000);
  }
  // Sem loop de 30min: deixamos o periodicSync do SW cuidar disso quando suportado.
}

// ─── Notificação imediata (ex: ao abrir o app com revisões atrasadas) ─────────
export async function notifyOverdueReviews(reviews: ReviewForNotification[]): Promise<void> {
  if (Notification.permission !== "granted") return;

  const today = new Date().toISOString().split("T")[0];
  const overdue = reviews.filter(r => !r.completed && r.scheduled_date <= today);
  if (overdue.length === 0) return;

  // Throttle: 1 por dia por sessão.
  const flagKey = `sf-revision-notified-${today}`;
  try {
    if (sessionStorage.getItem(flagKey)) return;
    sessionStorage.setItem(flagKey, "1");
  } catch { /* ignore */ }

  const reg = await navigator.serviceWorker.ready;
  const subjects = [...new Set(overdue.map(r => r.materia))].slice(0, 3).join(", ");
  reg.active?.postMessage({
    type: "SHOW_NOTIFICATION",
    title: `${overdue.length} ${overdue.length > 1 ? "revisões" : "revisão"} atrasada${overdue.length > 1 ? "s" : ""}`,
    body: `Não quebre sua sequência! ${subjects}`,
    url: "/?revisar=atrasadas",
  });
}

// ─── Hook de inicialização (chamar no App.tsx) ────────────────────────────────
export async function initNotifications(reviews: ReviewForNotification[]): Promise<void> {
  if (!notificationsSupported()) return;
  const permission = await requestNotificationPermission();
  if (permission !== "granted") return;
  await scheduleReviewNotifications(reviews);
  await notifyOverdueReviews(reviews);
}
