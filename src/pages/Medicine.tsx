import { lazy, Suspense, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Activity, ArrowLeft, ArrowRight, Baby, BookOpen, Brain, Check, ChevronRight, ClipboardCheck,
  AlertTriangle, CircleDot, ExternalLink, Eye, EyeOff, FileHeart, HeartPulse, Layers, ListChecks, MapPin, Menu, NotebookPen,
  Focus, Maximize2, Microscope, Minimize2, PanelLeftClose, Pause, Play, Rotate3D, RotateCcw, Scissors, Search, ShieldCheck, Sparkles, Stethoscope, Target, Timer, Wrench, X, ZoomIn, ZoomOut,
} from "lucide-react";
import { toast } from "sonner";
import { BodyAtlas } from "@/components/medicine/BodyAtlas";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import {
  anatomyPositionFor, anatomyStructures, atlasImageForStructure, bodyLayers, embryologyTimeline, medicalClinicalCase, medicalClinicalCases, medicalQuestions,
  medicineLevelProfiles, medicalSources, medicalSystems, type AnatomyStructure, type BodyLayer, type MedicineLevel,
  preferredAnatomyView,
} from "@/lib/medicineData";
import { medicalNotebookTemplates, type MedicalNotebookTemplate } from "@/lib/medicalNotebookTemplates";
import { prepareMedicalNotebookHtml } from "@/lib/notebookMedicalAssets";
import { isMedicalImageReady, preloadMedicalImages } from "@/lib/medicineMedia";
import {
  emptyMedicineLearningState,
  medicineCompetencyProgress,
  mergeMedicineLearningStates,
  medicineOverallProgress,
  medicineReviewCategoryLabels,
  parseMedicineLearningState,
  pendingMedicineReviews,
  registerMedicineAttempt,
  type MedicineCompetency,
  type MedicineLearningState,
  type MedicineReviewCategory,
} from "@/lib/medicineLearning";
import "@/components/medicine/medicine.css";
import "@/components/medicine/instruments.css";
import "@/components/medicine/anatomy-3d.css";
import "@/components/medicine/surgery-simulator.css";
import "@/components/medicine/anamnesis-simulator.css";
import "@/components/medicine/semiology-academy.css";
import "@/components/medicine/pathology-lab.css";
import "@/components/medicine/medicine-enhancements.css";

const Anatomy3DStudio = lazy(() => import("@/components/medicine/Anatomy3DStudio").then((module) => ({ default: module.Anatomy3DStudio })));
const AnamnesisSimulator = lazy(() => import("@/components/medicine/AnamnesisSimulator").then((module) => ({ default: module.AnamnesisSimulator })));
const SemiologyAcademy = lazy(() => import("@/components/medicine/SemiologyAcademy").then((module) => ({ default: module.SemiologyAcademy })));
const InstrumentsStudio = lazy(() => import("@/components/medicine/InstrumentsStudio").then((module) => ({ default: module.InstrumentsStudio })));
const SurgerySimulator = lazy(() => import("@/components/medicine/SurgerySimulator").then((module) => ({ default: module.SurgerySimulator })));
const MedicalPathologyLab = lazy(() => import("@/components/medicine/MedicalPathologyLab").then((module) => ({ default: module.MedicalPathologyLab })));
const HistologyMicroscope = lazy(() => import("@/components/medicine/HistologyMicroscope").then((module) => ({ default: module.HistologyMicroscope })));

type MedicineSection = "home" | "atlas" | "atlas3d" | "histology" | "instruments" | "surgery" | "systems" | "pathology" | "development" | "practice" | "questions" | "review" | "semiology" | "anamnesis" | "clinic" | "plan" | "notebook" | "sources";

type MedicalNotebookContext = {
  section: MedicineSection;
  label: string;
  structureId?: string;
  summary?: string;
  image?: string;
  imageAlt?: string;
  sourceId?: string;
};

const NAV: Array<{ id: MedicineSection; label: string; Icon: typeof Activity }> = [
  { id: "home", label: "Visão geral", Icon: Activity },
  { id: "atlas", label: "Atlas", Icon: Search },
  { id: "atlas3d", label: "Corpo 3D", Icon: Rotate3D },
  { id: "histology", label: "Histologia e Sentidos", Icon: Microscope },
  { id: "instruments", label: "Instrumentos", Icon: Wrench },
  { id: "surgery", label: "Cirurgia virtual", Icon: Scissors },
  { id: "systems", label: "Sistemas", Icon: HeartPulse },
  { id: "pathology", label: "Patologia", Icon: Microscope },
  { id: "development", label: "Desenvolvimento", Icon: Baby },
  { id: "practice", label: "Identificação", Icon: Target },
  { id: "questions", label: "Questões", Icon: ClipboardCheck },
  { id: "review", label: "Central de revisão", Icon: ListChecks },
  { id: "semiology", label: "Semiologia", Icon: Stethoscope },
  { id: "anamnesis", label: "Anamnese", Icon: FileHeart },
  { id: "clinic", label: "Clínica", Icon: Stethoscope },
  { id: "plan", label: "Plano", Icon: Timer },
  { id: "notebook", label: "Caderno médico", Icon: NotebookPen },
  { id: "sources", label: "Fontes e segurança", Icon: ShieldCheck },
];

const SECTION_PATHS: Record<MedicineSection, string> = {
  home: "/medicina",
  atlas: "/medicina/anatomia/atlas",
  atlas3d: "/medicina/anatomia/3d",
  histology: "/medicina/anatomia/histologia-e-sentidos",
  systems: "/medicina/anatomia/sistemas",
  development: "/medicina/anatomia/desenvolvimento",
  pathology: "/medicina/anatomia/patologia",
  practice: "/medicina/praticar/identificacao",
  questions: "/medicina/praticar/questoes",
  review: "/medicina/praticar/revisao",
  semiology: "/medicina/clinica/semiologia",
  anamnesis: "/medicina/clinica/anamnese",
  clinic: "/medicina/clinica/casos",
  instruments: "/medicina/procedimentos/instrumentos",
  surgery: "/medicina/procedimentos/cirurgia",
  plan: "/medicina/plano",
  notebook: "/medicina/caderno",
  sources: "/medicina/fontes",
};

const SECTION_FROM_PATH = Object.fromEntries(Object.entries(SECTION_PATHS).map(([section, path]) => [path, section])) as Record<string, MedicineSection>;

const SECTION_IMAGE_WARMUPS: Partial<Record<MedicineSection, string[]>> = {
  home: ["/medicine/medicine-hero-v2.png"],
  atlas: ["/medicine/atlas/organs-anterior-v2.png", "/medicine/atlas/organs-female-anterior-v3.png"],
  atlas3d: ["/medicine/medicine-hero-v2.png"],
  histology: ["/medicine/histology/openstax/eye-external.jpg", "/medicine/histology/commons/retina-low.jpg"],
  instruments: ["/medicine/instruments/stethoscope-v1.png", "/medicine/instruments/sphygmomanometer-v1.png"],
  surgery: ["/medicine/surgery/acute-abdomen-surface-v1.png", "/medicine/surgery/acute-abdomen-anatomy-v1.png"],
  systems: ["/medicine/systems/cardiovascular-v1.png", "/medicine/systems/respiratory-v1.png"],
  pathology: ["/medicine/pathology/lungs-emphysema-comparison-v1.png"],
  development: ["/medicine/development/week-1-v1.png", "/medicine/development/weeks-2-3-v1.png"],
  practice: ["/medicine/atlas/organs-anterior-v2.png"],
  clinic: ["/medicine/clinical/meningococcal-purpura-v1.png", "/medicine/clinical/open-tibia-fracture-v1.png"],
  notebook: ["/medicine/atlas/organs-anterior-v2.png", "/medicine/systems/cardiovascular-v1.png"],
};

function warmMedicineSection(section: MedicineSection) {
  const images = preloadMedicalImages(SECTION_IMAGE_WARMUPS[section] ?? [], "high");
  const module = section === "atlas3d" ? import("@/components/medicine/Anatomy3DStudio")
    : section === "histology" ? import("@/components/medicine/HistologyMicroscope")
    : section === "instruments" ? import("@/components/medicine/InstrumentsStudio")
      : section === "surgery" ? import("@/components/medicine/SurgerySimulator")
        : section === "pathology" ? import("@/components/medicine/MedicalPathologyLab")
          : section === "semiology" ? import("@/components/medicine/SemiologyAcademy")
            : section === "anamnesis" ? import("@/components/medicine/AnamnesisSimulator")
              : Promise.resolve();
  return Promise.allSettled([images, module]);
}

