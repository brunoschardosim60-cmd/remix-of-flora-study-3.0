import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { useNavigate } from "react-router-dom";
import {
  Activity, ArrowLeft, ArrowRight, Baby, BookOpen, Brain, Check, ChevronRight, ClipboardCheck,
  ExternalLink, FileHeart, HeartPulse, Menu, NotebookPen, PanelLeftClose, Play, Search,
  ShieldCheck, Sparkles, Stethoscope, Target, Timer, X,
} from "lucide-react";
import { toast } from "sonner";
import { BodyAtlas } from "@/components/medicine/BodyAtlas";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import {
  anatomyStructures, embryologyTimeline, medicalNotebookTemplates, medicalQuestions,
  medicalSources, medicalSystems, type AnatomyStructure, type BodyLayer, type MedicineLevel,
} from "@/lib/medicineData";
import "@/components/medicine/medicine.css";
import "@/components/medicine/medicine-enhancements.css";

type MedicineSection = "home" | "atlas" | "systems" | "development" | "practice" | "questions" | "clinic" | "plan" | "notebook" | "sources";

const NAV: Array<{ id: MedicineSection; label: string; Icon: typeof Activity }> = [
  { id: "home", label: "Visão geral", Icon: Activity },
  { id: "atlas", label: "Atlas", Icon: Search },
  { id: "systems", label: "Sistemas", Icon: HeartPulse },
  { id: "development", label: "Desenvolvimento", Icon: Baby },
  { id: "practice", label: "Identificação", Icon: Target },
  { id: "questions", label: "Questões", Icon: ClipboardCheck },
  { id: "clinic", label: "Clínica", Icon: Stethoscope },
  { id: "plan", label: "Plano", Icon: Timer },
  { id: "notebook", label: "Caderno médico", Icon: NotebookPen },
  { id: "sources", label: "Fontes e segurança", Icon: ShieldCheck },
];

const levelOrder: MedicineLevel[] = ["Iniciante", "Ciclo básico", "Ciclo clínico", "Internato", "Residência"];

function loadMedicineState<T>(key: string, fallback: T): T {
  try { const value = localStorage.getItem(`flora.medicine.${key}`); return value ? JSON.parse(value) as T : fallback; } catch { return fallback; }
}

function saveMedicineState(key: string, value: unknown) {
  try { localStorage.setItem(`flora.medicine.${key}`, JSON.stringify(value)); } catch { /* progresso local opcional */ }
}

