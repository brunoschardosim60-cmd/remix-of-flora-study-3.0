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
