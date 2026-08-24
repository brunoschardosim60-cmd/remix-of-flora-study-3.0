import { useMemo, useState, type CSSProperties, type MouseEvent } from "react";
import {
  AlertOctagon, ArrowRight, Check, ClipboardCheck, ExternalLink, Eye, EyeOff, ListChecks,
  RotateCcw, Scissors, ShieldCheck, Sparkles, Wind, Wrench, X,
  type LucideIcon,
} from "lucide-react";
import { medicalInstruments } from "@/lib/medicalInstruments";
import {
  surgicalStages, surgicalTools, WHO_SURGICAL_SAFETY_URL,
  type SurgicalToolId,
} from "@/lib/surgicalSimulation";
import type { MedicineLevel } from "@/lib/medicineData";

type SimulationState = "ready" | "running" | "failed" | "complete";

const toolIcons: Record<SurgicalToolId, LucideIcon> = {
  "safety-checklist": ClipboardCheck,
  "sterile-field": ShieldCheck,
  scalpel: Wrench,
  metzenbaum: Scissors,
  kelly: Wrench,
  suction: Wind,
  "needle-holder": Wrench,
  "final-count": ListChecks,
};

function ToolVisual({ toolId }: { toolId: SurgicalToolId }) {
  const tool = surgicalTools.find((item) => item.id === toolId)!;
  const instrument = tool.instrumentId ? medicalInstruments.find((item) => item.id === tool.instrumentId) : undefined;
  const Icon = toolIcons[toolId];
  return instrument?.image
    ? <img src={instrument.image} alt={`Render educacional de ${tool.name}`} loading="lazy" />
    : <span><Icon /></span>;
}

