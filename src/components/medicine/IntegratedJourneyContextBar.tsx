import { ArrowRight, Check, HeartPulse, Rotate3D } from "lucide-react";
import {
  integratedJourneyForContext,
  integratedStepForContext,
  nextIntegratedStepForContext,
  type IntegratedMedicineContext,
  type IntegratedMedicineStep,
} from "@/lib/medicineIntegratedJourney";

type IntegratedJourneyContextBarProps = {
  context: IntegratedMedicineContext;
  onReturnTo3D: () => void;
  onOpenStep: (step: IntegratedMedicineStep, structure: { id: string; name: string }) => void;
};

export function IntegratedJourneyContextBar({ context, onReturnTo3D, onOpenStep }: IntegratedJourneyContextBarProps) {
  const journey = integratedJourneyForContext(context);
  const activeStep = integratedStepForContext(context);
  const nextStep = nextIntegratedStepForContext(context);
  if (!journey || !activeStep) return null;

  const activeIndex = journey.steps.findIndex((step) => step.id === activeStep.id);
  const structure = { id: context.structure.source3DId, name: context.structure.label };

  return <aside className="med-integrated-journey-bar" aria-label={`Contexto ativo: ${journey.shortTitle}`}>
    <div className="med-integrated-journey-identity">
      <i><HeartPulse /></i>
      <span>
        <small>{journey.shortTitle} · {journey.systemLabel}</small>
        <strong>{context.structure.label}</strong>
      </span>
    </div>
    <div className="med-integrated-journey-progress">
      <span><Check /> Etapa {activeIndex + 1} de {journey.steps.length}</span>
      <strong>{activeStep.label}</strong>
      <div aria-label={`${activeIndex + 1} de ${journey.steps.length} etapas`}><i style={{ width: `${((activeIndex + 1) / journey.steps.length) * 100}%` }} /></div>
    </div>
    <div className="med-integrated-journey-actions">
      <button type="button" onClick={onReturnTo3D}><Rotate3D /> Voltar ao 3D</button>
      {nextStep && <button type="button" className="primary" onClick={() => onOpenStep(nextStep, structure)}>
        <span><small>Próxima etapa</small>{nextStep.label}</span><ArrowRight />
      </button>}
    </div>
  </aside>;
}
