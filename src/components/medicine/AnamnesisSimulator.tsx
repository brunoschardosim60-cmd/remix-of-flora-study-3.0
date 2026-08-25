import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle, ArrowRight, BookOpen, Check, CheckCircle2, ChevronRight, ClipboardCheck,
  ExternalLink, HeartPulse, MessageCircle, RotateCcw, ShieldCheck, Sparkles, Stethoscope,
  UserRound, XCircle,
} from "lucide-react";
import {
  anamnesisCases, anamnesisSources, decisionValueScore, questionValueScore,
  type AnamnesisCase, type AnamnesisDecision, type AnamnesisQuestion,
} from "@/lib/anamnesisSimulation";
import type { MedicineLevel } from "@/lib/medicineData";

const categories: AnamnesisCategory[] = ["Abertura", "Sintoma atual", "Antecedentes", "Medicamentos e alergias", "Contexto", "Segurança"];

const valueCopy = {
  critical: { label: "Essencial", className: "critical" },
  high: { label: "Muito relevante", className: "high" },
  useful: { label: "Útil", className: "useful" },
  poor: { label: "Inadequada", className: "poor" },
} as const;

const decisionCopy = {
  best: { label: "Decisão mais segura", icon: CheckCircle2 },
  reasonable: { label: "Aceitável com ressalvas", icon: AlertTriangle },
  unsafe: { label: "Decisão insegura", icon: XCircle },
} as const;

function scoreForSession(clinicalCase: AnamnesisCase, askedIds: string[], decision?: AnamnesisDecision) {
  const questions = clinicalCase.questions.filter((question) => askedIds.includes(question.id));
  const available = clinicalCase.questions.reduce((sum, question) => sum + Math.max(questionValueScore[question.value], 0), 0);
  const collected = questions.reduce((sum, question) => sum + questionValueScore[question.value], 0);
  const historyScore = Math.round(Math.max(0, collected) / Math.max(available, 1) * 50);
  const openedWell = questions[0]?.category === "Abertura" && questions[0]?.value !== "poor";
  const avoidedPoor = questions.every((question) => question.value !== "poor");
  const communicationScore = (openedWell ? 10 : 0) + (avoidedPoor ? 10 : 0);
  return Math.min(100, Math.max(0, historyScore + communicationScore + (decision ? decisionValueScore[decision.value] : 0)));
}

