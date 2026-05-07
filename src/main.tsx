import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { initializeAppStorageVersion, repairCorruptedAppStorage } from "./lib/storage";

initializeAppStorageVersion();
repairCorruptedAppStorage();

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