export default function Medicine() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [section, setSection] = useState<MedicineSection>("home");
  const [mobileNav, setMobileNav] = useState(false);
  const [focusMode, setFocusMode] = useState(false);
  const [level, setLevel] = useState<MedicineLevel>(() => loadMedicineState("level", "Ciclo básico"));
  const [activeLayer, setActiveLayer] = useState<BodyLayer>("organs");
  const [selectedStructure, setSelectedStructure] = useState<AnatomyStructure | null>(() => anatomyStructures.find((item) => item.id === "heart") ?? null);
  const [favoriteIds, setFavoriteIds] = useState<string[]>(() => loadMedicineState("favorites", []));
  const [questionIndex, setQuestionIndex] = useState(0);
  const [answer, setAnswer] = useState<number | null>(null);
  const [reviewOnly, setReviewOnly] = useState(false);
  const [answered, setAnswered] = useState<Record<string, boolean>>(() => loadMedicineState("answered", {}));
  const [wrongIds, setWrongIds] = useState<string[]>(() => loadMedicineState("wrong", []));
  const [practiceInput, setPracticeInput] = useState("");
  const [practiceResult, setPracticeResult] = useState<"correct" | "wrong" | null>(null);
  const [practiceStructure, setPracticeStructure] = useState(() => anatomyStructures.find((item) => item.id === "heart")!);
  const [caseStep, setCaseStep] = useState(0);
  const [caseReflection, setCaseReflection] = useState("");
  const [studyHours, setStudyHours] = useState(8);
  const [studyGoal, setStudyGoal] = useState("Dominar anatomia e fisiologia");
  const [cloudReady, setCloudReady] = useState(false);

  const progress = Math.round((Object.values(answered).filter(Boolean).length / medicalQuestions.length) * 100);
  const filteredQuestions = useMemo(() => medicalQuestions.filter((item) => levelOrder.indexOf(item.level) <= levelOrder.indexOf(level)), [level]);
  const reviewQuestions = useMemo(() => filteredQuestions.filter((item) => wrongIds.includes(item.id)), [filteredQuestions, wrongIds]);
  const activeReview = reviewOnly && reviewQuestions.length > 0;
  const sessionQuestions = activeReview ? reviewQuestions : filteredQuestions.length > 0 ? filteredQuestions : medicalQuestions;
  const currentQuestion = sessionQuestions[questionIndex % sessionQuestions.length];

  useEffect(() => {
    if (!user) return;
    let active = true;
    supabase.from("medicine_progress").select("*").eq("user_id", user.id).maybeSingle().then(({ data }) => {
      if (!active) return;
      if (data) {
        if (levelOrder.includes(data.level as MedicineLevel)) setLevel(data.level as MedicineLevel);
        setStudyHours(data.study_hours);
        setStudyGoal(data.study_goal);
        setFavoriteIds(Array.isArray(data.favorites) ? data.favorites.filter((item): item is string => typeof item === "string") : []);
        setWrongIds(Array.isArray(data.wrong_items) ? data.wrong_items.filter((item): item is string => typeof item === "string") : []);
        setAnswered(data.answered && typeof data.answered === "object" && !Array.isArray(data.answered) ? data.answered as Record<string, boolean> : {});
        setCaseStep(data.case_step);
      }
      setCloudReady(true);
    });
    return () => { active = false; };
  }, [user]);

  useEffect(() => {
    if (!user || !cloudReady) return;
    const timeout = window.setTimeout(() => {
      void supabase.from("medicine_progress").upsert({
        user_id: user.id,
        level,
        study_hours: studyHours,
        study_goal: studyGoal,
        favorites: favoriteIds,
        answered,
        wrong_items: wrongIds,
        case_step: caseStep,
        content_version: "MED-2026.08.24",
      }, { onConflict: "user_id" });
    }, 650);
    return () => window.clearTimeout(timeout);
  }, [answered, caseStep, cloudReady, favoriteIds, level, studyGoal, studyHours, user, wrongIds]);

  const go = (next: MedicineSection) => { setSection(next); setMobileNav(false); window.scrollTo({ top: 0, behavior: "smooth" }); };
  const updateLevel = (next: MedicineLevel) => { setLevel(next); saveMedicineState("level", next); };
  const toggleFavorite = (id: string) => {
    const next = favoriteIds.includes(id) ? favoriteIds.filter((item) => item !== id) : [...favoriteIds, id];
    setFavoriteIds(next); saveMedicineState("favorites", next);
  };
  const submitAnswer = (option: number) => {
    setAnswer(option);
    const correct = option === currentQuestion.answer;
    const nextAnswered = { ...answered, [currentQuestion.id]: correct };
    setAnswered(nextAnswered); saveMedicineState("answered", nextAnswered);
    const nextWrong = correct ? wrongIds.filter((id) => id !== currentQuestion.id) : Array.from(new Set([...wrongIds, currentQuestion.id]));
    setWrongIds(nextWrong); saveMedicineState("wrong", nextWrong);
  };

  return (
    <div className={`med-app ${focusMode ? "med-focus" : ""}`}>
      <header className="med-header">
        <button className="med-back" onClick={() => navigate("/")} aria-label="Voltar ao StudyFlow"><ArrowLeft /></button>
        <button className="med-brand" onClick={() => go("home")}><span><HeartPulse /></span><div><strong>Flora Medicina</strong><small>Academia de saúde</small></div></button>
        <div className="med-header-context"><span>Ambiente educacional</span><strong>{NAV.find((item) => item.id === section)?.label}</strong></div>
        <div className="med-header-actions">
          <button className={`med-focus-toggle ${focusMode ? "active" : ""}`} onClick={() => setFocusMode((value) => !value)} aria-label={focusMode ? "Sair do modo foco" : "Entrar no modo foco"}><PanelLeftClose /></button>
          <div className="med-level-chip"><span>Nível</span><select value={level} onChange={(event) => updateLevel(event.target.value as MedicineLevel)}>{levelOrder.map((item) => <option key={item}>{item}</option>)}</select></div>
          <button className="med-source-status" onClick={() => go("sources")}><ShieldCheck /> {cloudReady ? "Progresso protegido" : "Conteúdo rastreável"}</button>
          <button className="med-menu-button" onClick={() => setMobileNav((value) => !value)} aria-label="Abrir navegação"><Menu /></button>
        </div>
      </header>

      <div className="med-shell">
        <aside className={`med-sidebar ${mobileNav ? "open" : ""}`}>
          <div className="med-sidebar-label">ESTUDAR</div>
          {NAV.slice(0, 8).map(({ id, label, Icon }) => <button key={id} onClick={() => go(id)} className={section === id ? "active" : ""}><Icon /><span>{label}</span>{id === "questions" && wrongIds.length > 0 && <b>{wrongIds.length}</b>}</button>)}
          <div className="med-sidebar-label">FERRAMENTAS</div>
          {NAV.slice(8).map(({ id, label, Icon }) => <button key={id} onClick={() => go(id)} className={section === id ? "active" : ""}><Icon /><span>{label}</span></button>)}
          <div className="med-safety-mini"><ShieldCheck /><div><strong>Uso educacional</strong><span>Não substitui supervisão, avaliação ou atendimento profissional.</span></div></div>
        </aside>

        <main className="med-main">
          {section === "home" && <MedicineHome level={level} progress={progress} wrongCount={wrongIds.length} onGo={go} />}
          {section === "atlas" && <div className="med-section-wrap"><BodyAtlas activeLayer={activeLayer} onLayerChange={setActiveLayer} selected={selectedStructure} onSelect={setSelectedStructure} />{selectedStructure && <div className="med-atlas-actions"><button onClick={() => toggleFavorite(selectedStructure.id)}>{favoriteIds.includes(selectedStructure.id) ? <Check /> : <BookOpen />}{favoriteIds.includes(selectedStructure.id) ? "Salva para revisão" : "Salvar para revisão"}</button><button onClick={() => toast.info("A Flora deve explicar apenas com base nas fontes exibidas nesta estrutura.")}><Sparkles /> Explicar com a Flora</button></div>}</div>}
          {section === "systems" && <SystemsSection onOpenAtlas={(layer) => { setActiveLayer(layer); go("atlas"); }} />}
          {section === "development" && <DevelopmentSection />}
          {section === "practice" && <PracticeSection structure={practiceStructure} input={practiceInput} result={practiceResult} onInput={setPracticeInput} onSubmit={() => {
            const normalized = practiceInput.trim().toLowerCase();
            const correct = practiceStructure.synonyms.some((name) => normalized === name.toLowerCase());
            setPracticeResult(correct ? "correct" : "wrong");
            if (!correct) { const next = Array.from(new Set([...wrongIds, `structure:${practiceStructure.id}`])); setWrongIds(next); saveMedicineState("wrong", next); }
          }} onNext={() => { const nextIndex = (anatomyStructures.indexOf(practiceStructure) + 1) % anatomyStructures.length; setPracticeStructure(anatomyStructures[nextIndex]); setPracticeInput(""); setPracticeResult(null); }} />}
          {section === "questions" && <QuestionsSection question={currentQuestion} index={questionIndex % sessionQuestions.length} total={sessionQuestions.length} answer={answer} wrongCount={reviewQuestions.length} reviewOnly={activeReview} onToggleReview={() => { if (!reviewQuestions.length) { toast.info("Quando você errar uma questão, ela aparecerá aqui para revisão."); return; } setReviewOnly((value) => !value); setQuestionIndex(0); setAnswer(null); }} onAnswer={submitAnswer} onNext={() => { setQuestionIndex((value) => value + 1); setAnswer(null); }} />}
          {section === "clinic" && <ClinicalSection step={caseStep} reflection={caseReflection} onReflection={setCaseReflection} onNext={() => { if (caseReflection.trim().length < 20) { toast.info("Justifique seu raciocínio em pelo menos uma frase antes de avançar."); return; } setCaseStep((value) => Math.min(value + 1, 5)); setCaseReflection(""); }} />}
          {section === "plan" && <StudyPlanSection level={level} hours={studyHours} goal={studyGoal} onHours={setStudyHours} onGoal={setStudyGoal} onStart={() => { saveMedicineState("plan", { level, studyHours, studyGoal, createdAt: Date.now() }); toast.success("Plano médico salvo neste dispositivo."); }} />}
          {section === "notebook" && <NotebookSection navigate={navigate} />}
          {section === "sources" && <SourcesSection />}
        </main>
      </div>
    </div>
  );
}