export function SurgerySimulator({ level }: { level: MedicineLevel }) {
  const [state, setState] = useState<SimulationState>("ready");
  const [stageIndex, setStageIndex] = useState(0);
  const [selectedTool, setSelectedTool] = useState<SurgicalToolId | null>(null);
  const [criticalMessage, setCriticalMessage] = useState("");
  const [hint, setHint] = useState("Selecione um recurso e depois toque somente no alvo marcado.");
  const [showAnatomy, setShowAnatomy] = useState(true);
  const [log, setLog] = useState<string[]>([]);

  const stage = surgicalStages[Math.min(stageIndex, surgicalStages.length - 1)];
  const selected = surgicalTools.find((tool) => tool.id === selectedTool);
  const guided = level === "Iniciante" || level === "Ciclo básico";
  const progress = state === "complete" ? 100 : Math.round((stageIndex / surgicalStages.length) * 100);
  const completedLabel = `${Math.min(stageIndex, surgicalStages.length)} de ${surgicalStages.length}`;
  const imagePath = `/medicine/atlas/${stage.bodyView}-anterior-v2.png`;
  const safeStyle = {
    "--surgery-opening": `${stage.opening}%`,
    "--surgery-target-x": `${stage.target.x}%`,
    "--surgery-target-y": `${stage.target.y}%`,
  } as CSSProperties;

  const reset = () => {
    setState("ready");
    setStageIndex(0);
    setSelectedTool(null);
    setCriticalMessage("");
    setHint("Selecione um recurso e depois toque somente no alvo marcado.");
    setLog([]);
  };

  const fail = (message: string) => {
    setCriticalMessage(message);
    setState("failed");
    setSelectedTool(null);
  };

  const applySelectedTool = (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    if (state !== "running") return;
    if (!selectedTool) {
      setHint("Nenhum recurso está selecionado. Escolha um item da bandeja antes de tocar no campo.");
      return;
    }
    if (selectedTool !== stage.expectedToolId) {
      fail(`${stage.criticalEvent} Recurso selecionado: ${selected?.name ?? "não identificado"}.`);
      return;
    }

    const nextLog = [...log, stage.success];
    setLog(nextLog);
    setSelectedTool(null);
    setHint(stage.learningPoint);
    if (stageIndex === surgicalStages.length - 1) {
      setState("complete");
      return;
    }
    setStageIndex((value) => value + 1);
  };

  const missTarget = () => {
    if (state !== "running") return;
    if (!selectedTool) {
      setHint("Primeiro selecione um recurso. O campo não aceita interação livre.");
      return;
    }
    fail(`Movimento fora da área segura com ${selected?.name ?? "recurso não identificado"}. ${stage.criticalEvent}`);
  };

  const expectedName = useMemo(
    () => surgicalTools.find((tool) => tool.id === stage.expectedToolId)?.name,
    [stage.expectedToolId],
  );

  return <div className="med-page med-surgery-page">
    <header className="med-page-heading med-surgery-heading">
      <div><span className="med-eyebrow">SIMULAÇÃO EDUCACIONAL · {level}</span><h1>Centro cirúrgico virtual</h1><p>Reconheça instrumentos, respeite barreiras e avance pelas camadas anatômicas sem receber instruções operatórias executáveis.</p></div>
      <div className="med-surgery-mode"><ShieldCheck /><span><strong>Modo sem margem de erro</strong><small>Instrumento incorreto ou movimento fora do alvo encerra o cenário.</small></span></div>
    </header>

    <section className="med-surgery-safety">
      <AlertOctagon /><div><strong>Isto não é treinamento para operar pessoas</strong><span>A sequência é simplificada e não fornece medidas, profundidade, força, ângulo, dose, técnica de incisão, sutura ou resposta clínica real. “Falha crítica” é uma regra do simulador e não significa que todo erro real seja fatal.</span></div>
      <a href={WHO_SURGICAL_SAFETY_URL} target="_blank" rel="noreferrer">Base de segurança da OMS <ExternalLink /></a>
    </section>

    <div className="med-surgery-dashboard">
      <section className="med-surgery-stage-card">
        <header>
          <div><span>{stage.eyebrow}</span><strong>{state === "complete" ? "Cenário concluído" : stage.title}</strong></div>
          <button onClick={() => setShowAnatomy((value) => !value)}>{showAnatomy ? <EyeOff /> : <Eye />}{showAnatomy ? "Ocultar anatomia" : "Mostrar anatomia"}</button>
        </header>

        <div className={`med-surgery-body ${showAnatomy ? "anatomy-on" : "anatomy-off"}`} style={safeStyle} onClick={missTarget}>
          <img className="med-surgery-surface" src="/medicine/atlas/surface-anterior-v2.png" alt="Vista anterior da superfície corporal em ilustração educacional" />
          <img className="med-surgery-inner" src={imagePath} alt={`Camada ${stage.bodyView} em ilustração educacional`} />
          <div className="med-surgery-field-ring" />
          {stage.id === "bleeding-control" && state === "running" && <div className="med-surgery-bleeding"><i /><i /><i /></div>}
          {state === "running" && <button className="med-surgery-target" onClick={applySelectedTool} aria-label={`Aplicar ${selected?.name ?? "recurso selecionado"} somente na área segura`}><span><Sparkles /></span><small>ALVO SEGURO</small></button>}
          {state === "ready" && <div className="med-surgery-cover"><ShieldCheck /><strong>Ambiente bloqueado</strong><span>Leia os limites e inicie quando estiver pronto.</span><button onClick={(event) => { event.stopPropagation(); setState("running"); }}>Iniciar cenário <ArrowRight /></button></div>}
          {state === "complete" && <div className="med-surgery-cover complete"><Check /><strong>Sign-out concluído</strong><span>Todos os sete pontos de segurança foram registrados.</span><button onClick={(event) => { event.stopPropagation(); reset(); }}>Refazer cenário <RotateCcw /></button></div>}
          {!showAnatomy && <div className="med-surgery-anatomy-mask"><EyeOff /><strong>Conteúdo anatômico oculto</strong><span>O motor continua ativo sem mostrar as camadas.</span></div>}
          <div className="med-surgery-caption">Ilustração educacional · sem parâmetros de técnica real</div>
        </div>
      </section>

      <aside className="med-surgery-console">
        <div className="med-surgery-progress">
          <header><span>Progresso do cenário</span><strong>{completedLabel}</strong></header>
          <div><i style={{ width: `${progress}%` }} /></div>
          <nav aria-label="Etapas da simulação">{surgicalStages.map((item, index) => <span key={item.id} className={index < stageIndex || state === "complete" ? "done" : index === stageIndex ? "active" : ""}>{index < stageIndex || state === "complete" ? <Check /> : index + 1}</span>)}</nav>
        </div>

        <article className="med-surgery-task">
          <span className="med-eyebrow">DECISÃO ATUAL</span>
          <h2>{state === "complete" ? "Revisão liberada" : stage.title}</h2>
          <p>{state === "complete" ? "Compare as decisões registradas e revise os pontos de segurança antes de repetir." : stage.prompt}</p>
          {guided && state === "running" && <div className="med-surgery-guidance"><Sparkles /><span>Treino guiado: procure <strong>{expectedName}</strong>.</span></div>}
          <div className={`med-surgery-hint ${state === "failed" ? "critical" : ""}`}><span>{state === "failed" ? <X /> : <ShieldCheck />}</span><p>{state === "failed" ? criticalMessage : hint}</p></div>
        </article>

        <section className="med-surgery-tray">
          <header><div><span className="med-eyebrow">BANDEJA VIRTUAL</span><h3>Escolha um recurso</h3></div>{selected && <button onClick={() => setSelectedTool(null)}>Limpar</button>}</header>
          <div>{surgicalTools.map((tool) => <button key={tool.id} disabled={state !== "running"} className={selectedTool === tool.id ? "active" : ""} onClick={() => { setSelectedTool(tool.id); setHint(`${tool.name} selecionado. Toque somente no alvo se essa for a decisão segura.`); }} title={tool.purpose}>
            <ToolVisual toolId={tool.id} /><span><strong>{tool.shortName}</strong><small>{tool.purpose}</small></span>{selectedTool === tool.id && <Check />}
          </button>)}</div>
        </section>
      </aside>
    </div>

    <section className="med-surgery-debrief">
      <header><div><span className="med-eyebrow">REGISTRO DA EQUIPE</span><h2>Debriefing de segurança</h2></div><strong>{log.length} decisões seguras</strong></header>
      <div>{surgicalStages.map((item, index) => <article key={item.id} className={index < log.length ? "done" : "pending"}><span>{index < log.length ? <Check /> : index + 1}</span><div><small>{item.eyebrow}</small><strong>{item.title}</strong><p>{index < log.length ? log[index] : "Aguardando conclusão desta etapa."}</p></div></article>)}</div>
    </section>

    {state === "failed" && <div className="med-surgery-failure" role="dialog" aria-modal="true" aria-labelledby="surgery-failure-title">
      <article><div><AlertOctagon /></div><span>EVENTO CRÍTICO DO SIMULADOR</span><h2 id="surgery-failure-title">Cenário encerrado</h2><p>{criticalMessage}</p><aside><ShieldCheck /><span>O resultado é fictício. Em uma situação real, interrompa e chame a equipe responsável; este aplicativo não fornece conduta médica.</span></aside><button onClick={reset}><RotateCcw /> Reiniciar desde o checklist</button></article>
    </div>}
  </div>;
}