const NAV_GROUPS: Array<{ id: string; label: string; Icon: typeof Activity; defaultSection: MedicineSection; items: MedicineSection[] }> = [
  { id: "overview", label: "Visão geral", Icon: Activity, defaultSection: "home", items: ["home"] },
  { id: "anatomy", label: "Anatomia", Icon: Layers, defaultSection: "atlas", items: ["atlas", "atlas3d", "histology", "systems", "development", "pathology"] },
  { id: "practice", label: "Praticar", Icon: Target, defaultSection: "practice", items: ["practice", "questions", "review"] },
  { id: "clinical", label: "Prática clínica", Icon: Stethoscope, defaultSection: "semiology", items: ["semiology", "anamnesis", "clinic"] },
  { id: "procedures", label: "Procedimentos", Icon: Wrench, defaultSection: "instruments", items: ["instruments", "surgery"] },
  { id: "notebook", label: "Caderno médico", Icon: NotebookPen, defaultSection: "notebook", items: ["notebook"] },
  { id: "sources", label: "Fontes e segurança", Icon: ShieldCheck, defaultSection: "sources", items: ["sources"] },
];

function sectionForPath(pathname: string): MedicineSection {
  const normalized = pathname.replace(/\/$/, "") || "/medicina";
  return SECTION_FROM_PATH[normalized] ?? "home";
}

function navGroupForSection(section: MedicineSection) {
  return NAV_GROUPS.find((group) => group.items.includes(section))?.id ?? "overview";
}