function MedicineHome({ level, progress, wrongCount, onGo }: { level: MedicineLevel; progress: number; wrongCount: number; onGo: (id: MedicineSection) => void }) {
  return <div className="med-home">
    <section className="med-hero"><img src="/medicine/medicine-hero-4k.png" alt="Ambientação abstrata de educação médica; não representa anatomia diagnóstica" /><div className="med-hero-overlay"/><div className="med-hero-content"><span className="med-kicker"><ShieldCheck /> Conteúdo educacional com fontes</span><h1>Entenda o corpo.<br/><em>Construa raciocínio.</em></h1><p>Um ambiente sereno para explorar anatomia, revisar fisiologia e praticar com segurança — do início da graduação à residência.</p><div className="med-hero-actions"><button onClick={() => onGo("atlas")}><Play /> Explorar o corpo</button><button onClick={() => onGo("plan")}>Montar meu plano <ArrowRight /></button></div><small>Nível atual: {level}</small></div></section>
    <section className="med-command-grid">
      <button className="primary" onClick={() => onGo("atlas")}><span><Search /></span><div><small>EXPLORAR</small><h3>Atlas por camadas</h3><p>Pele, músculos, esqueleto, vasos, nervos e órgãos.</p></div><ChevronRight /></button>
      <button onClick={() => onGo("practice")}><span><Target /></span><div><small>PRATICAR</small><h3>Identificação ativa</h3><p>Nomeie estruturas e transforme erros em revisão.</p></div><ChevronRight /></button>
      <button onClick={() => onGo("clinic")}><span><Stethoscope /></span><div><small>RACIOCINAR</small><h3>Caso progressivo</h3><p>Informações liberadas em etapas, com justificativa.</p></div><ChevronRight /></button>
    </section>
    <section className="med-progress-row"><div><span className="med-eyebrow">Seu percurso</span><h2>Aprendizado longitudinal</h2></div><div className="med-progress-card"><div className="ring" style={{ "--progress": `${progress * 3.6}deg` } as CSSProperties}><strong>{progress}%</strong></div><div><strong>Questões dominadas</strong><span>{wrongCount ? `${wrongCount} item(ns) aguardando revisão` : "Nenhum erro pendente"}</span></div></div><div className="med-progress-card"><Brain /><div><strong>Ciclo recomendado</strong><span>Atlas → Identificação → Questões → Caso</span></div></div></section>
    <section className="med-systems-preview"><div className="med-section-heading"><div><span className="med-eyebrow">Anatomia e fisiologia</span><h2>Sistemas do corpo</h2></div><button onClick={() => onGo("systems")}>Ver todos <ArrowRight /></button></div><div className="med-system-mini-grid">{medicalSystems.slice(0, 4).map((system) => <button key={system.id} onClick={() => onGo("systems")} style={{ "--system": system.color } as CSSProperties}><span>{system.name.slice(0, 2).toUpperCase()}</span><strong>{system.name}</strong><small>{system.description}</small></button>)}</div></section>
  </div>;
}

