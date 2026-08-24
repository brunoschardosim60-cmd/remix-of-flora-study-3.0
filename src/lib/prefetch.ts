/**
 * Intelligent route prefetching with limits and cancellation.
 * - Avoids eager loading heavy AI/editor bundles on first paint
 * - Cancels idle work when the page context changes
 * - Priority-based loading
 */

const routeImports: Record<string, () => Promise<unknown>> = {
  "/notebooks": () => import("@/pages/Notebooks"),
  "/redacao": () => import("@/pages/Redacao"),
  "/analise": () => import("@/pages/Analise"),
  "/medicina": () => import("@/pages/Medicine"),
  "/admin": () => import("@/pages/Admin"),
};

const featureImports: Record<string, () => Promise<unknown>> = {
  flora: () => import("@/components/FloraChatPanel"),
  quiz: () => import("@/components/QuizDialog"),
  notes: () => import("@/components/TopicNotesDialog"),
  focus: () => import("@/components/FocusModeOverlay"),
  weekly: () => import("@/components/WeeklySchedule"),
};

const prefetched = new Set<string>();
let activeContext: string | null = null;
let pendingIds: number[] = [];
let pendingTimeoutIds: number[] = [];

function safePrefetch(key: string, loader: () => Promise<unknown>) {
  if (prefetched.has(key)) return;
  prefetched.add(key);
  loader().catch(() => { prefetched.delete(key); });
}

/** Cancel any pending context prefetches (user navigated away fast). */
function cancelPending() {
  if (typeof cancelIdleCallback !== "undefined") {
    pendingIds.forEach((id) => cancelIdleCallback(id));
  }
  pendingTimeoutIds.forEach((id) => window.clearTimeout(id));
  pendingIds = [];
  pendingTimeoutIds = [];
}

export function prefetchRoute(path: string) {
  const loader = routeImports[path];
  if (loader) safePrefetch(`route:${path}`, loader);
}

export function prefetchFeature(feature: keyof typeof featureImports) {
  const loader = featureImports[feature];
  if (loader) safePrefetch(`feature:${feature}`, loader);
}

/** Idle prefetch for small helpers only. Heavy AI/editor bundles load on demand. */
export function startIdlePrefetch() {
  const schedule = typeof requestIdleCallback !== "undefined"
    ? requestIdleCallback
    : null;

  if (schedule) {
    const id = schedule(() => {
      safePrefetch("feature:focus", () => import("@/components/FocusModeOverlay"));
    }, { timeout: 6000 });
    pendingIds.push(id as number);
    return;
  }

  const timeoutId = window.setTimeout(() => {
    safePrefetch("feature:focus", () => import("@/components/FocusModeOverlay"));
  }, 5000);
  pendingTimeoutIds.push(timeoutId);
}

/**
 * Contextual prefetch: max 2 items per page, cancels on re-call.
 * Priority: only the most probable next actions.
 */
export function prefetchForContext(currentPage: "dashboard" | "redacao" | "notebooks" | "analise") {
  // Cancel previous context prefetches if user switched pages fast
  cancelPending();
  activeContext = currentPage;

  const schedule = typeof requestIdleCallback !== "undefined"
    ? requestIdleCallback
    : null;

  const runPrefetch = () => {
    // Guard: user may have already navigated away
    if (activeContext !== currentPage) return;

    switch (currentPage) {
      case "dashboard":
        safePrefetch("feature:focus", () => import("@/components/FocusModeOverlay"));
        break;
      case "redacao":
        safePrefetch("route:/analise", () => import("@/pages/Analise"));
        break;
      case "notebooks":
        safePrefetch("feature:notes", () => import("@/components/TopicNotesDialog"));
        break;
      case "analise":
        safePrefetch("route:/redacao", () => import("@/pages/Redacao"));
        break;
    }
  };

  if (schedule) {
    const id = schedule(runPrefetch, { timeout: 6000 });
    pendingIds.push(id as number);
    return;
  }

  const timeoutId = window.setTimeout(runPrefetch, 4000);
  pendingTimeoutIds.push(timeoutId);
}
