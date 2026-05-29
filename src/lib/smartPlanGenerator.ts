import { createTopic, StudyTopic, Subject, ALL_SUBJECTS } from "@/lib/studyData";
import { toLocalDateStr } from "@/lib/dateUtils";

interface SmartPlanConfig {
  objetivo: string;
  dataProva?: string;
  horasPorDia: number;
  nivelAtual: string;
  materiasDificeis: string[];
}

export function generateSmartPlan(config: SmartPlanConfig): { topics: StudyTopic[], schedule: any[] } {
  const { objetivo, dataProva, horasPorDia, nivelAtual, materiasDificeis } = config;
  
  const topics: StudyTopic[] = [];
  const schedule: any[] = [];
  
  // Lógica de urgência
  const today = new Date();
  const examDate = dataProva ? new Date(dataProva) : null;
  const daysUntilExam = examDate ? Math.ceil((examDate.getTime() - today.getTime()) / (1000 * 3600 * 24)) : 365;
  
  const urgency = daysUntilExam < 30 ? "high" : daysUntilExam < 90 ? "medium" : "low";
  
  // Determinar ritmo
  const ritmo = urgency === "high" ? "Intensivo" : urgency === "medium" ? "Regular" : "Base";
  
  // Seed de tópicos iniciais baseados no objetivo
  const baseSubjects: Subject[] = (objetivo === "concurso" 
    ? ["Direito Constitucional", "Direito Administrativo", "Português"] 
    : ["Matemática", "Português", "Redação"]) as Subject[];
    
  baseSubjects.forEach((sub, i) => {
    const topic = createTopic(
      `Fundamentos de ${sub}`,
      sub,
      toLocalDateStr(new Date(today.getTime() + i * 86400000)),
      false
    );
    if (topic) topics.push(topic);
    
    // Adiciona ao cronograma
    schedule.push({
      dia: i % 7,
      horario: "08:00",
      materia: sub,
      descricao: `Estudar ${sub} (${ritmo})`
    });
  });

  return { topics, schedule };
}
