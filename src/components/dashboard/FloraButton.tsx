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
  // Só monta o painel (bundle pesado da Flora: ~chat + streaming + voz)
  // depois que o usuário abre pela primeira vez. Reduz JS na primeira pintura.
  const [mounted, setMounted] = useState(false);
  const [initialMessage, setInitialMessage] = useState<string | undefined>();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("flora") === "1") {
      const stored = sessionStorage.getItem("flora.suggestedQuestion");
      if (stored) {
        setInitialMessage(stored);
        sessionStorage.removeItem("flora.suggestedQuestion");
      }
      setMounted(true);
      setOpen(true);
      params.delete("flora");
      const newSearch = params.toString();
      const newUrl =
        window.location.pathname + (newSearch ? `?${newSearch}` : "") + window.location.hash;
      window.history.replaceState({}, "", newUrl);
    }
  }, []);

  useEffect(() => {
    const handler = () => {
      setMounted(true);
      setOpen(true);
    };
    window.addEventListener("open-flora-chat", handler);
    return () => window.removeEventListener("open-flora-chat", handler);
  }, []);

  return (
    <>
      <button
        onClick={() => {
          setMounted(true);
          setOpen(true);
        }}
        className="fixed bottom-[calc(env(safe-area-inset-bottom,0px)+5rem)] md:bottom-6 right-4 z-40 w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-xl flex items-center justify-center hover:scale-105 transition-transform"
        aria-label="Falar com Flora"
      >
        <FloraIcon className="w-7 h-7" />
      </button>
      {mounted && (
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
      )}
    </>
  );
}