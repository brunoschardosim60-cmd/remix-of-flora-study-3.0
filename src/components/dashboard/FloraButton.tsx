import { lazy, Suspense, useEffect, useState } from "react";
import { FloraIcon } from "@/components/FloraIcon";

const FloraChatPanel = lazy(() =>
  import("@/components/FloraChatPanel").then((m) => ({ default: m.FloraChatPanel }))
);

/**
 * Botão flutuante que abre o painel da Flora.
 * - Abre via clique direto.
 * - Abre via querystring `?flora=1` (ex.: FloraSuggestionChip do caderno).
 * - Abre via evento global `open-flora-chat` (BottomNav).
 * Mantém o painel lazy para não impactar TTI da home.
 */
export function FloraButton() {
  const [open, setOpen] = useState(false);
  const [initialMessage, setInitialMessage] = useState<string | undefined>();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("flora") === "1") {
      const stored = sessionStorage.getItem("flora.suggestedQuestion");
      if (stored) {
        setInitialMessage(stored);
        sessionStorage.removeItem("flora.suggestedQuestion");
      }
      setOpen(true);
      params.delete("flora");
      const newSearch = params.toString();
      const newUrl =
        window.location.pathname + (newSearch ? `?${newSearch}` : "") + window.location.hash;
      window.history.replaceState({}, "", newUrl);
    }
  }, []);

  useEffect(() => {
    const handler = () => setOpen(true);
    window.addEventListener("open-flora-chat", handler);
    return () => window.removeEventListener("open-flora-chat", handler);
  }, []);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-16 md:bottom-4 right-4 z-40 w-12 h-12 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center hover:scale-105 transition-transform"
        aria-label="Falar com Flora"
      >
        <FloraIcon className="w-6 h-6" />
      </button>
      <Suspense fallback={null}>
        <FloraChatPanel
          isOpen={open}
          onClose={() => {
            setOpen(false);
            setInitialMessage(undefined);
          }}
          initialMessage={initialMessage}
        />
      </Suspense>
    </>
  );
}