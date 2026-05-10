export interface LessonBlock {
  titulo: string;
  conteudo: string;
  checkpoint?: string;
  macete?: string;
  pegadinha?: string;
  analogia?: string;
  exemplo_resolvido?: string;
  flora_comment?: string;
  mini_interacao?: string;
  duvida_simulada?: { pergunta: string; resposta: string };
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
