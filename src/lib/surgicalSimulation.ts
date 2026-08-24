export type SurgicalToolId =
  | "safety-checklist"
  | "sterile-field"
  | "scalpel"
  | "metzenbaum"
  | "kelly"
  | "suction"
  | "needle-holder"
  | "final-count";

export interface SurgicalTool {
  id: SurgicalToolId;
  name: string;
  shortName: string;
  purpose: string;
  instrumentId?: string;
}

export interface SurgicalStage {
  id: string;
  eyebrow: string;
  title: string;
  prompt: string;
  expectedToolId: SurgicalToolId;
  bodyView: "surface" | "muscular" | "vascular" | "organs";
  opening: number;
  target: { x: number; y: number };
  success: string;
  criticalEvent: string;
  learningPoint: string;
}

export const surgicalTools: SurgicalTool[] = [
  {
    id: "safety-checklist",
    name: "Checklist cirúrgico",
    shortName: "Checklist",
    purpose: "Confirma equipe, pessoa, procedimento, local, alergias, preparo e riscos previstos.",
  },
  {
    id: "sterile-field",
    name: "Kit de campo estéril",
    shortName: "Campo estéril",
    purpose: "Representa preparo, barreiras e confirmação de esterilidade antes do contato com o campo.",
  },
  {
    id: "scalpel",
    name: "Bisturi",
    shortName: "Bisturi",
    purpose: "Instrumento cortante reconhecido nesta simulação apenas para acesso superficial virtual.",
    instrumentId: "scalpel",
  },
  {
    id: "metzenbaum",
    name: "Tesoura Metzenbaum",
    shortName: "Metzenbaum",
    purpose: "Instrumento delicado representado no reconhecimento de planos virtuais de tecido mole.",
    instrumentId: "metzenbaum-scissors",
  },
  {
    id: "kelly",
    name: "Pinça hemostática Kelly",
    shortName: "Kelly",
    purpose: "Representa controle temporário de uma fonte de sangramento já identificada no cenário.",
    instrumentId: "kelly-forceps",
  },
  {
    id: "suction",
    name: "Aspiração cirúrgica",
    shortName: "Aspiração",
    purpose: "Remove conteúdo simulado do campo para recuperar visualização, sem descrever parâmetros reais.",
    instrumentId: "suction-catheter",
  },
  {
    id: "needle-holder",
    name: "Porta-agulhas Mayo-Hegar",
    shortName: "Porta-agulhas",
    purpose: "Instrumento de sutura incluído como distrator; o simulador não ensina pontos ou fechamento real.",
    instrumentId: "needle-holder",
  },
  {
    id: "final-count",
    name: "Quadro de contagem final",
    shortName: "Contagem final",
    purpose: "Confirma instrumentos, compressas, agulhas, amostras e problemas de equipamento antes da saída.",
  },
];