export function AnamnesisSimulator({ level, onLearningEvent }: {
  level: MedicineLevel;
  onLearningEvent?: (event: { id: string; label: string; correct: boolean }) => void;
}) {
  const [caseId, setCaseId] = useState(anamnesisCases[0].id);
  const [askedIds, setAskedIds] = useState<string[]>([]);
  const [decisionId, setDecisionId] = useState<string | null>(null);
  const [summary, setSummary] = useState("");
  const [evaluated, setEvaluated] = useState(false);
  const [sensitiveAccepted, setSensitiveAccepted] = useState(!anamnesisCases[0].sensitive);
  const chatEndRef = useRef<HTMLDivElement | null>(null);

  const clinicalCase = anamnesisCases.find((item) => item.id === caseId) ?? anamnesisCases[0];
  const selectedDecision = clinicalCase.decisions.find((decision) => decision.id === decisionId);
  const guided = level === "Iniciante" || level === "Ciclo básico";
  const askedQuestions = askedIds.map((id) => clinicalCase.questions.find((question) => question.id === id)).filter((question): question is AnamnesisQuestion => Boolean(question));
  const missedCritical = clinicalCase.questions.filter((question) => question.value === "critical" && !askedIds.includes(question.id));
  const discoveredFlags = askedQuestions.filter((question) => question.redFlag);
  const coveredCategories = new Set(askedQuestions.map((question) => question.category)).size;
  const score = scoreForSession(clinicalCase, askedIds, selectedDecision);
  const canEvaluate = Boolean(selectedDecision) && summary.trim().length >= 40 && askedIds.length >= 4;

  const resetSession = (nextCase?: AnamnesisCase) => {
    const target = nextCase ?? clinicalCase;
    setAskedIds([]);
    setDecisionId(null);
    setSummary("");
    setEvaluated(false);
    setSensitiveAccepted(!target.sensitive);
  };

  const selectCase = (nextCase: AnamnesisCase) => {
    if (nextCase.id === clinicalCase.id) return;
    setCaseId(nextCase.id);
    resetSession(nextCase);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const ask = (question: AnamnesisQuestion) => {
    if (askedIds.includes(question.id) || evaluated || (clinicalCase.sensitive && !sensitiveAccepted)) return;
    setAskedIds((current) => [...current, question.id]);
  };

  useEffect(() => {
    const chat = chatEndRef.current?.parentElement;
    if (chat) chat.scrollTo({ top: chat.scrollHeight, behavior: "smooth" });
  }, [askedIds.length]);

  const sourceList = useMemo(
    () => anamnesisSources.filter((source) => clinicalCase.sourceIds.includes(source.id)),
    [clinicalCase],
  );

  return <div className="med-page med-anamnesis-page">
    <header className="med-page-heading med-anamnesis-heading">
      <div><span className="med-eyebrow">PACIENTE VIRTUAL · {level}</span><h1>Laboratório de anamnese</h1><p>Conduza a conversa, descubra pistas apenas quando fizer as perguntas certas e assuma uma decisão clínica educacional.</p></div>
      <div className="med-anamnesis-mode"><MessageCircle /><span><strong>Entrevista responsiva</strong><small>O paciente responde conforme a pergunta escolhida.</small></span></div>
    </header>

    <section className="med-anamnesis-safety"><ShieldCheck /><div><strong>Todos os pacientes e acontecimentos são fictícios</strong><span>A atividade treina coleta de história e priorização. Não diagnostica pessoas reais nem substitui supervisão clínica.</span></div></section>

    <section className="med-anamnesis-library">
      <header><div><span className="med-eyebrow">SITUAÇÕES IMERSIVAS</span><h2>Escolha quem você vai entrevistar</h2></div><strong>{anamnesisCases.length} casos completos</strong></header>
      <div>{anamnesisCases.map((item) => <button key={item.id} className={item.id === clinicalCase.id ? "active" : ""} onClick={() => selectCase(item)}>
        <span><UserRound /></span><div><small>{item.specialty} · {item.difficulty}</small><strong>{item.title}</strong><p>{item.patient.alias}, {item.patient.age} · {item.setting}</p></div>{item.sensitive ? <b><AlertTriangle /> Sensível</b> : <ChevronRight />}
      </button>)}</div>
    </section>

    <div className="med-anamnesis-workspace">
      <aside className="med-anamnesis-patient">
        <div className="med-anamnesis-avatar"><UserRound /><span>CASO FICTÍCIO</span></div>
        <section><span className="med-eyebrow">PACIENTE</span><h2>{clinicalCase.patient.alias}</h2><p>{clinicalCase.patient.age} · {clinicalCase.patient.occupation}<br />Pronomes: {clinicalCase.patient.pronouns}</p></section>
        <dl><div><dt>Ambiente</dt><dd>{clinicalCase.setting}</dd></div><div><dt>Chegada</dt><dd>{clinicalCase.arrival}</dd></div><div><dt>Comportamento</dt><dd>{clinicalCase.demeanor}</dd></div></dl>
        <div className="med-anamnesis-progress"><header><span>História explorada</span><strong>{askedIds.length}/{clinicalCase.questions.length}</strong></header><div><i style={{ width: `${askedIds.length / clinicalCase.questions.length * 100}%` }} /></div><footer><span>{coveredCategories}/6 áreas</span><span>{discoveredFlags.length} alertas percebidos</span></footer></div>
        {guided && <div className="med-anamnesis-guide"><Sparkles /><p><strong>Modo guiado</strong> Comece aberto, caracterize a queixa e depois explore segurança, antecedentes e contexto.</p></div>}
      </aside>

      <main className="med-anamnesis-conversation">
        {clinicalCase.sensitive && !sensitiveAccepted ? <section className="med-anamnesis-sensitive-gate"><AlertTriangle /><span>CONTEÚDO SENSÍVEL</span><h2>Esta entrevista exige cuidado</h2><p>O caso aborda {clinicalCase.sensitiveWarnings?.join(", ")}. As respostas são fictícias, não gráficas e podem causar desconforto.</p><button onClick={() => setSensitiveAccepted(true)}><Check /> Estou ciente — iniciar entrevista</button><small>Você pode escolher outro caso na biblioteca acima.</small></section> : evaluated ? <AnamnesisReport clinicalCase={clinicalCase} questions={askedQuestions} decision={selectedDecision!} summary={summary} score={score} missedCritical={missedCritical} sources={sourceList} onRestart={() => resetSession()} /> : <>
          <header><div><span className="med-eyebrow">CONSULTA EM ANDAMENTO</span><h2>{clinicalCase.title}</h2></div><span><HeartPulse /> {clinicalCase.setting}</span></header>
          <div className="med-anamnesis-chat" aria-live="polite">
            <article className="patient"><span><UserRound /></span><div><small>{clinicalCase.patient.alias}</small><p>{clinicalCase.openingStatement}</p></div></article>
            {askedQuestions.map((question) => <div key={question.id} className="med-anamnesis-exchange">
              <article className="student"><div><small>Você</small><p>{question.text}</p></div><span><Stethoscope /></span></article>
              <article className="patient"><span><UserRound /></span><div><small>{clinicalCase.patient.alias}</small><p>{question.answer}</p></div></article>
              <aside className={valueCopy[question.value].className}><strong>{valueCopy[question.value].label}</strong><p>{question.feedback}</p>{question.redFlag && <span><AlertTriangle /> Sinal de alerta registrado</span>}</aside>
            </div>)}
            <div ref={chatEndRef} />
          </div>

          <section className="med-anamnesis-synthesis">
            <header><div><span className="med-eyebrow">SÍNTESE DO ALUNO</span><h3>Resuma o problema antes de decidir</h3></div><small>{summary.trim().length}/40 caracteres mínimos</small></header>
            <textarea value={summary} onChange={(event) => setSummary(event.target.value)} placeholder="Ex.: Pessoa adulta com início súbito de... Principais sinais de alerta..." />
          </section>

          <section className="med-anamnesis-decisions">
            <header><span className="med-eyebrow">DECISÃO CLÍNICA EDUCACIONAL</span><h3>Qual é a próxima decisão mais segura?</h3><p>Você pode decidir após quatro perguntas, mas uma história incompleta reduz a pontuação.</p></header>
            <div>{clinicalCase.decisions.map((decision) => <button key={decision.id} className={decision.id === decisionId ? "active" : ""} disabled={askedIds.length < 4} onClick={() => setDecisionId(decision.id)}><span>{decision.id === decisionId ? <Check /> : <ArrowRight />}</span><strong>{decision.label}</strong></button>)}</div>
            {selectedDecision && <aside className={selectedDecision.value}>{(() => { const Icon = decisionCopy[selectedDecision.value].icon; return <Icon />; })()}<div><strong>{decisionCopy[selectedDecision.value].label}</strong><p>{selectedDecision.feedback}</p></div></aside>}
            <footer><span>{askedIds.length < 4 ? `Faça mais ${4 - askedIds.length} pergunta(s) para liberar as decisões.` : summary.trim().length < 40 ? "Escreva uma síntese de pelo menos 40 caracteres." : "Pronto para receber o relatório."}</span><button disabled={!canEvaluate} onClick={() => {
              setEvaluated(true);
              onLearningEvent?.({ id: `anamnesis:${clinicalCase.id}`, label: clinicalCase.title, correct: selectedDecision?.value === "best" && missedCritical.length === 0 });
            }}><ClipboardCheck /> Encerrar e avaliar</button></footer>
          </section>
        </>}
      </main>

      {!evaluated && sensitiveAccepted && <aside className="med-anamnesis-questions">
        <header><span className="med-eyebrow">ROTEIRO DE PERGUNTAS</span><h2>O que perguntar agora?</h2><p>Escolha com intenção. Perguntas inadequadas também entram na avaliação.</p></header>
        <nav aria-label="Progresso por categoria">{categories.map((item) => <span key={item}>{item}<b>{clinicalCase.questions.filter((question) => question.category === item && askedIds.includes(question.id)).length}/{clinicalCase.questions.filter((question) => question.category === item).length}</b></span>)}</nav>
        <div>{categories.map((item) => {
          const questions = clinicalCase.questions.filter((question) => question.category === item);
          if (!questions.length) return null;
          return <section key={item}><header><strong>{item}</strong><span>{questions.filter((question) => askedIds.includes(question.id)).length}/{questions.length}</span></header>{questions.map((question) => <button key={question.id} disabled={askedIds.includes(question.id)} onClick={() => ask(question)}><span>{askedIds.includes(question.id) ? <Check /> : <MessageCircle />}</span><p>{question.text}</p>{askedIds.includes(question.id) && <small>{valueCopy[question.value].label}</small>}</button>)}</section>;
        })}</div>
      </aside>}
    </div>
  </div>;
}

function AnamnesisReport({ clinicalCase, questions, decision, summary, score, missedCritical, sources, onRestart }: {
  clinicalCase: AnamnesisCase;
  questions: AnamnesisQuestion[];
  decision: AnamnesisDecision;
  summary: string;
  score: number;
  missedCritical: AnamnesisQuestion[];
  sources: Array<(typeof anamnesisSources)[number]>;
  onRestart: () => void;
}) {
  const DecisionIcon = decisionCopy[decision.value].icon;
  const poorQuestions = questions.filter((question) => question.value === "poor");
  return <section className="med-anamnesis-report">
    <header><div><span className="med-eyebrow">RELATÓRIO DA ENTREVISTA</span><h2>{score >= 80 ? "Anamnese segura e bem priorizada" : score >= 55 ? "Boa base, com lacunas importantes" : "A entrevista precisa ser refeita"}</h2><p>O resultado avalia coleta, comunicação e decisão dentro deste caso fictício.</p></div><div className={score >= 80 ? "excellent" : score >= 55 ? "developing" : "risk"}><strong>{score}</strong><span>/100</span></div></header>
    <div className="med-anamnesis-report-grid">
      <article className={`decision ${decision.value}`}><DecisionIcon /><div><small>SUA DECISÃO</small><strong>{decisionCopy[decision.value].label}</strong><p>{decision.feedback}</p></div></article>
      <article><BookOpen /><div><small>SUA SÍNTESE</small><p>{summary}</p></div></article>
    </div>
    <section><header><span className="med-eyebrow">COMPARAÇÃO ESTRUTURADA</span><h3>O que a história precisava revelar</h3></header><div className="med-anamnesis-reference"><article><strong>Síntese de referência</strong><p>{clinicalCase.referenceSummary}</p></article><article><strong>Achados-chave</strong><ul>{clinicalCase.keyFindings.map((finding) => <li key={finding}><Check /> {finding}</li>)}</ul></article><article><strong>Hipóteses para estudo</strong><ul>{clinicalCase.differentials.map((item) => <li key={item}><ChevronRight /> {item}</li>)}</ul></article></div></section>
    <section className="med-anamnesis-gaps"><header><span className="med-eyebrow">FEEDBACK DA CONVERSA</span><h3>Lacunas e qualidade das perguntas</h3></header><div><article className={missedCritical.length ? "warning" : "success"}><strong>{missedCritical.length ? `${missedCritical.length} pergunta(s) essencial(is) não feita(s)` : "Todas as perguntas essenciais foram feitas"}</strong>{missedCritical.map((question) => <p key={question.id}><AlertTriangle /> {question.text}</p>)}</article><article className={poorQuestions.length ? "warning" : "success"}><strong>{poorQuestions.length ? `${poorQuestions.length} pergunta(s) prejudicaram o vínculo` : "Nenhuma pergunta inadequada foi usada"}</strong>{poorQuestions.map((question) => <p key={question.id}><XCircle /> {question.feedback}</p>)}</article></div></section>
    <footer><div><strong>Fontes educacionais</strong>{sources.map((source) => <a key={source.id} href={source.url} target="_blank" rel="noreferrer">{source.title} <ExternalLink /></a>)}</div><button onClick={onRestart}><RotateCcw /> Refazer esta entrevista</button></footer>
  </section>;
}