const levelOrder: MedicineLevel[] = ["Iniciante", "Ciclo básico", "Ciclo clínico", "Internato", "Residência"];
const beginnerPracticeIds = new Set([
  "heart", "lungs", "brain", "liver", "kidneys", "skin", "deltoid", "femur", "aorta", "scalp",
  "frontal-region", "oral-region", "vertebra-c1", "clavicle", "sternum", "rib-1", "humerus",
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

function randomPracticeStructure(pool: AnatomyStructure[], currentId?: string) {
  if (!pool.length) return null;
  const alternatives = pool.filter((structure) => structure.id !== currentId);
  const candidates = alternatives.length ? alternatives : pool;
  return candidates[Math.floor(Math.random() * candidates.length)];
}

function loadMedicineState<T>(key: string, fallback: T): T {
  try { const value = localStorage.getItem(`flora.medicine.${key}`); return value ? JSON.parse(value) as T : fallback; } catch { return fallback; }
}

function saveMedicineState(key: string, value: unknown) {
  try { localStorage.setItem(`flora.medicine.${key}`, JSON.stringify(value)); } catch { /* progresso local opcional */ }
}

function loadAtlasLayer(): BodyLayer {
  const stored = loadMedicineState<string>("atlas_layer", "organs");
  return bodyLayers.some((layer) => layer.id === stored) ? stored as BodyLayer : "organs";
}

function loadAtlasStructure() {
  const storedId = loadMedicineState<string>("atlas_structure", "heart");
  return anatomyStructures.find((item) => item.id === storedId)
    ?? anatomyStructures.find((item) => item.id === "heart")
    ?? anatomyStructures[0];
}

function escapeNotebookText(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[character] ?? character);
}

function normalizeAnswer(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR").trim();
}

export default function Medicine() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [section, setSection] = useState<MedicineSection>(() => sectionForPath(location.pathname));
  const [mobileNav, setMobileNav] = useState(false);
  const [openNavGroup, setOpenNavGroup] = useState(() => navGroupForSection(section));
  const [focusMode, setFocusMode] = useState(false);
  const [level, setLevel] = useState<MedicineLevel>(() => loadMedicineState("level", "Ciclo básico"));
  const [activeLayer, setActiveLayer] = useState<BodyLayer>(loadAtlasLayer);
  const [selectedStructure, setSelectedStructure] = useState<AnatomyStructure | null>(loadAtlasStructure);
  const [favoriteIds, setFavoriteIds] = useState<string[]>(() => loadMedicineState("favorites", []));
  const [questionIndex, setQuestionIndex] = useState(0);
  const [answer, setAnswer] = useState<number | null>(null);
  const [reviewOnly, setReviewOnly] = useState(false);
  const [answered, setAnswered] = useState<Record<string, boolean>>(() => loadMedicineState("answered", {}));
  const [wrongIds, setWrongIds] = useState<string[]>(() => loadMedicineState("wrong", []));
  const [learningState, setLearningState] = useState<MedicineLearningState>(() => parseMedicineLearningState(loadMedicineState("learning", emptyMedicineLearningState)));
  const [practiceInput, setPracticeInput] = useState("");
  const [practiceResult, setPracticeResult] = useState<"correct" | "wrong" | null>(null);
  const [practiceStructure, setPracticeStructure] = useState(() => anatomyStructures.find((item) => item.id === "heart")!);
  const [activeCaseId, setActiveCaseId] = useState(() => loadMedicineState("case_id", medicalClinicalCase.id));
  const [caseStep, setCaseStep] = useState(0);
  const [caseProgress, setCaseProgress] = useState<Record<string, number>>(() => loadMedicineState("case_steps", {}));
  const [caseReflection, setCaseReflection] = useState("");
  const [caseAnswer, setCaseAnswer] = useState<number | null>(null);
  const [sensitiveContentEnabled, setSensitiveContentEnabled] = useState(false);
  const [studyHours, setStudyHours] = useState(8);
  const [studyGoal, setStudyGoal] = useState("Dominar anatomia e fisiologia");
  const [cloudReady, setCloudReady] = useState(false);
  const [cloudSyncError, setCloudSyncError] = useState(false);
  const [resumeSection, setResumeSection] = useState<MedicineSection>(() => loadMedicineState("last_section", "home"));
  const [initial3DStructureId, setInitial3DStructureId] = useState<string | null>(null);
  const [sectionMediaReady, setSectionMediaReady] = useState(() => (SECTION_IMAGE_WARMUPS[section] ?? []).every(isMedicalImageReady));

  const levelProfile = medicineLevelProfiles[level];
  const filteredQuestions = useMemo(() => medicalQuestions.filter((item) => item.level === level), [level]);
  const practicePool = useMemo(() => practiceStructuresForLevel(level), [level]);
  const progress = medicineOverallProgress(learningState);
  const competencyProgress = useMemo(() => medicineCompetencyProgress(learningState), [learningState]);
  const pendingReviews = useMemo(() => pendingMedicineReviews(learningState), [learningState]);
  const reviewQuestions = useMemo(() => filteredQuestions.filter((item) => wrongIds.includes(item.id)), [filteredQuestions, wrongIds]);
  const activeReview = reviewOnly && reviewQuestions.length > 0;
  const sessionQuestions = activeReview ? reviewQuestions : filteredQuestions.length > 0 ? filteredQuestions : medicalQuestions;
  const currentQuestion = sessionQuestions[questionIndex % sessionQuestions.length];
  const activeClinicalCase = medicalClinicalCases.find((item) => item.id === activeCaseId) ?? medicalClinicalCase;

  useEffect(() => {
    const next = sectionForPath(location.pathname);
    setSection(next);
    setOpenNavGroup(navGroupForSection(next));
  }, [location.pathname]);

  useEffect(() => {
    let active = true;
    const images = SECTION_IMAGE_WARMUPS[section] ?? [];
    const alreadyReady = images.length === 0 || images.every(isMedicalImageReady);
    setSectionMediaReady(alreadyReady);
    void warmMedicineSection(section).then(() => { if (active) setSectionMediaReady(true); });
    return () => { active = false; };
  }, [section]);

  useEffect(() => {
    saveMedicineState("atlas_layer", activeLayer);
    if (selectedStructure) saveMedicineState("atlas_structure", selectedStructure.id);
  }, [activeLayer, selectedStructure]);

  useEffect(() => {
    if (!mobileNav) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === "Escape") setMobileNav(false); };
    window.addEventListener("keydown", closeOnEscape);
    return () => { document.body.style.overflow = previousOverflow; window.removeEventListener("keydown", closeOnEscape); };
  }, [mobileNav]);

  useEffect(() => {
    setQuestionIndex(0);
    setAnswer(null);
    setReviewOnly(false);
    setPracticeInput("");
    setPracticeResult(null);
    const randomStructure = randomPracticeStructure(practicePool);
    if (randomStructure) setPracticeStructure(randomStructure);
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
        const mergedLearning = mergeMedicineLearningStates(
          parseMedicineLearningState(loadMedicineState("learning", emptyMedicineLearningState)),
          parseMedicineLearningState(data.learning_state),
        );
        setLearningState(mergedLearning);
        saveMedicineState("learning", mergedLearning);
        if (typeof data.last_section === "string" && NAV.some((item) => item.id === data.last_section)) setResumeSection(data.last_section as MedicineSection);
        const locallySelectedCase = loadMedicineState("case_id", medicalClinicalCase.id);
        const cloudCaseSteps = data.case_progress && typeof data.case_progress === "object" && !Array.isArray(data.case_progress) ? data.case_progress as Record<string, number> : {};
        const localCaseSteps = loadMedicineState<Record<string, number>>("case_steps", {});
        const mergedCaseSteps = { ...localCaseSteps, ...cloudCaseSteps, [medicalClinicalCase.id]: cloudCaseSteps[medicalClinicalCase.id] ?? (Number(data.case_step) || 0) };
        setCaseProgress(mergedCaseSteps);
        const savedStep = mergedCaseSteps[locallySelectedCase] || 0;
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
        learning_state: learningState,
        case_progress: caseProgress,
        last_section: section === "home" ? resumeSection : section,
        content_version: "MED-2026.08.26",
      }, { onConflict: "user_id" }).then(({ error }) => setCloudSyncError(Boolean(error)));
    }, 650);
    return () => window.clearTimeout(timeout);
  }, [answered, caseProgress, caseStep, cloudReady, favoriteIds, learningState, level, resumeSection, section, studyGoal, studyHours, user, wrongIds]);

  useEffect(() => {
    setCaseProgress((current) => {
      const next = { ...current, [activeClinicalCase.id]: caseStep };
      saveMedicineState("case_steps", next);
      return next;
    });
  }, [activeClinicalCase.id, caseStep]);

  useEffect(() => {
    if (!wrongIds.length) return;
    setLearningState((current) => {
      let next = current;
      wrongIds.forEach((legacyId) => {
        const isStructure = legacyId.startsWith("structure:");
        const structureId = isStructure ? legacyId.slice("structure:".length) : "";
        const reviewId = isStructure ? legacyId : `question:${legacyId}`;
        if (next.items[reviewId]) return;
        const structure = anatomyStructures.find((item) => item.id === structureId);
        const question = medicalQuestions.find((item) => item.id === legacyId);
        next = registerMedicineAttempt(next, {
          id: reviewId,
          label: structure?.name ?? question?.prompt ?? "Atividade anterior",
          category: isStructure ? "anatomia" : "questoes",
          competency: isStructure ? "anatomia" : "fisiologia",
          sourceSection: isStructure ? "practice" : "questions",
          correct: false,
        });
      });
      if (next !== current) saveMedicineState("learning", next);
      return next;
    });
  }, [wrongIds]);

  const recordLearning = (input: { id: string; label: string; category: MedicineReviewCategory; competency: MedicineCompetency; sourceSection: MedicineSection; correct: boolean }) => {
    setLearningState((current) => {
      const next = registerMedicineAttempt(current, input);
      saveMedicineState("learning", next);
      return next;
    });
  };

  const go = (next: MedicineSection) => {
    void warmMedicineSection(next);
    if (next === "practice" && section !== "practice") {
      const randomStructure = randomPracticeStructure(practicePool, practiceStructure.id);
      if (randomStructure) setPracticeStructure(randomStructure);
      setPracticeInput("");
      setPracticeResult(null);
    }
    setSection(next);
    if (next !== "home") { setResumeSection(next); saveMedicineState("last_section", next); }
    setOpenNavGroup(navGroupForSection(next));
    setMobileNav(false);
    navigate(SECTION_PATHS[next]);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const sendToNotebook = (context: MedicalNotebookContext) => {
    saveMedicineState("notebook_context", context);
    go("notebook");
  };
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
    recordLearning({ id: `question:${currentQuestion.id}`, label: currentQuestion.prompt, category: "questoes", competency: "fisiologia", sourceSection: "questions", correct });
  };
  const selectClinicalCase = (id: string) => {
    const nextCase = medicalClinicalCases.find((item) => item.id === id);
    if (!nextCase || nextCase.id === activeClinicalCase.id) return;
    setActiveCaseId(nextCase.id);
    saveMedicineState("case_id", nextCase.id);
    setCaseStep(Math.min(caseProgress[nextCase.id] ?? 0, nextCase.steps.length));
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
          {section !== "notebook" && <button className="med-send-notebook" onPointerEnter={() => void warmMedicineSection("notebook")} onFocus={() => void warmMedicineSection("notebook")} onClick={() => navigate("/notebooks")} title="Abrir meus cadernos"><NotebookPen /><span>Abrir Caderno</span></button>}
          <div className="med-level-chip" title={levelProfile.focus}><span>Nível</span><select aria-label="Nível de estudo" value={level} onChange={(event) => updateLevel(event.target.value as MedicineLevel)}>{levelOrder.map((item) => <option key={item}>{item}</option>)}</select></div>
          <button className={`med-source-status ${cloudSyncError ? "sync-error" : ""}`} onClick={() => go("sources")} title={cloudSyncError ? "O progresso continua salvo neste dispositivo e será reenviado na próxima alteração." : undefined}><ShieldCheck /> {cloudSyncError ? "Sincronização pendente" : cloudReady ? "Progresso protegido" : "Conteúdo rastreável"}</button>
          <button className="med-menu-button" onClick={() => setMobileNav((value) => !value)} aria-label={mobileNav ? "Fechar navegação" : "Abrir navegação"} aria-expanded={mobileNav} aria-controls="medicine-navigation">{mobileNav ? <X /> : <Menu />}</button>
        </div>
      </header>

      <div className="med-shell">
        {mobileNav && <button className="med-nav-backdrop" aria-label="Fechar navegação" onClick={() => setMobileNav(false)} />}
        <aside id="medicine-navigation" className={`med-sidebar ${mobileNav ? "open" : ""}`} aria-label="Navegação da academia médica">
          <div className="med-sidebar-label">ACADEMIA MÉDICA</div>
          <nav className="med-nav-groups">
            {NAV_GROUPS.map((group) => {
              const active = group.items.includes(section);
              const expanded = openNavGroup === group.id && group.items.length > 1;
              return <div className={`med-nav-group ${active ? "active" : ""}`} key={group.id}>
                <button className="med-nav-hub" onPointerEnter={() => void warmMedicineSection(group.defaultSection)} onFocus={() => void warmMedicineSection(group.defaultSection)} onClick={() => {
                  if (group.items.length === 1) { go(group.defaultSection); return; }
                  if (!active) go(group.defaultSection);
                  else setOpenNavGroup((current) => current === group.id ? "" : group.id);
                }} aria-expanded={group.items.length > 1 ? expanded : undefined} aria-current={group.items.length === 1 && active ? "page" : undefined}>
                  <group.Icon /><span>{group.label}</span>{group.id === "practice" && pendingReviews.length > 0 && <b>{pendingReviews.length}</b>}{group.items.length > 1 && <ChevronRight className={expanded ? "expanded" : ""} />}
                </button>
                {expanded && <div className="med-nav-children">{group.items.map((itemId) => {
                  const item = NAV.find((entry) => entry.id === itemId)!;
                  return <button key={item.id} onPointerEnter={() => void warmMedicineSection(item.id)} onFocus={() => void warmMedicineSection(item.id)} onClick={() => go(item.id)} className={section === item.id ? "active" : ""} aria-current={section === item.id ? "page" : undefined}><item.Icon /><span>{item.label}</span>{item.id === "review" && pendingReviews.length > 0 && <b>{pendingReviews.length}</b>}</button>;
                })}</div>}
              </div>;
            })}
          </nav>
          <div className="med-safety-mini"><ShieldCheck /><div><strong>Uso educacional</strong><span>Não substitui supervisão, avaliação ou atendimento profissional.</span></div></div>
        </aside>

        <main className="med-main">
          {!sectionMediaReady && <div className="med-media-loading" role="status" aria-live="polite"><span><Sparkles /></span><div><strong>Preparando imagens em alta definição</strong><small>Os arquivos originais estão sendo carregados sem compressão nem redução de qualidade.</small></div></div>}
          <Suspense fallback={<div className="med-3d-route-loading"><Sparkles /><strong>Preparando o módulo…</strong><span>Carregando apenas os recursos necessários para esta atividade.</span></div>}>
          {section === "home" && <MedicineHome level={level} progress={progress} competencies={competencyProgress} wrongCount={pendingReviews.length} resumeSection={resumeSection} onGo={go} />}
          {section === "atlas" && <div className="med-section-wrap"><BodyAtlas level={level} activeLayer={activeLayer} onLayerChange={setActiveLayer} selected={selectedStructure} onSelect={setSelectedStructure} onOpen3D={(structureId) => { setInitial3DStructureId(structureId); go("atlas3d"); }} />{selectedStructure && <div className="med-atlas-actions"><button onClick={() => toggleFavorite(selectedStructure.id)}>{favoriteIds.includes(selectedStructure.id) ? <Check /> : <BookOpen />}{favoriteIds.includes(selectedStructure.id) ? "Salva para revisão" : "Salvar para revisão"}</button><button onClick={() => go("questions")}><ListChecks /> Questões relacionadas</button><button onClick={() => go("pathology")}><Microscope /> Comparar alterações</button><button onClick={() => sendToNotebook({ section: "atlas", label: selectedStructure.name, structureId: selectedStructure.id })}><NotebookPen /> Enviar ao Caderno</button><button onClick={() => toast.info("A Flora deve explicar apenas com base nas fontes exibidas nesta estrutura.")}><Sparkles /> Explicar com a Flora</button></div>}</div>}
          {section === "atlas3d" && <Suspense fallback={<div className="med-3d-route-loading"><Rotate3D /><strong>Carregando o ambiente tridimensional…</strong><span>Preparando iluminação, câmera e estruturas.</span></div>}><Anatomy3DStudio level={level} initialStructureId={initial3DStructureId} /></Suspense>}
          {section === "histology" && <Suspense fallback={<div className="med-3d-route-loading"><Microscope /><strong>Preparando o laboratório visual…</strong><span>Carregando as imagens licenciadas sem reduzir a resolução.</span></div>}><HistologyMicroscope level={level} onLearningEvent={(event) => recordLearning({ ...event, category: "histologia", competency: "fisiologia", sourceSection: "histology" })} onOpenNotebook={(context) => sendToNotebook({ section: "histology", ...context })} /></Suspense>}
          {section === "instruments" && <InstrumentsStudio level={level} onLearningEvent={(event) => recordLearning({ ...event, category: "instrumentos", competency: "instrumentos", sourceSection: "instruments" })} onOpenSurgery={(instrumentId) => { saveMedicineState("surgery_instrument", instrumentId); go("surgery"); }} />}
          {section === "surgery" && <SurgerySimulator level={level} initialInstrumentId={loadMedicineState("surgery_instrument", null)} onLearningEvent={(event) => recordLearning({ ...event, category: "cirurgia", competency: "seguranca", sourceSection: "surgery" })} onOpenInstruments={() => go("instruments")} />}
          {section === "systems" && <SystemsSection level={level} onOpenAtlas={(layer, structure) => { setActiveLayer(layer); if (structure) setSelectedStructure(structure); go("atlas"); }} onOpen3D={(structure) => { setInitial3DStructureId(structure.id); go("atlas3d"); }} onOpenQuestions={() => go("questions")} onOpenNotebook={(context) => sendToNotebook({ section: "systems", ...context })} onLearningEvent={(event) => recordLearning({ ...event, category: "questoes", competency: "fisiologia", sourceSection: "systems" })} />}
          {section === "pathology" && <MedicalPathologyLab onOpenNotebook={(context) => sendToNotebook({ section: "pathology", ...context })} onLearningEvent={(event) => recordLearning({ ...event, category: "patologia", competency: "raciocinio-clinico", sourceSection: "pathology" })} />}
          {section === "development" && <DevelopmentSection onOpenNotebook={(context) => sendToNotebook({ section: "development", ...context })} onLearningEvent={(event) => recordLearning({ ...event, category: "desenvolvimento", competency: "fisiologia", sourceSection: "development" })} />}
          {section === "practice" && <PracticeSection level={level} structure={practiceStructure} input={practiceInput} result={practiceResult} onInput={setPracticeInput} onSubmit={() => {
            const normalized = normalizeAnswer(practiceInput);
            const acceptedNames = [...practiceStructure.synonyms, practiceStructure.name, practiceStructure.latin ?? ""].map(normalizeAnswer);
            const correct = acceptedNames.includes(normalized);
            setPracticeResult(correct ? "correct" : "wrong");
            const reviewId = `structure:${practiceStructure.id}`;
            const next = correct ? wrongIds.filter((id) => id !== reviewId) : Array.from(new Set([...wrongIds, reviewId]));
            setWrongIds(next); saveMedicineState("wrong", next);
            recordLearning({ id: reviewId, label: practiceStructure.name, category: "anatomia", competency: "anatomia", sourceSection: "practice", correct });
          }} onNext={() => { const randomStructure = randomPracticeStructure(practicePool, practiceStructure.id); if (randomStructure) setPracticeStructure(randomStructure); setPracticeInput(""); setPracticeResult(null); }} />}
          {section === "questions" && <QuestionsSection level={level} question={currentQuestion} index={questionIndex % sessionQuestions.length} total={sessionQuestions.length} answer={answer} wrongCount={reviewQuestions.length} reviewOnly={activeReview} onToggleReview={() => { if (!reviewQuestions.length) { toast.info("Quando você errar uma questão deste nível, ela aparecerá aqui para revisão."); return; } setReviewOnly((value) => !value); setQuestionIndex(0); setAnswer(null); }} onAnswer={submitAnswer} onNext={() => { setQuestionIndex((value) => value + 1); setAnswer(null); }} />}
          {section === "review" && <ReviewCenterSection items={pendingReviews} competencies={competencyProgress} onOpen={(next) => go(next)} />}
          {section === "semiology" && <SemiologyAcademy level={level} onNavigate={go} onLearningEvent={(event) => recordLearning({ ...event, category: "semiologia", competency: "semiologia", sourceSection: "semiology" })} />}
          {section === "anamnesis" && <AnamnesisSimulator level={level} onLearningEvent={(event) => recordLearning({ ...event, category: "anamnese", competency: "raciocinio-clinico", sourceSection: "anamnesis" })} />}
          {section === "clinic" && <ClinicalSection level={level} clinicalCase={activeClinicalCase} cases={medicalClinicalCases} sensitiveContentEnabled={sensitiveContentEnabled} step={caseStep} reflection={caseReflection} answer={caseAnswer} onSelectCase={selectClinicalCase} onToggleSensitive={() => setSensitiveContentEnabled((value) => !value)} onReflection={setCaseReflection} onAnswer={setCaseAnswer} onNext={() => {
            if (caseAnswer === null) { toast.info("Escolha uma resposta antes de avançar."); return; }
            if (caseReflection.trim().length < 40) { toast.info("Desenvolva a justificativa em pelo menos 40 caracteres."); return; }
            const finishing = caseStep === activeClinicalCase.steps.length - 1;
            const activeStep = activeClinicalCase.steps[caseStep];
            recordLearning({ id: `clinical:${activeClinicalCase.id}:${activeStep.id}`, label: `${activeClinicalCase.title} · ${activeStep.label}`, category: "clinica", competency: "raciocinio-clinico", sourceSection: "clinic", correct: caseAnswer === activeStep.answer });
            setCaseStep((value) => Math.min(value + 1, activeClinicalCase.steps.length));
            setCaseAnswer(null);
            setCaseReflection("");
            if (finishing) toast.success("Caso clínico concluído", { description: "A síntese final foi liberada para revisão." });
          }} onRestart={() => { setCaseStep(0); setCaseAnswer(null); setCaseReflection(""); toast.success("Caso reiniciado."); }} />}
          {section === "plan" && <StudyPlanSection level={level} hours={studyHours} goal={studyGoal} onHours={setStudyHours} onGoal={setStudyGoal} onStart={() => { saveMedicineState("plan", { level, studyHours, studyGoal, createdAt: Date.now() }); toast.success("Plano médico salvo neste dispositivo."); }} />}
          {section === "notebook" && <NotebookSection navigate={navigate} />}
          {section === "sources" && <SourcesSection />}
          </Suspense>
        </main>
      </div>
    </div>
  );
}

