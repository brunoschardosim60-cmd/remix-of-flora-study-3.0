import { useState, useEffect, useRef, useCallback, lazy, Suspense } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ArrowLeft, Plus, Trash2, ChevronLeft, ChevronRight, Loader2, Pencil, Type, Maximize2, Minimize2, Share2,
  Brain, Sparkles, BookPlus, CheckCircle2, XCircle, ZoomIn, ZoomOut, FileText, Cloud, CloudOff, RefreshCw, Eye, Camera,
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

const KonvaDrawingCanvas = lazy(() =>
  import("@/components/notebook/KonvaDrawingCanvas").then((m) => ({ default: m.KonvaDrawingCanvas }))
);

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

import { SamsungStyleToolbar } from "@/components/notebook/SamsungStyleToolbar";
import { PageSidebarGrid } from "@/components/notebook/PageSidebarGrid";
import { FloraNotebookSidebar } from "@/components/notebook/FloraNotebookSidebar";
import "@/components/notebook/notebook-premium.css";
import { ShareNotebookDialog } from "@/components/notebook/ShareNotebookDialog";
import { StickyNote, type StickyNoteData } from "@/components/notebook/StickyNote";
import { FocusMode } from "@/components/notebook/FocusMode";
import { ALL_SUBJECTS, createTopic, loadTopics, type Flashcard, type Subject } from "@/lib/studyData";
import { saveTopicsForUser } from "@/lib/studyStateStore";
import { toLocalDateStr } from "@/lib/dateUtils";
import { loadJsonStorage, loadStringStorage } from "@/lib/storage";
import { getNotebookAIActivities, recordAIActivity, type AIActivityItem } from "@/lib/aiActivityStore";
import { scheduleSpacedReviews } from "@/lib/spacedReviews";
import type { Json } from "@/integrations/supabase/types";

type PageTemplate = "blank" | "lined" | "grid" | "dotted" | "physics" | "chemistry" | "essay";

// Adapta DrawingState (que contém Date implicitamente nada, mas é typed local) para Json do Supabase.
function drawingToJson(d: DrawingState): Json {
  return JSON.parse(JSON.stringify(d)) as Json;
}

