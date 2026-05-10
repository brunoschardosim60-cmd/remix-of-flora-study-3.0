import { useCallback, useState } from "react";
import type { StudyTopic } from "@/lib/studyData";

/**
 * Centraliza o estado dos diálogos do dashboard:
 * - notas (TopicNotesDialog)
 * - quiz (QuizDialog) com questões iniciais opcionais (Flora pode pré-popular)
 * - sessão de flashcards (FlashcardSessionDialog)
 * - sinal de abertura do AddTopicForm
 *
 * Mantém Index.tsx focado em layout; Flora e demais consumidores
 * recebem os setters via prop drilling controlado.
 */
export function useDashboardDialogs() {
  const [notesTopic, setNotesTopic] = useState<StudyTopic | null>(null);
  const [quizTopic, setQuizTopic] = useState<StudyTopic | null>(null);
  const [quizInitialQuestions, setQuizInitialQuestions] = useState<any[] | undefined>(undefined);
  const [flashcardSessionOpen, setFlashcardSessionOpen] = useState(false);
  const [addTopicOpenSignal, setAddTopicOpenSignal] = useState(0);

  const openAddTopic = useCallback(() => {
    setAddTopicOpenSignal((prev) => prev + 1);
  }, []);

  const openQuiz = useCallback((topic: StudyTopic, questions?: any[]) => {
    setQuizInitialQuestions(questions);
    setQuizTopic(topic);
  }, []);

  const closeQuiz = useCallback(() => {
    setQuizTopic(null);
    setQuizInitialQuestions(undefined);
  }, []);

  const openFlashcardSession = useCallback(() => setFlashcardSessionOpen(true), []);
  const closeFlashcardSession = useCallback(() => setFlashcardSessionOpen(false), []);

  // Patch parcial em notesTopic — útil quando notas/flashcards são atualizados
  // dentro do diálogo aberto e o estado base já foi persistido.
  const patchNotesTopic = useCallback((topicId: string, patch: Partial<StudyTopic>) => {
    setNotesTopic((prev) => (prev && prev.id === topicId ? { ...prev, ...patch } : prev));
  }, []);

  return {
    // state
    notesTopic,
    quizTopic,
    quizInitialQuestions,
    flashcardSessionOpen,
    addTopicOpenSignal,
    // setters (necessários para Flora events e demais consumidores externos)
    setNotesTopic,
    setQuizTopic,
    setQuizInitialQuestions,
    // ações de alto nível
    openAddTopic,
    openQuiz,
    closeQuiz,
    openFlashcardSession,
    closeFlashcardSession,
    patchNotesTopic,
  };
}