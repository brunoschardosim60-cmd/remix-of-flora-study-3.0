import { lazy, Suspense, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { useNavigate } from "react-router-dom";
import {
  Activity, ArrowLeft, ArrowRight, Baby, BookOpen, Brain, Check, ChevronRight, ClipboardCheck,
  AlertTriangle, CircleDot, ExternalLink, Eye, EyeOff, FileHeart, HeartPulse, Layers, ListChecks, MapPin, Menu, NotebookPen,
  Focus, PanelLeftClose, Play, Rotate3D, RotateCcw, Scissors, Search, ShieldCheck, Sparkles, Stethoscope, Target, Timer, Wrench, X, ZoomIn, ZoomOut,
} from "lucide-react";
import { toast } from "sonner";
import { BodyAtlas } from "@/components/medicine/BodyAtlas";
import { InstrumentsStudio } from "@/components/medicine/InstrumentsStudio";
import { SurgerySimulator } from "@/components/medicine/SurgerySimulator";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import {
  anatomyPositionFor, anatomyStructures, bodyLayers, embryologyTimeline, medicalClinicalCase, medicalClinicalCases, medicalQuestions,
  medicineLevelProfiles, medicalSources, medicalSystems, type AnatomyStructure, type BodyLayer, type MedicineLevel,
  preferredAnatomyView,
} from "@/lib/medicineData";
import { medicalNotebookTemplates, type MedicalNotebookTemplate } from "@/lib/medicalNotebookTemplates";
import "@/components/medicine/medicine.css";
import "@/components/medicine/medicine-enhancements.css";
import "@/components/medicine/instruments.css";
import "@/components/medicine/anatomy-3d.css";
import "@/components/medicine/surgery-simulator.css";

const Anatomy3DStudio = lazy(() => import("@/components/medicine/Anatomy3DStudio").then((module) => ({ default: module.Anatomy3DStudio })));

type MedicineSection = "home" | "atlas" | "atlas3d" | "instruments" | "surgery" | "systems" | "development" | "practice" | "questions" | "clinic" | "plan" | "notebook" | "sources";

const NAV: Array<{ id: MedicineSection; label: string; Icon: typeof Activity }> = [
  { id: "home", label: "Visão geral", Icon: Activity },
  { id: "atlas", label: "Atlas", Icon: Search },
  { id: "atlas3d", label: "Corpo 3D", Icon: Rotate3D },
  { id: "instruments", label: "Instrumentos", Icon: Wrench },
  { id: "surgery", label: "Cirurgia virtual", Icon: Scissors },
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
const levelStartStructure: Record<MedicineLevel, string> = {
  Iniciante: "heart",
  "Ciclo básico": "deltoid",
  "Ciclo clínico": "aorta",
  Internato: "sciatic",
  Residência: "brainstem",
};

const beginnerPracticeIds = new Set([
  "heart", "lungs", "brain", "liver", "kidneys", "skin", "deltoid", "femur", "aorta", "scalp",
  "frontal-region", "oral-region", "cervical-vertebrae", "clavicle", "sternum", "ribs", "humerus",
  "radius", "ulna", "patella", "tibia", "fibula", "pectoralis-major", "biceps-brachii", "triceps-brachii",
  "rectus-abdominis", "gluteus-maximus", "gastrocnemius", "trachea", "stomach", "pancreas", "spleen",
  "urinary-bladder", "thyroid-gland", "spinal-cord",
]);

function practiceStructuresForLevel(level: MedicineLevel) {
  if (level === "Iniciante") return anatomyStructures.filter((structure) => beginnerPracticeIds.has(structure.id));
  if (level === "Ciclo básico") return anatomyStructures.filter((structure) => ["surface", "muscular", "skeletal", "organs"].includes(structure.layer));
  if (level === "Residência") return [...anatomyStructures].sort((a, b) => Number(Boolean(b.latin)) - Number(Boolean(a.latin)) || a.name.localeCompare(b.name, "pt-BR"));
  return anatomyStructures;
}

function loadMedicineState<T>(key: string, fallback: T): T {
  try { const value = localStorage.getItem(`flora.medicine.${key}`); return value ? JSON.parse(value) as T : fallback; } catch { return fallback; }
}

function saveMedicineState(key: string, value: unknown) {
  try { localStorage.setItem(`flora.medicine.${key}`, JSON.stringify(value)); } catch { /* progresso local opcional */ }
}

function normalizeAnswer(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR").trim();
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
  const [activeCaseId, setActiveCaseId] = useState(() => loadMedicineState("case_id", medicalClinicalCase.id));
  const [caseStep, setCaseStep] = useState(0);
  const [caseReflection, setCaseReflection] = useState("");
  const [caseAnswer, setCaseAnswer] = useState<number | null>(null);
  const [sensitiveContentEnabled, setSensitiveContentEnabled] = useState(false);
  const [studyHours, setStudyHours] = useState(8);
  const [studyGoal, setStudyGoal] = useState("Dominar anatomia e fisiologia");
  const [cloudReady, setCloudReady] = useState(false);
  const [initial3DStructureId, setInitial3DStructureId] = useState<string | null>(null);

  const levelProfile = medicineLevelProfiles[level];
  const filteredQuestions = useMemo(() => medicalQuestions.filter((item) => item.level === level), [level]);
  const practicePool = useMemo(() => practiceStructuresForLevel(level), [level]);
  const masteredAtLevel = filteredQuestions.filter((question) => answered[question.id]).length;
  const progress = Math.round((masteredAtLevel / Math.max(filteredQuestions.length, 1)) * 100);
  const reviewQuestions = useMemo(() => filteredQuestions.filter((item) => wrongIds.includes(item.id)), [filteredQuestions, wrongIds]);
  const activeReview = reviewOnly && reviewQuestions.length > 0;
  const sessionQuestions = activeReview ? reviewQuestions : filteredQuestions.length > 0 ? filteredQuestions : medicalQuestions;
  const currentQuestion = sessionQuestions[questionIndex % sessionQuestions.length];
  const activeClinicalCase = medicalClinicalCases.find((item) => item.id === activeCaseId) ?? medicalClinicalCase;

  useEffect(() => {
    setQuestionIndex(0);
    setAnswer(null);
    setReviewOnly(false);
    setPracticeInput("");
    setPracticeResult(null);
    const recommended = practicePool.find((structure) => structure.id === levelStartStructure[level]) ?? practicePool[0];
    if (recommended) setPracticeStructure(recommended);
  }, [level, practicePool]);

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
        const locallySelectedCase = loadMedicineState("case_id", medicalClinicalCase.id);
        const localCaseSteps = loadMedicineState<Record<string, number>>("case_steps", {});
        const savedStep = locallySelectedCase === medicalClinicalCase.id ? Number(data.case_step) || 0 : localCaseSteps[locallySelectedCase] || 0;
        const savedCase = medicalClinicalCases.find((item) => item.id === locallySelectedCase) ?? medicalClinicalCase;
        setCaseStep(Math.min(Math.max(savedStep, 0), savedCase.steps.length));
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

  useEffect(() => {
    const progress = loadMedicineState<Record<string, number>>("case_steps", {});
    saveMedicineState("case_steps", { ...progress, [activeClinicalCase.id]: caseStep });
  }, [activeClinicalCase.id, caseStep]);

  const go = (next: MedicineSection) => { setSection(next); setMobileNav(false); window.scrollTo({ top: 0, behavior: "smooth" }); };
  const updateLevel = (next: MedicineLevel) => {
    if (next === level) return;
    setLevel(next);
    saveMedicineState("level", next);
    toast.success(`${next} ativado`, { description: medicineLevelProfiles[next].focus });
  };
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
  const selectClinicalCase = (id: string) => {
    const nextCase = medicalClinicalCases.find((item) => item.id === id);
    if (!nextCase || nextCase.id === activeClinicalCase.id) return;
    const progress = loadMedicineState<Record<string, number>>("case_steps", {});
    setActiveCaseId(nextCase.id);
    saveMedicineState("case_id", nextCase.id);
    setCaseStep(Math.min(progress[nextCase.id] ?? 0, nextCase.steps.length));
    setCaseAnswer(null);
    setCaseReflection("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className={`med-app ${focusMode ? "med-focus" : ""}`}>
      <header className="med-header">
        <button className="med-back" onClick={() => navigate("/")} aria-label="Voltar ao StudyFlow"><ArrowLeft /></button>
        <button className="med-brand" onClick={() => go("home")}><span><HeartPulse /></span><div><strong>Flora Medicina</strong><small>Academia de saúde</small></div></button>
        <div className="med-header-context"><span>Ambiente educacional</span><strong>{NAV.find((item) => item.id === section)?.label}</strong></div>
        <div className="med-header-actions">
          <button className={`med-focus-toggle ${focusMode ? "active" : ""}`} onClick={() => setFocusMode((value) => !value)} aria-label={focusMode ? "Sair do modo foco" : "Entrar no modo foco"}><PanelLeftClose /></button>
          <div className="med-level-chip" title={levelProfile.focus}><span>Nível</span><select aria-label="Nível de estudo" value={level} onChange={(event) => updateLevel(event.target.value as MedicineLevel)}>{levelOrder.map((item) => <option key={item}>{item}</option>)}</select></div>
          <button className="med-source-status" onClick={() => go("sources")}><ShieldCheck /> {cloudReady ? "Progresso protegido" : "Conteúdo rastreável"}</button>
          <button className="med-menu-button" onClick={() => setMobileNav((value) => !value)} aria-label="Abrir navegação"><Menu /></button>
        </div>
      </header>

      <div className="med-shell">
        <aside className={`med-sidebar ${mobileNav ? "open" : ""}`}>
          <div className="med-sidebar-label">ESTUDAR</div>
          {NAV.slice(0, 11).map(({ id, label, Icon }) => <button key={id} onClick={() => go(id)} className={section === id ? "active" : ""}><Icon /><span>{label}</span>{id === "questions" && wrongIds.length > 0 && <b>{wrongIds.length}</b>}</button>)}
          <div className="med-sidebar-label">FERRAMENTAS</div>
          {NAV.slice(11).map(({ id, label, Icon }) => <button key={id} onClick={() => go(id)} className={section === id ? "active" : ""}><Icon /><span>{label}</span></button>)}
          <div className="med-safety-mini"><ShieldCheck /><div><strong>Uso educacional</strong><span>Não substitui supervisão, avaliação ou atendimento profissional.</span></div></div>
        </aside>

        <main className="med-main">
          {section === "home" && <MedicineHome level={level} progress={progress} wrongCount={wrongIds.length} onGo={go} />}
          {section === "atlas" && <div className="med-section-wrap"><BodyAtlas level={level} activeLayer={activeLayer} onLayerChange={setActiveLayer} selected={selectedStructure} onSelect={setSelectedStructure} onOpen3D={(structureId) => { setInitial3DStructureId(structureId); go("atlas3d"); }} />{selectedStructure && <div className="med-atlas-actions"><button onClick={() => toggleFavorite(selectedStructure.id)}>{favoriteIds.includes(selectedStructure.id) ? <Check /> : <BookOpen />}{favoriteIds.includes(selectedStructure.id) ? "Salva para revisão" : "Salvar para revisão"}</button><button onClick={() => toast.info("A Flora deve explicar apenas com base nas fontes exibidas nesta estrutura.")}><Sparkles /> Explicar com a Flora</button></div>}</div>}
          {section === "atlas3d" && <Suspense fallback={<div className="med-3d-route-loading"><Rotate3D /><strong>Carregando o ambiente tridimensional…</strong><span>Preparando iluminação, câmera e estruturas.</span></div>}><Anatomy3DStudio level={level} initialStructureId={initial3DStructureId} /></Suspense>}
          {section === "instruments" && <InstrumentsStudio level={level} />}
          {section === "surgery" && <SurgerySimulator level={level} />}
          {section === "systems" && <SystemsSection level={level} onOpenAtlas={(layer, structure) => { setActiveLayer(layer); if (structure) setSelectedStructure(structure); go("atlas"); }} />}
          {section === "development" && <DevelopmentSection />}
          {section === "practice" && <PracticeSection level={level} structure={practiceStructure} input={practiceInput} result={practiceResult} onInput={setPracticeInput} onSubmit={() => {
            const normalized = normalizeAnswer(practiceInput);
            const acceptedNames = [...practiceStructure.synonyms, practiceStructure.name, practiceStructure.latin ?? ""].map(normalizeAnswer);
            const correct = acceptedNames.includes(normalized);
            setPracticeResult(correct ? "correct" : "wrong");
            if (!correct) { const next = Array.from(new Set([...wrongIds, `structure:${practiceStructure.id}`])); setWrongIds(next); saveMedicineState("wrong", next); }
          }} onNext={() => { const currentIndex = practicePool.findIndex((structure) => structure.id === practiceStructure.id); const nextIndex = (Math.max(currentIndex, 0) + 1) % practicePool.length; setPracticeStructure(practicePool[nextIndex]); setPracticeInput(""); setPracticeResult(null); }} />}
          {section === "questions" && <QuestionsSection level={level} question={currentQuestion} index={questionIndex % sessionQuestions.length} total={sessionQuestions.length} answer={answer} wrongCount={reviewQuestions.length} reviewOnly={activeReview} onToggleReview={() => { if (!reviewQuestions.length) { toast.info("Quando você errar uma questão deste nível, ela aparecerá aqui para revisão."); return; } setReviewOnly((value) => !value); setQuestionIndex(0); setAnswer(null); }} onAnswer={submitAnswer} onNext={() => { setQuestionIndex((value) => value + 1); setAnswer(null); }} />}
          {section === "clinic" && <ClinicalSection level={level} clinicalCase={activeClinicalCase} cases={medicalClinicalCases} sensitiveContentEnabled={sensitiveContentEnabled} step={caseStep} reflection={caseReflection} answer={caseAnswer} onSelectCase={selectClinicalCase} onToggleSensitive={() => setSensitiveContentEnabled((value) => !value)} onReflection={setCaseReflection} onAnswer={setCaseAnswer} onNext={() => {
            if (caseAnswer === null) { toast.info("Escolha uma resposta antes de avançar."); return; }
            if (caseReflection.trim().length < 40) { toast.info("Desenvolva a justificativa em pelo menos 40 caracteres."); return; }
            const finishing = caseStep === activeClinicalCase.steps.length - 1;
            setCaseStep((value) => Math.min(value + 1, activeClinicalCase.steps.length));
            setCaseAnswer(null);
            setCaseReflection("");
            if (finishing) toast.success("Caso clínico concluído", { description: "A síntese final foi liberada para revisão." });
          }} onRestart={() => { setCaseStep(0); setCaseAnswer(null); setCaseReflection(""); toast.success("Caso reiniciado."); }} />}
          {section === "plan" && <StudyPlanSection level={level} hours={studyHours} goal={studyGoal} onHours={setStudyHours} onGoal={setStudyGoal} onStart={() => { saveMedicineState("plan", { level, studyHours, studyGoal, createdAt: Date.now() }); toast.success("Plano médico salvo neste dispositivo."); }} />}
          {section === "notebook" && <NotebookSection navigate={navigate} />}
          {section === "sources" && <SourcesSection />}
        </main>
      </div>
    </div>
  );
}

function MedicineHome({ level, progress, wrongCount, onGo }: { level: MedicineLevel; progress: number; wrongCount: number; onGo: (id: MedicineSection) => void }) {
  const profile = medicineLevelProfiles[level];
  return <div className="med-home">
    <section className="med-hero"><img src="/medicine/medicine-hero-v2.png" alt="Modelo anatômico educacional translúcido com coração, cérebro, vasos e nervos" /><div className="med-hero-overlay"/><div className="med-hero-content"><span className="med-kicker"><ShieldCheck /> Conteúdo educacional com fontes</span><div className="med-home-level"><span>{level}</span><strong>{profile.title}</strong></div><h1>Entenda o corpo.<br/><em>Construa raciocínio.</em></h1><p>{profile.homeDescription}</p><div className="med-hero-actions"><button onClick={() => onGo("atlas")}><Play /> Explorar o corpo</button><button onClick={() => onGo("plan")}>Montar meu plano <ArrowRight /></button></div><small>Foco deste nível: {profile.focus}</small></div></section>
    <section className="med-command-grid">
      <button className="primary" onClick={() => onGo("atlas")}><span><Search /></span><div><small>EXPLORAR</small><h3>Atlas por camadas</h3><p>Pele, músculos, esqueleto, vasos, nervos e órgãos.</p></div><ChevronRight /></button>
      <button onClick={() => onGo("practice")}><span><Target /></span><div><small>PRATICAR</small><h3>Identificação ativa</h3><p>Nomeie estruturas e transforme erros em revisão.</p></div><ChevronRight /></button>
      <button onClick={() => onGo("clinic")}><span><Stethoscope /></span><div><small>RACIOCINAR</small><h3>Caso progressivo</h3><p>Informações liberadas em etapas, com justificativa.</p></div><ChevronRight /></button>
    </section>
    <section className="med-progress-row"><div><span className="med-eyebrow">Seu percurso</span><h2>Aprendizado longitudinal</h2></div><div className="med-progress-card"><div className="ring" style={{ "--progress": `${progress * 3.6}deg` } as CSSProperties}><strong>{progress}%</strong></div><div><strong>Domínio em {level}</strong><span>{wrongCount ? `${wrongCount} item(ns) aguardando revisão` : "Nenhum erro pendente"}</span></div></div><div className="med-progress-card"><Brain /><div><strong>{profile.title}</strong><span>{profile.cycle.slice(0, 4).join(" → ")}</span></div></div></section>
    <section className="med-systems-preview"><div className="med-section-heading"><div><span className="med-eyebrow">Anatomia e fisiologia</span><h2>Sistemas do corpo</h2></div><button onClick={() => onGo("systems")}>Ver todos <ArrowRight /></button></div><div className="med-system-mini-grid">{medicalSystems.slice(0, 4).map((system) => <button key={system.id} onClick={() => onGo("systems")} style={{ "--system": system.color } as CSSProperties}><span>{system.name.slice(0, 2).toUpperCase()}</span><strong>{system.name}</strong><small>{system.description}</small></button>)}</div></section>
  </div>;
}

type SystemTab = "overview" | "structures" | "physiology" | "practice";

const systemLevelGuides: Record<MedicineLevel, { title: string; goal: string; question: string }> = {
  Iniciante: { title: "Reconhecimento essencial", goal: "Localize as estruturas, aprenda seus nomes e associe cada uma à função central.", question: "O que é, onde fica e qual função central exerce?" },
  "Ciclo básico": { title: "Mecanismos fundamentais", goal: "Conecte anatomia, organização tecidual e mecanismos fisiológicos básicos.", question: "Quais estruturas e mecanismos participam deste processo?" },
  "Ciclo clínico": { title: "Integração fisiopatológica", goal: "Relacione alterações de estrutura e função com manifestações clínicas gerais.", question: "Como uma alteração deste processo repercute no organismo?" },
  Internato: { title: "Raciocínio aplicado", goal: "Organize achados por mecanismo, localização e impacto funcional sem perder os limites do caso.", question: "Quais dados ajudam a localizar e explicar a alteração funcional?" },
  Residência: { title: "Síntese avançada", goal: "Integre mecanismos, relações anatômicas e decisões de investigação em cenários educacionais.", question: "Quais mecanismos concorrentes e relações anatômicas precisam ser comparados?" },
};

const systemTabs: Array<{ id: SystemTab; label: string; Icon: typeof Activity }> = [
  { id: "overview", label: "Visão integrada", Icon: Layers },
  { id: "structures", label: "Explorar anatomia", Icon: MapPin },
  { id: "physiology", label: "Fisiologia", Icon: Activity },
  { id: "practice", label: "Treino rápido", Icon: ListChecks },
];

function SystemsSection({ level, onOpenAtlas }: { level: MedicineLevel; onOpenAtlas: (layer: BodyLayer, structure?: AnatomyStructure) => void }) {
  const [selectedId, setSelectedId] = useState(medicalSystems[0].id);
  const [tab, setTab] = useState<SystemTab>("overview");
  const [structureQuery, setStructureQuery] = useState("");
  const [activeStructureId, setActiveStructureId] = useState("");
  const [questionIndex, setQuestionIndex] = useState(0);
  const [systemAnswer, setSystemAnswer] = useState<number | null>(null);
  const selected = medicalSystems.find((system) => system.id === selectedId) ?? medicalSystems[0];
  const guide = systemLevelGuides[level];
  const systemStructures = useMemo(
    () => selected.atlasStructureIds.map((id) => anatomyStructures.find((structure) => structure.id === id)).filter((structure): structure is AnatomyStructure => Boolean(structure)),
    [selected],
  );
  const filteredStructures = useMemo(() => {
    const normalized = normalizeAnswer(structureQuery);
    if (!normalized) return systemStructures;
    return systemStructures.filter((structure) => normalizeAnswer(`${structure.name} ${structure.latin ?? ""} ${structure.region}`).includes(normalized));
  }, [structureQuery, systemStructures]);
  const systemQuestions = useMemo(() => {
    const candidates = medicalQuestions.filter((question) => selected.questionSystems.includes(question.system));
    const exactLevel = candidates.filter((question) => question.level === level);
    if (exactLevel.length) return exactLevel;
    const targetRank = levelOrder.indexOf(level);
    return [...candidates].sort((a, b) => Math.abs(levelOrder.indexOf(a.level) - targetRank) - Math.abs(levelOrder.indexOf(b.level) - targetRank));
  }, [level, selected]);
  const activeStructure = systemStructures.find((structure) => structure.id === activeStructureId) ?? systemStructures[0];
  const structureView = activeStructure ? preferredAnatomyView(activeStructure) : "anterior";
  const structurePosition = activeStructure ? anatomyPositionFor(activeStructure, structureView) : null;
  const currentQuestion = systemQuestions.length ? systemQuestions[questionIndex % systemQuestions.length] : null;
  const source = medicalSources[selected.sourceId];

  useEffect(() => {
    setTab("overview");
    setStructureQuery("");
    setActiveStructureId("");
    setQuestionIndex(0);
    setSystemAnswer(null);
  }, [selectedId]);

  const nextQuestion = () => {
    setQuestionIndex((value) => value + 1);
    setSystemAnswer(null);
  };

  return <div className="med-page med-systems-page">
    <PageHeading eyebrow={`Anatomia por sistemas · ${level}`} title="Veja o organismo funcionando em conjunto" description="Explore o mapa anatômico, siga os mecanismos em sequência e teste o entendimento sem sair do sistema escolhido." />
    <div className="med-systems-layout med-systems-workspace">
      <nav className="med-system-list" aria-label="Sistemas do corpo">
        <div className="med-system-list-heading"><span>{medicalSystems.length} sistemas</span><strong>Escolha uma área</strong></div>
        {medicalSystems.map((system) => <button key={system.id} onClick={() => setSelectedId(system.id)} className={selected.id === system.id ? "active" : ""} style={{ "--system": system.color } as CSSProperties}><span>{system.name.slice(0, 2)}</span><div><strong>{system.name}</strong><small>{system.description}</small></div><ChevronRight /></button>)}
      </nav>

      <article className="med-system-detail med-system-studio" style={{ "--system": selected.color } as CSSProperties}>
        <section className="med-system-hero">
          <div className="med-system-hero-copy">
            <span className="med-eyebrow">SISTEMA {selected.name.toUpperCase()}</span>
            <h2>{selected.name}</h2>
            <p>{selected.description}</p>
            <div className="med-system-hero-stats">
              <div><strong>{systemStructures.length}</strong><span>estruturas exploráveis</span></div>
              <div><strong>{selected.topics.length}</strong><span>eixos de fisiologia</span></div>
              <div><strong>{systemQuestions.length}</strong><span>questões relacionadas</span></div>
            </div>
            <div className="med-system-hero-actions"><button onClick={() => setTab("structures")}><ZoomIn /> Explorar de perto</button><button onClick={() => setTab("practice")}>Testar agora <ArrowRight /></button></div>
          </div>
          <div className="med-system-visual med-system-hero-visual"><img key={selected.image} src={selected.image} alt={`Ilustração educacional do sistema ${selected.name}`} /><span>Modelo educacional · não diagnóstico</span></div>
        </section>

        <nav className="med-system-tabs" aria-label="Conteúdo do sistema">
          {systemTabs.map(({ id, label, Icon }) => <button key={id} className={tab === id ? "active" : ""} onClick={() => setTab(id)}><Icon />{label}</button>)}
        </nav>

        <div className="med-system-content">
          {tab === "overview" && <div className="med-system-overview-grid">
            <section className="med-system-learning-map">
              <div className="med-system-section-title"><span className="med-eyebrow">ROTA INTEGRADA</span><h3>Da estrutura ao raciocínio</h3><p>Avance na ordem ou entre diretamente no ponto que precisa revisar.</p></div>
              <div className="med-system-route">
                <button onClick={() => setTab("structures")}><span>01</span><div><small>ANATOMIA</small><strong>Reconhecer estruturas</strong><p>{selected.structures.join(" · ")}</p></div><ChevronRight /></button>
                <button onClick={() => setTab("physiology")}><span>02</span><div><small>FISIOLOGIA</small><strong>Entender mecanismos</strong><p>{selected.topics.join(" · ")}</p></div><ChevronRight /></button>
                <button onClick={() => setTab("practice")}><span>03</span><div><small>RECUPERAÇÃO ATIVA</small><strong>Responder e conferir</strong><p>Questões com explicação e fonte rastreável.</p></div><ChevronRight /></button>
              </div>
            </section>
            <aside className="med-system-level-panel">
              <span className="med-eyebrow">SEU NÍVEL ATIVO</span><strong>{level}</strong><h3>{guide.title}</h3><p>{guide.goal}</p>
              <div><CircleDot /><span><b>Pergunta-guia</b>{guide.question}</span></div>
              <small>O seletor de nível no topo altera este objetivo e prioriza questões compatíveis.</small>
            </aside>
            <section className="med-system-core-grid">
              <div><span><MapPin /></span><small>ESTRUTURAS-CHAVE</small><strong>{selected.structures.join(", ")}</strong></div>
              <div><span><Activity /></span><small>PROCESSOS-CHAVE</small><strong>{selected.topics.join(", ")}</strong></div>
              <div><span><ShieldCheck /></span><small>FONTE PRINCIPAL</small><strong>{source.organization}</strong><a href={source.url} target="_blank" rel="noreferrer">Conferir conteúdo <ExternalLink /></a></div>
            </section>
          </div>}

          {tab === "structures" && <div className="med-system-structure-explorer">
            <aside>
              <div className="med-system-section-title"><span className="med-eyebrow">MAPA ANATÔMICO</span><h3>Estruturas do sistema</h3><p>Selecione um nome para localizar e ampliar.</p></div>
              <label><Search /><input value={structureQuery} onChange={(event) => setStructureQuery(event.target.value)} placeholder="Buscar estrutura" /></label>
              <div className="med-system-structure-list">{filteredStructures.map((structure) => <button key={structure.id} className={activeStructure?.id === structure.id ? "active" : ""} onClick={() => setActiveStructureId(structure.id)}><span><MapPin /></span><div><strong>{structure.name}</strong><small>{structure.region}</small></div><ChevronRight /></button>)}</div>
              {!filteredStructures.length && <div className="med-system-no-results">Nenhuma estrutura encontrada.</div>}
            </aside>
            {activeStructure && structurePosition && <article>
              <div className="med-system-anatomy-preview" aria-label={`Ampliação de ${activeStructure.name}`}>
                <div className="med-anatomy-focus-grid" />
                <img key={`${activeStructure.layer}-${structureView}`} src={`/medicine/atlas/${activeStructure.layer}-${structureView}-v2.png`} alt={`Localização anatômica de ${activeStructure.name}`} style={{ height: "280%", left: "50%", top: "50%", transform: `translate(-${structurePosition.x}%, -${structurePosition.y}%)` }} />
                <i /><div><strong>{activeStructure.name}</strong><span>{activeStructure.region} · vista {structureView}</span></div>
              </div>
              <div className="med-system-structure-copy"><span className="med-eyebrow">{bodyLayers.find((layer) => layer.id === activeStructure.layer)?.label}</span><h3>{activeStructure.name}</h3>{activeStructure.latin && <em>{activeStructure.latin}</em>}<p>{activeStructure.summary}</p><dl><div><dt>Função</dt><dd>{activeStructure.function}</dd></div><div><dt>Relações</dt><dd>{activeStructure.relations}</dd></div></dl><button onClick={() => onOpenAtlas(activeStructure.layer, activeStructure)}>Abrir no atlas imersivo <ArrowRight /></button></div>
            </article>}
          </div>}

          {tab === "physiology" && <section className="med-system-physiology">
            <div className="med-system-section-title"><span className="med-eyebrow">TRILHA DE FISIOLOGIA</span><h3>Construa o mecanismo por etapas</h3><p>Os tópicos são organizados como uma sequência de estudo; use a pergunta-guia do seu nível em cada etapa.</p></div>
            <div className="med-system-flow">{selected.topics.map((topic, index) => <article key={topic}><span>{String(index + 1).padStart(2, "0")}</span><div><small>ETAPA {index + 1}</small><h4>{topic}</h4><p>{guide.question}</p><div><CircleDot />Conecte com {selected.structures[index % selected.structures.length]}</div></div></article>)}</div>
            <div className="med-system-physiology-footer"><div><Brain /><span><strong>Fechamento ativo</strong>Explique os três tópicos sem consultar e marque onde o encadeamento ficou incompleto.</span></div><button onClick={() => setTab("practice")}>Ir para o treino <ArrowRight /></button></div>
          </section>}

          {tab === "practice" && <section className="med-system-practice">
            <div className="med-system-section-title"><span className="med-eyebrow">TREINO DO SISTEMA · {level}</span><h3>Recupere antes de reler</h3><p>A questão mais próxima do nível selecionado é priorizada quando não existe uma pergunta exatamente desse nível.</p></div>
            {currentQuestion ? <article className="med-system-question">
              <div className="med-question-meta"><span>{currentQuestion.level}</span><span>{currentQuestion.system}</span><span>{currentQuestion.type}</span></div>
              <h4>{currentQuestion.prompt}</h4>
              <div className="med-options">{currentQuestion.options.map((option, optionIndex) => { const state = systemAnswer === null ? "" : optionIndex === currentQuestion.answer ? "correct" : optionIndex === systemAnswer ? "wrong" : "muted"; return <button key={option} className={state} onClick={() => systemAnswer === null && setSystemAnswer(optionIndex)}><b>{String.fromCharCode(65 + optionIndex)}</b><span>{option}</span>{state === "correct" && <Check />}{state === "wrong" && <X />}</button>; })}</div>
              {systemAnswer !== null && <div className="med-explanation"><Sparkles /><div><strong>{systemAnswer === currentQuestion.answer ? "Resposta correta" : "Revise este mecanismo"}</strong><p>{currentQuestion.explanation}</p><a href={medicalSources[currentQuestion.sourceId].url} target="_blank" rel="noreferrer">Conferir fonte <ExternalLink /></a></div></div>}
              <footer><span>Questão {questionIndex % systemQuestions.length + 1} de {systemQuestions.length}</span><button disabled={systemAnswer === null} onClick={nextQuestion}>Próxima <ArrowRight /></button></footer>
            </article> : <div className="med-system-no-results">Ainda não há questão vinculada a este sistema.</div>}
          </section>}
        </div>
      </article>
    </div>
  </div>;
}

function DevelopmentSection() {
  const [active, setActive] = useState(0);
  const stage = embryologyTimeline[active];
  const source = medicalSources[stage.sourceId];
  const selectStage = (index: number) => setActive(Math.min(Math.max(index, 0), embryologyTimeline.length - 1));

  return <div className="med-page med-development-page">
    <PageHeading eyebrow="Embriologia e desenvolvimento humano" title="Do começo da vida à fase adulta" description="Uma jornada visual para entender o que muda em cada fase, quais sistemas estão em foco e o que revisar antes de avançar." />

    <div className="med-development-safety"><ShieldCheck /><div><strong>Guia educacional com fontes por etapa</strong><span>Faixas etárias são didáticas e o desenvolvimento apresenta variações individuais. As imagens ajudam na orientação visual, mas não são fonte anatômica nem material diagnóstico.</span></div></div>

    <nav className="med-development-ribbon" aria-label="Etapas do desenvolvimento humano">
      {embryologyTimeline.map((item, index) => <button key={item.id} className={active === index ? "active" : ""} onClick={() => selectStage(index)} aria-current={active === index ? "step" : undefined}>
        <span>{String(index + 1).padStart(2, "0")}</span>
        <div><small>{item.phase} · {item.period}</small><strong>{item.title}</strong></div>
      </button>)}
    </nav>

    <article className="med-development-hero">
      <div className="med-development-hero-image">
        <img key={stage.image} src={stage.image} alt={stage.imageAlt} />
        <span>Imagem educacional · não diagnóstica</span>
        <div className="med-development-image-index">ETAPA {active + 1} / {embryologyTimeline.length}</div>
      </div>
      <div className="med-development-hero-copy">
        <div className="med-development-phase"><Baby /><span>{stage.phase}</span><i /> <span>{stage.period}</span></div>
        <h2>{stage.title}</h2>
        <p>{stage.detail}</p>
        <div className="med-development-source-mini"><BookOpen /><div><small>FONTE DESTA ETAPA</small><strong>{source.title}</strong><span>{source.organization} · revisada em {source.reviewedAt.split("-").reverse().join("/")}</span></div></div>
        <div className="med-development-hero-actions">
          <button onClick={() => selectStage(active - 1)} disabled={active === 0}><ArrowLeft /> Anterior</button>
          <button className="primary" onClick={() => selectStage(active + 1)} disabled={active === embryologyTimeline.length - 1}>Próxima fase <ArrowRight /></button>
        </div>
      </div>
    </article>

    <div className="med-development-learning-grid">
      <section className="med-development-milestones">
        <header><span className="med-eyebrow">O QUE ACONTECE</span><h3>Marcos desta fase</h3><p>Uma sequência curta para construir o entendimento antes dos detalhes.</p></header>
        <div>{stage.milestones.map((milestone, index) => <article key={milestone}><span>{index + 1}</span><p>{milestone}</p></article>)}</div>
      </section>

      <aside className="med-development-processes">
        <span className="med-eyebrow">MAPA DE ESTUDO</span><h3>Sistemas e processos em foco</h3>
        <div>{stage.systems.map((system) => <span key={system}>{system}</span>)}</div>
        <a href={source.url} target="_blank" rel="noreferrer"><BookOpen /> Abrir referência completa <ExternalLink /></a>
      </aside>
    </div>

    <section className="med-development-prompts">
      <div><span className="med-eyebrow">RECUPERAÇÃO ATIVA</span><h3>Consegue explicar sem reler?</h3><p>Responda com suas palavras. Se travar, volte aos marcos e confira a referência.</p></div>
      <ol>{stage.studyQuestions.map((question, index) => <li key={question}><span>{String(index + 1).padStart(2, "0")}</span><p>{question}</p></li>)}</ol>
    </section>

    <section className="med-development-gallery">
      <header><div><span className="med-eyebrow">JORNADA COMPLETA</span><h3>Compare as fases lado a lado</h3></div><span>{embryologyTimeline.length} etapas ilustradas</span></header>
      <div>{embryologyTimeline.map((item, index) => <button key={item.id} className={active === index ? "active" : ""} onClick={() => selectStage(index)}>
        <span><img src={item.image} alt="" loading="lazy" /></span><small>{item.period}</small><strong>{item.title}</strong>
      </button>)}</div>
    </section>
  </div>;
}

function PracticeSection({ level, structure, input, result, onInput, onSubmit, onNext }: { level: MedicineLevel; structure: AnatomyStructure; input: string; result: "correct" | "wrong" | null; onInput: (value: string) => void; onSubmit: () => void; onNext: () => void }) {
  const modelView = preferredAnatomyView(structure);
  const markerPosition = anatomyPositionFor(structure, modelView) ?? { x: structure.x, y: structure.y };
  const [visualZoom, setVisualZoom] = useState(2.2);
  const [visualPan, setVisualPan] = useState({ x: 0, y: 0 });
  const [panning, setPanning] = useState(false);
  const modelRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ pointerId: number; x: number; y: number } | null>(null);
  const rank = levelOrder.indexOf(level);
  const profile = medicineLevelProfiles[level];
  const layerName = bodyLayers.find((layer) => layer.id === structure.layer)?.label ?? structure.layer;
  const clue = rank === 0 ? `Camada ${layerName} · começa com “${structure.name.charAt(0)}”` : rank === 1 ? `Camada anatômica: ${layerName}` : "Observe a estrutura destacada e informe o nome anatômico.";
  const eyebrow = rank <= 2 ? `REGIÃO: ${structure.region}` : rank === 3 ? `CAMADA: ${layerName}` : "IDENTIFICAÇÃO AVANÇADA · SEM PISTAS";

  const focusMarker = (targetZoom = Math.max(visualZoom, 2.2)) => {
    const width = modelRef.current?.clientWidth ?? 293;
    const height = modelRef.current?.clientHeight ?? 520;
    setVisualZoom(targetZoom);
    setVisualPan({
      x: -((markerPosition.x / 100) - .5) * width * targetZoom,
      y: -((markerPosition.y / 100) - .5) * height * targetZoom,
    });
  };

  const changeVisualZoom = (delta: number) => {
    const nextZoom = Math.min(5, Math.max(1, Number((visualZoom + delta).toFixed(2))));
    const ratio = nextZoom / visualZoom;
    setVisualZoom(nextZoom);
    setVisualPan((current) => ({ x: current.x * ratio, y: current.y * ratio }));
  };

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      const width = modelRef.current?.clientWidth ?? 293;
      const height = modelRef.current?.clientHeight ?? 520;
      const targetZoom = 2.2;
      setVisualZoom(targetZoom);
      setVisualPan({
        x: -((markerPosition.x / 100) - .5) * width * targetZoom,
        y: -((markerPosition.y / 100) - .5) * height * targetZoom,
      });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [markerPosition.x, markerPosition.y, structure.id]);

  return <div className="med-page"><PageHeading eyebrow={`Aprendizado ativo · ${level}`} title="Identificação anatômica" description={profile.practiceDescription} />
    <div className="med-practice-card"><div className="med-practice-visual"><div className="pulse-ring"/>
      <div className="med-practice-zoom-controls">
        <button onClick={() => changeVisualZoom(-.35)} aria-label="Diminuir zoom da identificação"><ZoomOut /></button>
        <strong>{Math.round(visualZoom * 100)}%</strong>
        <button onClick={() => changeVisualZoom(.35)} aria-label="Aumentar zoom da identificação"><ZoomIn /></button>
        <button className="wide" onClick={() => focusMarker()}><Focus /> Focar ponto</button>
        <button className="wide" onClick={() => { setVisualZoom(1); setVisualPan({ x: 0, y: 0 }); }}><RotateCcw /> Corpo inteiro</button>
      </div>
      <div
        className={`med-practice-viewport ${panning ? "is-panning" : ""}`}
        onWheel={(event) => { event.preventDefault(); changeVisualZoom(event.deltaY < 0 ? .25 : -.25); }}
        onPointerDown={(event) => {
          if (event.button !== 0) return;
          event.preventDefault();
          event.currentTarget.setPointerCapture(event.pointerId);
          dragRef.current = { pointerId: event.pointerId, x: event.clientX, y: event.clientY };
          setPanning(true);
        }}
        onPointerMove={(event) => {
          const drag = dragRef.current;
          if (!drag || drag.pointerId !== event.pointerId) return;
          const deltaX = event.clientX - drag.x;
          const deltaY = event.clientY - drag.y;
          drag.x = event.clientX;
          drag.y = event.clientY;
          const limitX = event.currentTarget.clientWidth * visualZoom;
          const limitY = event.currentTarget.clientHeight * visualZoom;
          setVisualPan((current) => ({
            x: Math.min(limitX, Math.max(-limitX, current.x + deltaX)),
            y: Math.min(limitY, Math.max(-limitY, current.y + deltaY)),
          }));
        }}
        onPointerUp={(event) => {
          if (dragRef.current?.pointerId !== event.pointerId) return;
          dragRef.current = null;
          setPanning(false);
          if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
        }}
        onPointerCancel={() => { dragRef.current = null; setPanning(false); }}
        onLostPointerCapture={() => { dragRef.current = null; setPanning(false); }}
        aria-label="Imagem anatômica ampliável; arraste para navegar"
      >
        <div ref={modelRef} className="med-practice-model" style={{ transform: `translate3d(${visualPan.x}px, ${visualPan.y}px, 0) scale(${visualZoom})` }}><img key={`${structure.layer}-${modelView}`} src={`/medicine/atlas/${structure.layer}-${modelView}-v2.png`} alt={`Modelo anatômico educacional em vista ${modelView}`} draggable={false} /><i style={{ left: `${markerPosition.x}%`, top: `${markerPosition.y}%` } as CSSProperties}/></div>
      </div>
      <div className="med-practice-drag-help">Arraste para navegar · roda para aproximar</div><span>MODELO ANATÔMICO EM ALTA DEFINIÇÃO</span><small>Ilustração educacional · não diagnóstica</small></div><div className="med-practice-prompt"><span className="med-eyebrow">{eyebrow}</span><h2>Qual é esta estrutura?</h2><p>{result ? structure.summary : clue}</p><div className="med-answer-box"><input value={input} onChange={(event) => onInput(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") onSubmit(); }} placeholder="Digite o nome da estrutura" disabled={result !== null}/>{result === null ? <button onClick={onSubmit}>Responder</button> : <button onClick={onNext}>Próxima <ArrowRight /></button>}</div>{result && <div className={`med-feedback ${result}`}><span>{result === "correct" ? <Check /> : <X />}</span><div><strong>{result === "correct" ? "Resposta correta" : `Resposta: ${structure.name}`}</strong><p><b>Função:</b> {structure.function}</p><p><b>Próximas:</b> {structure.nearby.length ? structure.nearby.join(", ") : "consulte a fonte anatômica"}</p></div></div>}</div></div>
  </div>;
}

function QuestionsSection({ level, question, index, total, answer, wrongCount, reviewOnly, onToggleReview, onAnswer, onNext }: { level: MedicineLevel; question: typeof medicalQuestions[number]; index: number; total: number; answer: number | null; wrongCount: number; reviewOnly: boolean; onToggleReview: () => void; onAnswer: (value: number) => void; onNext: () => void }) {
  return <div className="med-page"><PageHeading eyebrow={`Banco médico · ${level}`} title="Questões com explicação e fonte" description={medicineLevelProfiles[level].questionDescription} />
    <div className="med-question-layout"><aside><div><strong>{wrongCount}</strong><span>para revisar</span></div><div><strong>{index + 1}/{total}</strong><span>sessão atual</span></div><button className={reviewOnly ? "active" : ""} onClick={onToggleReview}>{reviewOnly ? "Ver sessão normal" : "Revisar meus erros"}</button></aside><article className="med-question-card"><div className="med-question-meta"><span>{question.level}</span><span>{question.system}</span><span>{question.type}</span></div><h2>{question.prompt}</h2><div className="med-options">{question.options.map((option, optionIndex) => { const state = answer === null ? "" : optionIndex === question.answer ? "correct" : optionIndex === answer ? "wrong" : "muted"; return <button key={option} className={state} onClick={() => answer === null && onAnswer(optionIndex)}><b>{String.fromCharCode(65 + optionIndex)}</b><span>{option}</span>{state === "correct" && <Check />}{state === "wrong" && <X />}</button>; })}</div>{answer !== null && <div className="med-explanation"><Sparkles/><div><strong>Explicação</strong><p>{question.explanation}</p><a href={medicalSources[question.sourceId].url} target="_blank" rel="noreferrer">Fonte usada <ExternalLink /></a></div></div>}<footer><span>Questão {index + 1}</span><button disabled={answer === null} onClick={onNext}>Próxima <ArrowRight /></button></footer></article></div>
  </div>;
}

function ClinicalSection({ level, clinicalCase, cases, sensitiveContentEnabled, step, reflection, answer, onSelectCase, onToggleSensitive, onReflection, onAnswer, onNext, onRestart }: {
  level: MedicineLevel;
  clinicalCase: typeof medicalClinicalCase;
  cases: typeof medicalClinicalCases;
  sensitiveContentEnabled: boolean;
  step: number;
  reflection: string;
  answer: number | null;
  onSelectCase: (id: string) => void;
  onToggleSensitive: () => void;
  onReflection: (value: string) => void;
  onAnswer: (value: number) => void;
  onNext: () => void;
  onRestart: () => void;
}) {
  const completed = step >= clinicalCase.steps.length;
  const activeStep = clinicalCase.steps[Math.min(step, clinicalCase.steps.length - 1)];
  const source = medicalSources[activeStep.sourceId];
  const correct = answer === activeStep.answer;
  const progress = completed ? 100 : Math.round((step / clinicalCase.steps.length) * 100);
  const responseReady = answer !== null && reflection.trim().length >= 40;
  const levelRank = levelOrder.indexOf(level);
  const difficultyRank = levelOrder.indexOf(clinicalCase.difficulty);
  const showHint = levelRank < 2 && activeStep.hint;

  return <div className="med-page med-clinic-page">
    <PageHeading eyebrow={`Simulação educacional · ${level}`} title="Clínica imersiva" description={`${medicineLevelProfiles[level].clinicalInstruction} Os cenários reproduzem padrões clínicos realistas, mas todas as pessoas e informações são fictícias.`} />
    <div className="med-clinical-warning"><ShieldCheck/><span><strong>Realismo sem expor pacientes</strong> Casos sintéticos e desidentificados, baseados em padrões clínicos e fontes rastreáveis. Não oferecem diagnóstico, prescrição ou orientação individual.</span></div>

    <section className="med-case-library">
      <header><div><span className="med-eyebrow">BIBLIOTECA DE CENÁRIOS</span><h2>Escolha seu plantão</h2><p>{cases.length} casos completos, com decisões, prontuário, exames, evolução e desfecho.</p></div><div><strong>{level}</strong><span>nível ativo</span></div></header>
      <div>{cases.map((item, index) => {
        const compatible = levelOrder.indexOf(item.difficulty) <= levelRank;
        return <button key={item.id} className={item.id === clinicalCase.id ? "active" : ""} onClick={() => onSelectCase(item.id)}>
          <span className="med-case-card-index">{String(index + 1).padStart(2, "0")}</span>
          <div><small>{item.area} · {item.setting}</small><strong>{item.title}</strong><p>{item.focus}</p><footer><span>{item.durationMinutes} min</span><span>{item.steps.length} etapas</span><span className={compatible ? "compatible" : "advanced"}>{compatible ? "Adequado ao nível" : `Desafio: ${item.difficulty}`}</span>{item.sensitive && <span className="sensitive"><AlertTriangle /> Sensível</span>}</footer></div>
          <ChevronRight />
        </button>;
      })}</div>
    </section>

    <section className="med-clinical-case-heading">
      <div><span className="med-eyebrow">{clinicalCase.area} · {clinicalCase.setting}</span><h2>{clinicalCase.title}</h2><p>{clinicalCase.subtitle}</p></div>
      <div className="med-clinical-case-meta"><span>{clinicalCase.patient}</span><strong>{completed ? "Concluído" : `Etapa ${step + 1} de ${clinicalCase.steps.length}`}</strong><div><i style={{ width: `${progress}%` }} /></div></div>
    </section>

    <section className="med-case-monitor" aria-label="Sinais vitais iniciais">
      <div><Activity/><span><small>MONITOR INICIAL</small><strong>{clinicalCase.setting}</strong></span></div>
      {clinicalCase.triage.map((datum) => <div key={datum.label} className={datum.tone ?? "normal"}><small>{datum.label}</small><strong>{datum.value}</strong></div>)}
      <div className="med-case-monitor-difficulty"><small>COMPLEXIDADE</small><strong>{clinicalCase.difficulty}</strong><span>{difficultyRank <= levelRank ? "Compatível" : "Acima do nível atual"}</span></div>
    </section>

    <div className={`med-case-layout ${completed ? "completed" : ""}`}>
      <ol className="med-case-steps">{clinicalCase.steps.map((item, index) => <li key={item.id} className={index < step ? "done" : index === step ? "active" : "locked"}>
        <span>{index < step ? <Check/> : index + 1}</span><div><small>{index < step ? "REVISADA" : index === step ? "EM ANÁLISE" : "BLOQUEADA"}</small><strong>{item.label}</strong></div>
      </li>)}</ol>

      {completed ? <article className="med-case-completion">
        <span><Check /></span><small>{clinicalCase.steps.length} ETAPAS CONCLUÍDAS</small><h2>{clinicalCase.completion.title}</h2><p>{clinicalCase.completion.summary}</p>
        <div>{clinicalCase.completion.takeaways.map((takeaway) => <div key={takeaway}><Check /><span>{takeaway}</span></div>)}</div>
        <aside><ShieldCheck /><p><strong>Limite mantido</strong> Você reconheceu um padrão em um cenário fictício. Isso não equivale a avaliar uma pessoa real nem define tratamento.</p></aside>
        <button onClick={onRestart}>Refazer o caso <ArrowRight /></button>
      </article> : <article className="med-case-workspace">
        <header><div><span className="med-eyebrow">ETAPA {step + 1} DE {clinicalCase.steps.length}</span><h2>{activeStep.title}</h2></div><span>Dados liberados agora</span></header>

        {clinicalCase.visual && <section className={`med-case-visual ${clinicalCase.sensitive && !sensitiveContentEnabled ? "concealed" : "revealed"}`}>
          <img src={clinicalCase.visual.image} alt={sensitiveContentEnabled || !clinicalCase.sensitive ? clinicalCase.visual.alt : "Conteúdo clínico sensível ocultado"} />
          {clinicalCase.sensitive && !sensitiveContentEnabled && <div className="med-sensitive-cover"><AlertTriangle/><strong>Conteúdo clínico sensível</strong><p>{clinicalCase.sensitivityNote}</p><button onClick={onToggleSensitive}><Eye /> Estou ciente — mostrar imagem</button></div>}
          {clinicalCase.sensitive && sensitiveContentEnabled && <button className="med-hide-sensitive" onClick={onToggleSensitive}><EyeOff /> Ocultar imagens sensíveis</button>}
          <footer><span>{clinicalCase.visual.caption}</span><b>IMAGEM SINTÉTICA · NÃO DIAGNÓSTICA</b></footer>
        </section>}

        <div className="med-case-findings">{activeStep.release.map((finding, index) => <div key={finding}><span>{String(index + 1).padStart(2, "0")}</span><p>{finding}</p></div>)}</div>

        {activeStep.data && <section className="med-case-data"><header><Activity/><div><small>PRONTUÁRIO LIBERADO</small><strong>Dados desta etapa</strong></div></header><div>{activeStep.data.map((datum) => <div key={datum.label} className={datum.tone ?? "normal"}><small>{datum.label}</small><strong>{datum.value}</strong></div>)}</div></section>}

        <section className="med-case-decision">
          <span className="med-eyebrow">DECISÃO CLÍNICA EDUCACIONAL</span><h3>{activeStep.question}</h3>
          {showHint && <div className="med-case-hint"><Sparkles/><span><strong>Pista para {level}</strong>{activeStep.hint}</span></div>}
          <div>{activeStep.options.map((option, optionIndex) => {
            const state = answer === null ? "" : optionIndex === activeStep.answer ? "correct" : optionIndex === answer ? "wrong" : "muted";
            return <button key={option} className={state} onClick={() => answer === null && onAnswer(optionIndex)}><b>{String.fromCharCode(65 + optionIndex)}</b><span>{option}</span>{state === "correct" && <Check />}{state === "wrong" && <X />}</button>;
          })}</div>
          {answer !== null && <aside className={correct ? "correct" : "review"}><Sparkles /><div><strong>{correct ? "Boa decisão" : "Compare com a melhor resposta"}</strong><p>{activeStep.explanation}</p><a href={source.url} target="_blank" rel="noreferrer">Conferir referência desta etapa <ExternalLink /></a></div></aside>}
        </section>

        <label className="med-case-reflection"><span><strong>Registre seu raciocínio</strong><small>{activeStep.reflectionPrompt}</small></span><textarea value={reflection} onChange={(event) => onReflection(event.target.value)} placeholder={activeStep.placeholder} /><i>{reflection.trim().length}/40 caracteres mínimos</i></label>

        <footer><div><BookOpen /><span><small>FONTE DA ETAPA</small><strong>{source.title}</strong></span></div><div className="med-case-unlock"><span className={answer !== null ? "done" : ""}>{answer !== null ? <Check/> : <CircleDot/>} Decisão registrada</span><span className={reflection.trim().length >= 40 ? "done" : ""}>{reflection.trim().length >= 40 ? <Check/> : <CircleDot/>} Raciocínio 40+</span></div><button className={responseReady ? "ready" : ""} onClick={onNext}>{step === clinicalCase.steps.length - 1 ? "Concluir e liberar síntese" : "Validar e liberar próxima etapa"} <ArrowRight /></button></footer>
      </article>}
    </div>
  </div>;
}

function StudyPlanSection({ level, hours, goal, onHours, onGoal, onStart }: { level: MedicineLevel; hours: number; goal: string; onHours: (value: number) => void; onGoal: (value: string) => void; onStart: () => void }) {
  const profile = medicineLevelProfiles[level];
  const cycle = profile.cycle;
  return <div className="med-page"><PageHeading eyebrow={`Plano adaptativo · ${level}`} title="Seu ciclo médico" description={`${profile.title}: ${profile.focus}. A distribuição é educacional e não substitui o currículo da instituição.`} /><div className="med-plan-grid"><section><label>Objetivo principal<input value={goal} onChange={(event) => onGoal(event.target.value)} /></label><label>Horas disponíveis por semana<div className="med-range"><input type="range" min="2" max="40" value={hours} onChange={(event) => onHours(Number(event.target.value))}/><strong>{hours}h</strong></div></label><label>Nível atual<div className="med-static-field">{level} · {profile.title}</div></label><button onClick={onStart}>Salvar meu plano <Check /></button></section><article><span className="med-eyebrow">CICLO RECOMENDADO PARA {level}</span><h2>{Math.max(3, Math.round(hours / 2))} blocos por semana</h2><div className="med-cycle">{cycle.map((item, index) => <div key={item}><span>{index + 1}</span><div><strong>{item}</strong><small>{Math.max(20, Math.round((hours * 60) / cycle.length))} min sugeridos</small></div></div>)}</div></article></div>
  </div>;
}

function NotebookSection({ navigate }: { navigate: ReturnType<typeof useNavigate> }) {
  const { user } = useAuth();
  const [creatingId, setCreatingId] = useState<string | null>(null);
  const createFromTemplate = async (template: MedicalNotebookTemplate) => {
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
    const { error: pageError } = await supabase.from("notebook_pages").insert(
      template.pages.map((page, index) => ({
        notebook_id: notebook.id,
        user_id: user.id,
        page_number: index + 1,
        content: page.html,
        template: page.paper ?? "blank",
        tags: ["medicina", template.id, page.title.toLocaleLowerCase("pt-BR")],
      })),
    );
    if (pageError) {
      await supabase.from("notebooks").delete().eq("id", notebook.id);
      setCreatingId(null);
      toast.error("O template não pôde ser preparado. Nenhum caderno incompleto foi mantido.");
      return;
    }
    toast.success(`${template.pages.length} páginas médicas preparadas no seu Caderno.`);
    navigate(`/notebooks/${notebook.id}`);
  };
  return <div className="med-page">
    <PageHeading eyebrow="Caderno médico" title="Aprenda desenhando relações" description="Cadernos multipágina com imagens, explicações, fluxos e exercícios. Não inclua dados identificáveis de pacientes reais." />
    <div className="med-notebook-banner">
      <NotebookPen />
      <div><strong>Flora Canvas para medicina</strong><span>Escrita e desenho no mesmo papel, imagens anatômicas, setas, PDFs, questões e revisão ativa.</span></div>
      <button onClick={() => navigate("/notebooks")}>Abrir meus cadernos <ArrowRight /></button>
    </div>
    <div className="med-template-grid med-template-grid-rich">
      {medicalNotebookTemplates.map((template) => <article key={template.id} style={{ "--template-accent": template.accent } as CSSProperties}>
        <div className="med-template-preview"><img src={template.coverImage} alt="" loading="lazy" /><span><FileHeart /> {template.eyebrow}</span></div>
        <div className="med-template-copy"><h3>{template.name}</h3><p>{template.description}</p><div className="med-template-pages">{template.pages.slice(0, 3).map((page, index) => <span key={page.title}><b>{String(index + 1).padStart(2, "0")}</b>{page.title}</span>)}{template.pages.length > 3 && <small>+ {template.pages.length - 3} página{template.pages.length - 3 > 1 ? "s" : ""}</small>}</div></div>
        <button disabled={creatingId !== null} onClick={() => void createFromTemplate(template)}>{creatingId === template.id ? "Preparando páginas…" : "Criar no Caderno"} {creatingId !== template.id && <ArrowRight />}</button>
      </article>)}
    </div>
  </div>;
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
