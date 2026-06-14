// StudyFlow Service Worker — v5
// • Notificações de revisões agendadas (mantido)
// • Cache offline para questões, revisões e flashcards (novo)
//
// Estratégia:
//   - HTML/JS/CSS → SEMPRE rede (network-only). Evita servir build velho.
//   - GET de leitura no Supabase REST (questions, concurso_questions,
//     spaced_reviews, study_topics) → stale-while-revalidate. Funciona offline
//     com a última cópia conhecida e atualiza em segundo plano quando online.
//   - Demais requests → não interceptados.

const DATA_CACHE = "studyflow-data-v5";
const REVISION_NOTIFICATION_TAG = "studyflow-revision";
const REVISION_MIN_INTERVAL_MS = 24 * 60 * 60 * 1000;
let _lastRevisionNotificationAt = 0;

// Tabelas Supabase REST que valem a pena cachear para uso offline.
// Match em /rest/v1/<tabela>?...
const CACHEABLE_TABLES = new Set([
  "questions",
  "concurso_questions",
  "spaced_reviews",
  "study_topics",
  "study_state",
  "concurso_trilhas",
  "essay_themes",
]);

self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    try {
      const names = await caches.keys();
      await Promise.all(
        names
          .filter((n) => n !== DATA_CACHE)
          .map((n) => caches.delete(n)),
      );
    } catch (_) { /* ignore */ }
    await self.clients.claim();
  })());
});

function isSupabaseReadRequest(url) {
  if (!/\/rest\/v1\//.test(url.pathname)) return false;
  const m = url.pathname.match(/\/rest\/v1\/([^/?]+)/);
  if (!m) return false;
  return CACHEABLE_TABLES.has(m[1]);
}

// Stale-while-revalidate para leituras GET de tabelas no Supabase.
self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  let url;
  try { url = new URL(req.url); } catch { return; }

  if (!isSupabaseReadRequest(url)) return;

  event.respondWith((async () => {
    const cache = await caches.open(DATA_CACHE);
    const cached = await cache.match(req);

    const networkPromise = fetch(req)
      .then((resp) => {
        // Só cacheia respostas OK e que não vieram de erro CORS opaco.
        if (resp && resp.status === 200 && resp.type !== "opaque") {
          cache.put(req, resp.clone()).catch(() => { /* quota cheia → ignora */ });
        }
        return resp;
      })
      .catch(() => null);

    if (cached) {
      // Atualiza em background mas responde já com a cópia local
      event.waitUntil(networkPromise);
      return cached;
    }

    const fresh = await networkPromise;
    if (fresh) return fresh;

    // Sem cache e sem rede → 503 amigável (o app trata como erro)
    return new Response(
      JSON.stringify({ error: "offline", message: "Sem conexão e sem dados em cache" }),
      { status: 503, headers: { "Content-Type": "application/json" } },
    );
  })());
});

// ─── Click em notificação → abre o app ───────────────────────────────────────
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  if (event.notification.tag === REVISION_NOTIFICATION_TAG && event.action === "dismiss") {
    _lastRevisionNotificationAt = Date.now();
    return;
  }
  const url = event.notification.data?.url || "/";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if (client.url.includes(self.location.origin) && "focus" in client) {
          client.focus();
          client.postMessage({ type: "NAVIGATE", url });
          return;
        }
      }
      if (self.clients.openWindow) self.clients.openWindow(url);
    })
  );
});

// ─── Mensagens da página principal ───────────────────────────────────────────
self.addEventListener("message", (event) => {
  if (event.data?.type === "SCHEDULE_REVIEW_NOTIFICATIONS") {
    scheduleReviewChecks(event.data.reviews);
  }
  if (event.data?.type === "SHOW_NOTIFICATION") {
    showStudyNotification(event.data.title, event.data.body, event.data.url);
  }
});

function showStudyNotification(title, body, url = "/") {
  const now = Date.now();
  if (now - _lastRevisionNotificationAt < REVISION_MIN_INTERVAL_MS) return;
  _lastRevisionNotificationAt = now;
  self.registration.showNotification(title, {
    body,
    icon: "/icon-192.png",
    badge: "/favicon.ico",
    tag: REVISION_NOTIFICATION_TAG,
    renotify: false,
    requireInteraction: false,
    data: { url },
    actions: [
      { action: "open", title: "Revisar 5 cards" },
      { action: "dismiss", title: "Mais tarde" },
    ],
  });
}

// Armazena revisões pendentes em memória (limpa ao fechar o SW)
let _pendingReviews = [];

function scheduleReviewChecks(reviews) {
  _pendingReviews = reviews || [];
  console.log("[SW] Revisões agendadas:", _pendingReviews.length);
}

// Verifica revisões atrasadas a cada 30 minutos (via sync periódico se disponível)
self.addEventListener("periodicsync", (event) => {
  if (event.tag === "studyflow-revision-check") {
    event.waitUntil(checkOverdueReviews());
  }
});

async function checkOverdueReviews() {
  const today = new Date().toISOString().split("T")[0];
  const overdue = _pendingReviews.filter(r => !r.completed && r.scheduled_date <= today);
  if (overdue.length > 0) {
    const subjects = [...new Set(overdue.map(r => r.materia))].slice(0, 3).join(", ");
    showStudyNotification(
      `${overdue.length} revisão${overdue.length > 1 ? "ões" : ""} pendente${overdue.length > 1 ? "s" : ""}`,
      `Matérias: ${subjects}. Não quebre sua sequência!`,
      "/?revisar=atrasadas"
    );
  }
}