function MedicineHome({ level, progress, competencies, wrongCount, resumeSection, onGo }: { level: MedicineLevel; progress: number; competencies: ReturnType<typeof medicineCompetencyProgress>; wrongCount: number; resumeSection: MedicineSection; onGo: (id: MedicineSection) => void }) {
  const profile = medicineLevelProfiles[level];
  return <div className="med-home">
    <section className="med-hero"><img src="/medicine/medicine-hero-v2.png" alt="Modelo anatômico educacional translúcido com coração, cérebro, vasos e nervos" decoding="async" /><div className="med-hero-overlay"/><div className="med-hero-content"><span className="med-kicker"><ShieldCheck /> Conteúdo educacional com fontes</span><div className="med-home-level"><span>{level}</span><strong>{profile.title}</strong></div><h1>Entenda o corpo.<br/><em>Construa raciocínio.</em></h1><p>{profile.homeDescription}</p><div className="med-hero-actions"><button onClick={() => onGo("atlas")}><Play /> Explorar o corpo</button>{resumeSection !== "home" && <button onClick={() => onGo(resumeSection)}>Continuar em {NAV.find((item) => item.id === resumeSection)?.label} <ArrowRight /></button>}<button onClick={() => onGo("plan")}>Montar meu plano <ArrowRight /></button></div><small>Foco deste nível: {profile.focus}</small></div></section>
    <section className="med-command-grid">
      <button className="primary" onClick={() => onGo("atlas")}><span><Search /></span><div><small>EXPLORAR</small><h3>Atlas por camadas</h3><p>Pele, músculos, esqueleto, vasos, nervos e órgãos.</p></div><ChevronRight /></button>
      <button onClick={() => onGo("practice")}><span><Target /></span><div><small>PRATICAR</small><h3>Identificação ativa</h3><p>Nomeie estruturas e transforme erros em revisão.</p></div><ChevronRight /></button>
      <button onClick={() => onGo("semiology")}><span><Stethoscope /></span><div><small>COMEÇAR MEDICINA</small><h3>Semiologia guiada</h3><p>Conversa, exame, sinais vitais, raciocínio e SOAP.</p></div><ChevronRight /></button>
      <button onClick={() => onGo("pathology")}><span><Microscope /></span><div><small>COMPARAR</small><h3>Anatomia e patologia</h3><p>Veja o saudável, explore a alteração e teste o mecanismo.</p></div><ChevronRight /></button>
    </section>
    <section className="med-progress-row"><div><span className="med-eyebrow">Seu percurso</span><h2>Aprendizado longitudinal</h2></div><button className="med-progress-card" onClick={() => onGo("review")}><div className="ring" style={{ "--progress": `${progress * 3.6}deg` } as CSSProperties}><strong>{progress}%</strong></div><div><strong>Domínio geral em {level}</strong><span>{wrongCount ? `${wrongCount} item(ns) aguardando revisão` : "Nenhum erro pendente"}</span></div></button><button className="med-progress-card" onClick={() => onGo("plan")}><Brain /><div><strong>{profile.title}</strong><span>{profile.cycle.slice(0, 4).join(" → ")}</span></div></button></section>
    <section className="med-competency-overview"><header><div><span className="med-eyebrow">COMPETÊNCIAS</span><h2>O que forma seu domínio</h2></div><button onClick={() => onGo("review")}>Abrir revisão <ArrowRight /></button></header><div>{competencies.map((item) => <article key={item.competency}><span><strong>{item.label}</strong><b>{item.score}%</b></span><div><i style={{ width: `${item.score}%` }} /></div><small>{item.activities ? `${item.activities} atividade(s) registrada(s)` : "Ainda sem atividade registrada"}</small></article>)}</div></section>
    <section className="med-systems-preview"><div className="med-section-heading"><div><span className="med-eyebrow">Anatomia e fisiologia</span><h2>Sistemas do corpo</h2></div><button onClick={() => onGo("systems")}>Ver todos <ArrowRight /></button></div><div className="med-system-mini-grid">{medicalSystems.slice(0, 4).map((system) => <button key={system.id} onClick={() => onGo("systems")} style={{ "--system": system.color } as CSSProperties}><span>{system.name.slice(0, 2).toUpperCase()}</span><strong>{system.name}</strong><small>{system.description}</small></button>)}</div></section>
  </div>;
}

