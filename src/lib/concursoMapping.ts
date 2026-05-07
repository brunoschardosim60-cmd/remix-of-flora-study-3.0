import type { Subject } from "@/lib/studyData";

/**
 * Mapeia uma disciplina/tema de concurso para um Subject existente do app.
 * Cobre as principais disciplinas de bancas (CESPE, FCC, Vunesp, FGV).
 * Em último caso devolve "Simulado" para preservar o fluxo do plano.
 */
export function mapDisciplinaToSubject(input: string): Subject {
  const d = (input || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

  // Português / Redação / Línguas
  if (/(portug|gramatic|interpretac|redac|literatur)/.test(d)) {
    if (/redac/.test(d)) return "Redação";
    return "Português";
  }
  if (/(ingles|english|espanhol|spanish|frances)/.test(d)) return "Inglês";

  // Raciocínio Lógico — disciplina específica de concurso
  if (/(raciocin|logic)/.test(d)) return "Raciocínio Lógico";
  // Matemática / Estatística / Finanças
  if (/(matemat|estatist|financ|quantitat|aritmet|algebr|geometr)/.test(d)) {
    return "Matemática";
  }

  // Ciências exatas
  if (/(fisica|mecanic|termodinam|eletromag)/.test(d)) return "Física";
  if (/(quimic)/.test(d)) return "Química";
  if (/(biolog|microbiol|anatom|fisiolog)/.test(d)) return "Biologia";

  // Humanas
  if (/(geografi|geopolit)/.test(d)) return "Geografia";
  if (/(atualidad|cidadan|etica)/.test(d)) return "Atualidades";
  if (/(historia|sociolog|filosof)/.test(d)) return "História";

  // Direito (específicos)
  if (/(constitucional)/.test(d)) return "Direito Constitucional";
  if (/(administrativ)/.test(d) && /direit/.test(d)) return "Direito Administrativo";
  if (/(penal|processual penal)/.test(d)) return "Direito Penal";
  if (/(civil|processual civil|tribut|empresarial|trabalh)/.test(d)) return "Direito Civil";
  if (/direit/.test(d)) return "Direito Constitucional";

  // Informática / TI
  if (/(informatic|computac|redes|seguranc.*informac|noco.*informat)/.test(d)) return "Informática";

  // Administração Pública / Gestão
  if (/(administrac|gestao public|gestao de pessoa|orcament)/.test(d)) return "Administração Pública";

  // Contabilidade / Auditoria
  if (/(contabil|audit)/.test(d)) return "Contabilidade";

  // Fallback
  return "Simulado";
}

/**
 * Calcula a "fase" de revisão para um tópico de concurso, considerando
 * accuracy e número de tentativas. Define se a carga deve aumentar/reduzir/manter.
 */
export type ReviewPhase = "introducao" | "consolidacao" | "manutencao" | "reforco";
export type ReviewLoadAdjustment = "aumentar" | "reduzir" | "manter";

export function computeReviewPhase(opts: {
  total: number;
  acertos: number;
  diasDesdeUltima: number;
}): { phase: ReviewPhase; adjust: ReviewLoadAdjustment; reason: string } {
  const { total, acertos, diasDesdeUltima } = opts;
  const accuracy = total > 0 ? Math.round((acertos / total) * 100) : 0;

  if (total < 3) {
    return { phase: "introducao", adjust: "manter", reason: "Poucas tentativas — continue praticando para a Flora calibrar." };
  }
  if (accuracy < 50) {
    return { phase: "reforco", adjust: "aumentar", reason: `Accuracy ${accuracy}% — reforçar o tema com revisões mais frequentes.` };
  }
  if (accuracy < 75) {
    return { phase: "consolidacao", adjust: "manter", reason: `Accuracy ${accuracy}% — manter ritmo até consolidar.` };
  }
  if (accuracy >= 85 && diasDesdeUltima <= 7 && total >= 8) {
    return { phase: "manutencao", adjust: "reduzir", reason: `Domínio alto (${accuracy}%) — reduzir carga e espaçar revisões.` };
  }
  return { phase: "consolidacao", adjust: "manter", reason: `Accuracy ${accuracy}% — manter cronograma atual.` };
}