function SystemsSection({ onOpenAtlas }: { onOpenAtlas: (layer: BodyLayer) => void }) {
  const [selected, setSelected] = useState(medicalSystems[0]);
  return <div className="med-page med-systems-page"><PageHeading eyebrow="Anatomia por sistemas" title="Conecte estrutura, função e aplicação" description="Conteúdo introdutório estruturado por sistemas, com trilhas que começam na anatomia e avançam para fisiologia." />
    <div className="med-systems-layout"><div className="med-system-list">{medicalSystems.map((system) => <button key={system.id} onClick={() => setSelected(system)} className={selected.id === system.id ? "active" : ""} style={{ "--system": system.color } as CSSProperties}><span>{system.name.slice(0, 2)}</span><div><strong>{system.name}</strong><small>{system.description}</small></div><ChevronRight /></button>)}</div>
    <article className="med-system-detail" style={{ "--system": selected.color } as CSSProperties}><div className="med-system-orb"><Activity /></div><span className="med-eyebrow">SISTEMA SELECIONADO</span><h2>{selected.name}</h2><p>{selected.description}</p><div className="med-detail-columns"><div><h4>Estruturas essenciais</h4>{selected.structures.map((item) => <span key={item}><Check /> {item}</span>)}</div><div><h4>Trilha de fisiologia</h4>{selected.topics.map((item, index) => <span key={item}><b>{index + 1}</b>{item}</span>)}</div></div><button onClick={() => onOpenAtlas(selected.id === "musculoskeletal" ? "skeletal" : selected.id === "nervous" ? "nervous" : selected.id === "cardiovascular" ? "vascular" : "organs")}>Abrir no atlas <ArrowRight /></button></article></div>
  </div>;
}