// Converte um row genérico do supabase para NotebookPage (drawing_data vem como Json | null).
function rowToNotebookPage(row: {
  id: string; notebook_id: string; user_id: string; page_number: number;
  content: string; drawing_data: Json | null; tags: string[];
}): NotebookPage {
  return {
    id: row.id,
    notebook_id: row.notebook_id,
    user_id: row.user_id,
    page_number: row.page_number,
    content: row.content,
    drawing_data: (row.drawing_data as unknown as DrawingState | null) ?? null,
    tags: row.tags ?? [],
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
  const [pages, setPages] = useState<NotebookPage[]>([]);
  const [currentPage, setCurrentPage] = useState(0);
  const page = pages[currentPage];
  const [loading, setLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [darkMode, setDarkMode] = useState(false);
  const [mode, setMode] = useState<"text" | "draw">("text");
  const [pageTemplate, setPageTemplate] = useState<PageTemplate>("blank");
  const [expandedEditor, setExpandedEditor] = useState(true);
  const [focusModeActive, setFocusModeActive] = useState(false);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [zoom, setZoom] = useState(1);
  const editorContainerRef = useRef<HTMLDivElement>(null);
  const [drawTool, setDrawTool] = useState<"pen" | "marker" | "eraser" | "select" | "line" | "rect" | "circle">("pen");
  const [floraOpen, setFloraOpen] = useState(false);
  const [selectionBounds, setSelectionBounds] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  const [penColor, setPenColor] = useState("#000000");
  const [penWidth, setPenWidth] = useState(2);
  const [autoSolveEnabled, setAutoSolveEnabled] = useState(() => {
    const stored = loadStringStorage(NOTEBOOK_AUTOSOLVE_STORAGE_KEY);
    return stored == null ? true : stored === "1";
  });
  const [headerPinned, setHeaderPinned] = useState(false);
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
  const [generatingStudy, setGeneratingStudy] = useState<"none" | "flashcards" | "quiz" | "summary">("none");
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
    updateDrawingState({ ...drawingStateRef.current, strokes });
  }, [updateDrawingState]);

  const handleStickyNotesChange = useCallback((stickyNotes: StickyNoteData[]) => {
    updateDrawingState({ ...drawingStateRef.current, stickyNotes });
  }, [updateDrawingState]);

  const handleMathSuggestionsChange = useCallback((mathSuggestions: MathSuggestion[]) => {
    updateDrawingState({ ...drawingStateRef.current, mathSuggestions });
  }, [updateDrawingState]);

  const drawingState = currentPageData?.drawing_data ?? emptyDrawing;

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

      try {
        const { error } = await supabase
          .from("notebook_pages")
          .update({
            content: currentPageData.content,
            drawing_data: drawingToJson(currentPageData.drawing_data ?? emptyDrawing),
            tags: currentMeta?.tags ?? [],
          })
          .eq("id", currentPageData.id);

        if (error) throw error;
        setSaveStatus("saved");
      } catch (error) {
        console.error("Failed to save page:", error);
        setSaveStatus("error");
        toast.error("Erro ao salvar página.");
      }
    }, 1000);

    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [currentPageData, id, currentMeta?.tags]);

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

  const handleSolveSelection = useCallback(async () => {
    if (!selectionBounds) {
      toast.info("Selecione uma região primeiro (ferramenta de seleção).");
      return;
    }
    if (solvingMathRef.current) return;

    solvingMathRef.current = true;
    setSolvingMath(true);
    setMathStatus("processing");
    try {
      const imageData = canvasRef.current?.getImageData(selectionBounds);
      if (!imageData) {
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
        setMathStatus("idle");
        toast.info("Não consegui identificar uma expressão na região.");
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
  }, [applySolutions, drawingState.strokes, selectionBounds]);


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

  const deletePage = async () => {
    if (pages.length <= 1) return;
    const pageToDelete = pages[currentPage];
    await supabase.from("notebook_pages").delete().eq("id", pageToDelete.id);
    const newPages = pages.filter((_, i) => i !== currentPage);
    setPages(newPages);
    setCurrentPage(Math.min(currentPage, newPages.length - 1));
  };

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
      if (e.key === "Escape" && autoSolveEnabled) {
        setAutoSolveEnabled(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [autoSolveEnabled]);

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

  return (
    <div className={`min-h-dvh bg-background flex flex-col ${expandedEditor ? "fixed inset-0 z-50 overflow-auto" : ""}`}
      style={expandedEditor ? { touchAction: "pan-x pan-y pinch-zoom" } : undefined}
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

      {/* Header - auto-hide. Show only on hover (peek strip at top). */}
      <div
        className={`nb-peek-top sticky top-0 z-40 ${
          headerPinned || generatingStudy !== "none" || ocrLoading ? "pinned" : ""
        }`}
      >
        <div className="nb-peek-trigger" aria-hidden />
        <header className="nb-peek-content border-b border-border bg-card/80 backdrop-blur-md">
        <div className="container max-w-7xl mx-auto px-3 sm:px-4 py-2 flex flex-wrap items-center gap-2 sm:gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/notebooks")} className="h-11 w-11 sm:h-10 sm:w-10">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="font-heading font-bold text-base sm:text-lg truncate min-w-0 flex-1">{notebook?.title}</h1>
          {/* Save status indicator */}
          <div className="flex items-center gap-1 text-xs shrink-0">
            {saveStatus === "saving" && (
              <span className="flex items-center gap-1 text-muted-foreground animate-pulse">
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span className="hidden sm:inline">Salvando…</span>
              </span>
            )}
            {saveStatus === "saved" && (
              <span className="flex items-center gap-1 text-primary">
                <Cloud className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Salvo</span>
              </span>
            )}
            {saveStatus === "error" && (
              <span className="flex items-center gap-1 text-destructive">
                <CloudOff className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Erro ao salvar</span>
              </span>
            )}
          </div>

          {/* Mode toggle */}
          <div className="order-4 sm:order-none w-full sm:w-auto flex items-center bg-muted rounded-lg p-0.5 gap-0.5 overflow-x-auto">
            <button
              type="button"
              onClick={() => setMode("text")}
              className={`flex-1 sm:flex-none justify-center flex items-center gap-1 px-4 py-2 sm:px-3 sm:py-1 rounded-md text-sm font-medium transition-all whitespace-nowrap ${
                mode === "text" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"
              }`}
            >
              <Type className="w-4 h-4" />
              Texto
            </button>
            <button
              type="button"
              onClick={() => setMode("draw")}
              className={`flex-1 sm:flex-none justify-center flex items-center gap-1 px-4 py-2 sm:px-3 sm:py-1 rounded-md text-sm font-medium transition-all whitespace-nowrap ${
                mode === "draw" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"
              }`}
            >
              <Pencil className="w-4 h-4" />
              Desenhar
            </button>
          </div>

          <div className="order-6 sm:order-none w-full sm:w-auto flex flex-wrap sm:flex-nowrap items-center gap-2">
            <Select
              value={selectedSubject}
              onValueChange={(v) => setSelectedSubject(v as Subject)}
              onOpenChange={(open) => setHeaderPinned(open)}
            >
              <SelectTrigger className="h-9 w-full sm:w-auto min-w-0 sm:min-w-[150px]">
                <SelectValue placeholder="Matéria" />
              </SelectTrigger>
              <SelectContent>
                {(notebook?.subject
                  ? ALL_SUBJECTS.filter((s) => s === notebook.subject)
                  : ALL_SUBJECTS
                ).map((subject) => (
                  <SelectItem key={subject} value={subject}>{subject}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* AI toggle icon - works for both text and draw */}
            <button
              type="button"
              onClick={() => handleToggleAutoSolve(!autoSolveEnabled)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                autoSolveEnabled ? "bg-primary/20 text-primary" : "text-muted-foreground hover:bg-muted"
              }`}
              title={autoSolveEnabled ? "IA ativa — clique ou ESC para sair" : "Ativar IA (modo seleção)"}
            >
              <Sparkles className="w-4 h-4" />
              <span className="hidden sm:inline">IA</span>
            </button>

            <DropdownMenu onOpenChange={(open) => setHeaderPinned(open)}>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-11 w-11 sm:h-8 sm:w-8">
                  <Brain className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>Ações da Flora</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleGenerateSummaryFromPage} disabled={generatingStudy !== "none"}>
                  {generatingStudy === "summary" && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Gerar Resumo
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleGenerateFlashcardsFromPage} disabled={generatingStudy !== "none"}>
                  {generatingStudy === "flashcards" && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Gerar Flashcards
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleGenerateQuizFromPage} disabled={generatingStudy !== "none"}>
                  {generatingStudy === "quiz" && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Gerar Quiz
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => fileInputRef.current?.click()} disabled={ocrLoading}>
                  <Camera className="w-4 h-4 mr-2" />
                  Digitalizar foto (OCR)
                </DropdownMenuItem>
                <input
                  type="file"
                  ref={fileInputRef}
                  className="hidden"
                  accept="image/*"
                  onChange={handleOCR}
                />

                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleCreateTopicFromPage}>
                  <BookPlus className="w-4 h-4 mr-2" />
                  Criar Tópico a partir da página
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleSyncSummaryToTopic}>
                  <Cloud className="w-4 h-4 mr-2" />
                  Enviar Resumo para Tópico
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShareDialogOpen(true)}
              className="h-11 w-11 sm:h-8 sm:w-8"
              title="Compartilhar caderno"
            >
              <Share2 className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setFocusModeActive((prev) => !prev)}
              className="h-11 w-11 sm:h-8 sm:w-8"
              title="Modo foco"
            >
              <Eye className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setExpandedEditor((v) => !v)}
              className="h-11 w-11 sm:h-8 sm:w-8"
              title={expandedEditor ? "Sair da tela cheia" : "Tela cheia"}
            >
              {expandedEditor ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </Button>
          </div>

          {/* Page navigation */}
          <div className="order-5 sm:order-none w-full sm:w-auto flex items-center gap-1">
            <Button variant="ghost" size="icon" onClick={() => setCurrentPage((prev) => Math.max(0, prev - 1))} disabled={currentPage === 0}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="text-sm text-muted-foreground">
              Página {currentPage + 1} de {pages.length}
            </span>
            <Button variant="ghost" size="icon" onClick={() => setCurrentPage((prev) => Math.min(pages.length - 1, prev + 1))} disabled={currentPage === pages.length - 1}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>
      </div>

      <SamsungStyleToolbar
        mode={mode}
        onModeChange={setMode}
        drawTool={drawTool}
        onDrawToolChange={setDrawTool}
        penColor={penColor}
        onColorChange={setPenColor}
        penWidth={penWidth}
        onWidthChange={setPenWidth}
        onClear={() => updateDrawingState({ ...drawingState, strokes: [], stickyNotes: [], mathSuggestions: [] })}
        onUndo={() => {
          const lastStroke = drawingState.strokes[drawingState.strokes.length - 1];
          if (lastStroke) {
            updateDrawingState({ ...drawingState, strokes: drawingState.strokes.slice(0, -1) });
          }
        }}
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
        mathStatus={mathStatus}
      />

      <ShareNotebookDialog
        open={shareDialogOpen}
        onOpenChange={setShareDialogOpen}
        notebookId={id!}
        notebookTitle={notebook?.title || ""}
        userId={user?.id || ""}
      />

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
                paperOverlay={
                  <Suspense fallback={null}>
                    <KonvaDrawingCanvas
                      ref={canvasRef}
                      strokes={drawingState.strokes}
                      onStrokesChange={handleStrokesChange}
                      active={mode === "draw"}
                      penColor={penColor}
                      penWidth={penWidth}
                      tool={drawTool}
                      zoom={1}
                      onSelectionChange={setSelectionBounds}
                    />
                  </Suspense>
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
              onDeletePage={(idx) => { setCurrentPage(idx === 0 ? 0 : idx - 1); deletePage(); }}
            />
          )}

          <div
            ref={editorContainerRef}
            className={`nb-paper-area ${expandedEditor ? "w-full h-full" : ""}`}
          >
            <div className="relative min-h-full w-full flex-1">
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
                paperOverlay={
                  <Suspense fallback={null}>
                    <KonvaDrawingCanvas
                      ref={canvasRef}
                      strokes={drawingState.strokes}
                      onStrokesChange={handleStrokesChange}
                      active={mode === "draw"}
                      penColor={penColor}
                      penWidth={penWidth}
                      tool={drawTool}
                      zoom={1}
                      onSelectionChange={setSelectionBounds}
                    />
                  </Suspense>
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
