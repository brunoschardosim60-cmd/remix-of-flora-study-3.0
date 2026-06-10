import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { initializeAppStorageVersion, repairCorruptedAppStorage } from "./lib/storage";

initializeAppStorageVersion();
repairCorruptedAppStorage();

// Recarrega automaticamente quando um chunk dinâmico antigo falha (deploy novo
// invalida hashes; HTML antigo tenta importar arquivo que não existe mais).
const CHUNK_RELOAD_KEY = "studyflow.chunk-reload-at";
async function clearBrowserCaches() {
  try {
    if ("caches" in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
    }
    if ("serviceWorker" in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map((r) => r.unregister()));
    }
  } catch { /* ignore */ }
}
function maybeReloadOnChunkError(message: string) {
  if (!/Failed to fetch dynamically imported module|Importing a module script failed|ChunkLoadError/i.test(message)) {
    return;
  }
  try {
    const last = Number(sessionStorage.getItem(CHUNK_RELOAD_KEY) || 0);
    if (Date.now() - last < 10_000) return; // evita loop
    sessionStorage.setItem(CHUNK_RELOAD_KEY, String(Date.now()));
  } catch { /* ignore */ }
  clearBrowserCaches().finally(() => {
    const url = new URL(window.location.href);
    url.searchParams.set("_reload", String(Date.now()));
    window.location.replace(url.toString());
  });
}
window.addEventListener("error", (e) => {
  const target = e.target as HTMLScriptElement | null;
  const src = target && "src" in target ? target.src : "";
  maybeReloadOnChunkError(String(e?.message || src || ""));
});
window.addEventListener("unhandledrejection", (e) => {
  const reason = e?.reason;
  const msg = typeof reason === "string" ? reason : reason?.message || "";
  maybeReloadOnChunkError(String(msg));
});

const isLovablePreview = /lovable(project)?\.com|lovable\.app/.test(window.location.hostname);
const shouldRegisterServiceWorker = "serviceWorker" in navigator && !import.meta.env.DEV && !isLovablePreview;

if ("serviceWorker" in navigator && !shouldRegisterServiceWorker) {
  navigator.serviceWorker.getRegistrations().then((regs) => regs.forEach((reg) => reg.unregister())).catch(() => {});
}

// Register service worker for background Pomodoro notifications only outside preview/dev.
if (shouldRegisterServiceWorker) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/sw.js", { updateViaCache: "none" })
      .then((reg) => {
        // Força checagem de nova versão do SW a cada load
        reg.update().catch(() => {});
        // Quando uma nova versão estiver pronta, ativa imediatamente
        reg.addEventListener("updatefound", () => {
          const sw = reg.installing;
          if (!sw) return;
          sw.addEventListener("statechange", () => {
            if (sw.state === "installed" && navigator.serviceWorker.controller) {
              sw.postMessage?.({ type: "SKIP_WAITING" });
            }
          });
        });
      })
      .catch(() => {});

    // Recarrega a página uma única vez quando o controller mudar
    // (novo SW assumiu) — assim o usuário pega o build novo sem F5.
    let reloaded = false;
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (reloaded) return;
      reloaded = true;
      window.location.reload();
    });
  });

  // Recebe pedidos de navegação do SW (deep link de notificações)
  navigator.serviceWorker.addEventListener("message", (event) => {
    if (event.data?.type === "NAVIGATE" && typeof event.data.url === "string") {
      const target = event.data.url;
      // Navegação client-side: evita reload completo
      if (target.startsWith("/") && window.location.pathname + window.location.search !== target) {
        window.history.pushState({}, "", target);
        window.dispatchEvent(new PopStateEvent("popstate"));
      }
    }
  });
}

createRoot(document.getElementById("root")!).render(<App />);
