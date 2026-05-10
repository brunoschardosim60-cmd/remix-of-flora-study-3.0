import { useCallback } from "react";
import { toast } from "sonner";
import type { User } from "@supabase/supabase-js";
import type { StudyTopic } from "@/lib/studyData";

type Args = {
  user: User | null;
  topics: StudyTopic[];
  recommendedTopic: StudyTopic | null;
  studyNowLoading: boolean;
  comebackMode: boolean;
  setTab: (tab: "revisao" | "semanal") => void;
  openAddTopic: () => void;
  setStudyChoiceOpen: (open: boolean) => void;
  handleStartStudyNow: (topic: StudyTopic) => void;
};

/**
 * Calcula o label e o handler do CTA principal do Hero.
 *
 * Regras (preservadas do Index.tsx):
 * - Sem temas e sem login → CTA "Criar primeiro tema" abre AddTopicForm.
 * - Logado mas sem temas → abre AddTopicForm + toast.
 * - Logado com temas → abre StudyChoiceDialog (Flora pergunta antes de decidir).
 * - Anônimo com temas → começa direto no `recommendedTopic`.
 *
 * O label muda quando a Flora está preparando o estudo.
 */
export function useDashboardPrimaryAction({
  user,
  topics,
  recommendedTopic,
  studyNowLoading,
  comebackMode,
  setTab,
  openAddTopic,
  setStudyChoiceOpen,
  handleStartStudyNow,
}: Args) {
  const handlePrimaryAction = useCallback(() => {
    setTab("revisao");

    if (topics.length === 0 && !user) {
      openAddTopic();
      return;
    }

    if (user) {
      if (topics.length === 0) {
        openAddTopic();
        toast.info("Crie seu primeiro tema para começar a estudar.");
        return;
      }
      setStudyChoiceOpen(true);
      return;
    }

    if (recommendedTopic) handleStartStudyNow(recommendedTopic);
  }, [user, topics.length, recommendedTopic, setTab, openAddTopic, setStudyChoiceOpen, handleStartStudyNow]);

  const primaryLabel = studyNowLoading
    ? "Flora preparando..."
    : topics.length === 0 && !user
    ? "Criar primeiro tema"
    : user
    ? "Estudar agora"
    : comebackMode
    ? "Retomar pelo mais facil"
    : "Comecar agora";

  return { handlePrimaryAction, primaryLabel };
}