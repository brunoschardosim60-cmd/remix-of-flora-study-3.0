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
      // NAVEGAR: ação puramente client-side. Não chama backend (não custa nada).
      // Leva o aluno pra página certa já com contexto (tema, matéria, modo).
      if (action.type === "NAVEGAR") {
        const p = action.payload as { destino?: string; tema?: string; materia?: string; modo?: string; query?: string };
        const destino = (p.destino || "").toLowerCase();
        const map: Record<string, string> = {
          redacao: "/redacao",
          redacao_temas: "/redacao/temas",
          caderno: "/notebooks",
          notebook: "/notebooks",
          quiz: "/banco",
          banco: "/banco",
          banco_concurso: "/banco-concurso",
          simulado: "/simulado-enem",
          simulado_semanal: "/simulado-semanal",
          analise: "/analise",
          cronograma: "/",
          home: "/",
          explica_foto: "/explica-foto",
        };
        const path = map[destino];
        if (!path) { toast.error("Destino desconhecido."); return; }
        const state: Record<string, unknown> = {};
        if (p.tema) state.tema = p.tema;
        if (p.materia) state.materia = p.materia;
        if (p.modo) state.modo = p.modo;
        const search = p.query ? `?${p.query}` : "";
        navigate(`${path}${search}`, { state: Object.keys(state).length ? state : undefined });
        toast.success(`Te levei pro lugar certo. Continuo aqui pra te ajudar.`);
        return;
      }

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
          // Mostra prévia (imagem + link) no chat
          const previewParts: string[] = [];
          if (data.imageUrl) previewParts.push(`![${data.titulo || "Caderno"}](${data.imageUrl})`);
          previewParts.push(`📓 [Abrir caderno "${data.titulo || "Novo"}"](/notebooks/${data.notebookId})`);
          window.dispatchEvent(new CustomEvent("flora-chat-append", {
            detail: { role: "assistant", content: previewParts.join("\n\n") },
          }));
        }
      } else if (data?.type === "meta_dia") {
        window.dispatchEvent(new CustomEvent("flora-meta-dia", { detail: data }));
        toast.success("Meta do dia atualizada!");
      } else if (data?.type === "image") {
        if (data.imageUrl) {
          window.dispatchEvent(new CustomEvent("flora-chat-append", {
            detail: { role: "assistant", content: `![${data.prompt || "Imagem"}](${data.imageUrl})` },
          }));
          toast.success(data.generated ? "Imagem gerada." : "Imagem encontrada.");
        } else {
          toast.error(data.error || "Não consegui gerar a imagem.");
        }
      }
    } catch (err) {
      console.error("Action error:", err);
      toast.error("Erro ao executar ação.");
    }
  }, [navigate, onClose]);
}
