import { useState, useEffect, useRef, useCallback, type CSSProperties } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ArrowLeft, Plus, Trash2, ChevronLeft, ChevronRight, Loader2, Maximize2, Minimize2, Share2,
  Brain, Sparkles, BookPlus, CheckCircle2, XCircle, ZoomIn, ZoomOut, FileText, Cloud, CloudOff, RefreshCw, Eye, Camera, Wand2,
  LayoutTemplate, Tag as TagIcon, MoreHorizontal, Search, Download, History, FileUp, Images, Stethoscope,
} from "lucide-react";

import { toast } from "sonner";
import { InlineMath } from "react-katex";
import "katex/dist/katex.min.css";
import { RichEditor } from "@/components/notebook/RichEditor";

import {
  getStrokeBounds,
  getStrokesBounds,
  type Stroke,
  type DrawingCanvasRef,
} from "@/components/notebook/drawingTypes";
import { LazyKonvaDrawingCanvas as KonvaDrawingCanvas } from "@/components/notebook/LazyKonvaDrawingCanvas";

// MathSuggestion type used locally in the editor
interface MathSuggestion {
  id: string;
  x: number;
  y: number;
  text: string;
  accepted: boolean;
  fontSize: number;
  createdAt: number;
  expiresAt: number;
  isError?: boolean;
  expression?: string;
  expressionLatex?: string;
  result?: string;
  resultLatex?: string;
  x_percent?: number;
  y_percent?: number;
  stroke_height?: number;
  is_correction?: boolean;
  user_answer?: boolean;
  steps?: string[];
  stepsLatex?: string[];
  confidence?: number;
}

import { NotebookStudioToolbar } from "@/components/notebook/NotebookStudioToolbar";
import { AudioSummaryButton } from "@/components/notebook/AudioSummaryButton";
import { PageSidebarGrid } from "@/components/notebook/PageSidebarGrid";
import { MedicalAssetPicker } from "@/components/notebook/MedicalAssetPicker";
import { NotebookExportDialog, type NotebookExportAction } from "@/components/notebook/NotebookExportDialog";
import { FloraNotebookSidebar } from "@/components/notebook/FloraNotebookSidebar";
import { GHOST_ENABLED_KEY } from "@/components/notebook/GhostTextExtension";
import "@/components/notebook/notebook-premium.css";
import { ShareNotebookDialog } from "@/components/notebook/ShareNotebookDialog";
import { StickyNote, type StickyNoteData } from "@/components/notebook/StickyNote";
import { FocusMode } from "@/components/notebook/FocusMode";
import { createTopic, loadTopics, type Flashcard, type Subject } from "@/lib/studyData";
import { saveTopicsForUser } from "@/lib/studyStateStore";
import { toLocalDateStr } from "@/lib/dateUtils";
import { loadJsonStorage, loadStringStorage } from "@/lib/storage";
import { getNotebookAIActivities, recordAIActivity, type AIActivityItem } from "@/lib/aiActivityStore";
import { scheduleSpacedReviews } from "@/lib/spacedReviews";
import type { Json } from "@/integrations/supabase/types";
import { enqueuePageUpdate, flushQueue, pendingCount } from "@/lib/notebookOfflineQueue";
import { getTemplatesForSubject, suggestTagsFromText } from "@/lib/notebookTemplates";
import type { NotebookMedicalAsset } from "@/lib/notebookMedicalAssets";
import {
  buildStandaloneNotebookHtml,
  downloadNotebookBlob,
  embedNotebookImages,
  notebookExportFilename,
  notebookToMarkdown,
  notebookToPlainText,
} from "@/lib/notebookExport";
import DOMPurify from "dompurify";

type PageTemplate = "blank" | "lined" | "grid" | "dotted" | "physics" | "chemistry" | "essay";
const PAGE_TEMPLATES: PageTemplate[] = ["blank", "lined", "grid", "dotted", "physics", "chemistry", "essay"];

function normalizePageTemplate(value: string | null | undefined): PageTemplate {
  return PAGE_TEMPLATES.includes(value as PageTemplate) ? value as PageTemplate : "blank";
}

// Adapta DrawingState (que contém Date implicitamente nada, mas é typed local) para Json do Supabase.
function drawingToJson(d: DrawingState): Json {
  return JSON.parse(JSON.stringify(d)) as Json;
}

// Converte um row genérico do supabase para NotebookPage (drawing_data vem como Json | null).
function rowToNotebookPage(row: {
  id: string; notebook_id: string; user_id: string; page_number: number;
  content: string; drawing_data: Json | null; tags: string[]; template: string;
}): NotebookPage {
  return {
    id: row.id,
    notebook_id: row.notebook_id,
    user_id: row.user_id,
    page_number: row.page_number,
    content: row.content,
    drawing_data: (row.drawing_data as unknown as DrawingState | null) ?? null,
    tags: row.tags ?? [],
    template: normalizePageTemplate(row.template),
  };
}

interface NotebookPage {
  id: string;
  notebook_id: string;
  user_id: string;
  page_number: number;
  content: string;
  drawing_data: DrawingState | null;
  tags: string[];
  template: PageTemplate;
}

interface Notebook {
  id: string;
  title: string;
  subject: string | null;
  cover_color: string;
}

interface DrawingState {
  strokes: Stroke[];
  stickyNotes: StickyNoteData[];
  mathSuggestions: MathSuggestion[];
  backgroundImage?: string;
  backgroundSource?: "pdf" | "image";
}

interface NotebookVersion {
  savedAt: number;
  content: string;
  drawing: DrawingState;
}

interface NotebookStudyLink {
  subject: Subject;
  topicId: string | null;
  topicTitle: string;
}

interface NotebookPageMeta {
  pinned: boolean;
  tags: string[];
}

interface NotebookQuizQuestion {
  pergunta: string;
  alternativas: string[];
  correta: number;
  explicacao: string;
}

interface NotebookMathSolution {
  expression?: string;
  expression_latex?: string;
  result?: string;
  result_latex?: string;
  x_percent?: number;
  y_percent?: number;
  x?: number;
  y?: number;
  stroke_height?: number;
  is_correction?: boolean;
  user_answer?: boolean;
  steps?: string[];
  stepsLatex?: string[];
  confidence?: number;
}

interface SolveMathResponse {
  solutions?: NotebookMathSolution[];
}

interface GenerateFlashcardsResponse {
  resumo?: string;
  flashcards?: Array<{
    frente: string;
    verso: string;
  }>;
}

interface GenerateQuizResponse {
  questions?: NotebookQuizQuestion[];
}

const emptyDrawing: DrawingState = { strokes: [], stickyNotes: [], mathSuggestions: [] };
const SUGGESTION_FADE_MS = 10_000;
const STATUS_RESOLVED_MS = 1500;
const SOLVE_COOLDOWN_MS = 2500;
const NOTEBOOK_LINKS_STORAGE_KEY = "studyflow.notebook.page-links";
const NOTEBOOK_AUTOSOLVE_STORAGE_KEY = "studyflow.notebook.auto-solver";
const NOTEBOOK_META_STORAGE_KEY = "studyflow.notebook.page-meta";
const NOTEBOOK_SUMMARIES_STORAGE_KEY = "studyflow.notebook.page-summaries";
const NOTEBOOK_TEMPLATE_STORAGE_KEY = "studyflow.notebook.page-templates";
const NOTEBOOK_HISTORY_STORAGE_KEY = "studyflow.notebook.history";
const MEDICAL_NOTEBOOK_SUBJECTS = new Set(["Medicina", "HAM", "SOI", "IESC", "PIEPE", "MCM"]);

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const normalizeStrokesForHash = (strokes: Stroke[]) =>
  strokes
    .filter((stroke) => stroke.tool === "pen")
    .map((stroke) => {
      const first = stroke.points[0];
      const last = stroke.points[stroke.points.length - 1];
      const bounds = getStrokeBounds(stroke);
      return {
        p: stroke.points.length,
        w: Math.round(stroke.width),
        c: stroke.color,
        s: first ? `${Math.round(first.x)},${Math.round(first.y)}` : "",
        e: last ? `${Math.round(last.x)},${Math.round(last.y)}` : "",
        b: bounds
          ? `${Math.round(bounds.width)},${Math.round(bounds.height)}`
          : "",
      };
    });

const hashStrokes = (strokes: Stroke[]) => JSON.stringify(normalizeStrokesForHash(strokes));

const calculateAverageStrokeDistance = (strokes: Stroke[]) => {
  if (strokes.length < 2) return 0;

  const centers = strokes
    .map((stroke) => {
      const bounds = getStrokeBounds(stroke);
      if (!bounds) return null;
      return { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2 };
    })
    .filter((center): center is { x: number; y: number } => center !== null);

  if (centers.length < 2) return 0;

  let sum = 0;
  let pairs = 0;
  for (let i = 0; i < centers.length; i++) {
    for (let j = i + 1; j < centers.length; j++) {
      const dx = centers[i].x - centers[j].x;
      const dy = centers[i].y - centers[j].y;
      sum += Math.hypot(dx, dy);
      pairs += 1;
    }
  }

  return pairs ? sum / pairs : 0;
};

const getAdaptiveDebounceMs = (strokes: Stroke[]) => {
  if (strokes.length <= 3) return 650;
  if (strokes.length <= 6) return 900;
  return 1200;
};

const hasLikelyMathTrigger = (strokes: Stroke[], canvasWidth: number) => {
  const horizontalStrokes = strokes
    .map((stroke) => ({ stroke, bounds: getStrokeBounds(stroke) }))
    .filter((item): item is { stroke: Stroke; bounds: NonNullable<ReturnType<typeof getStrokeBounds>> } => Boolean(item.bounds))
    .filter(({ bounds }) => bounds.width >= 20 && bounds.height > 0 && bounds.width / bounds.height >= 4);

  if (!horizontalStrokes.length) return false;

  for (let i = 0; i < horizontalStrokes.length; i++) {
    for (let j = i + 1; j < horizontalStrokes.length; j++) {
      const a = horizontalStrokes[i].bounds;
      const b = horizontalStrokes[j].bounds;
      const verticalDistance = Math.abs((a.y + a.height / 2) - (b.y + b.height / 2));
      const overlap = Math.max(0, Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x));
      const minOverlap = Math.min(a.width, b.width) * 0.4;
      if (verticalDistance <= Math.max(12, canvasWidth * 0.02) && overlap >= minOverlap) {
        return true;
      }
    }
  }

  return horizontalStrokes.some(({ bounds }) => bounds.width >= canvasWidth * 0.12);
};