function DevelopmentSection() {
  const [active, setActive] = useState(0);
  return <div className="med-page"><PageHeading eyebrow="Embriologia e desenvolvimento" title="Da fecundação à vida extrauterina" description="Linha do tempo educacional. Idades embrionária, fetal e gestacional devem ser interpretadas conforme a convenção da fonte." />
    <div className="med-development-stage"><div className="med-timeline">{embryologyTimeline.map((item, index) => <button key={item.period} className={active === index ? "active" : ""} onClick={() => setActive(index)}><span>{index + 1}</span><div><small>{item.period}</small><strong>{item.title}</strong></div></button>)}</div><article><Baby /><span className="med-eyebrow">{embryologyTimeline[active].period}</span><h2>{embryologyTimeline[active].title}</h2><p>{embryologyTimeline[active].detail}</p><div className="med-germ-layers"><div><b>Ectoderma</b><span>Sistema nervoso e epiderme, entre outros derivados.</span></div><div><b>Mesoderma</b><span>Músculos, ossos, sistema circulatório e diversos órgãos.</span></div><div><b>Endoderma</b><span>Epitélios dos sistemas digestório e respiratório e derivados.</span></div></div><small className="med-development-note">Resumo introdutório: cada camada germinativa possui derivados e exceções que exigem estudo detalhado.</small><a href={medicalSources[embryologyTimeline[active].sourceId].url} target="_blank" rel="noreferrer">Conferir a fonte desta etapa <ExternalLink /></a></article></div>
  </div>;
}

