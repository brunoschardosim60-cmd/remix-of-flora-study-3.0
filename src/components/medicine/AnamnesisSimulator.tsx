import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Activity, AlertTriangle, BookOpen, Check, ChevronRight, CircleStop, ExternalLink, HeartPulse,
  Maximize2, MessageCircle, Mic, MicOff, Minimize2, RotateCcw, Send, ShieldCheck,
  Sparkles, Stethoscope, UserRound, Volume2, VolumeX, XCircle,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useFloraVoice } from "@/hooks/useFloraVoice";
import {
  anamnesisCases, anamnesisSources, decisionValueScore, questionValueScore,
  type AnamnesisCase, type AnamnesisCategory, type AnamnesisDecision, type AnamnesisQuestion,
  type PatientVisualState,
} from "@/lib/anamnesisSimulation";
import {
  composeAnchoredPatientReply, createAnamnesisPatientPayload, detectAnamnesisInteractionIntent, matchAnamnesisQuestionsLocally,
  shouldTriggerAnamnesisCrisis, type AnamnesisConversationTurn, type AnamnesisPatientResponse,
} from "@/lib/anamnesisPatient";
import type { MedicineLearningEvent, MedicineLevel } from "@/lib/medicineData";

const categories: AnamnesisCategory[] = ["Abertura", "Sintoma atual", "Antecedentes", "Medicamentos e alergias", "Contexto", "Segurança"];
const valueCopy = {
  critical: { label: "Essencial", className: "critical" }, high: { label: "Alta relevância", className: "high" },
  useful: { label: "Útil", className: "useful" }, poor: { label: "Inadequada", className: "poor" },
} as const;
const decisionCopy = {
  best: { label: "Conduta mais segura", icon: ShieldCheck }, reasonable: { label: "Aceitável com ressalvas", icon: Activity },
  unsafe: { label: "Conduta insegura", icon: AlertTriangle },
} as const;
const stateCopy: Record<PatientVisualState, string> = {
  neutral: "Calmo", pain: "Com dor", distressed: "Agoniado", unconscious: "Inconsciente", stabilized: "Estabilizado",
};

interface ChatMessage {
  id: string;
  role: "student" | "patient" | "system";
  text: string;
  coveredQuestionIds?: string[];
  fallback?: boolean;
}

function scoreForSession(clinicalCase: AnamnesisCase, questions: AnamnesisQuestion[], decision?: AnamnesisDecision) {
  const maxQuestionScore = clinicalCase.questions.filter((q) => q.value !== "poor").reduce((sum, q) => sum + questionValueScore[q.value], 0);
  const questionScore = Math.max(0, questions.reduce((sum, q) => sum + questionValueScore[q.value], 0));
  return Math.max(0, Math.min(100, Math.round((maxQuestionScore ? questionScore / maxQuestionScore * 70 : 0) + (decision ? decisionValueScore[decision.value] : 0))));
}

function openingMessage(clinicalCase: AnamnesisCase): ChatMessage {
  return { id: `opening-${clinicalCase.id}`, role: "patient", text: clinicalCase.openingStatement };
}

async function blobToBase64(blob: Blob) {
  return await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(",")[1] ?? "");
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

