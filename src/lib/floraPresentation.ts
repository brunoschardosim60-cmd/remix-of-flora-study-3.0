export const floraDecisionLabels: Record<string, string> = {
  risk_alert: "Retomar os estudos", fatigue: "Pausa e ritmo de estudo",
  proactive_suggestion: "Sugestão de estudo", reduce_load: "Ajuste da carga",
  proactive: "Sugestão de estudo", schedule_adjustment: "Ajuste do cronograma",
};
export function decisionLabel(kind: string) {
  return floraDecisionLabels[kind] ?? "Orientação de estudo";
}
export function decisionReason(kind: string, reason: string) {
  const hours = reason.match(/(?:há|ha)\s+([\d.,]+)h\s+sem pausa/i);
  if (kind === "fatigue" && hours && Number(hours[1].replace(",", ".")) > 24) {
    return "Alerta antigo com duração inconsistente. Desconsidere esta estimativa; ela não representa tempo de estudo validado.";
  }
  return reason;
}
