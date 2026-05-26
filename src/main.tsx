import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { initializeAppStorageVersion, repairCorruptedAppStorage } from "./lib/storage";

initializeAppStorageVersion();
repairCorruptedAppStorage();

// Recarrega automaticamente quando um chunk dinâmico antigo falha (deploy novo
// invalida hashes; HTML antigo tenta importar arquivo que não existe mais).
const CHUNK_RELOAD_KEY = "studyflow.chunk-reload-at";
function maybeReloadOnChunkError(message: string) {
  if (!/Failed to fetch dynamically imported module|Importing a module script failed|ChunkLoadError/i.test(message)) {
    return;
  }
  try {
    const last = Number(sessionStorage.getItem(CHUNK_RELOAD_KEY) || 0);
    if (Date.now() - last < 10_000) return; // evita loop
    sessionStorage.setItem(CHUNK_RELOAD_KEY, String(Date.now()));
  } catch { /* ignore */ }
  window.location.reload();
}
window.addEventListener("error", (e) => {
  maybeReloadOnChunkError(String(e?.message || ""));
});
window.addEventListener("unhandledrejection", (e) => {
  const reason = e?.reason;
  const msg = typeof reason === "string" ? reason : reason?.message || "";
  maybeReloadOnChunkError(String(msg));
});

// Register service worker for background Pomodoro notifications.
if ("serviceWorker" in navigator) {
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