export default function NotebookEditor() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const [notebook, setNotebook] = useState<Notebook | null>(null);
  const [titleDraft, setTitleDraft] = useState("");
  const [pages, setPages] = useState<NotebookPage[]>([]);
  const [currentPage, setCurrentPage] = useState(0);
  const page = pages[currentPage];
  const [loading, setLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error" | "offline">("idle");
  const [pendingOffline, setPendingOffline] = useState<number>(0);
  const [darkMode, setDarkMode] = useState(false);
  const [mode, setMode] = useState<"text" | "draw">("text");
  const [pageTemplate, setPageTemplate] = useState<PageTemplate>("blank");
  // O layout normal começa com as páginas visíveis; tela cheia vira uma escolha.
  const [expandedEditor, setExpandedEditor] = useState(false);
  const [focusModeActive, setFocusModeActive] = useState(false);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [medicalAssetPickerOpen, setMedicalAssetPickerOpen] = useState(false);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [exporting, setExporting] = useState<NotebookExportAction | null>(null);
  const [editorInsertion, setEditorInsertion] = useState<{ id: number; html: string } | null>(null);
  const [zoom, setZoom] = useState(1);
  const editorContainerRef = useRef<HTMLDivElement>(null);
  const [drawTool, setDrawTool] = useState<"pen" | "marker" | "eraser" | "select" | "line" | "rect" | "circle">("pen");
  const [drawBrush, setDrawBrush] = useState<"ballpoint" | "gel" | "pencil" | "fineliner" | "marker">("ballpoint");
  const [handwritingMode, setHandwritingMode] = useState(false);
  const [paperMargin, setPaperMargin] = useState(true);
  const [ghostEnabled, setGhostEnabled] = useState<boolean>(() =>
    typeof window === "undefined" ? false : window.localStorage.getItem(GHOST_ENABLED_KEY) === "1"
  );
  const [floraOpen, setFloraOpen] = useState(false);
  const [selectionBounds, setSelectionBounds] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  const [penColor, setPenColor] = useState("#000000");
  const [penWidth, setPenWidth] = useState(2);
  const [redoStrokes, setRedoStrokes] = useState<Stroke[]>([]);
  const [autoSolveEnabled, setAutoSolveEnabled] = useState(() => {
    const stored = loadStringStorage(NOTEBOOK_AUTOSOLVE_STORAGE_KEY);
    return stored == null ? true : stored === "1";
  });
  const prevDrawToolRef = useRef<"pen" | "marker" | "eraser" | "select" | "line" | "rect" | "circle">("pen");
  const prevModeRef = useRef<"text" | "draw">("text");
  const [solvingMath, setSolvingMath] = useState(false);
  const [mathStatus, setMathStatus] = useState<"idle" | "processing" | "resolved">("idle");
  const [lastMathSuggestion, setLastMathSuggestion] = useState<MathSuggestion | null>(null);
  const [selectedSubject, setSelectedSubject] = useState<Subject>("Matemática");
  const [pageLinks, setPageLinks] = useState<Record<string, NotebookStudyLink>>({});
  const [pageMeta, setPageMeta] = useState<Record<string, NotebookPageMeta>>({});
  const [searchQuery, setSearchQuery] = useState("");
  const [tagInput, setTagInput] = useState("");
  const [pageSummaries, setPageSummaries] = useState<Record<string, string>>({});
  const [aiActivities, setAiActivities] = useState<AIActivityItem[]>([]);
  const [generatingStudy, setGeneratingStudy] = useState<"none" | "flashcards" | "quiz" | "summary" | "image">("none");
  const [quizDifficulty, setQuizDifficulty] = useState<"facil" | "medio" | "dificil">("medio");
  const [quizDialogOpen, setQuizDialogOpen] = useState(false);
  const [quizQuestions, setQuizQuestions] = useState<NotebookQuizQuestion[]>([]);
  const [quizIndex, setQuizIndex] = useState(0);
  const [quizSelected, setQuizSelected] = useState<number | null>(null);
  const [quizScore, setQuizScore] = useState(0);
  const [quizFinished, setQuizFinished] = useState(false);
  const [quizWrongQuestions, setQuizWrongQuestions] = useState<string[]>([]);
  const [quizResultSaved, setQuizResultSaved] = useState(false);
  const [ocrLoading, setOcrLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pdfInputRef = useRef<HTMLInputElement>(null);
  const [pdfImporting, setPdfImporting] = useState(false);
  const isMedicalNotebook = MEDICAL_NOTEBOOK_SUBJECTS.has(notebook?.subject || selectedSubject);

  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const solveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const statusTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const solveCacheRef = useRef<Map<string, NotebookMathSolution[]>>(new Map());
  const previousResultsRef = useRef<NotebookMathSolution[]>([]);
  const lastSolvedHashRef = useRef<string | null>(null);
  const lastSolveAtRef = useRef(0);
  const solvingMathRef = useRef(false);
  const drawingStateRef = useRef<DrawingState>(emptyDrawing);
  const canvasRef = useRef<DrawingCanvasRef>(null);

  useEffect(() => {
    const savedLinks = loadJsonStorage<Record<string, NotebookStudyLink>>(NOTEBOOK_LINKS_STORAGE_KEY);
    setPageLinks(savedLinks ?? {});
  }, []);

  useEffect(() => {
    const savedMeta = loadJsonStorage<Record<string, NotebookPageMeta>>(NOTEBOOK_META_STORAGE_KEY);
    setPageMeta(savedMeta ?? {});
  }, []);

  useEffect(() => {
    const savedSummaries = loadJsonStorage<Record<string, string>>(NOTEBOOK_SUMMARIES_STORAGE_KEY);
    setPageSummaries(savedSummaries ?? {});
  }, []);

  const currentPageData = pages[currentPage] ?? null;

  useEffect(() => {
    if (!id || !currentPageData?.id) return;
    setAiActivities(getNotebookAIActivities(id, currentPageData.id));
  }, [id, currentPageData?.id]);

  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      if (solveTimerRef.current) clearTimeout(solveTimerRef.current);
      if (statusTimerRef.current) clearTimeout(statusTimerRef.current);
    };
  }, []);

  // Zoom via mouse wheel (Ctrl+scroll) or pinch (touch)
  useEffect(() => {
    const container = editorContainerRef.current;
    if (!container) return;

    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey) {
        e.preventDefault();
        setZoom((prev) => clamp(prev - e.deltaY * 0.001, 0.5, 3));
      }
    };

    const handleGestureStart = (e: Event) => {
      e.preventDefault();
    };

    container.addEventListener("wheel", handleWheel, { passive: false });
    container.addEventListener("gesturestart", handleGestureStart, { passive: false });

    return () => {
      container.removeEventListener("wheel", handleWheel);
      container.removeEventListener("gesturestart", handleGestureStart);
    };
  }, []);

  const pageKey = id && currentPageData?.id ? `${id}:${currentPageData.id}` : undefined;
  const currentLink = pageKey ? pageLinks[pageKey] : undefined;
  const currentMeta = pageKey ? pageMeta[pageKey] : undefined;
  const currentSummary = pageKey ? pageSummaries[pageKey] : "";

  useEffect(() => {
    if (!pageKey) return;
    const saved = loadJsonStorage<Record<string, PageTemplate>>(NOTEBOOK_TEMPLATE_STORAGE_KEY) ?? {};
    setPageTemplate(saved[pageKey] ?? currentPageData?.template ?? "blank");
  }, [currentPageData?.template, pageKey]);

  const changePageTemplate = useCallback((template: PageTemplate) => {
    setPageTemplate(template);
    if (!pageKey) return;
    const saved = loadJsonStorage<Record<string, PageTemplate>>(NOTEBOOK_TEMPLATE_STORAGE_KEY) ?? {};
    window.localStorage.setItem(NOTEBOOK_TEMPLATE_STORAGE_KEY, JSON.stringify({ ...saved, [pageKey]: template }));
    if (currentPageData?.id) {
      setPages((currentPages) => currentPages.map((currentPageItem) => currentPageItem.id === currentPageData.id ? { ...currentPageItem, template } : currentPageItem));
      void supabase.from("notebook_pages").update({ template }).eq("id", currentPageData.id);
    }
  }, [currentPageData?.id, pageKey]);

  const updateDrawingState = useCallback((next: DrawingState) => {
    drawingStateRef.current = next;
    if (!pageKey) return;
    setPages((prev) =>
      prev.map((item, idx) =>
        idx === currentPage ? { ...item, drawing_data: next } : item
      )
    );
  }, [currentPage, pageKey]);

  const handleStrokesChange = useCallback((strokes: Stroke[]) => {
    setRedoStrokes([]);
    updateDrawingState({ ...drawingStateRef.current, strokes });
  }, [updateDrawingState]);

  useEffect(() => {
    setRedoStrokes([]);
  }, [currentPage]);

  const handleStickyNotesChange = useCallback((stickyNotes: StickyNoteData[]) => {
    updateDrawingState({ ...drawingStateRef.current, stickyNotes });
  }, [updateDrawingState]);

  const handleMathSuggestionsChange = useCallback((mathSuggestions: MathSuggestion[]) => {
    updateDrawingState({ ...drawingStateRef.current, mathSuggestions });
  }, [updateDrawingState]);

  const drawingState = currentPageData?.drawing_data ?? emptyDrawing;

  const recordPageVersion = useCallback((item: NotebookPage) => {
    try {
      const all = loadJsonStorage<Record<string, NotebookVersion[]>>(NOTEBOOK_HISTORY_STORAGE_KEY) ?? {};
      const versions = all[item.id] ?? [];
      const snapshot: NotebookVersion = { savedAt: Date.now(), content: item.content, drawing: item.drawing_data ?? emptyDrawing };
      const signature = JSON.stringify({ content: snapshot.content, drawing: snapshot.drawing });
      const last = versions[versions.length - 1];
      if (last && JSON.stringify({ content: last.content, drawing: last.drawing }) === signature) return;
      window.localStorage.setItem(NOTEBOOK_HISTORY_STORAGE_KEY, JSON.stringify({ ...all, [item.id]: [...versions, snapshot].slice(-20) }));
    } catch { /* histórico local é complementar ao salvamento principal */ }
  }, []);

  const restorePreviousVersion = useCallback(() => {
    if (!currentPageData) return;
    const all = loadJsonStorage<Record<string, NotebookVersion[]>>(NOTEBOOK_HISTORY_STORAGE_KEY) ?? {};
    const versions = all[currentPageData.id] ?? [];
    if (versions.length < 2) { toast.info("Ainda não há uma versão anterior desta página."); return; }
    const previous = versions[versions.length - 2];
    setPages((items) => items.map((item, index) => index === currentPage ? { ...item, content: previous.content, drawing_data: previous.drawing } : item));
    drawingStateRef.current = previous.drawing;
    window.localStorage.setItem(NOTEBOOK_HISTORY_STORAGE_KEY, JSON.stringify({ ...all, [currentPageData.id]: versions.slice(0, -1) }));
    toast.success(`Versão de ${new Date(previous.savedAt).toLocaleString("pt-BR")} restaurada.`);
  }, [currentPage, currentPageData]);

  const handleContentChange = useCallback((content: string) => {
    if (!pageKey) return;
    setPages((prev) =>
      prev.map((item, idx) =>
        idx === currentPage ? { ...item, content } : item
      )
    );
  }, [currentPage, pageKey]);

  // Save to Supabase with debounce
  useEffect(() => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    setSaveStatus("saving");

    saveTimerRef.current = setTimeout(async () => {
      if (!id || !currentPageData?.id) {
        setSaveStatus("saved");
        return;
      }

      const payload = {
        content: currentPageData.content,
        drawing_data: drawingToJson(currentPageData.drawing_data ?? emptyDrawing),
        tags: currentMeta?.tags ?? [],
      };
      recordPageVersion(currentPageData);

      // Offline: queue and report
      if (typeof navigator !== "undefined" && navigator.onLine === false) {
        enqueuePageUpdate({ pageId: currentPageData.id, ...payload });
        setPendingOffline(pendingCount());
        setSaveStatus("offline");
        return;
      }

      try {
        const { error } = await supabase
          .from("notebook_pages")
          .update(payload)
          .eq("id", currentPageData.id);

        if (error) throw error;
        setSaveStatus("saved");
      } catch (error) {
        console.error("Failed to save page:", error);
        // Cai pra offline queue ao invés de perder dados
        enqueuePageUpdate({ pageId: currentPageData.id, ...payload });
        setPendingOffline(pendingCount());
        setSaveStatus("offline");
      }
    }, 1000);

    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [currentPageData, id, currentMeta?.tags, recordPageVersion]);

  // Offline-first: tenta dar flush ao carregar e quando a conexão volta
  useEffect(() => {
    setPendingOffline(pendingCount());
    const doFlush = async () => {
      if (typeof navigator !== "undefined" && navigator.onLine === false) return;
      const before = pendingCount();
      if (before === 0) return;
      const { ok, fail } = await flushQueue();
      const remaining = pendingCount();
      setPendingOffline(remaining);
      if (ok > 0 && remaining === 0) {
        setSaveStatus("saved");
        toast.success(`Sincronizado: ${ok} alteraç${ok === 1 ? "ão" : "ões"} salva${ok === 1 ? "" : "s"}.`);
      } else if (fail > 0) {
        setSaveStatus("offline");
      }
    };
    void doFlush();
    const onOnline = () => void doFlush();
    const onOffline = () => setSaveStatus("offline");
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, []);

  // Load notebook and pages
  useEffect(() => {
    async function loadNotebook() {
      if (!id) return;
      setLoading(true);
      try {
        const { data: notebookData, error: notebookError } = await supabase
          .from("notebooks")
          .select("*")
          .eq("id", id)
          .single();

        if (notebookError) throw notebookError;
        setNotebook(notebookData);
        setTitleDraft(notebookData.title || "Sem título");
        if (notebookData.subject) setSelectedSubject(notebookData.subject as Subject);

        const { data: pagesData, error: pagesError } = await supabase
          .from("notebook_pages")
          .select("*")
          .eq("notebook_id", id)
          .order("page_number", { ascending: true });

        if (pagesError) throw pagesError;
        setPages(pagesData.map(rowToNotebookPage));
      } catch (error) {
        console.error("Failed to load notebook:", error);
        toast.error("Erro ao carregar caderno.");
        navigate("/notebooks");
      } finally {
        setLoading(false);
      }
    }
    loadNotebook();
  }, [id, navigate]);

  // Auto-create the first page when a notebook has none yet.
  useEffect(() => {
    if (loading) return;
    if (!id || !user?.id) return;
    if (pages.length > 0) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("notebook_pages")
        .insert({
          notebook_id: id,
          user_id: user.id,
          page_number: 1,
          content: "",
          drawing_data: drawingToJson(emptyDrawing),
        })
        .select()
        .single();
      if (!cancelled && data) {
        setPages([rowToNotebookPage(data)]);
        setCurrentPage(0);
      }
    })();
    return () => { cancelled = true; };
  }, [loading, id, user?.id, pages.length]);

  const applySolutions = useCallback((solutions: NotebookMathSolution[], originalStrokes: Stroke[]) => {
    const newMathSuggestions: MathSuggestion[] = solutions.map((sol) => {
      const bounds = getStrokesBounds(originalStrokes);
      const x_percent = sol.x_percent ?? (bounds ? (sol.x ?? 0) / bounds.width : 0);
      const y_percent = sol.y_percent ?? (bounds ? (sol.y ?? 0) / bounds.height : 0);

      return {
        id: crypto.randomUUID(),
        x: sol.x ?? (bounds ? bounds.x + bounds.width * x_percent : 0),
        y: sol.y ?? (bounds ? bounds.y + bounds.height * y_percent : 0),
        text: sol.result || "",
        accepted: false,
        fontSize: 24,
        createdAt: Date.now(),
        expiresAt: Date.now() + SUGGESTION_FADE_MS,
        expression: sol.expression,
        expressionLatex: sol.expression_latex,
        result: sol.result,
        resultLatex: sol.result_latex,
        steps: sol.steps,
        stepsLatex: sol.stepsLatex,
        confidence: sol.confidence,
        isError: sol.is_correction,
        user_answer: sol.user_answer,
      };
    });

    handleMathSuggestionsChange([...drawingStateRef.current.mathSuggestions, ...newMathSuggestions]);
    setLastMathSuggestion(newMathSuggestions[0] || null);
    setMathStatus("resolved");
    if (statusTimerRef.current) clearTimeout(statusTimerRef.current);
    statusTimerRef.current = setTimeout(() => {
      setMathStatus("idle");
    }, STATUS_RESOLVED_MS);
  }, [handleMathSuggestionsChange]);

  const solveMath = useCallback(async (strokes: Stroke[], isSelection = false) => {
    if (solvingMathRef.current) return;
    solvingMathRef.current = true;
    setSolvingMath(true);
    setMathStatus("processing");

    const currentHash = hashStrokes(strokes);
    if (solveCacheRef.current.has(currentHash)) {
      const solutions = solveCacheRef.current.get(currentHash)!;
      applySolutions(solutions, strokes);
      setSolvingMath(false);
      solvingMathRef.current = false;
      return;
    }

    try {
      const imageData = canvasRef.current?.getImageData();
      if (!imageData) throw new Error("No image data");

      const { data, error } = await supabase.functions.invoke<SolveMathResponse>("solve-math", {
        body: {
          imageBase64: imageData,
          previousResults: previousResultsRef.current,
        },
      });

      if (error) throw error;

      if (data?.solutions && data.solutions.length > 0) {
        previousResultsRef.current = data.solutions;
        solveCacheRef.current.set(currentHash, data.solutions);
        applySolutions(data.solutions, strokes);
        toast.success("Expressão resolvida.");
      } else {
        setMathStatus("idle");
        // Silencioso no auto-solve para não poluir páginas de texto/exercícios.
      }
    } catch (error) {
      console.error("Solve math error:", error);
      console.warn("solve-math falhou silenciosamente no auto-solve");
      setMathStatus("idle");
    } finally {
      setSolvingMath(false);
      solvingMathRef.current = false;
      lastSolveAtRef.current = Date.now();
    }
  }, [applySolutions]);

  // Auto-solve math when drawing stops
  useEffect(() => {
    if (mode !== "draw" || !autoSolveEnabled) return;
    if (solveTimerRef.current) clearTimeout(solveTimerRef.current);

    const currentStrokes = drawingState.strokes;
    if (currentStrokes.length === 0) return;

    const debounceMs = getAdaptiveDebounceMs(currentStrokes);

    solveTimerRef.current = setTimeout(() => {
      if (Date.now() - lastSolveAtRef.current < SOLVE_COOLDOWN_MS) return;
      if (hashStrokes(currentStrokes) === lastSolvedHashRef.current) return;

      lastSolvedHashRef.current = hashStrokes(currentStrokes);
      void solveMath(currentStrokes);
    }, debounceMs);

    return () => {
      if (solveTimerRef.current) clearTimeout(solveTimerRef.current);
    };
  }, [drawingState.strokes, mode, autoSolveEnabled, solveMath]);

  const handleAutoSolve = async () => {
    if (solvingMathRef.current) return;
    const penStrokes = drawingState.strokes.filter((stroke) => stroke.tool === "pen");
    if (penStrokes.length < 2) {
      toast.info("Desenhe uma expressão antes de resolver.");
      return;
    }

    await solveMath(drawingState.strokes);
  };

  // Resolve uma expressão digitada na página (fallback quando não há desenho).
  // Usa flora-engine "chat" para devolver soma, produto e raízes em texto/LaTeX.
  const solveTextWithFlora = useCallback(async (text: string) => {
    if (solvingMathRef.current) return;
    solvingMathRef.current = true;
    setSolvingMath(true);
    setMathStatus("processing");
    try {
      const prompt =
        `Você é um solver matemático. Resolva a(s) expressão(ões) abaixo de forma direta e completa em PT-BR. ` +
        `Se for equação do 2º grau, mostre: forma padrão ax^2+bx+c=0, soma das raízes (-b/a), produto (c/a) e as raízes via Bhaskara. ` +
        `Responda em texto curto + LaTeX entre $...$ quando útil. Sem markdown extra.\n\n` +
        `Conteúdo da página:\n${text}`;

      const { data, error } = await supabase.functions.invoke<{ reply?: string; message?: string; content?: string }>(
        "flora-engine",
        {
          body: {
            action: "chat",
            userId: user?.id || "anonymous",
            data: { message: prompt, messages: [{ role: "user", content: prompt }] },
          },
        }
      );
      if (error) throw error;
      const reply = (data?.reply || data?.message || data?.content || "").toString().trim();
      if (!reply) {
        toast.info("A IA não retornou solução.");
        setMathStatus("idle");
        return;
      }

      // Anexa o resultado como bloco no final da página
      const block = `<p><strong>Solver IA:</strong><br/>${reply
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/\n/g, "<br/>")}</p>`;
      handleContentChange(`${page?.content || ""}${block}`);
      setMathStatus("resolved");
      if (statusTimerRef.current) clearTimeout(statusTimerRef.current);
      statusTimerRef.current = setTimeout(() => setMathStatus("idle"), STATUS_RESOLVED_MS);
      setFloraOpen(true);
      toast.success("Resolvido com base no texto da página.");
    } catch (err) {
      console.error("solveTextWithFlora error:", err);
      const { handleQuotaError } = await import("@/lib/quotaErrors");
      const handled = await handleQuotaError(err, { feature: "solver" });
      if (!handled) toast.error("Não consegui resolver a expressão.");
      setMathStatus("idle");
    } finally {
      setSolvingMath(false);
      solvingMathRef.current = false;
    }
  }, [user?.id, page?.content, handleContentChange]);

  const handleGenerateImageOnPage = useCallback(async () => {
    if (generatingStudy !== "none") return;
    const prompt = window.prompt("O que a Flora deve desenhar?", "")?.trim();
    if (!prompt) return;
    setGeneratingStudy("image");
    try {
      const { generateImageFromPrompt } = await import("@/lib/floraImages");
      const url = await generateImageFromPrompt(prompt);
      if (!url) { toast.error("Não consegui gerar a imagem."); return; }
      const safeAlt = prompt.replace(/"/g, "&quot;").slice(0, 200);
      const block = `<p><img src="${url}" alt="${safeAlt}" style="max-width:100%;border-radius:8px;" /></p>`;
      handleContentChange(`${page?.content || ""}${block}`);
      toast.success("Imagem inserida na página.");
    } catch (err) {
      console.error("generate image error:", err);
      toast.error("Erro ao gerar imagem.");
    } finally {
      setGeneratingStudy("none");
    }
  }, [generatingStudy, page?.content, handleContentChange]);

  const handleSolveSelection = useCallback(async () => {
    if (!selectionBounds) {
      // Sem seleção: tenta resolver pelo texto da página (texto digitado).
      const text = (page?.content || "")
        .replace(/<[^>]*>/g, " ")
        .replace(/&nbsp;/g, " ")
        .replace(/\s+/g, " ")
        .trim();
      if (!text) {
        toast.info("Selecione uma região ou escreva uma expressão na página.");
        return;
      }
      void solveTextWithFlora(text);
      return;
    }
    if (solvingMathRef.current) return;

    solvingMathRef.current = true;
    setSolvingMath(true);
    setMathStatus("processing");
    try {
      const imageData = canvasRef.current?.getImageData(selectionBounds);
      // Conta strokes dentro da seleção: se vazio, vai para fallback de texto.
      const insideStrokes = drawingState.strokes.filter((stroke) => {
        const b = getStrokeBounds(stroke);
        if (!b) return false;
        const cx = b.x + b.width / 2;
        const cy = b.y + b.height / 2;
        return (
          cx >= selectionBounds.x &&
          cx <= selectionBounds.x + selectionBounds.width &&
          cy >= selectionBounds.y &&
          cy <= selectionBounds.y + selectionBounds.height
        );
      });

      if (!imageData || insideStrokes.length === 0) {
        const text = (page?.content || "")
          .replace(/<[^>]*>/g, " ")
          .replace(/&nbsp;/g, " ")
          .replace(/\s+/g, " ")
          .trim();
        if (text) {
          await solveTextWithFlora(text);
          return;
        }
        toast.error("Não foi possível recortar a região.");
        return;
      }

      const { data, error } = await supabase.functions.invoke<SolveMathResponse>("solve-math", {
        body: {
          imageBase64: imageData,
          previousResults: previousResultsRef.current,
        },
      });
      if (error) throw error;

      if (data?.solutions && data.solutions.length > 0) {
        previousResultsRef.current = data.solutions;
        applySolutions(data.solutions, drawingState.strokes);
        toast.success("Região resolvida.");
      } else {
        // Sem solução pela imagem → tenta pelo texto da página
        const text = (page?.content || "")
          .replace(/<[^>]*>/g, " ")
          .replace(/&nbsp;/g, " ")
          .replace(/\s+/g, " ")
          .trim();
        if (text) {
          await solveTextWithFlora(text);
        } else {
          setMathStatus("idle");
          toast.info("Não consegui identificar uma expressão na região.");
        }
      }
    } catch (error) {
      console.error("Solve selection error:", error);
      toast.error("Erro ao resolver a região.");
      setMathStatus("idle");
    } finally {
      setSolvingMath(false);
      solvingMathRef.current = false;
      canvasRef.current?.clearSelection?.();
      setSelectionBounds(null);
    }
    // solveTextWithFlora é estável (definido abaixo via useCallback)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [applySolutions, drawingState.strokes, selectionBounds, page?.content]);


  const confidenceLabel = (value: number | undefined) => {
    const confidence = value ?? 0;
    if (confidence >= 0.8) return { label: "Alta confiança", className: "text-secondary" };
    if (confidence >= 0.55) return { label: "Confiança média", className: "text-amber-600" };
    return { label: "Baixa confiança", className: "text-destructive" };
  };

  const handleSaveMathAsNote = () => {
    if (!lastMathSuggestion || !lastMathSuggestion.result) return;
    const parts = [
      `Expressão: ${lastMathSuggestion.expression || "(não identificada)"}`,
      `Resultado: ${lastMathSuggestion.result}`,
    ];
    if (lastMathSuggestion.steps?.length) {
      parts.push(`Passos: ${lastMathSuggestion.steps.join(" -> ")}`);
    }

    const noteBlock = `<p><strong>Solver:</strong> ${parts.join(" | ")}</p>`;
    handleContentChange(`${page?.content || ""}${noteBlock}`);
    pushAIActivity({
      type: "solver",
      title: "Resultado do solver salvo nas notas",
      detail: lastMathSuggestion.expression || lastMathSuggestion.result,
      notebookId: id,
      pageId: page?.id,
      topicId: currentLink?.topicId ?? undefined,
    });
    toast.success("Resultado salvo como anotação da página.");
  };

  const handleSaveMathAsFlashcard = async () => {
    if (!lastMathSuggestion?.result) return;
    const { allTopics, topic } = await ensureLinkedTopic();
    const expression = lastMathSuggestion.expression || "Expressão manuscrita";
    const confidenceInfo = confidenceLabel(lastMathSuggestion.confidence).label.toLowerCase();
    const card: Flashcard = {
      id: crypto.randomUUID(),
      frente: `Resolva: ${expression}`,
      verso: `${lastMathSuggestion.result} (${confidenceInfo})`,
    };

    const nextTopics = allTopics.map((item) => {
      if (item.id !== topic.id) return item;
      return { ...item, flashcards: [...item.flashcards, card] };
    });

    await saveTopicsForUser(user?.id, nextTopics);
    if (user?.id) {
      await scheduleSpacedReviews(user.id, topic.id, topic.materia);
    }
    pushAIActivity({
      type: "solver",
      title: "Resultado do solver virou flashcard",
      detail: expression,
      notebookId: id,
      pageId: page?.id,
      topicId: topic.id,
    });
    toast.success("Flashcard salvo. Revisões agendadas em 1, 3, 7 e 15 dias.");
  };

  const handleSaveMathAsExercise = async () => {
    if (!lastMathSuggestion?.result) return;
    const expression = lastMathSuggestion.expression || "Expressão manuscrita";
    const tema = `Exercício: ${expression.slice(0, 60)}`;
    const topic = createTopic(tema, selectedSubject, toLocalDateStr(new Date()), false);
    topic.notas = `Resultado esperado: ${lastMathSuggestion.result}\nPassos: ${(lastMathSuggestion.steps || []).join(" -> ")}`;

    const topics = loadTopics();
    await saveTopicsForUser(user?.id, [...topics, topic]);
    updateCurrentPageLink({ subject: selectedSubject, topicId: topic.id, topicTitle: topic.tema });
    pushAIActivity({
      type: "solver",
      title: "Resultado do solver virou exercício",
      detail: topic.tema,
      notebookId: id,
      pageId: page?.id,
      topicId: topic.id,
    });
    toast.success("Resultado salvo como exercício revisável.");
  };

  useEffect(() => {
    if (!drawingState.mathSuggestions.length) return;

    const timer = setInterval(() => {
      const now = Date.now();
      const activeSuggestions = drawingState.mathSuggestions.filter(
        (suggestion) => (suggestion.expiresAt ?? now + 1) > now
      );
      if (activeSuggestions.length !== drawingState.mathSuggestions.length) {
        updateDrawingState({ ...drawingState, mathSuggestions: activeSuggestions });
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [drawingState, updateDrawingState]);

  const addPage = async () => {
    const newPageNum = pages.length + 1;
    const { data } = await supabase
      .from("notebook_pages")
      .insert({
        notebook_id: id!,
        user_id: user!.id,
        page_number: newPageNum,
        content: "",
        drawing_data: drawingToJson(emptyDrawing),
      })
      .select()
      .single();
    if (data) {
      setPages((prev) => [...prev, rowToNotebookPage(data)]);
      setCurrentPage(pages.length);
      toast.success("Página adicionada!");
    }
  };

  const duplicatePage = async (targetIndex: number) => {
    const sourcePage = pages[targetIndex];
    if (!sourcePage || !id || !user?.id) return;
    const { data, error } = await supabase.from("notebook_pages").insert({
      notebook_id: id,
      user_id: user.id,
      page_number: pages.length + 1,
      content: sourcePage.content,
      drawing_data: sourcePage.drawing_data ? drawingToJson(sourcePage.drawing_data) : drawingToJson(emptyDrawing),
      template: sourcePage.template,
      tags: sourcePage.tags,
    }).select().single();
    if (error || !data) {
      toast.error("Não foi possível duplicar a página.");
      return;
    }
    setPages((currentPages) => [...currentPages, rowToNotebookPage(data)]);
    setCurrentPage(pages.length);
    toast.success("Cópia criada no final do caderno.");
  };

  const reorderPages = async (fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex || !pages[fromIndex] || !pages[toIndex]) return;
    const previousPages = pages;
    const activePageId = pages[currentPage]?.id;
    const reordered = [...pages];
    const [movedPage] = reordered.splice(fromIndex, 1);
    reordered.splice(toIndex, 0, movedPage);
    const normalized = reordered.map((pageItem, index) => ({ ...pageItem, page_number: index + 1 }));
    setPages(normalized);
    setCurrentPage(Math.max(0, normalized.findIndex((pageItem) => pageItem.id === activePageId)));
    setSaveStatus("saving");
    const results = await Promise.all(normalized.map((pageItem) => supabase.from("notebook_pages").update({ page_number: pageItem.page_number }).eq("id", pageItem.id)));
    if (results.some((result) => result.error)) {
      setPages(previousPages);
      setCurrentPage(Math.max(0, previousPages.findIndex((pageItem) => pageItem.id === activePageId)));
      setSaveStatus("error");
      toast.error("A nova ordem não pôde ser salva.");
      return;
    }
    setSaveStatus("saved");
  };

  const deletePage = async (targetIndex = currentPage) => {
    if (pages.length <= 1) return;
    const pageToDelete = pages[targetIndex];
    if (!pageToDelete) return;
    const { error } = await supabase.from("notebook_pages").delete().eq("id", pageToDelete.id);
    if (error) { toast.error("Não foi possível excluir a página."); return; }
    const background = pageToDelete.drawing_data?.backgroundImage;
    const backgroundIsShared = pages.some((otherPage) => otherPage.id !== pageToDelete.id && otherPage.drawing_data?.backgroundImage === background);
    if (!backgroundIsShared && background?.includes("/notebook-images/")) {
      const path = decodeURIComponent(background.split("/notebook-images/")[1]?.split("?")[0] || "");
      if (path) void supabase.storage.from("notebook-images").remove([path]);
    }
    const newPages = pages.filter((_, i) => i !== targetIndex).map((pageItem, index) => ({ ...pageItem, page_number: index + 1 }));
    setPages(newPages);
    setCurrentPage(Math.min(targetIndex, newPages.length - 1));
    const renumberResults = await Promise.all(newPages.map((pageItem) => supabase.from("notebook_pages").update({ page_number: pageItem.page_number }).eq("id", pageItem.id)));
    if (renumberResults.some((result) => result.error)) {
      toast.warning("A página foi excluída, mas a numeração será reorganizada na próxima alteração.");
    }
  };

  const saveNotebookTitle = async () => {
    if (!notebook) return;
    const nextTitle = titleDraft.trim() || "Sem título";
    if (nextTitle === notebook.title) { setTitleDraft(nextTitle); return; }
    const previousTitle = notebook.title;
    setNotebook({ ...notebook, title: nextTitle });
    setTitleDraft(nextTitle);
    setSaveStatus("saving");
    const { error } = await supabase.from("notebooks").update({ title: nextTitle }).eq("id", notebook.id);
    if (error) {
      setNotebook({ ...notebook, title: previousTitle });
      setTitleDraft(previousTitle);
      setSaveStatus("error");
      toast.error("Não foi possível renomear o caderno.");
      return;
    }
    setSaveStatus("saved");
  };

  const insertMedicalAsset = (asset: NotebookMedicalAsset, insertMode: "cutout" | "study") => {
    const metadata = `data-medical-asset="${asset.id}" data-transparent="${asset.transparent}" data-wrap="${asset.transparent}" data-alignment="${asset.transparent ? "left" : "center"}" width="${asset.suggestedWidth ?? 460}"`;
    const image = `<img src="${asset.src}" alt="${asset.label}" title="${asset.description}" ${metadata}/>`;
    const html = insertMode === "study"
      ? `<h2>${asset.label}</h2>${image}<blockquote><strong>Orientação:</strong> ${asset.description}</blockquote><p><strong>Estrutura ou etapa em foco:</strong> ______________________________</p><p><strong>Relação anatômica ou sequência:</strong> __________________ → __________________</p><p><br></p>`
      : `${image}<p><br></p>`;
    setEditorInsertion({ id: Date.now(), html });
    toast.success(asset.transparent ? `${asset.label} inserido sem fundo. Arraste, gire, redimensione ou escreva ao redor.` : `${asset.label} inserido. Use Desenhar para adicionar setas e rótulos.`);
  };

  const handleInsertionHandled = useCallback((handledId: number) => {
    setEditorInsertion((currentRequest) => currentRequest?.id === handledId ? null : currentRequest);
  }, []);

  const persistPageLinks = useCallback((next: Record<string, NotebookStudyLink>) => {
    setPageLinks(next);
    localStorage.setItem(NOTEBOOK_LINKS_STORAGE_KEY, JSON.stringify(next));
  }, []);

  const persistPageMeta = useCallback((next: Record<string, NotebookPageMeta>) => {
    setPageMeta(next);
    localStorage.setItem(NOTEBOOK_META_STORAGE_KEY, JSON.stringify(next));
  }, []);

  const persistPageSummaries = useCallback((next: Record<string, string>) => {
    setPageSummaries(next);
    localStorage.setItem(NOTEBOOK_SUMMARIES_STORAGE_KEY, JSON.stringify(next));
  }, []);

  const updateCurrentPageMeta = useCallback((updater: (prev: NotebookPageMeta) => NotebookPageMeta) => {
    if (!pageKey) return;
    const previous = pageMeta[pageKey] ?? { pinned: false, tags: [] };
    persistPageMeta({
      ...pageMeta,
      [pageKey]: updater(previous),
    });
  }, [pageKey, pageMeta, persistPageMeta]);

  const updateCurrentPageLink = useCallback((link: NotebookStudyLink) => {
    if (!pageKey) return;
    persistPageLinks({ ...pageLinks, [pageKey]: link });
  }, [pageKey, pageLinks, persistPageLinks]);

  const pushAIActivity = useCallback((activity: Omit<AIActivityItem, "id" | "createdAt">) => {
    const next = recordAIActivity(activity);
    if (!id || !page?.id) return;
    setAiActivities(next.filter((item) => item.notebookId === id && item.pageId === page.id).slice(0, 8));
  }, [id, page?.id]);

  const getPlainPageText = useCallback(() => {
    const html = page?.content || "";
    return html
      .replace(/<[^>]*>/g, " ")
      .replace(/&nbsp;/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }, [page?.content]);

  const ensureLinkedTopic = useCallback(async () => {
    const allTopics = loadTopics();
    const linked = currentLink?.topicId ? allTopics.find((t) => t.id === currentLink.topicId) : null;
    if (linked) return { allTopics, topic: linked };

    const text = getPlainPageText();
    const topicName = currentLink?.topicTitle || text.slice(0, 60) || `${notebook?.title || "Caderno"} - pág ${currentPage + 1}`;
    const newTopic = createTopic(topicName, selectedSubject, toLocalDateStr(new Date()), false);
    const nextTopics = [...allTopics, newTopic];
    await saveTopicsForUser(user?.id, nextTopics);
    updateCurrentPageLink({ subject: selectedSubject, topicId: newTopic.id, topicTitle: newTopic.tema });
    pushAIActivity({
      type: "topic",
      title: "Tópico criado automaticamente",
      detail: newTopic.tema,
      notebookId: id,
      pageId: page?.id,
      topicId: newTopic.id,
    });
    return { allTopics: nextTopics, topic: newTopic };
  }, [currentLink?.topicId, currentLink?.topicTitle, currentPage, getPlainPageText, id, notebook?.title, page?.id, pushAIActivity, selectedSubject, updateCurrentPageLink, user?.id]);

  const handleCreateTopicFromPage = async () => {
    const text = getPlainPageText();
    const topicName = text.slice(0, 60) || `${notebook?.title || "Caderno"} - pág ${currentPage + 1}`;
    const newTopic = createTopic(topicName, selectedSubject, toLocalDateStr(new Date()), false);
    const topics = loadTopics();
    await saveTopicsForUser(user?.id, [...topics, newTopic]);
    updateCurrentPageLink({ subject: selectedSubject, topicId: newTopic.id, topicTitle: newTopic.tema });
    pushAIActivity({
      type: "topic",
      title: "Tópico criado da página",
      detail: newTopic.tema,
      notebookId: id,
      pageId: page?.id,
      topicId: newTopic.id,
    });
    toast.success("Tópico criado a partir da página.");
  };

  // ===== Fase 4b: Templates por matéria, tags inteligentes e auto-resumo =====
  const autoSummaryRef = useRef<{ pageKey?: string; lastLen: number; timer?: ReturnType<typeof setTimeout> }>({ lastLen: 0 });

  const handleInsertTemplate = useCallback((html: string, label: string) => {
    const existing = page?.content || "";
    const separator = existing.trim() ? "<hr/>" : "";
    handleContentChange(`${existing}${separator}${html}`);
    toast.success(`Template "${label}" inserido.`);
  }, [page?.content, handleContentChange]);

  const handleSuggestTags = useCallback(() => {
    const text = getPlainPageText();
    if (text.length < 80) {
      toast.info("Escreva um pouco mais para a Flora sugerir tags.");
      return;
    }
    const suggested = suggestTagsFromText(text, 6);
    if (suggested.length === 0) {
      toast.info("Não consegui extrair tags claras desta página.");
      return;
    }
    updateCurrentPageMeta((prev) => {
      const merged = Array.from(new Set([...(prev.tags ?? []), ...suggested]));
      return { ...prev, tags: merged.slice(0, 10) };
    });
    toast.success(`Flora sugeriu ${suggested.length} tags: ${suggested.join(", ")}`);
  }, [getPlainPageText, updateCurrentPageMeta]);

  // Auto-resumo: 30s após parar de digitar, se a página tiver >800 chars e ainda não houver resumo
  useEffect(() => {
    if (!pageKey) return;
    if (currentSummary && currentSummary.trim()) return;
    if (generatingStudy !== "none") return;
    const text = getPlainPageText();
    if (text.length < 800) return;
    if (autoSummaryRef.current.pageKey !== pageKey) {
      autoSummaryRef.current = { pageKey, lastLen: 0 };
    }
    if (text.length === autoSummaryRef.current.lastLen) return;
    autoSummaryRef.current.lastLen = text.length;
    if (autoSummaryRef.current.timer) clearTimeout(autoSummaryRef.current.timer);
    autoSummaryRef.current.timer = setTimeout(() => {
      if (currentSummary && currentSummary.trim()) return;
      void handleGenerateSummaryFromPage();
    }, 30000);
    return () => {
      if (autoSummaryRef.current.timer) clearTimeout(autoSummaryRef.current.timer);
    };
  }, [pageKey, currentSummary, generatingStudy, getPlainPageText]);

  const handleGenerateSummaryFromPage = async () => {
    setGeneratingStudy("summary");
    setFloraOpen(true);
    try {
      const notes = getPlainPageText();
      if (!notes) {
        toast.info("Adicione conteúdo na página para gerar resumo.");
        return;
      }

        const { data, error } = await supabase.functions.invoke<GenerateFlashcardsResponse>("flora-engine", {
        body: {
          action: "generate_flashcards",
          userId: user?.id || "anonymous",
          data: {
            tema: currentLink?.topicTitle || notebook?.title || `Página ${currentPage + 1}`,
            materia: selectedSubject,
            pageContent: notes,
          },
        },
      });

      if (error) throw error;
      const summaryText = String(data?.resumo || "").trim();
      if (!summaryText) {
        toast.info("A IA não retornou resumo desta vez.");
        return;
      }

      if (pageKey) {
        persistPageSummaries({ ...pageSummaries, [pageKey]: summaryText });
      }
      pushAIActivity({
        type: "summary",
        title: "Resumo gerado",
        detail: summaryText.slice(0, 120),
        notebookId: id,
        pageId: page?.id,
        topicId: currentLink?.topicId ?? undefined,
      });
      toast.success("Resumo da página atualizado.");
    } catch (error) {
      console.error(error);
      const { handleQuotaError } = await import("@/lib/quotaErrors");
      const handled = await handleQuotaError(error, { feature: "resumo" });
      if (!handled) toast.error("Não foi possível gerar resumo da página.");
    } finally {
      setGeneratingStudy("none");
    }
  };

  const handleGenerateFlashcardsFromPage = async () => {
    setGeneratingStudy("flashcards");
    setFloraOpen(true);
    try {
      const { allTopics, topic } = await ensureLinkedTopic();
      const notes = getPlainPageText();
      let summaryText = currentSummary;

      if (!summaryText) {
          const summaryRes = await supabase.functions.invoke<GenerateFlashcardsResponse>("flora-engine", {
          body: {
            action: "generate_flashcards",
            userId: user?.id || "anonymous",
            data: {
              tema: topic.tema,
              materia: topic.materia,
              pageContent: notes,
            },
          },
        });

        if (summaryRes.error) throw summaryRes.error;
        summaryText = (summaryRes.data?.resumo || "").trim();
        if (pageKey && summaryText) {
          persistPageSummaries({ ...pageSummaries, [pageKey]: summaryText });
        }
      }

      const notesForFlashcards = summaryText
        ? `Resumo da página:\n${summaryText}\n\nAnotações da página:\n${notes}`
        : notes;

        const { data, error } = await supabase.functions.invoke<GenerateFlashcardsResponse>("flora-engine", {
        body: {
          action: "generate_flashcards",
          userId: user?.id || "anonymous",
          data: {
            tema: topic.tema,
            materia: topic.materia,
            pageContent: notesForFlashcards,
          },
        },
      });
      if (error) throw error;

      const generated: Flashcard[] = (data?.flashcards || []).map((card) => ({
        id: crypto.randomUUID(),
        frente: card.frente,
        verso: card.verso,
      }));

      const dedupe = new Map<string, Flashcard>();
      const nextTopics = allTopics.map((t) => {
        if (t.id !== topic.id) return t;
        [...t.flashcards, ...generated].forEach((card) => {
          const key = `${card.frente.toLowerCase().trim()}::${card.verso.toLowerCase().trim()}`;
          if (!dedupe.has(key)) dedupe.set(key, card);
        });
        const mergedNotes = summaryText
          ? `Resumo automático da página:\n${summaryText}\n\n${notes || t.notas}`
          : notes || t.notas;
        return { ...t, notas: mergedNotes, flashcards: Array.from(dedupe.values()) };
      });

      await saveTopicsForUser(user?.id, nextTopics);
      if (pageKey && summaryText) {
        persistPageSummaries({ ...pageSummaries, [pageKey]: summaryText });
      }
      if (user?.id && generated.length > 0) {
        await scheduleSpacedReviews(user.id, topic.id, topic.materia);
      }
      pushAIActivity({
        type: "flashcards",
        title: "Flashcards gerados",
        detail: `${generated.length} cards para ${topic.tema}`,
        notebookId: id,
        pageId: page?.id,
        topicId: topic.id,
      });
      toast.success(`${generated.length} flashcards gerados. Revisões agendadas em 1, 3, 7 e 15 dias.`);
    } catch (error) {
      console.error(error);
      const { handleQuotaError } = await import("@/lib/quotaErrors");
      const handled = await handleQuotaError(error, { feature: "flashcards" });
      if (!handled) toast.error("Não foi possível gerar flashcards da página.");
    } finally {
      setGeneratingStudy("none");
    }
  };

  const resetNotebookQuiz = () => {
    setQuizQuestions([]);
    setQuizIndex(0);
    setQuizSelected(null);
    setQuizScore(0);
    setQuizFinished(false);
    setQuizWrongQuestions([]);
    setQuizResultSaved(false);
  };

  const handleOCR = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setOcrLoading(true);
    toast.loading("Digitalizando sua página...");
    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = reader.result as string;
        const base64Content = base64.split(",")[1];
        try {
          const { data, error } = await supabase.functions.invoke("ocr-notebook", {
            body: { image: base64Content }
          });
          if (error) throw error;
          if (data?.text) {
            handleContentChange(`${page?.content || ""}<p>${data.text.replace(/\n/g, "<br/>")}</p>`);
            toast.dismiss();
            toast.success("Texto digitalizado!");
          } else {
            toast.dismiss();
            toast.info("Não consegui ler nada.");
          }
        } catch (err) {
          console.error(err);
          toast.dismiss();
          toast.error("Erro ao processar imagem.");
        } finally {
          setOcrLoading(false);
          if (fileInputRef.current) fileInputRef.current.value = "";
        }
      };
      reader.readAsDataURL(file);
    } catch (err) {
      setOcrLoading(false);
      toast.dismiss();
      toast.error("Erro ao carregar arquivo.");
    }
  };


  const handleGenerateQuizFromPage = async () => {
    setGeneratingStudy("quiz");
    try {
      const { topic } = await ensureLinkedTopic();
      const notes = getPlainPageText();
      const { data, error } = await supabase.functions.invoke<GenerateQuizResponse>("flora-engine", {
        body: {
          action: "generate_quiz",
          userId: user?.id || "anonymous",
          data: {
            tema: topic.tema,
            materia: topic.materia,
            difficulty: quizDifficulty,
            pageContent: notes,
          },
        },
      });
      if (error) throw error;
      if (!Array.isArray(data?.questions) || data.questions.length === 0) throw new Error("Quiz vazio");

      resetNotebookQuiz();
      setQuizQuestions(data.questions);
      setQuizDialogOpen(true);
      pushAIActivity({
        type: "quiz",
        title: "Quiz gerado",
        detail: `${data.questions.length} perguntas para ${topic.tema}`,
        notebookId: id,
        pageId: page?.id,
        topicId: topic.id,
      });
    } catch (error) {
      console.error(error);
      const { handleQuotaError } = await import("@/lib/quotaErrors");
      const handled = await handleQuotaError(error, { feature: "quiz" });
      if (!handled) toast.error("Não foi possível gerar quiz da página.");
    } finally {
      setGeneratingStudy("none");
    }
  };

  // Lê o texto selecionado pelo aluno dentro do editor. Retorna null se < 20 chars.
  const getSelectedText = (): string | null => {
    const sel = typeof window !== "undefined" ? window.getSelection() : null;
    const text = sel?.toString().trim() || "";
    if (text.length < 20) return null;
    return text;
  };

  const handleGenerateFlashcardsFromSelection = async () => {
    const selected = getSelectedText();
    if (!selected) {
      toast.error("Selecione pelo menos um parágrafo (20+ caracteres).");
      return;
    }
    setGeneratingStudy("flashcards");
    setFloraOpen(true);
    try {
      const { allTopics, topic } = await ensureLinkedTopic();
      const { data, error } = await supabase.functions.invoke<GenerateFlashcardsResponse>("flora-engine", {
        body: {
          action: "generate_flashcards",
          userId: user?.id || "anonymous",
          data: {
            tema: topic.tema,
            materia: topic.materia,
            pageContent: `Trecho selecionado pelo aluno:\n${selected}`,
          },
        },
      });
      if (error) throw error;

      const generated: Flashcard[] = (data?.flashcards || []).map((card) => ({
        id: crypto.randomUUID(),
        frente: card.frente,
        verso: card.verso,
      }));
      if (generated.length === 0) throw new Error("Nenhum flashcard gerado");

      const dedupe = new Map<string, Flashcard>();
      const nextTopics = allTopics.map((t) => {
        if (t.id !== topic.id) return t;
        [...t.flashcards, ...generated].forEach((card) => {
          const key = `${card.frente.toLowerCase().trim()}::${card.verso.toLowerCase().trim()}`;
          if (!dedupe.has(key)) dedupe.set(key, card);
        });
        return { ...t, flashcards: Array.from(dedupe.values()) };
      });
      await saveTopicsForUser(user?.id, nextTopics);

      pushAIActivity({
        type: "flashcards",
        title: "Flashcards do trecho",
        detail: `${generated.length} cards de ${topic.tema}`,
        notebookId: id,
        pageId: page?.id,
        topicId: topic.id,
      });
      toast.success(`${generated.length} flashcards gerados do trecho.`);
    } catch (error) {
      console.error(error);
      const { handleQuotaError } = await import("@/lib/quotaErrors");
      const handled = await handleQuotaError(error, { feature: "flashcards" });
      if (!handled) toast.error("Não foi possível gerar flashcards do trecho.");
    } finally {
      setGeneratingStudy("none");
    }
  };

  const handleGenerateQuizFromSelection = async () => {
    const selected = getSelectedText();
    if (!selected) {
      toast.error("Selecione pelo menos um parágrafo (20+ caracteres).");
      return;
    }
    setGeneratingStudy("quiz");
    try {
      const { topic } = await ensureLinkedTopic();
      const { data, error } = await supabase.functions.invoke<GenerateQuizResponse>("flora-engine", {
        body: {
          action: "generate_quiz",
          userId: user?.id || "anonymous",
          data: {
            tema: topic.tema,
            materia: topic.materia,
            difficulty: quizDifficulty,
            pageContent: `Trecho selecionado pelo aluno:\n${selected}`,
          },
        },
      });
      if (error) throw error;
      if (!Array.isArray(data?.questions) || data.questions.length === 0) throw new Error("Quiz vazio");

      resetNotebookQuiz();
      setQuizQuestions(data.questions);
      setQuizDialogOpen(true);
      pushAIActivity({
        type: "quiz",
        title: "Quiz do trecho",
        detail: `${data.questions.length} perguntas de ${topic.tema}`,
        notebookId: id,
        pageId: page?.id,
        topicId: topic.id,
      });
    } catch (error) {
      console.error(error);
      const { handleQuotaError } = await import("@/lib/quotaErrors");
      const handled = await handleQuotaError(error, { feature: "quiz" });
      if (!handled) toast.error("Não foi possível gerar quiz do trecho.");
    } finally {
      setGeneratingStudy("none");
    }
  };

  const answerNotebookQuiz = (idx: number) => {
    if (quizSelected !== null) return;
    setQuizSelected(idx);
    if (idx === quizQuestions[quizIndex].correta) {
      setQuizScore((value) => value + 1);
    } else {
      setQuizWrongQuestions((prev) => [...prev, quizQuestions[quizIndex].pergunta]);
    }
  };

  const saveNotebookQuizResult = useCallback(async () => {
    if (quizResultSaved || quizQuestions.length === 0) return;

    const { allTopics, topic } = await ensureLinkedTopic();
    const normalized = quizQuestions.length > 0 ? quizScore / quizQuestions.length : 0;
    const nextRating = Math.max(1, Math.min(5, Math.round(normalized * 5)));
    const nextTopics = allTopics.map((item) =>
      item.id === topic.id
        ? {
            ...item,
            quizAttempts: (item.quizAttempts ?? 0) + 1,
            quizLastScore: normalized,
            quizErrors: [...(item.quizErrors ?? []), ...quizWrongQuestions].slice(-12),
            rating: item.rating === 0 ? nextRating : Math.round((item.rating + nextRating) / 2),
          }
        : item
    );

    await saveTopicsForUser(user?.id, nextTopics);
    setQuizResultSaved(true);
    pushAIActivity({
      type: "quiz",
      title: "Resultado do quiz salvo",
      detail: `${quizScore}/${quizQuestions.length} em ${topic.tema}`,
      notebookId: id,
      pageId: page?.id,
      topicId: topic.id,
    });
  }, [ensureLinkedTopic, id, page?.id, pushAIActivity, quizQuestions.length, quizResultSaved, quizScore, quizWrongQuestions, user?.id]);

  const nextNotebookQuiz = () => {
    if (quizIndex + 1 >= quizQuestions.length) {
      void saveNotebookQuizResult();
      setQuizFinished(true);
      return;
    }
    setQuizIndex((value) => value + 1);
    setQuizSelected(null);
  };

  const searchAndJumpToPage = () => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return;

    const nextIndex = pages.findIndex((item) => {
      const html = item.content || "";
      const text = html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").toLowerCase();
      const key = id ? `${id}:${item.id}` : "";
      const meta = key ? pageMeta[key] : undefined;
      const tagMatch = (meta?.tags ?? []).some((tag) => tag.toLowerCase().includes(query));
      return text.includes(query) || tagMatch;
    });

    if (nextIndex >= 0) {
      setCurrentPage(nextIndex);
      toast.success(`Ir para página ${nextIndex + 1}`);
    } else {
      toast.info("Nenhuma página encontrada para essa busca.");
    }
  };

  const handleSyncSummaryToTopic = async () => {
    if (!currentSummary.trim()) {
      toast.info("Gere um resumo antes de enviar para o tópico.");
      return;
    }

    const { allTopics, topic } = await ensureLinkedTopic();
    const nextTopics = allTopics.map((item) =>
      item.id === topic.id
        ? {
            ...item,
            notas: item.notas.trim()
              ? `${item.notas.trim()}\n\nResumo da página:\n${currentSummary}`
              : `Resumo da página:\n${currentSummary}`,
          }
        : item
    );

    await saveTopicsForUser(user?.id, nextTopics);
    pushAIActivity({
      type: "sync",
      title: "Resumo enviado ao tópico",
      detail: topic.tema,
      notebookId: id,
      pageId: page?.id,
      topicId: topic.id,
    });
    toast.success("Resumo enviado para o tópico vinculado.");
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === "F") {
        e.preventDefault();
        setFocusModeActive((prev) => !prev);
      }
      // Atalho "F" sozinho: alterna modo foco quando o usuário não está digitando
      if (
        (e.key === "f" || e.key === "F") &&
        !e.ctrlKey && !e.metaKey && !e.altKey && !e.shiftKey
      ) {
        const el = document.activeElement as HTMLElement | null;
        const typing =
          !!el &&
          (el.tagName === "INPUT" ||
            el.tagName === "TEXTAREA" ||
            el.isContentEditable);
        if (!typing) {
          e.preventDefault();
          setFocusModeActive((prev) => !prev);
        }
      }
      if (e.key === "Escape" && autoSolveEnabled) {
        setAutoSolveEnabled(false);
      }
      const el = document.activeElement as HTMLElement | null;
      const typing = !!el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable);
      if (!typing && mode === "draw" && drawTool === "select" && selectionBounds) {
        if (e.key === "Delete" || e.key === "Backspace") {
          e.preventDefault();
          canvasRef.current?.deleteSelection?.();
        }
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "d") {
          e.preventDefault();
          canvasRef.current?.duplicateSelection?.();
        }
      }
      if (!typing && !e.ctrlKey && !e.metaKey && !e.altKey) {
        if (e.key.toLowerCase() === "p") { setMode("draw"); setDrawTool("pen"); }
        if (e.key.toLowerCase() === "e") { setMode("draw"); setDrawTool("eraser"); }
        if (e.key.toLowerCase() === "l") { setMode("draw"); setDrawTool("select"); }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [autoSolveEnabled, drawTool, mode, selectionBounds]);

  // When IA is toggled ON, automatically switch to draw mode with selection tool
  // so the user can immediately select a region to solve. Toggling OFF restores
  // the previous mode/tool.
  const handleToggleAutoSolve = useCallback((enabled: boolean) => {
    setAutoSolveEnabled(enabled);
    localStorage.setItem(NOTEBOOK_AUTOSOLVE_STORAGE_KEY, enabled ? "1" : "0");
    if (enabled) {
      prevModeRef.current = mode;
      prevDrawToolRef.current = drawTool;
      setMode("draw");
      setDrawTool("select");
      toast.info("IA ativada — selecione a região para resolver. ESC para sair.");
    } else {
      setMode(prevModeRef.current);
      setDrawTool(prevDrawToolRef.current);
      canvasRef.current?.clearSelection?.();
      setSelectionBounds(null);
    }
  }, [drawTool, mode]);

  // Recebe conteúdo enviado pela Flora via chat
  useEffect(() => {
    const handleFloraContent = (e: Event) => {
      const detail = (e as CustomEvent).detail as { html: string; titulo?: string };
      if (!detail?.html) return;
      setPages((prev) =>
        prev.map((item, idx) =>
          idx === currentPage
            ? { ...item, content: (item.content || "") + "\n" + detail.html }
            : item
        )
      );
      toast.success("Flora adicionou conteúdo ao caderno!");
    };
    window.addEventListener("flora-add-to-notebook", handleFloraContent);
    return () => window.removeEventListener("flora-add-to-notebook", handleFloraContent);
  }, [currentPage]);

  useEffect(() => {
    const target = searchParams.get("revisar");
    if (!target) return;
    const id = target === "atrasadas" ? "revisoes-atrasadas" : "revisoes-hoje";
    // Aguarda render das seções lazy
    const t = setTimeout(() => {
      const el = document.getElementById(id);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
      // Limpa o param para não rolar de novo em re-renders
      const next = new URLSearchParams(searchParams);
      next.delete("revisar");
      setSearchParams(next, { replace: true });
    }, 600);
    return () => clearTimeout(t);
  }, [searchParams, setSearchParams]);

  if (loading) {
    return (
      <div className="min-h-dvh bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  async function handleExplainDrawing() {
    const img = canvasRef.current?.getImageData?.(null);
    if (!img) { toast.error("Desenhe algo primeiro."); return; }
    const tid = toast.loading("Flora analisando o desenho...");
    try {
      const { data, error } = await supabase.functions.invoke("flora-engine", {
        body: { action: "explain_drawing", data: { image: img } },
      });
      if (error) throw error;
      const explanation = typeof data === "object" && data !== null && "explanation" in data
        ? String(data.explanation ?? "").trim()
        : "";
      toast.dismiss(tid);
      if (!explanation) { toast.error("Flora não conseguiu explicar."); return; }
      toast.success("Flora explicou seu desenho", {
        description: explanation.length > 600 ? explanation.slice(0, 600) + "..." : explanation,
        duration: 20000,
      });
    } catch (e: unknown) {
      toast.dismiss(tid);
      toast.error(e instanceof Error ? e.message : "Erro ao chamar Flora.");
    }
  }

  function toggleGhostCompletion() {
    const next = !ghostEnabled;
    setGhostEnabled(next);
    window.localStorage.setItem(GHOST_ENABLED_KEY, next ? "1" : "0");
    toast.success(next ? "Autocomplete Flora ativado (Tab aceita, Esc descarta)" : "Autocomplete Flora desativado");
  }

  async function renderNotebookPage(item: NotebookPage, pageIndex: number) {
    const [{ default: html2canvas }, { renderStrokesToDataUrl }] = await Promise.all([
      import("html2canvas"),
      import("@/components/notebook/KonvaDrawingCanvas"),
    ]);
    const root = document.createElement("article");
    root.className = `nb-export-page notebook-${item.template}`;
    root.innerHTML = `<div class="nb-export-page-content">${DOMPurify.sanitize(item.content || "<p></p>")}</div><small class="nb-export-page-number">${notebook?.title || "Caderno"} · ${pageIndex + 1}/${pages.length}</small>`;
    root.querySelectorAll<HTMLImageElement>("img[data-rotation]").forEach((image) => {
      image.style.transform = `rotate(${Number(image.dataset.rotation || 0)}deg)`;
      image.style.transformOrigin = "center";
    });
    const drawing = item.drawing_data;
    if (drawing?.backgroundImage) {
      const background = document.createElement("img");
      background.className = "nb-export-background";
      background.src = drawing.backgroundImage;
      root.prepend(background);
    }
    if (drawing?.strokes?.length) {
      const overlay = document.createElement("img");
      overlay.className = "nb-export-drawing";
      overlay.src = renderStrokesToDataUrl(drawing.strokes, 794, 1123, null);
      root.appendChild(overlay);
    }
    drawing?.stickyNotes?.forEach((note) => {
      const sticky = document.createElement("div");
      sticky.className = "nb-export-sticky";
      sticky.textContent = note.text;
      Object.assign(sticky.style, { left: `${note.x}px`, top: `${note.y}px`, width: `${note.width}px`, minHeight: `${note.height}px`, background: note.color });
      root.appendChild(sticky);
    });
    document.body.appendChild(root);
    try {
      await Promise.all(Array.from(root.querySelectorAll("img")).map((image) => image.complete ? Promise.resolve() : new Promise<void>((resolve) => {
        image.addEventListener("load", () => resolve(), { once: true });
        image.addEventListener("error", () => resolve(), { once: true });
      })));
      return await html2canvas(root, { scale: 2, useCORS: true, backgroundColor: "#ffffff", logging: false, width: 794, height: 1123 });
    } finally {
      root.remove();
    }
  }

  async function exportNotebookPdf(target: "samsung" | "pdf") {
    if (!pages.length) return;
    const [{ jsPDF }] = await Promise.all([import("jspdf")]);
    const pdf = new jsPDF({ unit: "pt", format: "a4", orientation: "portrait" });
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    for (let index = 0; index < pages.length; index += 1) {
      if (index > 0) pdf.addPage();
      const canvas = await renderNotebookPage(pages[index], index);
      pdf.addImage(canvas.toDataURL("image/jpeg", 0.94), "JPEG", 0, 0, pageWidth, pageHeight, undefined, "FAST");
    }
    pdf.save(notebookExportFilename(notebook?.title || "caderno", target === "samsung" ? "samsung-notes" : "", "pdf"));
    toast.success(target === "samsung" ? "PDF A4 pronto para importar no Samsung Notes." : "Caderno completo exportado em PDF.");
  }

  const portablePages = () => pages.map((item) => ({ pageNumber: item.page_number, content: item.content || "" }));

  async function handleNotebookExport(action: NotebookExportAction) {
    if (!pages.length || exporting) return;
    setExporting(action);
    try {
      const title = notebook?.title || "Caderno";
      if (action === "samsung" || action === "pdf") await exportNotebookPdf(action);
      if (action === "png") {
        const canvas = await renderNotebookPage(pages[currentPage], currentPage);
        const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob((value) => value ? resolve(value) : reject(new Error("Não foi possível preparar a imagem.")), "image/png"));
        downloadNotebookBlob(blob, "image/png", notebookExportFilename(title, `pagina-${currentPage + 1}`, "png"));
        toast.success("Página atual exportada em PNG.");
      }
      if (action === "html") {
        const html = await embedNotebookImages(buildStandaloneNotebookHtml(title, portablePages()));
        downloadNotebookBlob(html, "text/html;charset=utf-8", notebookExportFilename(title, "editavel", "html"));
        toast.success("Caderno editável exportado em HTML.");
      }
      if (action === "markdown") {
        downloadNotebookBlob(notebookToMarkdown(title, portablePages()), "text/markdown;charset=utf-8", notebookExportFilename(title, "", "md"));
        toast.success("Caderno exportado em Markdown.");
      }
      if (action === "text") {
        downloadNotebookBlob(notebookToPlainText(title, portablePages()), "text/plain;charset=utf-8", notebookExportFilename(title, "", "txt"));
        toast.success("Caderno exportado como texto.");
      }
      if (action === "copy") {
        const html = pages[currentPage]?.content || "<p></p>";
        const text = notebookToPlainText(title, [{ pageNumber: currentPage + 1, content: html }]);
        const embeddedDocument = await embedNotebookImages(`<!doctype html><html><body>${html}</body></html>`);
        const embeddedHtml = new DOMParser().parseFromString(embeddedDocument, "text/html").body.innerHTML;
        if (typeof ClipboardItem !== "undefined" && navigator.clipboard?.write) {
          await navigator.clipboard.write([new ClipboardItem({ "text/html": new Blob([embeddedHtml], { type: "text/html" }), "text/plain": new Blob([text], { type: "text/plain" }) })]);
        } else await navigator.clipboard.writeText(text);
        toast.success("Página copiada com formatação.");
      }
      setExportDialogOpen(false);
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Não foi possível exportar o caderno.");
    } finally {
      setExporting(null);
    }
  }

  async function importPdfAsPages(file: File) {
    if (!user?.id || !id || pdfImporting) return;
    if (file.size > 50 * 1024 * 1024) { toast.error("Escolha um PDF de até 50 MB."); return; }
    setPdfImporting(true);
    const loadingId = toast.loading("Abrindo o PDF...");
    const uploadedPaths: string[] = [];
    try {
      const { renderPdfPages } = await import("@/lib/notebookPdfImport");
      const rendered = await renderPdfPages(file, (current, total) => {
        toast.loading(`Renderizando página ${current} de ${total}...`, { id: loadingId });
      });
      const importId = crypto.randomUUID();
      const rows: Array<{ notebook_id: string; user_id: string; page_number: number; content: string; drawing_data: Json }> = [];
      for (const renderedPage of rendered) {
        toast.loading(`Salvando página ${renderedPage.pageNumber} de ${rendered.length}...`, { id: loadingId });
        const path = `${user.id}/${id}/pdf-${importId}/page-${renderedPage.pageNumber}.jpg`;
        const { error: uploadError } = await supabase.storage.from("notebook-images").upload(path, renderedPage.blob, {
          contentType: "image/jpeg",
          upsert: false,
        });
        if (uploadError) throw uploadError;
        uploadedPaths.push(path);
        const { data: publicData } = supabase.storage.from("notebook-images").getPublicUrl(path);
        rows.push({
          notebook_id: id,
          user_id: user.id,
          page_number: pages.length + renderedPage.pageNumber,
          content: "",
          drawing_data: drawingToJson({ ...emptyDrawing, backgroundImage: publicData.publicUrl, backgroundSource: "pdf" }),
        });
      }
      const { data, error } = await supabase.from("notebook_pages").insert(rows).select();
      if (error) throw error;
      const imported = (data ?? []).map(rowToNotebookPage);
      setPages((current) => [...current, ...imported]);
      if (imported.length) {
        setCurrentPage(pages.length);
        setMode("draw");
        setDrawTool("pen");
      }
      toast.dismiss(loadingId);
      toast.success(`${imported.length} página${imported.length === 1 ? "" : "s"} importada${imported.length === 1 ? "" : "s"}. Agora você pode escrever por cima.`);
    } catch (error: unknown) {
      if (uploadedPaths.length) await supabase.storage.from("notebook-images").remove(uploadedPaths);
      toast.dismiss(loadingId);
      toast.error(error instanceof Error ? error.message : "Não foi possível importar o PDF.");
    } finally {
      setPdfImporting(false);
      if (pdfInputRef.current) pdfInputRef.current.value = "";
    }
  }

  return (
    <div className={`nb-editor-container min-h-dvh bg-background flex flex-col ${isMedicalNotebook ? "is-medical-notebook" : ""} ${expandedEditor ? "fixed inset-0 z-50 overflow-auto" : ""}`}
      style={{
        ...(expandedEditor ? { touchAction: "pan-x pan-y pinch-zoom" } : {}),
        "--nb-notebook-accent": notebook?.cover_color || "#397563",
      } as CSSProperties}
    >
      {/* Floating back button + mode dock in fullscreen */}
      {expandedEditor && (
        <>
          <button
            onClick={() => setExpandedEditor(false)}
            className="fixed top-3 left-3 z-[60] rounded-full bg-background/90 border border-border shadow-lg p-2.5 hover:bg-muted transition-colors backdrop-blur-sm"
            title="Voltar ao layout normal"
          >
            <Minimize2 className="w-5 h-5" />
          </button>

        </>
      )}

      <div className="nb-peek-top pinned sticky top-0 z-40">
        <div className="nb-peek-trigger" aria-hidden />
        <header className="nb-peek-content nb-editor-header">
          <div className="nb-editor-topline">
            <button type="button" className="nb-editor-back" aria-label="Voltar para cadernos" onClick={() => navigate("/notebooks")}><ArrowLeft /></button>
            <div className="nb-editor-identity">
              <span><FileText /></span>
              <div><small>{isMedicalNotebook ? `CADERNO MÉDICO · ${notebook?.subject || selectedSubject}` : notebook?.subject || selectedSubject || "CADERNO LIVRE"}</small><input className="nb-editor-title-input" value={titleDraft} onChange={(event) => setTitleDraft(event.target.value)} onBlur={() => void saveNotebookTitle()} onKeyDown={(event) => { if (event.key === "Enter") event.currentTarget.blur(); if (event.key === "Escape") { setTitleDraft(notebook?.title || "Sem título"); event.currentTarget.blur(); } }} aria-label="Nome do caderno" title="Clique para renomear" /></div>
            </div>

            <div className={`nb-save-state ${saveStatus}`}>
              {saveStatus === "saving" && <><RefreshCw className="animate-spin" /><span>Salvando</span></>}
              {saveStatus === "saved" && <><Cloud /><span>Salvo</span></>}
              {saveStatus === "error" && <><CloudOff /><span>Erro ao salvar</span></>}
              {saveStatus === "offline" && <><CloudOff /><span>Offline{pendingOffline > 0 ? ` · ${pendingOffline}` : ""}</span></>}
            </div>

            <form className="nb-editor-search" onSubmit={(event) => { event.preventDefault(); searchAndJumpToPage(); }}>
              <Search /><Input value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="Buscar neste caderno…" aria-label="Buscar texto ou etiqueta no caderno" />
            </form>

            <div className="nb-editor-actions">
              <button type="button" onClick={() => setShareDialogOpen(true)} title="Compartilhar caderno" aria-label="Compartilhar caderno"><Share2 /></button>
              <button type="button" onClick={() => setFocusModeActive((active) => !active)} title="Modo foco" aria-label="Alternar modo foco"><Eye /></button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild><button type="button" title="Mais opções" aria-label="Mais opções do caderno"><MoreHorizontal /></button></DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-72">
                  <DropdownMenuLabel>Papel e visual</DropdownMenuLabel>
                  <DropdownMenuItem onClick={() => setHandwritingMode((value) => !value)}><span className="mr-2 text-base font-bold" style={{ fontFamily: "Caveat, cursive" }}>Aa</span>{handwritingMode ? "Usar tipografia digital" : "Usar caligrafia manuscrita"}</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setPaperMargin((value) => !value)}><span className="mr-3 block h-4 w-0.5 rounded bg-red-400" />{paperMargin ? "Esconder margem" : "Mostrar margem"}</DropdownMenuItem>
                  <DropdownMenuLabel className="mt-1 text-[10px] uppercase tracking-wide text-muted-foreground">Modelo da página</DropdownMenuLabel>
                  <div className="grid grid-cols-2 gap-1 px-1 pb-1">{([[
                    "blank", "Em branco"], ["lined", "Pautado"], ["grid", "Quadriculado"], ["dotted", "Pontilhado"], ["physics", "Física"], ["chemistry", "Química"], ["essay", "Redação"],
                  ] as const).map(([value, label]) => <Button key={value} type="button" variant={pageTemplate === value ? "secondary" : "ghost"} size="sm" className="h-8 justify-start text-xs" onClick={() => changePageTemplate(value)}><LayoutTemplate className="mr-1.5 h-3.5 w-3.5" />{label}</Button>)}</div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setExpandedEditor((value) => !value)}>{expandedEditor ? <Minimize2 className="mr-2 h-4 w-4" /> : <Maximize2 className="mr-2 h-4 w-4" />}{expandedEditor ? "Sair da tela cheia" : "Abrir tela cheia"}</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setExportDialogOpen(true)}><Download className="mr-2 h-4 w-4" />Exportar / abrir em outro app</DropdownMenuItem>
                  <DropdownMenuItem disabled={pdfImporting} onClick={() => pdfInputRef.current?.click()}>{pdfImporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileUp className="mr-2 h-4 w-4" />}{pdfImporting ? "Importando PDF…" : "Importar PDF para anotar"}</DropdownMenuItem>
                  <input ref={pdfInputRef} type="file" accept="application/pdf,.pdf" className="hidden" onChange={(event) => { const file = event.target.files?.[0]; if (file) void importPdfAsPages(file); }} />
                  <DropdownMenuItem onClick={restorePreviousVersion}><History className="mr-2 h-4 w-4" />Restaurar versão anterior</DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => void handleExplainDrawing()}><Wand2 className="mr-2 h-4 w-4" />Explicar desenho com a Flora</DropdownMenuItem>
                  <DropdownMenuItem onClick={toggleGhostCompletion}><Sparkles className="mr-2 h-4 w-4" />{ghostEnabled ? "Desativar autocomplete" : "Ativar autocomplete"}</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          <div className="nb-editor-subline">
            <div className="nb-page-switcher">
              <button type="button" aria-label="Página anterior" onClick={() => setCurrentPage((pageIndex) => Math.max(0, pageIndex - 1))} disabled={currentPage === 0}><ChevronLeft /></button>
              <span><b>{currentPage + 1}</b> de {pages.length}</span>
              <button type="button" aria-label="Próxima página" onClick={() => setCurrentPage((pageIndex) => Math.min(pages.length - 1, pageIndex + 1))} disabled={currentPage === pages.length - 1}><ChevronRight /></button>
              <button type="button" className="add" aria-label="Adicionar nova página" onClick={addPage} title="Nova página"><Plus /></button>
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild><button type="button" className="nb-study-page-button">{isMedicalNotebook ? <Stethoscope /> : <Brain />}<span>{isMedicalNotebook ? "Ferramentas médicas" : "Estudar esta página"}</span></button></DropdownMenuTrigger>
              <DropdownMenuContent align="center" className="w-64">
                <DropdownMenuLabel>{isMedicalNotebook ? "Estudar e estruturar a página" : "Aprender com a página"}</DropdownMenuLabel>
                <DropdownMenuItem onClick={handleGenerateSummaryFromPage} disabled={generatingStudy !== "none"}>{generatingStudy === "summary" && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Gerar resumo explicado</DropdownMenuItem>
                <DropdownMenuItem onClick={handleGenerateFlashcardsFromPage} disabled={generatingStudy !== "none"}>{generatingStudy === "flashcards" && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Gerar flashcards</DropdownMenuItem>
                <DropdownMenuItem onClick={handleGenerateQuizFromPage} disabled={generatingStudy !== "none"}>{generatingStudy === "quiz" && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Gerar quiz</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleGenerateFlashcardsFromSelection} disabled={generatingStudy !== "none"}>Flashcards do trecho selecionado</DropdownMenuItem>
                <DropdownMenuItem onClick={handleGenerateQuizFromSelection} disabled={generatingStudy !== "none"}>Quiz do trecho selecionado</DropdownMenuItem>
                <DropdownMenuItem onClick={handleSuggestTags}><TagIcon className="mr-2 h-4 w-4" />Sugerir etiquetas</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuLabel className="text-xs opacity-70">{isMedicalNotebook ? "Blocos médicos de" : "Blocos de"} {selectedSubject || "estudo"}</DropdownMenuLabel>
                {getTemplatesForSubject(selectedSubject).map((template) => <DropdownMenuItem key={template.id} onClick={() => handleInsertTemplate(template.html, template.label)}><LayoutTemplate className="mr-2 h-4 w-4" />Inserir {template.label}</DropdownMenuItem>)}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => fileInputRef.current?.click()} disabled={ocrLoading}><Camera className="mr-2 h-4 w-4" />Digitalizar foto (OCR)</DropdownMenuItem>
                <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleOCR} />
                <DropdownMenuItem onClick={handleCreateTopicFromPage}><BookPlus className="mr-2 h-4 w-4" />Criar tópico desta página</DropdownMenuItem>
                <DropdownMenuItem onClick={handleSyncSummaryToTopic}><Cloud className="mr-2 h-4 w-4" />Enviar resumo para tópico</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <button type="button" className="nb-medical-gallery-button" onClick={() => setMedicalAssetPickerOpen(true)}><Images /><span>Atlas visual</span></button>

            <AudioSummaryButton content={currentPageData?.content || ""} title={notebook?.title || `Página ${currentPage + 1}`} />
          </div>
        </header>
      </div>

      <NotebookStudioToolbar
        mode={mode}
        onModeChange={setMode}
        drawTool={drawTool}
        onDrawToolChange={setDrawTool}
        drawBrush={drawBrush}
        onDrawBrushChange={setDrawBrush}
        penColor={penColor}
        onColorChange={setPenColor}
        penWidth={penWidth}
        onWidthChange={setPenWidth}
        onClear={() => updateDrawingState({ ...drawingState, strokes: [], stickyNotes: [], mathSuggestions: [] })}
        onUndo={() => {
          const lastStroke = drawingState.strokes[drawingState.strokes.length - 1];
          if (lastStroke) {
            setRedoStrokes((prev) => [...prev, lastStroke]);
            updateDrawingState({ ...drawingState, strokes: drawingState.strokes.slice(0, -1) });
          }
        }}
        onRedo={() => {
          const restored = redoStrokes[redoStrokes.length - 1];
          if (!restored) return;
          setRedoStrokes((prev) => prev.slice(0, -1));
          updateDrawingState({ ...drawingState, strokes: [...drawingState.strokes, restored] });
        }}
        canUndo={drawingState.strokes.length > 0}
        canRedo={redoStrokes.length > 0}
        onAddSticky={(color) => handleStickyNotesChange([
          ...drawingState.stickyNotes,
          { id: crypto.randomUUID(), x: 80, y: 80, width: 180, height: 140, text: "", color },
        ])}
        onToggleFlora={() => setFloraOpen(!floraOpen)}
        floraOpen={floraOpen}
        onSolveSelection={handleSolveSelection}
        autoSolveEnabled={autoSolveEnabled}
        onToggleAutoSolve={handleToggleAutoSolve}
        solvingMath={solvingMath}
        hasSelection={!!selectionBounds}
        onDuplicateSelection={() => canvasRef.current?.duplicateSelection?.()}
        onDeleteSelection={() => canvasRef.current?.deleteSelection?.()}
        mathStatus={mathStatus}
      />

      <ShareNotebookDialog
        open={shareDialogOpen}
        onOpenChange={setShareDialogOpen}
        notebookId={id!}
        notebookTitle={notebook?.title || ""}
        userId={user?.id || ""}
      />

      <MedicalAssetPicker open={medicalAssetPickerOpen} onOpenChange={setMedicalAssetPickerOpen} onInsert={insertMedicalAsset} />
      <NotebookExportDialog open={exportDialogOpen} onOpenChange={setExportDialogOpen} exporting={exporting} onExport={(action) => void handleNotebookExport(action)} />

      {/* Editor */}
      {focusModeActive ? (
        <FocusMode isActive={focusModeActive} onToggle={() => setFocusModeActive(false)}>
          <div
            ref={editorContainerRef}
            className={`flex-1 overflow-auto w-full h-full`}
          >
            <div className="relative min-h-full">
              <RichEditor
                content={page?.content || ""}
                onChange={handleContentChange}
                userId={user!.id}
                notebookId={id!}
                darkMode={darkMode}
                onToggleDarkMode={() => setDarkMode((d) => !d)}
                template={pageTemplate}
                zoom={zoom}
                wide={expandedEditor}
                handwriting={handwritingMode}
                showMargin={paperMargin}
                backgroundImage={drawingState.backgroundImage}
                insertionRequest={editorInsertion}
                onInsertionHandled={handleInsertionHandled}
                paperOverlay={
                  <KonvaDrawingCanvas
                    ref={canvasRef}
                    strokes={drawingState.strokes}
                    onStrokesChange={handleStrokesChange}
                    active={mode === "draw"}
                    penColor={penColor}
                    penWidth={penWidth}
                    tool={drawTool}
                    brush={drawBrush}
                    zoom={1}
                    onSelectionChange={setSelectionBounds}
                  />
                }
              />

              {drawingState.stickyNotes.map((note) => (
                <StickyNote
                  key={note.id}
                  note={note}
                  active={mode === "draw"}
                  onUpdate={(updated) => handleStickyNotesChange(drawingState.stickyNotes.map((n) => n.id === updated.id ? updated : n))}
                  onDelete={(idToDelete) => handleStickyNotesChange(drawingState.stickyNotes.filter((n) => n.id !== idToDelete))}
                />
              ))}

            </div>
          </div>
        </FocusMode>
      ) : (
        <div className="nb-layout">
          {!expandedEditor && (
            <PageSidebarGrid
              pages={pages}
              currentPage={currentPage}
              onSelectPage={setCurrentPage}
              onAddPage={addPage}
              onDeletePage={(idx) => { void deletePage(idx); }}
              onDuplicatePage={(idx) => { void duplicatePage(idx); }}
              onReorderPages={(fromIndex, toIndex) => { void reorderPages(fromIndex, toIndex); }}
              pageMeta={pageMeta}
              notebookId={id}
              hasActivity={(pageId) => aiActivities.some((activity) => activity.pageId === pageId)}
            />
          )}

          <div
            ref={editorContainerRef}
            className={`nb-paper-area ${expandedEditor ? "w-full h-full" : ""}`}
          >
            <div key={currentPage} className="relative min-h-full w-full flex-1 page-flip-anim">
              <RichEditor
                content={page?.content || ""}
                onChange={handleContentChange}
                userId={user!.id}
                notebookId={id!}
                darkMode={darkMode}
                onToggleDarkMode={() => setDarkMode((d) => !d)}
                template={pageTemplate}
                zoom={zoom}
                wide={expandedEditor}
                handwriting={handwritingMode}
                showMargin={paperMargin}
                backgroundImage={drawingState.backgroundImage}
                insertionRequest={editorInsertion}
                onInsertionHandled={handleInsertionHandled}
                paperOverlay={
                  <KonvaDrawingCanvas
                    ref={canvasRef}
                    strokes={drawingState.strokes}
                    onStrokesChange={handleStrokesChange}
                    active={mode === "draw"}
                    penColor={penColor}
                    penWidth={penWidth}
                    tool={drawTool}
                    brush={drawBrush}
                    zoom={1}
                    onSelectionChange={setSelectionBounds}
                  />
                }
              />

              {drawingState.stickyNotes.map((note) => (
                <StickyNote
                  key={note.id}
                  note={note}
                  active={mode === "draw"}
                  onUpdate={(updated) => handleStickyNotesChange(drawingState.stickyNotes.map((n) => n.id === updated.id ? updated : n))}
                  onDelete={(idToDelete) => handleStickyNotesChange(drawingState.stickyNotes.filter((n) => n.id !== idToDelete))}
                />
              ))}

            </div>
          </div>
          
          <FloraNotebookSidebar
            open={floraOpen}
            onClose={() => setFloraOpen(false)}
            linkedTopicTitle={notebook?.title}
            summary={currentSummary}
            activities={aiActivities}
            generatingStudy={generatingStudy}
            onGenerateSummary={handleGenerateSummaryFromPage}
            onGenerateFlashcards={handleGenerateFlashcardsFromPage}
            onGenerateQuiz={handleGenerateQuizFromPage}
            onCreateTopic={handleCreateTopicFromPage}
            onSyncSummary={handleSyncSummaryToTopic}
            onGenerateImage={handleGenerateImageOnPage}
          />
        </div>
      )}

      <Dialog
        open={quizDialogOpen}
        onOpenChange={(open) => {
          setQuizDialogOpen(open);
          if (!open) resetNotebookQuiz();
        }}
      >
        <DialogContent className="sm:max-w-[800px] p-0">
          <DialogHeader className="p-6 pb-0">
            <DialogTitle>Quiz do Caderno</DialogTitle>
          </DialogHeader>
          <div className="p-6 pt-0">
            {quizQuestions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8">
                <Loader2 className="w-8 h-8 animate-spin text-primary mb-4" />
                <p className="text-muted-foreground">Gerando quiz...</p>
              </div>
            ) : quizFinished ? (
              <div className="text-center">
                <h3 className="text-2xl font-bold mb-4">Quiz Concluído!</h3>
                <p className="text-lg mb-2">Você acertou {quizScore} de {quizQuestions.length} perguntas.</p>
                {quizWrongQuestions.length > 0 && (
                  <div className="mt-4 p-4 bg-red-100 dark:bg-red-900 rounded-md text-red-800 dark:text-red-200 text-left">
                    <p className="font-semibold mb-2">Perguntas que você errou:</p>
                    <ul className="list-disc list-inside">
                      {quizWrongQuestions.map((q, i) => <li key={i}>{q}</li>)}
                    </ul>
                  </div>
                )}
                <Button onClick={() => setQuizDialogOpen(false)} className="mt-6">Fechar</Button>
              </div>
            ) : (
              <div>
                <p className="text-sm text-muted-foreground mb-4">Pergunta {quizIndex + 1} de {quizQuestions.length}</p>
                <h4 className="text-lg font-semibold mb-4">{quizQuestions[quizIndex].pergunta}</h4>
                <div className="grid gap-2">
                  {quizQuestions[quizIndex].alternativas.map((alt, idx) => (
                    <Button
                      key={idx}
                      variant={quizSelected === idx ? (idx === quizQuestions[quizIndex].correta ? "secondary" : "destructive") : "outline"}
                      onClick={() => answerNotebookQuiz(idx)}
                      disabled={quizSelected !== null}
                      className="justify-start h-auto whitespace-normal text-left"
                    >
                      {alt}
                      {quizSelected === idx && idx === quizQuestions[quizIndex].correta && <CheckCircle2 className="ml-auto w-4 h-4 text-green-500" />}
                      {quizSelected === idx && idx !== quizQuestions[quizIndex].correta && <XCircle className="ml-auto w-4 h-4 text-red-500" />}
                    </Button>
                  ))}
                </div>
                {quizSelected !== null && (
                  <div className="mt-4 p-4 bg-muted rounded-md">
                    <p className="font-semibold">Explicação:</p>
                    <p className="text-sm text-muted-foreground">{quizQuestions[quizIndex].explicacao}</p>
                  </div>
                )}
                <Button onClick={nextNotebookQuiz} className="mt-6" disabled={quizSelected === null}>Próxima</Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