export function AnamnesisSimulator({ level, initialCaseId, onLearningEvent }: { level: MedicineLevel; initialCaseId?: string; onLearningEvent?: (event: MedicineLearningEvent) => void }) {
  const [caseId, setCaseId] = useState(() => anamnesisCases.find((item) => item.id === initialCaseId)?.id ?? anamnesisCases[0].id);
  const clinicalCase = anamnesisCases.find((item) => item.id === caseId) ?? anamnesisCases[0];
  const [messages, setMessages] = useState<ChatMessage[]>([openingMessage(clinicalCase)]);
  const [coveredIds, setCoveredIds] = useState<string[]>([]);
  const [input, setInput] = useState("");
  const [isResponding, setIsResponding] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [interactionError, setInteractionError] = useState<string | null>(null);
  const [decisionId, setDecisionId] = useState<string>();
  const [summary, setSummary] = useState("");
  const [evaluated, setEvaluated] = useState(false);
  const [sensitiveAccepted, setSensitiveAccepted] = useState(!clinicalCase.sensitive);
  const [crisisActive, setCrisisActive] = useState(false);
  const [crisisResolved, setCrisisResolved] = useState(false);
  const [autoVoice, setAutoVoice] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showGuidance, setShowGuidance] = useState(level === "beginner");
  const workspaceRef = useRef<HTMLDivElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const { speak, stop: stopVoice, playing: voicePlaying, loading: voiceLoading, error: voiceError, mode: voiceMode } = useFloraVoice();

  const askedQuestions = useMemo(() => clinicalCase.questions.filter((q) => coveredIds.includes(q.id)), [clinicalCase, coveredIds]);
  const selectedDecision = clinicalCase.decisions.find((d) => d.id === decisionId);
  const missedCritical = clinicalCase.questions.filter((q) => q.value === "critical" && !coveredIds.includes(q.id));
  const discoveredFlags = askedQuestions.filter((q) => q.redFlag);
  const coveredCategories = new Set(askedQuestions.map((q) => q.category)).size;
  const sourceList = anamnesisSources.filter((source) => clinicalCase.sourceIds.includes(source.id));
  const score = scoreForSession(clinicalCase, askedQuestions, selectedDecision);
  const currentState: PatientVisualState = crisisResolved ? "stabilized" : crisisActive ? clinicalCase.crisisTrigger?.state ?? "distressed" : clinicalCase.initialState;
  const currentVitals = crisisActive && !crisisResolved ? clinicalCase.crisisTrigger?.crisisVitals ?? clinicalCase.baselineVitals : clinicalCase.baselineVitals;
  const studentTurnCount = messages.filter((message) => message.role === "student").length;

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }); }, [messages, isResponding]);
  useEffect(() => {
    const onFullscreen = () => setIsFullscreen(document.fullscreenElement === workspaceRef.current);
    document.addEventListener("fullscreenchange", onFullscreen);
    return () => document.removeEventListener("fullscreenchange", onFullscreen);
  }, []);
  useEffect(() => () => {
    recorderRef.current?.stop();
    mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
    stopVoice();
  }, [stopVoice]);

  const resetSession = useCallback((nextCase = clinicalCase) => {
    stopVoice(); setMessages([openingMessage(nextCase)]); setCoveredIds([]); setInput(""); setDecisionId(undefined);
    setSummary(""); setEvaluated(false); setCrisisActive(false); setCrisisResolved(false); setInteractionError(null);
    setSensitiveAccepted(!nextCase.sensitive);
  }, [clinicalCase, stopVoice]);

  useEffect(() => {
    if (!initialCaseId || initialCaseId === caseId) return;
    const nextCase = anamnesisCases.find((item) => item.id === initialCaseId);
    if (!nextCase) return;
    setCaseId(nextCase.id);
    resetSession(nextCase);
  }, [caseId, initialCaseId, resetSession]);

  const selectCase = (nextCase: AnamnesisCase) => { setCaseId(nextCase.id); resetSession(nextCase); };

  const sendMessage = useCallback(async () => {
    const text = input.trim();
    if (text.length < 2 || isResponding || evaluated) return;
    setInput(""); setInteractionError(null); setIsResponding(true);
    const priorConversation: AnamnesisConversationTurn[] = messages.filter((m) => m.role !== "system").map((m) => ({ role: m.role === "patient" ? "patient" : "student", text: m.text }));
    setMessages((current) => [...current, { id: `student-${Date.now()}`, role: "student", text }]);

    try {
      const { data, error } = await supabase.functions.invoke("flora-engine", { body: { action: "anamnesis_patient", data: { case: createAnamnesisPatientPayload(clinicalCase), studentMessage: text, conversation: priorConversation, coveredQuestionIds: coveredIds, crisisActive } } });
      if (error || !data?.anchored || !Array.isArray(data?.coveredQuestionIds)) throw error ?? new Error("Resposta não ancorada.");
      const response = data as AnamnesisPatientResponse;
      const nextCovered = [...new Set([...coveredIds, ...response.coveredQuestionIds])];
      const newlyCovered = response.coveredQuestionIds.filter((id) => !coveredIds.includes(id));
      const triggerNow = !crisisActive && shouldTriggerAnamnesisCrisis(clinicalCase, studentTurnCount + 1, nextCovered);
      const reply = triggerNow ? composeAnchoredPatientReply(clinicalCase, response.coveredQuestionIds, true, {
        studentMessage: text,
        conversation: priorConversation,
        interactionIntent: response.interactionIntent,
        previouslyCoveredQuestionIds: coveredIds,
      }) : response.reply;
      if (triggerNow) setCrisisActive(true);
      setCoveredIds(nextCovered);
      setMessages((current) => [...current, { id: `patient-${Date.now()}`, role: "patient", text: reply, coveredQuestionIds: newlyCovered }]);
      if (autoVoice) void speak(reply, triggerNow || currentState === "distressed" ? "padrao" : "amiga");
    } catch {
      const interactionIntent = detectAnamnesisInteractionIntent(text);
      const localIds = matchAnamnesisQuestionsLocally(text, clinicalCase);
      const nextCovered = [...new Set([...coveredIds, ...localIds])];
      const newlyCovered = localIds.filter((id) => !coveredIds.includes(id));
      const triggerNow = !crisisActive && shouldTriggerAnamnesisCrisis(clinicalCase, studentTurnCount + 1, nextCovered);
      const reply = composeAnchoredPatientReply(clinicalCase, localIds, triggerNow || crisisActive, {
        studentMessage: text,
        conversation: priorConversation,
        interactionIntent,
        previouslyCoveredQuestionIds: coveredIds,
      });
      if (triggerNow) setCrisisActive(true);
      setCoveredIds(nextCovered);
      setMessages((current) => [...current, { id: `patient-fallback-${Date.now()}`, role: "patient", text: reply, coveredQuestionIds: newlyCovered, fallback: true }]);
      setInteractionError("A IA ficou indisponível; a entrevista continuou no modo local seguro, usando apenas o caso cadastrado.");
      if (autoVoice) void speak(reply, "padrao");
    } finally { setIsResponding(false); }
  }, [autoVoice, clinicalCase, coveredIds, currentState, evaluated, input, isResponding, messages, speak, crisisActive, studentTurnCount]);

  const transcribeRecording = useCallback(async (blob: Blob) => {
    setIsTranscribing(true); setInteractionError(null);
    try {
      if (blob.size < 500) throw new Error("Áudio muito curto.");
      if (blob.size > 8 * 1024 * 1024) throw new Error("Áudio muito longo.");
      const audio = await blobToBase64(blob);
      const { data, error } = await supabase.functions.invoke("flora-transcribe", { body: { audio, mimeType: blob.type || "audio/webm" } });
      if (error || !data?.text) throw error ?? new Error("Transcrição vazia.");
      setInput((current) => current ? `${current} ${data.text}` : String(data.text));
    } catch { setInteractionError("Não foi possível transcrever. Você pode continuar digitando normalmente."); }
    finally { setIsTranscribing(false); }
  }, []);

  const toggleRecording = useCallback(async () => {
    if (isRecording) { recorderRef.current?.stop(); setIsRecording(false); return; }
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") { setInteractionError("Este navegador não oferece gravação de voz. A entrada por texto continua disponível."); return; }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;
      const mimeType = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"].find((type) => MediaRecorder.isTypeSupported(type));
      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      recorderRef.current = recorder; audioChunksRef.current = [];
      recorder.ondataavailable = (event) => { if (event.data.size) audioChunksRef.current.push(event.data); };
      recorder.onstop = () => { const blob = new Blob(audioChunksRef.current, { type: recorder.mimeType }); stream.getTracks().forEach((track) => track.stop()); mediaStreamRef.current = null; setIsRecording(false); if (blob.size > 0) void transcribeRecording(blob); };
      recorder.start(); setIsRecording(true);
    } catch { setInteractionError("O microfone não foi autorizado. Você pode continuar digitando normalmente."); }
  }, [isRecording, transcribeRecording]);

  const toggleFullscreen = async () => {
    if (!workspaceRef.current) return;
    if (document.fullscreenElement) await document.exitFullscreen(); else await workspaceRef.current.requestFullscreen();
  };
  const chooseDecision = (decision: AnamnesisDecision) => {
    setDecisionId(decision.id);
    if (crisisActive && clinicalCase.crisisTrigger?.safeDecisionIds.includes(decision.id)) setCrisisResolved(true);
  };

  return <div className="med-page med-anamnesis-page">
    <header className="med-page-heading med-anamnesis-heading"><div><span className="med-eyebrow">CONSULTA SIMULADA · {level.toLocaleUpperCase("pt-BR")}</span><h1>Anamnese imersiva</h1><p>Converse livremente. O paciente responde somente com os fatos clínicos validados deste caso.</p></div><div className="med-anamnesis-mode"><MessageCircle /><span><strong>Conversa natural e ancorada</strong><small>Entende acolhimento, seguimentos e reformulações sem inventar fatos.</small></span></div></header>
    <section className="med-anamnesis-safety"><ShieldCheck /><div><strong>Todos os pacientes, sinais vitais e acontecimentos são fictícios</strong><span>Treino educacional de entrevista e priorização. Não diagnostica pessoas reais, não orienta atendimento e não substitui supervisão clínica.</span></div></section>
    <section className="med-anamnesis-library"><header><div><span className="med-eyebrow">SITUAÇÕES IMERSIVAS</span><h2>Escolha quem você vai entrevistar</h2></div><strong>{anamnesisCases.length} casos completos</strong></header><div>{anamnesisCases.map((item) => <button key={item.id} className={item.id === clinicalCase.id ? "active" : ""} onClick={() => selectCase(item)}><span><UserRound /></span><div><small>{item.specialty} · {item.difficulty}</small><strong>{item.title}</strong><p>{item.patient.alias} · {item.patient.age}</p></div>{item.sensitive ? <b><AlertTriangle /> Sensível</b> : <ChevronRight />}</button>)}</div></section>

    <div ref={workspaceRef} className={`med-anamnesis-workspace ${isFullscreen ? "is-fullscreen" : ""}`}>
      <aside className="med-anamnesis-patient"><div className={`med-anamnesis-avatar state-${currentState}`}><div className="med-patient-face"><UserRound /></div><span>{stateCopy[currentState]} · CASO FICTÍCIO</span></div><section><span className="med-eyebrow">PACIENTE</span><h2>{clinicalCase.patient.alias}</h2><p>{clinicalCase.patient.age} · {clinicalCase.patient.occupation}</p></section><dl><div><dt>Chegada</dt><dd>{clinicalCase.arrival}</dd></div><div><dt>Comportamento</dt><dd>{clinicalCase.demeanor}</dd></div><div><dt>Ambiente</dt><dd>{clinicalCase.setting}</dd></div></dl>
        {currentVitals && <div className={`med-anamnesis-vitals ${crisisActive && !crisisResolved ? "critical" : ""}`}><header><Activity /><strong>Monitor simulado</strong><span>{crisisResolved ? "estável" : crisisActive ? "alerta" : "basal"}</span></header><div><span><small>FC</small><b>{currentVitals.heartRate}</b><em>bpm</em></span><span><small>PA</small><b>{currentVitals.bloodPressure}</b><em>mmHg</em></span><span><small>FR</small><b>{currentVitals.respiratoryRate}</b><em>irpm</em></span><span><small>SpO₂</small><b>{currentVitals.oxygenSaturation}</b><em>%</em></span></div></div>}
        <div className="med-anamnesis-progress"><header><span>História explorada</span><strong>{coveredIds.length}/{clinicalCase.questions.length}</strong></header><div><i style={{ width: `${coveredIds.length / clinicalCase.questions.length * 100}%` }} /></div><footer><span>{coveredCategories}/6 áreas</span><span>{discoveredFlags.length} alertas percebidos</span></footer></div>
      </aside>

      <main className="med-anamnesis-conversation">
        {clinicalCase.sensitive && !sensitiveAccepted ? <section className="med-anamnesis-sensitive-gate"><AlertTriangle /><span>CONTEÚDO SENSÍVEL</span><h2>Esta entrevista exige cuidado</h2><p>O caso aborda {clinicalCase.sensitiveWarnings?.join(", ")}. As respostas são fictícias, não gráficas e podem causar desconforto.</p><button onClick={() => { setSensitiveAccepted(true); void speak(clinicalCase.openingStatement, "padrao"); }}><Check /> Estou ciente — iniciar entrevista</button><small>Você pode escolher outro caso na biblioteca acima.</small></section> : evaluated ? <AnamnesisReport clinicalCase={clinicalCase} questions={askedQuestions} decision={selectedDecision!} summary={summary} score={score} missedCritical={missedCritical} sources={sourceList} crisisOccurred={crisisActive} crisisResolved={crisisResolved} onRestart={() => resetSession()} /> : <>
          <header><div><span className="med-eyebrow">CONSULTA EM ANDAMENTO</span><h2>{clinicalCase.title}</h2></div><div className="med-anamnesis-session-actions"><button onClick={() => setAutoVoice((v) => !v)} title={autoVoice ? "Desativar voz automática" : "Ativar voz automática"}>{autoVoice ? <Volume2 /> : <VolumeX />}</button><button onClick={toggleFullscreen} title={isFullscreen ? "Sair da tela cheia" : "Tela cheia"}>{isFullscreen ? <Minimize2 /> : <Maximize2 />}</button><span><Stethoscope /> {clinicalCase.setting}</span></div></header>
          {crisisActive && !crisisResolved && <div className="med-anamnesis-crisis"><HeartPulse /><div><strong>Mudança clínica percebida</strong><p>{clinicalCase.crisisTrigger?.narrative}</p></div></div>}
          {crisisResolved && <div className="med-anamnesis-crisis resolved"><ShieldCheck /><div><strong>Resposta de segurança reconhecida</strong><p>O cenário foi estabilizado para fins educacionais. Finalize a síntese e revise o debriefing.</p></div></div>}
          <div className="med-anamnesis-chat" aria-live="polite">{messages.map((message) => <article key={message.id} className={`${message.role} ${message.fallback ? "fallback" : ""}`}><span>{message.role === "student" ? <Stethoscope /> : <UserRound />}</span><div><small>{message.role === "student" ? "VOCÊ" : clinicalCase.patient.alias}</small><p>{message.text}</p>{message.coveredQuestionIds?.map((id) => { const question = clinicalCase.questions.find((q) => q.id === id); return question ? <aside key={id} className={valueCopy[question.value].className}><strong>{valueCopy[question.value].label}</strong><span>{question.feedback}</span></aside> : null; })}{message.fallback && <em>Resposta local ancorada</em>}</div></article>)}{isResponding && <article className="patient thinking"><span><UserRound /></span><div><small>{clinicalCase.patient.alias}</small><p><i /><i /><i /></p></div></article>}<div ref={chatEndRef} /></div>
          <div className="med-anamnesis-composer">{interactionError && <p role="status"><AlertTriangle /> {interactionError}</p>}<div><textarea value={input} onChange={(event) => setInput(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); void sendMessage(); } }} placeholder="Pergunte livremente ao paciente..." aria-label="Pergunta ao paciente" disabled={isResponding || isTranscribing} /><button className={`mic ${isRecording ? "recording" : ""}`} onClick={toggleRecording} disabled={isTranscribing || isResponding} aria-label={isRecording ? "Parar gravação" : "Falar pergunta"}>{isTranscribing ? <Sparkles /> : isRecording ? <CircleStop /> : <Mic />}</button><button className="send" onClick={() => void sendMessage()} disabled={input.trim().length < 2 || isResponding || isTranscribing} aria-label="Enviar pergunta"><Send /></button></div><footer><span>{voiceError ?? (isRecording ? "Gravando — toque para parar" : isTranscribing ? "Transcrevendo sua fala..." : voiceMode === "device" ? "Voz do dispositivo em reprodução" : "Enter envia · Shift+Enter quebra a linha")}</span><button onClick={() => voicePlaying ? stopVoice() : void speak(messages.filter((m) => m.role === "patient").at(-1)?.text ?? clinicalCase.openingStatement, "padrao")} disabled={voiceLoading}>{voicePlaying ? <MicOff /> : <Volume2 />} {voiceLoading ? "Gerando voz..." : voicePlaying ? "Parar voz" : "Ouvir paciente"}</button></footer></div>
          <section className="med-anamnesis-synthesis"><header><div><span className="med-eyebrow">SÍNTESE CLÍNICA</span><h3>Organize o que você descobriu</h3></div><small>Sem diagnóstico definitivo: resuma problema, cronologia, alertas e contexto.</small></header><textarea value={summary} onChange={(event) => setSummary(event.target.value)} placeholder="Ex.: Pessoa de 54 anos com pressão torácica iniciada há..." /></section>
          <section className="med-anamnesis-decisions"><header><span className="med-eyebrow">DECISÃO DE SEGURANÇA</span><h3>{crisisActive ? "Como você responde à mudança clínica?" : "Qual é o próximo passo mais seguro?"}</h3><p>As opções avaliam priorização educacional, não prescrevem conduta para pacientes reais.</p></header><div>{clinicalCase.decisions.map((decision) => <button key={decision.id} disabled={coveredIds.length < 3} className={decision.id === decisionId ? "active" : ""} onClick={() => chooseDecision(decision)}><span><ChevronRight /></span><strong>{decision.label}</strong></button>)}</div>{selectedDecision && <aside className={selectedDecision.value}>{(() => { const Icon = decisionCopy[selectedDecision.value].icon; return <Icon />; })()}<div><strong>{decisionCopy[selectedDecision.value].label}</strong><p>{selectedDecision.feedback}</p></div></aside>}<footer><span>{coveredIds.length < 3 ? `Explore mais ${3 - coveredIds.length} tópico(s) antes de decidir.` : "Decisão liberada."}</span><button disabled={!selectedDecision || summary.trim().length < 20} onClick={() => { setEvaluated(true); onLearningEvent?.({ id: `anamnesis:${clinicalCase.id}`, label: clinicalCase.title, correct: selectedDecision?.value === "best" && missedCritical.length === 0 }); }}><BookOpen /> Gerar debriefing</button></footer></section>
        </>}
      </main>

      {!evaluated && sensitiveAccepted && <aside className="med-anamnesis-questions med-anamnesis-competencies"><header><span className="med-eyebrow">MAPA DA ENTREVISTA</span><h2>O que você já cobriu?</h2><p>Sem lista de perguntas prontas: acompanhe apenas as áreas exploradas.</p></header><nav>{categories.map((category) => { const total = clinicalCase.questions.filter((q) => q.category === category).length; const done = askedQuestions.filter((q) => q.category === category).length; return <span key={category} className={done === total ? "complete" : ""}>{category}<b>{done}/{total}</b></span>; })}</nav><div className="med-anamnesis-competency-list">{categories.map((category) => { const questions = clinicalCase.questions.filter((q) => q.category === category); const completed = questions.filter((q) => coveredIds.includes(q.id)); return <section key={category}><header><strong>{category}</strong><span>{completed.length}/{questions.length}</span></header><div className="med-competency-meter"><i style={{ width: `${questions.length ? completed.length / questions.length * 100 : 0}%` }} /></div>{completed.map((question) => <p key={question.id}><Check /> {valueCopy[question.value].label}{question.redFlag ? " · alerta reconhecido" : ""}</p>)}</section>; })}</div><footer><button onClick={() => setShowGuidance((v) => !v)}><Sparkles /> {showGuidance ? "Ocultar orientação" : "Preciso de orientação"}</button>{showGuidance && <p>Comece com uma pergunta aberta. Depois explore o sintoma atual, segurança, antecedentes, medicamentos e contexto — sem julgar nem sugerir respostas.</p>}</footer></aside>}
    </div>
  </div>;
}