export const surgicalStages: SurgicalStage[] = [
  {
    id: "team-timeout",
    eyebrow: "ANTES DO CAMPO",
    title: "Interrompa e confirme o plano",
    prompt: "Escolha o recurso que deve reunir as confirmações essenciais antes de qualquer interação com o corpo virtual.",
    expectedToolId: "safety-checklist",
    bodyView: "surface",
    opening: 0,
    target: { x: 50, y: 45 },
    success: "Time-out concluído: identidade fictícia, objetivo, local, equipe e riscos foram verbalmente confirmados.",
    criticalEvent: "O campo foi abordado sem a pausa de segurança. A simulação foi encerrada por risco de procedimento ou local incorreto.",
    learningPoint: "A segurança começa com comunicação estruturada; não com o primeiro instrumento.",
  },
  {
    id: "sterility",
    eyebrow: "PREPARO",
    title: "Proteja o campo virtual",
    prompt: "Selecione o recurso de barreira e preparo antes de tocar na área marcada.",
    expectedToolId: "sterile-field",
    bodyView: "surface",
    opening: 4,
    target: { x: 50, y: 47 },
    success: "Campo virtual preparado e esterilidade confirmada pela equipe.",
    criticalEvent: "A barreira estéril foi comprometida. O cenário foi interrompido por risco crítico de contaminação.",
    learningPoint: "O simulador trata quebra de esterilidade como evento crítico, mesmo sem representar microrganismos.",
  },
  {
    id: "superficial-access",
    eyebrow: "CAMADA SUPERFICIAL",
    title: "Reconheça o instrumento de acesso",
    prompt: "Identifique o instrumento cortante compatível com a abertura superficial puramente virtual.",
    expectedToolId: "scalpel",
    bodyView: "muscular",
    opening: 16,
    target: { x: 50, y: 47 },
    success: "A camada superficial virtual foi aberta e o próximo plano ficou visível.",
    criticalEvent: "Instrumento ou área incompatível com o objetivo atual. A simulação registrou lesão não planejada e foi encerrada.",
    learningPoint: "A imagem mostra apenas mudança de camada; não informa corte, profundidade, força ou trajetória reais.",
  },
  {
    id: "tissue-plane",
    eyebrow: "PLANO DE TECIDO",
    title: "Diferencie antes de avançar",
    prompt: "Escolha o instrumento delicado associado ao reconhecimento de planos virtuais de tecido mole.",
    expectedToolId: "metzenbaum",
    bodyView: "muscular",
    opening: 25,
    target: { x: 50, y: 47 },
    success: "O plano virtual foi separado e as estruturas profundas permaneceram protegidas.",
    criticalEvent: "O avanço ocorreu sem instrumento compatível ou fora do alvo. O cenário foi encerrado por dano a estrutura adjacente.",
    learningPoint: "Reconhecer o instrumento não habilita seu uso; dissecação real exige supervisão, anatomia e treinamento prático.",
  },
  {
    id: "bleeding-control",
    eyebrow: "EVENTO INESPERADO",
    title: "Controle a fonte já identificada",
    prompt: "Um marcador vermelho sinaliza sangramento virtual. Selecione o instrumento de controle temporário previsto no cenário.",
    expectedToolId: "kelly",
    bodyView: "vascular",
    opening: 31,
    target: { x: 52, y: 47 },
    success: "Fonte virtual controlada; o índice de estabilidade voltou ao intervalo seguro da simulação.",
    criticalEvent: "A fonte não foi controlada ou uma estrutura errada foi manipulada. O cenário evoluiu para instabilidade crítica e foi encerrado.",
    learningPoint: "Em atendimento real, resposta a sangramento depende de contexto, equipe, acesso e protocolo; não de uma regra única.",
  },
  {
    id: "field-visibility",
    eyebrow: "VISUALIZAÇÃO",
    title: "Recupere a leitura do campo",
    prompt: "Selecione o instrumento que representa remoção de conteúdo simulado para tornar o campo novamente visível.",
    expectedToolId: "suction",
    bodyView: "organs",
    opening: 35,
    target: { x: 50, y: 47 },
    success: "Campo virtual limpo; estruturas internas foram liberadas apenas para observação anatômica.",
    criticalEvent: "A ação reduziu a visualização ou atingiu uma área incompatível. A simulação foi encerrada por perda de controle do campo.",
    learningPoint: "Nenhum parâmetro de aspiração, pressão ou técnica é fornecido por este ambiente.",
  },
  {
    id: "sign-out",
    eyebrow: "ANTES DE ENCERRAR",
    title: "Faça a conferência final",
    prompt: "Escolha o recurso que confirma contagens, identificação de amostras e problemas de equipamento antes da conclusão.",
    expectedToolId: "final-count",
    bodyView: "surface",
    opening: 7,
    target: { x: 50, y: 47 },
    success: "Sign-out concluído. Contagens, amostras, equipamentos e pontos de recuperação foram revisados.",
    criticalEvent: "O cenário foi encerrado sem a conferência final, criando risco de item retido, amostra incorreta ou falha de comunicação.",
    learningPoint: "Fechar a interface não encerra o cuidado: a equipe ainda precisa comunicar recuperação e problemas identificados.",
  },
];

export const WHO_SURGICAL_SAFETY_URL = "https://www.who.int/teams/integrated-health-services/quality-of-care-and-patient-safety/patient-safety-guidance-and-tools/safe-surgery/tool-and-resources";