function ReviewCenterSection({ items, competencies, onOpen }: { items: ReturnType<typeof pendingMedicineReviews>; competencies: ReturnType<typeof medicineCompetencyProgress>; onOpen: (section: MedicineSection) => void }) {
  const grouped = (Object.keys(medicineReviewCategoryLabels) as MedicineReviewCategory[]).map((category) => ({
    category,
    label: medicineReviewCategoryLabels[category],
    items: items.filter((item) => item.category === category),
  })).filter((group) => group.items.length > 0);

  return <div className="med-page med-review-center">
    <PageHeading eyebrow="Revisão longitudinal" title="Central de revisão" description="Todos os erros da academia entram aqui: anatomia, questões, instrumentos, semiologia, anamnese, clínica e cirurgia." />
    <section className="med-review-summary"><div><ListChecks /><span><strong>{items.length}</strong><small>itens pendentes</small></span></div>{competencies.map((item) => <article key={item.competency}><span>{item.label}</span><strong>{item.score}%</strong><div><i style={{ width: `${item.score}%` }} /></div></article>)}</section>
    {!items.length ? <section className="med-review-empty"><Check /><h2>Nenhuma revisão pendente</h2><p>Continue praticando. Um erro em qualquer módulo aparecerá aqui automaticamente.</p><button onClick={() => onOpen("practice")}>Praticar identificação <ArrowRight /></button></section> : <div className="med-review-groups">{grouped.map((group) => <section key={group.category}><header><div><span>{group.label}</span><strong>{group.items.length}</strong></div><button onClick={() => onOpen(group.items[0].sourceSection as MedicineSection)}>Abrir módulo <ArrowRight /></button></header><div>{group.items.map((item) => <article key={item.id}><span><AlertTriangle /></span><div><strong>{item.label}</strong><small>{item.attempts} tentativa(s) · último estudo em {new Date(item.lastAttemptAt).toLocaleDateString("pt-BR")}</small></div><button onClick={() => onOpen(item.sourceSection as MedicineSection)}>Revisar <ChevronRight /></button></article>)}</div></section>)}</div>}
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

function SystemsSection({ level, onOpenAtlas, onOpen3D, onOpenQuestions, onOpenNotebook, onLearningEvent }: {
  level: MedicineLevel;
  onOpenAtlas: (layer: BodyLayer, structure?: AnatomyStructure) => void;
  onOpen3D: (structure: AnatomyStructure) => void;
  onOpenQuestions: () => void;
  onOpenNotebook: (context: Omit<MedicalNotebookContext, "section">) => void;
  onLearningEvent: (event: { id: string; label: string; correct: boolean }) => void;
}) {
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

  useEffect(() => {
    const selectedIndex = medicalSystems.findIndex((system) => system.id === selected.id);
    const nextSystem = medicalSystems[(selectedIndex + 1) % medicalSystems.length];
    const anatomyPreview = activeStructure ? atlasImageForStructure(activeStructure, structureView) : null;
    void preloadMedicalImages([selected.image, nextSystem?.image, anatomyPreview], "high");
  }, [activeStructure, selected, structureView]);

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
            <div className="med-system-hero-actions"><button onClick={() => setTab("structures")}><ZoomIn /> Explorar de perto</button><button onClick={() => setTab("practice")}>Testar agora <ArrowRight /></button><button onClick={() => onOpenNotebook({ label: `Sistema ${selected.name}`, summary: selected.description, image: selected.image, imageAlt: `Ilustração educacional do sistema ${selected.name}`, sourceId: selected.sourceId })}><NotebookPen /> Enviar ao Caderno</button></div>
          </div>
          <div className="med-system-visual med-system-hero-visual"><img key={selected.image} src={selected.image} alt={`Ilustração educacional do sistema ${selected.name}`} decoding="async" /><span>Modelo educacional · não diagnóstico</span></div>
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
                <img key={`${activeStructure.layer}-${structureView}`} src={atlasImageForStructure(activeStructure, structureView)} alt={`Localização anatômica de ${activeStructure.name}`} decoding="async" style={{ height: "280%", left: "50%", top: "50%", transform: `translate(-${structurePosition.x}%, -${structurePosition.y}%)` }} />
                <i /><div><strong>{activeStructure.name}</strong><span>{activeStructure.region} · vista {structureView}</span></div>
              </div>
              <div className="med-system-structure-copy"><span className="med-eyebrow">{bodyLayers.find((layer) => layer.id === activeStructure.layer)?.label}</span><h3>{activeStructure.name}</h3>{activeStructure.latin && <em>{activeStructure.latin}</em>}<p>{activeStructure.summary}</p><dl><div><dt>Função</dt><dd>{activeStructure.function}</dd></div><div><dt>Relações</dt><dd>{activeStructure.relations}</dd></div></dl><div className="med-system-structure-actions"><button onClick={() => onOpenAtlas(activeStructure.layer, activeStructure)}>Abrir no atlas <ArrowRight /></button><button onClick={() => onOpen3D(activeStructure)}><Rotate3D /> Girar em 3D</button><button onClick={() => onOpenNotebook({ label: activeStructure.name, structureId: activeStructure.id })}><NotebookPen /> Caderno</button></div></div>
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
              <div className="med-options">{currentQuestion.options.map((option, optionIndex) => { const state = systemAnswer === null ? "" : optionIndex === currentQuestion.answer ? "correct" : optionIndex === systemAnswer ? "wrong" : "muted"; return <button key={option} className={state} onClick={() => { if (systemAnswer !== null) return; setSystemAnswer(optionIndex); onLearningEvent({ id: `system:${currentQuestion.id}`, label: `${selected.name} · ${currentQuestion.prompt}`, correct: optionIndex === currentQuestion.answer }); }}><b>{String.fromCharCode(65 + optionIndex)}</b><span>{option}</span>{state === "correct" && <Check />}{state === "wrong" && <X />}</button>; })}</div>
              {systemAnswer !== null && <div className="med-explanation"><Sparkles /><div><strong>{systemAnswer === currentQuestion.answer ? "Resposta correta" : "Revise este mecanismo"}</strong><p>{currentQuestion.explanation}</p><a href={medicalSources[currentQuestion.sourceId].url} target="_blank" rel="noreferrer">Conferir fonte <ExternalLink /></a></div></div>}
              <footer><span>Questão {questionIndex % systemQuestions.length + 1} de {systemQuestions.length}</span><div><button onClick={onOpenQuestions}>Abrir banco completo</button><button disabled={systemAnswer === null} onClick={nextQuestion}>Próxima <ArrowRight /></button></div></footer>
            </article> : <div className="med-system-no-results">Ainda não há questão vinculada a este sistema.</div>}
          </section>}
        </div>
      </article>
    </div>
  </div>;
}