function PracticeSection({ structure, input, result, onInput, onSubmit, onNext }: { structure: AnatomyStructure; input: string; result: "correct" | "wrong" | null; onInput: (value: string) => void; onSubmit: () => void; onNext: () => void }) {
  return <div className="med-page"><PageHeading eyebrow="Aprendizado ativo" title="Identificação anatômica" description="Digite o nome da estrutura destacada. Sinônimos anatômicos comuns são aceitos." />
    <div className="med-practice-card"><div className="med-practice-visual"><div className="pulse-ring"/><svg viewBox="0 0 200 430" role="img" aria-label="Silhueta humana esquemática"><ellipse cx="100" cy="42" rx="28" ry="34"/><path d="M76 78 C55 95 58 145 68 170 L62 245 L48 395 L78 400 L100 270 L122 400 L152 395 L138 245 L132 170 C142 145 145 95 124 78 C112 86 88 86 76 78Z"/></svg><i style={{ left: `${structure.x}%`, top: `${Math.min(89, structure.y + 4)}%` } as CSSProperties}/><span>ESTRUTURA DESTACADA</span></div><div className="med-practice-prompt"><span className="med-eyebrow">REGIÃO: {structure.region}</span><h2>Qual é esta estrutura?</h2><p>{result ? structure.summary : "Observe a posição aproximada na representação esquemática e informe o nome anatômico."}</p><div className="med-answer-box"><input value={input} onChange={(event) => onInput(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") onSubmit(); }} placeholder="Digite o nome da estrutura" disabled={result !== null}/>{result === null ? <button onClick={onSubmit}>Responder</button> : <button onClick={onNext}>Próxima <ArrowRight /></button>}</div>{result && <div className={`med-feedback ${result}`}><span>{result === "correct" ? <Check /> : <X />}</span><div><strong>{result === "correct" ? "Resposta correta" : `Resposta: ${structure.name}`}</strong><p><b>Função:</b> {structure.function}</p><p><b>Próximas:</b> {structure.nearby.join(", ")}</p></div></div>}</div></div>
  </div>;
}

function QuestionsSection({ question, index, total, answer, wrongCount, reviewOnly, onToggleReview, onAnswer, onNext }: { question: typeof medicalQuestions[number]; index: number; total: number; answer: number | null; wrongCount: number; reviewOnly: boolean; onToggleReview: () => void; onAnswer: (value: number) => void; onNext: () => void }) {
  return <div className="med-page"><PageHeading eyebrow="Banco médico" title="Questões com explicação e fonte" description="Itens educacionais autorais baseados nas referências apresentadas; não são questões oficiais de prova." />
    <div className="med-question-layout"><aside><div><strong>{wrongCount}</strong><span>para revisar</span></div><div><strong>{index + 1}/{total}</strong><span>sessão atual</span></div><button className={reviewOnly ? "active" : ""} onClick={onToggleReview}>{reviewOnly ? "Ver sessão normal" : "Revisar meus erros"}</button></aside><article className="med-question-card"><div className="med-question-meta"><span>{question.level}</span><span>{question.system}</span><span>{question.type}</span></div><h2>{question.prompt}</h2><div className="med-options">{question.options.map((option, optionIndex) => { const state = answer === null ? "" : optionIndex === question.answer ? "correct" : optionIndex === answer ? "wrong" : "muted"; return <button key={option} className={state} onClick={() => answer === null && onAnswer(optionIndex)}><b>{String.fromCharCode(65 + optionIndex)}</b><span>{option}</span>{state === "correct" && <Check />}{state === "wrong" && <X />}</button>; })}</div>{answer !== null && <div className="med-explanation"><Sparkles/><div><strong>Explicação</strong><p>{question.explanation}</p><a href={medicalSources[question.sourceId].url} target="_blank" rel="noreferrer">Fonte usada <ExternalLink /></a></div></div>}<footer><span>Questão {index + 1}</span><button disabled={answer === null} onClick={onNext}>Próxima <ArrowRight /></button></footer></article></div>
  </div>;
}

const caseSteps = [
  { label: "Queixa principal", content: "Pessoa adulta fictícia relata cansaço aos esforços há algumas semanas. Este cenário existe apenas para treino de representação do problema." },
  { label: "História", content: "O sintoma ocorre ao subir escadas e melhora com repouso. Não há informação suficiente para definir uma causa." },
  { label: "Exame simulado", content: "Frequência cardíaca discretamente elevada após esforço padronizado; demais dados ainda não foram fornecidos." },
  { label: "Dados complementares", content: "Hemograma fictício mostra redução da concentração de hemoglobina. Interprete o dado no contexto educacional." },
  { label: "Hipóteses", content: "Compare mecanismos que reduzam a oferta de oxigênio aos tecidos e explicite quais informações faltam." },
  { label: "Síntese", content: "Construa uma síntese fisiopatológica sem prescrever conduta e identifique limites do caso." },
];

function ClinicalSection({ step, reflection, onReflection, onNext }: { step: number; reflection: string; onReflection: (value: string) => void; onNext: () => void }) {
  return <div className="med-page"><PageHeading eyebrow="Simulação educacional" title="Caso clínico progressivo" description="Caso inteiramente fictício. Não use esta área para avaliar sintomas, exames ou decisões de uma pessoa real." /><div className="med-clinical-warning"><ShieldCheck/><span><strong>Limite de segurança</strong> Conteúdo para raciocínio acadêmico, sem diagnóstico ou recomendação terapêutica.</span></div>
    <div className="med-case-layout"><ol>{caseSteps.map((item, index) => <li key={item.label} className={index < step ? "done" : index === step ? "active" : ""}><span>{index < step ? <Check/> : index + 1}</span><strong>{item.label}</strong></li>)}</ol><article><span className="med-eyebrow">ETAPA {step + 1} DE {caseSteps.length}</span><h2>{caseSteps[step].label}</h2><p>{caseSteps[step].content}</p><label>Justifique seu raciocínio antes de revelar a próxima etapa<textarea value={reflection} onChange={(event) => onReflection(event.target.value)} placeholder="Quais mecanismos e estruturas podem estar relacionados? O que ainda é necessário saber?" /></label><button onClick={onNext} disabled={step === caseSteps.length - 1}>Liberar próxima etapa <ArrowRight /></button></article></div>
  </div>;
}

function StudyPlanSection({ level, hours, goal, onHours, onGoal, onStart }: { level: MedicineLevel; hours: number; goal: string; onHours: (value: number) => void; onGoal: (value: string) => void; onStart: () => void }) {
  const cycle = ["Explorar anatomia", "Ler teoria", "Identificar estruturas", "Resolver questões", "Revisar erros", "Fazer caso fictício"];
  return <div className="med-page"><PageHeading eyebrow="Plano adaptativo" title="Seu ciclo médico" description="Distribuição educacional baseada no nível informado e no tempo disponível; não substitui o currículo da instituição." /><div className="med-plan-grid"><section><label>Objetivo principal<input value={goal} onChange={(event) => onGoal(event.target.value)} /></label><label>Horas disponíveis por semana<div className="med-range"><input type="range" min="2" max="40" value={hours} onChange={(event) => onHours(Number(event.target.value))}/><strong>{hours}h</strong></div></label><label>Nível atual<div className="med-static-field">{level}</div></label><button onClick={onStart}>Salvar meu plano <Check /></button></section><article><span className="med-eyebrow">CICLO RECOMENDADO</span><h2>{Math.max(3, Math.round(hours / 2))} blocos por semana</h2><div className="med-cycle">{cycle.map((item, index) => <div key={item}><span>{index + 1}</span><div><strong>{item}</strong><small>{Math.max(20, Math.round((hours * 60) / cycle.length))} min sugeridos</small></div></div>)}</div></article></div>
  </div>;
}

function NotebookSection({ navigate }: { navigate: ReturnType<typeof useNavigate> }) {
  const { user } = useAuth();
  const [creatingId, setCreatingId] = useState<string | null>(null);
  const createFromTemplate = async (template: typeof medicalNotebookTemplates[number]) => {
    if (!user || creatingId) return;
    setCreatingId(template.id);
    const { data: notebook, error: notebookError } = await supabase.from("notebooks").insert({
      user_id: user.id,
      title: template.name,
      subject: "Medicina",
      folder: "Medicina",
      cover_color: "#7fa99a",
      is_favorite: false,
    }).select().single();
    if (notebookError || !notebook) {
      setCreatingId(null);
      toast.error("Não foi possível criar o caderno médico.");
      return;
    }
    const content = template.body.split("\n").map((line, index) => index === 0 ? `<h2>${line}</h2>` : `<p>${line || "<br>"}</p>`).join("");
    const { error: pageError } = await supabase.from("notebook_pages").insert({
      notebook_id: notebook.id,
      user_id: user.id,
      page_number: 1,
      content,
      template: "blank",
      tags: ["medicina", template.id],
    });
    if (pageError) {
      await supabase.from("notebooks").delete().eq("id", notebook.id);
      setCreatingId(null);
      toast.error("O template não pôde ser preparado. Nenhum caderno incompleto foi mantido.");
      return;
    }
    toast.success("Caderno médico criado com o template selecionado.");
    navigate(`/notebooks/${notebook.id}`);
  };
  return <div className="med-page"><PageHeading eyebrow="Caderno médico" title="Anote com estrutura e segurança" description="Templates educacionais integrados ao Caderno. Não inclua dados identificáveis de pacientes reais." /><div className="med-notebook-banner"><NotebookPen/><div><strong>Samsung Notes para medicina</strong><span>Escreva, desenhe sobre PDFs e imagens, gere questões e revise versões.</span></div><button onClick={() => navigate("/notebooks")}>Abrir cadernos <ArrowRight /></button></div><div className="med-template-grid">{medicalNotebookTemplates.map((template) => <article key={template.id}><span><FileHeart /></span><h3>{template.name}</h3><p>{template.description}</p><pre>{template.body}</pre><button disabled={creatingId !== null} onClick={() => void createFromTemplate(template)}>{creatingId === template.id ? "Criando…" : "Criar caderno"} {creatingId !== template.id && <ArrowRight />}</button></article>)}</div></div>;
}

function SourcesSection() {
  const { user } = useAuth();
  const [report, setReport] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const submitReport = async () => {
    if (report.trim().length < 12) { toast.info("Descreva a estrutura, tela e o possível problema."); return; }
    if (!user) return;
    setSubmitting(true);
    const { error } = await supabase.from("medicine_content_reports").insert({ user_id: user.id, description: report.trim(), content_version: "MED-2026.08.24" });
    setSubmitting(false);
    if (error) { toast.error("Não foi possível registrar agora. Seu texto foi mantido para tentar novamente."); return; }
    setReport("");
    toast.success("Sinalização registrada para revisão editorial.");
  };
  return <div className="med-page"><PageHeading eyebrow="Governança clínica" title="Fontes, limites e revisão" description="Toda afirmação educacional deve apontar para uma referência identificável e uma data de revisão." /><div className="med-safety-hero"><ShieldCheck/><div><h2>Segurança antes de velocidade</h2><p>O módulo não diagnostica, não prescreve e não processa casos de pacientes reais. Conteúdo com incerteza deve ser sinalizado e revisado antes da publicação.</p><span>Versão editorial MED-2026.08.24</span></div></div><div className="med-source-grid">{Object.entries(medicalSources).map(([id, source]) => <article key={id}><span>REVISADO EM {new Date(`${source.reviewedAt}T12:00:00`).toLocaleDateString("pt-BR")}</span><h3>{source.title}</h3><p>{source.organization}</p>{source.license && <small>{source.license}</small>}{source.attribution && <small>{source.attribution}</small>}<a href={source.url} target="_blank" rel="noreferrer">Abrir fonte <ExternalLink /></a></article>)}</div><div className="med-governance"><h3>Regras editoriais do módulo</h3>{["Separar conteúdo educacional de orientação individual", "Exigir fonte e data de revisão para cada estrutura", "Usar modelos anatômicos validados e licenciados", "Registrar correções e manter histórico de versões", "Não incluir dados identificáveis em simulações clínicas"].map((rule) => <div key={rule}><Check />{rule}</div>)}</div><div className="med-report-card"><div><span className="med-eyebrow">VIGILÂNCIA DO CONTEÚDO</span><h3>Sinalizar possível erro</h3><p>Informe a tela, a estrutura e o ponto que precisa ser conferido. Não inclua dados de pacientes.</p></div><textarea value={report} onChange={(event) => setReport(event.target.value)} placeholder="Ex.: Atlas › Coração — conferir a descrição de…"/><button onClick={() => void submitReport()} disabled={submitting}>{submitting ? "Registrando…" : "Enviar para revisão"} {!submitting && <ArrowRight />}</button></div></div>;
}

function PageHeading({ eyebrow, title, description }: { eyebrow: string; title: string; description: string }) {
  return <header className="med-page-heading"><span className="med-eyebrow">{eyebrow}</span><h1>{title}</h1><p>{description}</p></header>;
}
