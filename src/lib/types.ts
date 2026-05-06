export interface LessonBlock {
  titulo: string;
  conteudo: string;
  checkpoint: string;
}

export interface ExerciseQuestion {
  pergunta: string;
  alternativas: string[];
  correta: number;
  explicacao: string;
}

export interface Lesson {
  titulo: string;
  introducao: string;
  blocos: LessonBlock[];
  resumo: string[];
  exercicio_final: ExerciseQuestion;
}

export interface SentimentAnalysisResult {
  sentimento: "positivo" | "negativo" | "neutro" | "frustrado" | "confuso" | "motivado" | "desmotivado";
  justificativa: string;
  acao_sugerida: string;
}

export interface Draft {
  titulo: string;
  introducao: string;
  desenvolvimento: string[];
  conclusao: string;
}