type DevelopmentCinematicShot = { x: number; y: number; zoom: number };

const developmentCinematicShots: Record<string, DevelopmentCinematicShot[]> = {
  fertilization: [
    { x: .11, y: .54, zoom: 1.7 },
    { x: .47, y: .53, zoom: 1.55 },
    { x: .86, y: .53, zoom: 1.52 },
  ],
  implantation: [{ x: .36, y: .48, zoom: 1.38 }, { x: .52, y: .5, zoom: 1.48 }, { x: .68, y: .5, zoom: 1.42 }],
  embryonic: [{ x: .35, y: .48, zoom: 1.35 }, { x: .5, y: .48, zoom: 1.5 }, { x: .66, y: .48, zoom: 1.38 }],
  fetal: [{ x: .44, y: .45, zoom: 1.18 }, { x: .54, y: .5, zoom: 1.34 }, { x: .48, y: .6, zoom: 1.22 }],
};

function developmentCinematicShot(stageId: string, milestone: number): DevelopmentCinematicShot {
  const shots = developmentCinematicShots[stageId] ?? [
    { x: .48, y: .42, zoom: 1.08 },
    { x: .54, y: .52, zoom: 1.18 },
    { x: .48, y: .6, zoom: 1.1 },
  ];
  return shots[milestone % shots.length];
}