export default AnamnesisSimulator;

function AnamnesisReport({ clinicalCase, questions, decision, summary, score, missedCritical, sources, crisisOccurred, crisisResolved, onRestart }: {
  clinicalCase: AnamnesisCase; questions: AnamnesisQuestion[]; decision: AnamnesisDecision; summary: string; score: number;
  missedCritical: AnamnesisQuestion[]; sources: Array<(typeof anamnesisSources)[number]>; crisisOccurred: boolean; crisisResolved: boolean; onRestart: () => void;
}) {
  const DecisionIcon = decisionCopy[decision.value].icon;
  const poorQuestions = questions.filter((q) => q.value === "poor");
  return <section className="med-anamnesis-report"><header><div><span className="med-eyebrow">DEBRIEFING ESTRUTURADO</span><h2>{score >= 80 ? "Anamnese segura e bem priorizada" : score >= 55 ? "Boa base, com lacunas importantes" : "A entrevista precisa ser refeita"}</h2><p>O resultado avalia coleta, comunicação e decisão dentro deste caso fictício.</p></div><div className={score >= 80 ? "excellent" : score >= 55 ? "developing" : "risk"}><strong>{score}</strong><span>/100</span></div></header>
    <div className="med-anamnesis-report-grid"><article className={`decision ${decision.value}`}><DecisionIcon /><div><small>SUA DECISÃO</small><strong>{decisionCopy[decision.value].label}</strong><p>{decision.feedback}</p></div></article><article><BookOpen /><div><small>SUA SÍNTESE</small><p>{summary}</p></div></article>{crisisOccurred && <article className={crisisResolved ? "success" : "unsafe"}><Activity /><div><small>RESPOSTA À MUDANÇA</small><strong>{crisisResolved ? "Mudança reconhecida e resposta segura" : "Mudança não estabilizada"}</strong><p>{clinicalCase.crisisTrigger?.narrative}</p></div></article>}</div>
    <section><header><span className="med-eyebrow">COMPARAÇÃO ESTRUTURADA</span><h3>O que a história precisava revelar</h3></header><div className="med-anamnesis-reference"><article><strong>Síntese de referência</strong><p>{clinicalCase.referenceSummary}</p></article><article><strong>Achados-chave</strong><ul>{clinicalCase.keyFindings.map((finding) => <li key={finding}><Check /> {finding}</li>)}</ul></article><article><strong>Hipóteses para estudo</strong><ul>{clinicalCase.differentials.map((item) => <li key={item}><ChevronRight /> {item}</li>)}</ul></article></div></section>
    <section className="med-anamnesis-gaps"><header><span className="med-eyebrow">FEEDBACK DA CONVERSA</span><h3>Lacunas e qualidade das perguntas</h3></header><div><article className={missedCritical.length ? "warning" : "success"}><strong>{missedCritical.length ? `${missedCritical.length} pergunta(s) essencial(is) não feita(s)` : "Todas as perguntas essenciais foram feitas"}</strong>{missedCritical.map((q) => <p key={q.id}><AlertTriangle /> {q.text}</p>)}</article><article className={poorQuestions.length ? "warning" : "success"}><strong>{poorQuestions.length ? `${poorQuestions.length} pergunta(s) prejudicaram o vínculo` : "Nenhuma pergunta inadequada foi usada"}</strong>{poorQuestions.map((q) => <p key={q.id}><XCircle /> {q.feedback}</p>)}</article></div></section>
    <footer><div><strong>Fontes educacionais</strong>{sources.map((source) => <a key={source.id} href={source.url} target="_blank" rel="noreferrer">{source.title} <ExternalLink /></a>)}</div><button onClick={onRestart}><RotateCcw /> Refazer esta entrevista</button></footer></section>;
}
