import { useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { FloraAction } from "@/lib/floraChat";

/**
 * Executa ações [AÇÃO:...] da Flora chamando flora-engine#execute_action e
 * disparando os eventos globais que o resto do app escuta (quiz, flashcards,
 * pomodoro, cronograma, caderno, meta do dia).
 *
 * IMPORTANTE: os listeners desses eventos vivem no Index.tsx e em outros
 * componentes — não mudar nomes dos eventos sem atualizar lá.
 */
export function useFloraActionExecutor(onClose: () => void) {
  const navigate = useNavigate();

  return useCallback(async (action: FloraAction) => {
    try {
      const { data, error } = await supabase.functions.invoke("flora-engine", {
        body: { action: "execute_action", data: { actionType: action.type, payload: action.payload } },
      });
      if (error) throw error;

      if (data?.type === "quiz" && data.questions?.length) {
        window.dispatchEvent(new CustomEvent("flora-quiz", { detail: data }));
        toast.success(`Quiz gerado com ${data.questions.length} questões.`);
      } else if (data?.type === "flashcards" && data.flashcards?.length) {
        window.dispatchEvent(new CustomEvent("flora-flashcards", { detail: data }));
        toast.success(`${data.flashcards.length} flashcards criados.`);
      } else if (data?.type === "pomodoro") {
        window.dispatchEvent(new CustomEvent("flora-pomodoro", { detail: data }));
        toast.success("Pomodoro configurado.");
      } else if (action.type === "CRONOGRAMA") {
        window.dispatchEvent(new CustomEvent("flora-schedule-updated", { detail: action.payload }));
        toast.success("Cronograma salvo.");
      } else if (action.type === "REMOVER_CRONOGRAMA") {
        window.dispatchEvent(new CustomEvent("flora-schedule-removed", { detail: data }));
        toast.success("Matéria removida do cronograma.");
      } else if (data?.type === "notebook" && data.notebookId) {
        const isInNotebook = window.location.pathname.startsWith("/notebooks/");
        if (isInNotebook && action.payload?.conteudo) {
          window.dispatchEvent(new CustomEvent("flora-add-to-notebook", {
            detail: { html: action.payload.conteudo, titulo: action.payload.titulo },
          }));
          toast.success(`Conteúdo adicionado ao caderno!`);
        } else {
          toast.success(`Caderno "${data.titulo || "Novo"}" criado.`);
          navigate(`/notebooks/${data.notebookId}`);
          onClose();
        }
      } else if (data?.type === "meta_dia") {
        window.dispatchEvent(new CustomEvent("flora-meta-dia", { detail: data }));
        toast.success("Meta do dia atualizada!");
      }
    } catch (err) {
      console.error("Action error:", err);
      toast.error("Erro ao executar ação.");
    }
  }, [navigate, onClose]);
}