function DevelopmentSection({ onOpenNotebook, onLearningEvent }: {
  onOpenNotebook: (context: Omit<MedicalNotebookContext, "section">) => void;
  onLearningEvent: (event: { id: string; label: string; correct: boolean }) => void;
}) {
  const [active, setActive] = useState(0);
  const [activeMilestone, setActiveMilestone] = useState(0);
  const [immersive, setImmersive] = useState(false);
  const [autoPlay, setAutoPlay] = useState(false);
  const [compare, setCompare] = useState(false);
  const [visualZoom, setVisualZoom] = useState(1);
  const [visualPan, setVisualPan] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const dragRef = useRef<{ pointerId: number; x: number; y: number } | null>(null);
  const heroImageRef = useRef<HTMLDivElement>(null);
  const stage = embryologyTimeline[active];
  const previousStage = embryologyTimeline[Math.max(0, active - 1)];
  const source = medicalSources[stage.sourceId];
  const progress = ((active + 1) / embryologyTimeline.length) * 100;
  const selectStage = (index: number) => setActive(Math.min(Math.max(index, 0), embryologyTimeline.length - 1));

  useEffect(() => {
    const nextStage = embryologyTimeline[Math.min(active + 1, embryologyTimeline.length - 1)];
    void preloadMedicalImages([previousStage.image, stage.image, nextStage.image], "high");
  }, [active, previousStage.image, stage.image]);

  useEffect(() => {
    setActiveMilestone(0);
    setVisualZoom(1);
    setVisualPan({ x: 0, y: 0 });
    setCompare(false);
  }, [active]);

  useEffect(() => {
    if (!autoPlay) return;
    const timer = window.setTimeout(() => {
      if (activeMilestone < stage.milestones.length - 1) {
        setActiveMilestone((current) => current + 1);
        return;
      }
      if (active === embryologyTimeline.length - 1) {
        setAutoPlay(false);
        return;
      }
      setActive((current) => current + 1);
    }, immersive ? 3200 : 3900);
    return () => window.clearTimeout(timer);
  }, [active, activeMilestone, autoPlay, immersive, stage.milestones.length]);

  useEffect(() => {
    if (!autoPlay || compare) return;
    const frame = window.requestAnimationFrame(() => {
      const shot = developmentCinematicShot(stage.id, activeMilestone);
      const width = heroImageRef.current?.clientWidth ?? 760;
      const height = heroImageRef.current?.clientHeight ?? 560;
      setVisualZoom(shot.zoom);
      setVisualPan({ x: (.5 - shot.x) * width, y: (.5 - shot.y) * height });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [activeMilestone, autoPlay, compare, stage.id]);

  useEffect(() => {
    if (!immersive) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.target as HTMLElement)?.closest("input, textarea, select")) return;
      if (event.key === "Escape") setImmersive(false);
      if (event.key === "ArrowRight") { event.preventDefault(); selectStage(active + 1); }
      if (event.key === "ArrowLeft") { event.preventDefault(); selectStage(active - 1); }
      if (event.code === "Space") { event.preventDefault(); setAutoPlay((value) => !value); }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [active, immersive]);

  const changeZoom = (delta: number) => setVisualZoom((current) => Math.min(2.6, Math.max(1, Number((current + delta).toFixed(1)))));
  const resetView = () => { setVisualZoom(1); setVisualPan({ x: 0, y: 0 }); };
  const toggleJourney = () => {
    if (autoPlay) {
      setAutoPlay(false);
      return;
    }
    if (active === embryologyTimeline.length - 1 && activeMilestone === stage.milestones.length - 1) {
      setActive(0);
      setActiveMilestone(0);
    }
    setAutoPlay(true);
  };
  const openImmersiveJourney = () => { setImmersive(true); setAutoPlay(true); setCompare(false); };

  return <div className="med-page med-development-page">
    <PageHeading eyebrow="Embriologia e desenvolvimento humano" title="Da fecundação ao envelhecimento" description="Acompanhe cada transformação como uma jornada visual contínua: união dos gametas, divisões celulares, crescimento, nascimento, maturação e envelhecimento." />

    <div className="med-development-safety"><ShieldCheck /><div><strong>Guia educacional com fontes por etapa</strong><span>Faixas etárias são didáticas e o desenvolvimento apresenta variações individuais. As imagens ajudam na orientação visual, mas não são fonte anatômica nem material diagnóstico.</span></div></div>

    <nav className="med-development-ribbon" aria-label="Etapas do desenvolvimento humano">
      {embryologyTimeline.map((item, index) => <button key={item.id} className={active === index ? "active" : ""} onClick={() => selectStage(index)} aria-current={active === index ? "step" : undefined}>
        <span>{String(index + 1).padStart(2, "0")}</span>
        <div><small>{item.phase} · {item.period}</small><strong>{item.title}</strong></div>
      </button>)}
    </nav>

    <article className={`med-development-hero ${immersive ? "immersive" : ""}`} aria-label={`Exploração imersiva: ${stage.title}`}>
      {immersive && <header className="med-development-immersive-header">
        <div><Baby /><span><small>JORNADA IMERSIVA</small><strong>Desenvolvimento humano</strong></span></div>
        <div><span>← → mudar fase</span><span>espaço reproduzir</span><button onClick={() => setImmersive(false)} aria-label="Sair do modo imersivo"><Minimize2 /></button></div>
      </header>}
      <div
        ref={heroImageRef}
        className={`med-development-hero-image ${dragging ? "dragging" : ""} ${compare ? "comparing" : ""} ${autoPlay ? "cinematic-playing" : ""}`}
        onPointerDown={(event) => {
          if (compare || (event.target as HTMLElement).closest("button")) return;
          if (autoPlay) setAutoPlay(false);
          dragRef.current = { pointerId: event.pointerId, x: event.clientX, y: event.clientY };
          event.currentTarget.setPointerCapture(event.pointerId);
          setDragging(true);
        }}
        onPointerMove={(event) => {
          if (!dragRef.current || dragRef.current.pointerId !== event.pointerId) return;
          const dx = event.clientX - dragRef.current.x;
          const dy = event.clientY - dragRef.current.y;
          dragRef.current = { pointerId: event.pointerId, x: event.clientX, y: event.clientY };
          setVisualPan((current) => ({ x: current.x + dx, y: current.y + dy }));
        }}
        onPointerUp={(event) => {
          if (dragRef.current?.pointerId === event.pointerId) dragRef.current = null;
          setDragging(false);
        }}
        onPointerCancel={() => { dragRef.current = null; setDragging(false); }}
        onWheel={(event) => { if (!compare) { if (autoPlay) setAutoPlay(false); changeZoom(event.deltaY < 0 ? .1 : -.1); } }}
      >
        {compare ? <div className="med-development-compare">
          <figure><img src={previousStage.image} alt={previousStage.imageAlt} /><figcaption><small>ANTES</small><strong>{previousStage.period}</strong><span>{previousStage.title}</span></figcaption></figure>
          <i><ArrowRight /></i>
          <figure><img src={stage.image} alt={stage.imageAlt} /><figcaption><small>AGORA</small><strong>{stage.period}</strong><span>{stage.title}</span></figcaption></figure>
        </div> : <>
          <div className="med-development-image-backdrop" style={{ backgroundImage: `url(${stage.image})` }} aria-hidden="true" />
          <div className="med-development-image-canvas" style={{ transform: `translate3d(${visualPan.x}px, ${visualPan.y}px, 0) scale(${visualZoom})` }}>
            <img key={stage.image} src={stage.image} alt={stage.imageAlt} decoding="async" draggable={false} />
          </div>
        </>}
        <div className="med-development-visual-controls">
          <button onClick={() => changeZoom(-.2)} disabled={compare || visualZoom <= 1} aria-label="Afastar"><ZoomOut /></button>
          <span>{Math.round(visualZoom * 100)}%</span>
          <button onClick={() => changeZoom(.2)} disabled={compare || visualZoom >= 2.6} aria-label="Aproximar"><ZoomIn /></button>
          <button onClick={resetView} disabled={compare || (visualZoom === 1 && visualPan.x === 0 && visualPan.y === 0)} aria-label="Centralizar"><RotateCcw /></button>
          <button onClick={() => immersive ? setImmersive(false) : openImmersiveJourney()} aria-label={immersive ? "Sair da tela imersiva" : "Abrir jornada imersiva"}>{immersive ? <Minimize2 /> : <Maximize2 />}</button>
        </div>
        <span>Imagem educacional · não diagnóstica</span>
        <div className="med-development-image-index">ETAPA {active + 1} / {embryologyTimeline.length}</div>
        {autoPlay && <div className="med-development-cinematic-status"><span><Play /> EM REPRODUÇÃO</span><strong>{stage.milestones[activeMilestone]}</strong><i><b style={{ width: `${((activeMilestone + 1) / stage.milestones.length) * 100}%` }} /></i></div>}
        <div className="med-development-discovery">
          <div><small>MARCO {activeMilestone + 1} DE {stage.milestones.length}</small><strong>{stage.milestones[activeMilestone]}</strong></div>
          <nav aria-label="Marcos desta fase">{stage.milestones.map((milestone, index) => <button key={milestone} className={activeMilestone === index ? "active" : ""} onClick={() => setActiveMilestone(index)} aria-label={`Mostrar marco ${index + 1}`} />)}</nav>
        </div>
      </div>
      <div className="med-development-hero-copy">
        <div className="med-development-journey-progress"><i style={{ width: `${progress}%` }} /></div>
        <div className="med-development-phase"><Baby /><span>{stage.phase}</span><i /> <span>{stage.period}</span></div>
        <h2>{stage.title}</h2>
        <p>{stage.detail}</p>
        <div className="med-development-experience-actions">
          <button className={`journey-primary ${autoPlay ? "active" : ""}`} onClick={toggleJourney}>{autoPlay ? <Pause /> : <Play />}{autoPlay ? "Pausar jornada" : "Reproduzir jornada"}</button>
          <button className={compare ? "active" : ""} disabled={active === 0} onClick={() => setCompare((value) => !value)}><Layers />{compare ? "Voltar à imagem" : "Comparar anterior"}</button>
          <button onClick={() => immersive ? setImmersive(false) : openImmersiveJourney()}>{immersive ? <Minimize2 /> : <Maximize2 />}{immersive ? "Sair do modo imersivo" : "Assistir em modo imersivo"}</button>
        </div>
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
      <footer className="med-development-study-actions"><button onClick={() => { onLearningEvent({ id: `development:${stage.id}`, label: stage.title, correct: true }); toast.success("Fase registrada no seu progresso."); }}><Check /> Marcar fase como estudada</button><button onClick={() => onOpenNotebook({ label: stage.title, summary: stage.detail, image: stage.image, imageAlt: stage.imageAlt, sourceId: stage.sourceId })}><NotebookPen /> Enviar fase ao Caderno</button></footer>
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
  const modelImage = atlasImageForStructure(structure, modelView);
  const markerPosition = anatomyPositionFor(structure, modelView) ?? { x: structure.x, y: structure.y };
  const [visualZoom, setVisualZoom] = useState(2.2);
  const [visualPan, setVisualPan] = useState({ x: 0, y: 0 });
  const [panning, setPanning] = useState(false);
  const [clueRevealed, setClueRevealed] = useState(false);
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
    setClueRevealed(false);
    void preloadMedicalImages([modelImage], "high");
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
  }, [markerPosition.x, markerPosition.y, modelImage, structure.id]);

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
        <div ref={modelRef} className="med-practice-model" style={{ transform: `translate3d(${visualPan.x}px, ${visualPan.y}px, 0) scale(${visualZoom})` }}><img key={`${structure.layer}-${modelView}`} src={modelImage} alt={`Modelo anatômico educacional em vista ${modelView}`} decoding="async" draggable={false} /><i style={{ left: `${markerPosition.x}%`, top: `${markerPosition.y}%` } as CSSProperties}/></div>
      </div>
      <div className="med-practice-drag-help">Arraste para navegar · roda para aproximar</div><span>MODELO ANATÔMICO EM ALTA DEFINIÇÃO</span><small>Ilustração educacional · não diagnóstica</small></div><div className="med-practice-prompt"><span className="med-eyebrow">{eyebrow}</span><h2>Qual é esta estrutura?</h2>{result ? <p>{structure.summary}</p> : <button type="button" className={`med-practice-clue ${clueRevealed ? "revealed" : ""}`} onClick={() => setClueRevealed(true)} aria-expanded={clueRevealed}><span>{clue}</span><b>{clueRevealed ? <><EyeOff /> Dica revelada</> : <><Eye /> Revelar dica</>}</b></button>}<div className="med-answer-box"><input value={input} onChange={(event) => onInput(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") onSubmit(); }} placeholder="Digite o nome da estrutura" disabled={result !== null}/>{result === null ? <button onClick={onSubmit}>Responder</button> : <button onClick={onNext}>Próxima <ArrowRight /></button>}</div>{result && <div className={`med-feedback ${result}`}><span>{result === "correct" ? <Check /> : <X />}</span><div><strong>{result === "correct" ? "Resposta correta" : `Resposta: ${structure.name}`}</strong><p><b>Função:</b> {structure.function}</p><p><b>Próximas:</b> {structure.nearby.length ? structure.nearby.join(", ") : "consulte a fonte anatômica"}</p></div></div>}</div></div>
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

  useEffect(() => {
    const currentIndex = cases.findIndex((item) => item.id === clinicalCase.id);
    const nextCase = cases[(currentIndex + 1) % cases.length];
    void preloadMedicalImages([clinicalCase.visual?.image, nextCase?.visual?.image], "high");
  }, [cases, clinicalCase]);

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
          <img src={clinicalCase.visual.image} alt={sensitiveContentEnabled || !clinicalCase.sensitive ? clinicalCase.visual.alt : "Conteúdo clínico sensível ocultado"} decoding="async" />
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
  return <div className="med-page"><PageHeading eyebrow={`Plano adaptativo · ${level}`} title="Seu ciclo médico" description={`${profile.title}: ${profile.focus}. A distribuição é educacional e não substitui o currículo da instituição.`} /><div className="med-plan-grid"><section><label>Objetivo principal<input value={goal} onChange={(event) => onGoal(event.target.value)} /></label><label>Horas disponíveis por semana<div className="med-range"><input type="range" min="2" max="40" value={hours} onChange={(event) => onHours(Number(event.target.value))}/><strong>{hours}h</strong></div></label><label>Nível atual<div className="med-static-field">{level} · {profile.title}</div></label><button onClick={onStart}>Salvar meu plano <Check /></button></section><article><span className="med-eyebrow">CICLO RECOMENDADO PARA {level}</span><h2>{cycle.length} {cycle.length === 1 ? "bloco" : "blocos"} por semana</h2><div className="med-cycle">{cycle.map((item, index) => <div key={item}><span>{index + 1}</span><div><strong>{item}</strong><small>{Math.max(20, Math.round((hours * 60) / cycle.length))} min sugeridos</small></div></div>)}</div></article></div>
  </div>;
}

function NotebookSection({ navigate }: { navigate: ReturnType<typeof useNavigate> }) {
  const { user } = useAuth();
  const [creatingId, setCreatingId] = useState<string | null>(null);
  const [incomingContext, setIncomingContext] = useState(() => loadMedicineState<MedicalNotebookContext | null>("notebook_context", null));
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
    const contextStructure = incomingContext?.structureId ? anatomyStructures.find((item) => item.id === incomingContext.structureId) : undefined;
    const contextSource = contextStructure
      ? medicalSources[contextStructure.sourceId]
      : incomingContext?.sourceId ? medicalSources[incomingContext.sourceId] : undefined;
    const contextImage = incomingContext?.image?.startsWith("/medicine/") ? incomingContext.image : undefined;
    const contextPage = incomingContext ? [{
      title: incomingContext.label,
      purpose: "Conteúdo selecionado na academia médica",
      paper: "blank" as const,
      html: contextStructure ? `
        <h1>${escapeNotebookText(contextStructure.name)}</h1>
        ${contextStructure.latin ? `<p><em>${escapeNotebookText(contextStructure.latin)}</em></p>` : ""}
        <p><strong>Região:</strong> ${escapeNotebookText(contextStructure.region)} · <strong>Sistema:</strong> ${escapeNotebookText(contextStructure.system)}</p>
        <img src="${atlasImageForStructure(contextStructure)}" alt="Localização anatômica de ${escapeNotebookText(contextStructure.name)}" />
        <h2>Visão geral</h2><p>${escapeNotebookText(contextStructure.summary)}</p>
        <h2>Função</h2><p>${escapeNotebookText(contextStructure.function)}</p>
        <h2>Relações anatômicas</h2><p>${escapeNotebookText(contextStructure.relations)}</p>
        <h2>Estruturas próximas</h2><ul>${contextStructure.nearby.map((item) => `<li>${escapeNotebookText(item)}</li>`).join("")}</ul>
        ${contextSource ? `<blockquote><strong>Fonte para conferência:</strong> ${escapeNotebookText(contextSource.title)} — ${escapeNotebookText(contextSource.organization)}</blockquote>` : ""}
        <h2>Minhas anotações</h2><p><br><br><br></p>
      ` : `
        <h1>${escapeNotebookText(incomingContext.label)}</h1>
        <p><strong>Origem:</strong> ${escapeNotebookText(NAV.find((item) => item.id === incomingContext.section)?.label ?? incomingContext.section)}</p>
        ${contextImage ? `<img src="${escapeNotebookText(contextImage)}" alt="${escapeNotebookText(incomingContext.imageAlt ?? incomingContext.label)}" />` : ""}
        ${incomingContext.summary ? `<h2>Visão geral</h2><p>${escapeNotebookText(incomingContext.summary)}</p>` : ""}
        ${contextSource ? `<blockquote><strong>Fonte para conferência:</strong> ${escapeNotebookText(contextSource.title)} — ${escapeNotebookText(contextSource.organization)}</blockquote>` : ""}
        <h2>Relações importantes</h2><p><br><br></p>
        <h2>Minhas anotações</h2><p><br><br><br></p>
      `,
    }] : [];
    const pagesToCreate = [...contextPage, ...template.pages];
    const { error: pageError } = await supabase.from("notebook_pages").insert(
      pagesToCreate.map((page, index) => ({
        notebook_id: notebook.id,
        user_id: user.id,
        page_number: index + 1,
        content: prepareMedicalNotebookHtml(page.html),
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
    saveMedicineState("notebook_context", null);
    setIncomingContext(null);
    toast.success(`${pagesToCreate.length} páginas médicas preparadas no seu Caderno.`);
    navigate(`/notebooks/${notebook.id}`);
  };
  return <div className="med-page">
    <PageHeading eyebrow="Caderno médico" title="Aprenda desenhando relações" description="Cadernos multipágina com figuras sem fundo, explicações, fluxos e exercícios. Exporte para Samsung Notes, PDF, PNG, HTML ou Markdown. Não inclua dados identificáveis de pacientes reais." />
    <div className="med-notebook-banner">
      <NotebookPen />
      <div><strong>Flora Canvas para medicina</strong><span>Escrita e desenho no mesmo papel, imagens anatômicas, setas, PDFs, questões e revisão ativa.</span></div>
      <button onClick={() => navigate("/notebooks")}>Abrir meus cadernos <ArrowRight /></button>
    </div>
    {incomingContext && <section className="med-notebook-context"><div><span className="med-eyebrow">CONTEÚDO SELECIONADO</span><h2>{incomingContext.label}</h2><p>Este conteúdo foi trazido de {NAV.find((item) => item.id === incomingContext.section)?.label ?? "outra área da academia"}. Escolha um template abaixo para montar uma página estruturada ou abra seus cadernos para inserir no papel atual.</p></div><button onClick={() => { saveMedicineState("notebook_context", null); setIncomingContext(null); }}><X /> Remover seleção</button></section>}
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
    const { error } = await supabase.from("medicine_content_reports").insert({ user_id: user.id, description: report.trim(), content_version: "MED-2026.08.26" });
    setSubmitting(false);
    if (error) { toast.error("Não foi possível registrar agora. Seu texto foi mantido para tentar novamente."); return; }
    setReport("");
    toast.success("Sinalização registrada para revisão editorial.");
  };
  const auditItems = [
    ["Idioma da interface", "Português do Brasil"],
    ["Terminologia", "Português + latim anatômico identificado"],
    ["Cobertura do atlas", `${anatomyStructures.length} estruturas catalogadas`],
    ["Rastreabilidade", `${Object.keys(medicalSources).length} fontes identificadas`],
  ];
  return <div className="med-page"><PageHeading eyebrow="Governança clínica" title="Fontes, limites e revisão" description="Toda afirmação educacional deve apontar para uma referência identificável e uma data de revisão." /><div className="med-safety-hero"><ShieldCheck/><div><h2>Segurança antes de velocidade</h2><p>O módulo não diagnostica, não prescreve e não processa casos de pacientes reais. Conteúdo com incerteza deve ser sinalizado e revisado antes da publicação.</p><span>Versão editorial MED-2026.08.26</span></div></div><div className="med-content-audit" aria-label="Resumo da auditoria editorial">{auditItems.map(([label, value]) => <article key={label}><Check/><span><small>{label}</small><strong>{value}</strong></span></article>)}</div><div className="med-source-grid">{Object.entries(medicalSources).map(([id, source]) => <article key={id}><span>REVISADO EM {new Date(`${source.reviewedAt}T12:00:00`).toLocaleDateString("pt-BR")}</span><h3>{source.title}</h3><p>{source.organization}</p>{source.license && <small>{source.license}</small>}{source.attribution && <small>{source.attribution === "Access for free at openstax.org." ? "Acesso gratuito em openstax.org." : source.attribution}</small>}<a href={source.url} target="_blank" rel="noreferrer">Abrir fonte <ExternalLink /></a></article>)}</div><div className="med-governance"><h3>Regras editoriais do módulo</h3>{["Separar conteúdo educacional de orientação individual", "Exigir fonte e data de revisão para cada estrutura", "Usar modelos anatômicos validados e licenciados", "Manter nomes latinos identificados, sem misturá-los ao texto em português", "Registrar correções e manter histórico de versões", "Não incluir dados identificáveis em simulações clínicas"].map((rule) => <div key={rule}><Check />{rule}</div>)}</div><div className="med-report-card"><div><span className="med-eyebrow">VIGILÂNCIA DO CONTEÚDO</span><h3>Sinalizar possível erro</h3><p>Informe a tela, a estrutura e o ponto que precisa ser conferido. Não inclua dados de pacientes.</p></div><textarea value={report} onChange={(event) => setReport(event.target.value)} placeholder="Ex.: Atlas › Coração — conferir a descrição de…"/><button onClick={() => void submitReport()} disabled={submitting}>{submitting ? "Registrando…" : "Enviar para revisão"} {!submitting && <ArrowRight />}</button></div></div>;
}

function PageHeading({ eyebrow, title, description }: { eyebrow: string; title: string; description: string }) {
  return <header className="med-page-heading"><span className="med-eyebrow">{eyebrow}</span><h1>{title}</h1><p>{description}</p></header>;
}
