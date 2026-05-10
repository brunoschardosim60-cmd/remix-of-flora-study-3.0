import { useCallback, useState } from "react";
import { toast } from "sonner";
import { floraStudyNow, floraStudyNowFollowup } from "@/lib/floraClient";
import type { StudyTopic } from "@/lib/types";

export interface StudyNowMessage {
  role: "flora" | "user";
  content: string;
}
export interface StudyNowContent {
  tema: string;
  materia: string;
  conteudo: string;
}

/**
 * Encapsula o fluxo "estudar agora" da Flora — diálogo de escolha + briefing
 * com follow-up. Mantém TODOS os estados juntos (eles são acoplados entre si:
 * abrir choice dispara studyNow, que controla messages e followup).
 *
 * Index continua dono dos handlers externos (handleStartStudyNow, timer) e
 * passa-os via parâmetros nas funções que precisam deles, evitando quebrar
 * o acoplamento documentado com useFloraEvents.
 */
export function useStudyNow(opts: {
  recommendedTopic: StudyTopic | null;
  handleStartStudyNow: (t: StudyTopic) => void;
}) {
  const { recommendedTopic, handleStartStudyNow } = opts;

  const [studyChoiceOpen, setStudyChoiceOpen] = useState(false);
  const [studyNowLoading, setStudyNowLoading] = useState(false);
  const [studyNowContent, setStudyNowContent] = useState<StudyNowContent | null>(null);
  const [studyNowMessages, setStudyNowMessages] = useState<StudyNowMessage[]>([]);
  const [studyNowFollowupInput, setStudyNowFollowupInput] = useState("");
  const [studyNowFollowupLoading, setStudyNowFollowupLoading] = useState(false);

  const runFloraStudyNow = useCallback(async () => {
    setStudyNowLoading(true);
    try {
      const result = await floraStudyNow();
      if (result && result.conteudo) {
        setStudyNowContent(result);
        setStudyNowMessages([{ role: "flora", content: result.conteudo }]);
      } else if (recommendedTopic) {
        handleStartStudyNow(recommendedTopic);
      } else {
        toast.info("Adicione um tema ao cronograma para a Flora sugerir o que estudar.");
      }
    } catch {
      if (recommendedTopic) handleStartStudyNow(recommendedTopic);
    } finally {
      setStudyNowLoading(false);
    }
  }, [handleStartStudyNow, recommendedTopic]);

  const sendStudyNowFollowup = useCallback(async (request: string) => {
    if (!studyNowContent || !request.trim() || studyNowFollowupLoading) return;
    setStudyNowMessages((prev) => [...prev, { role: "user", content: request }]);
    setStudyNowFollowupInput("");
    setStudyNowFollowupLoading(true);
    try {
      const previousContent = studyNowMessages
        .filter((m) => m.role === "flora")
        .map((m) => m.content)
        .join("\n\n---\n\n");
      const res = await floraStudyNowFollowup({
        tema: studyNowContent.tema,
        materia: studyNowContent.materia,
        previousContent,
        userRequest: request,
      });
      if (res?.conteudo) {
        setStudyNowMessages((prev) => [...prev, { role: "flora", content: res.conteudo }]);
      } else {
        toast.error("A Flora não conseguiu responder agora. Tenta de novo?");
      }
    } finally {
      setStudyNowFollowupLoading(false);
    }
  }, [studyNowContent, studyNowMessages, studyNowFollowupLoading]);

  const closeStudyNow = useCallback(() => {
    setStudyNowContent(null);
    setStudyNowMessages([]);
    setStudyNowFollowupInput("");
  }, []);

  return {
    // estado
    studyChoiceOpen,
    studyNowLoading,
    studyNowContent,
    studyNowMessages,
    studyNowFollowupInput,
    studyNowFollowupLoading,
    // setters expostos (Index ainda precisa abrir o choice a partir de handlePrimaryAction)
    setStudyChoiceOpen,
    setStudyNowFollowupInput,
    // ações
    runFloraStudyNow,
    sendStudyNowFollowup,
    closeStudyNow,
  };
}