import { useState, useEffect, useCallback, useMemo, lazy, Suspense } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { BookOpen, CalendarDays, LayoutGrid, NotebookPen, FileText, BarChart3, Sun, Moon, CircleDot, LogOut, Settings, Library } from "lucide-react";
import { useTheme } from "next-themes";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { createTopic, StudyTopic, WeeklySlot, ALL_SUBJECTS, Subject } from "@/lib/studyData";
import { DashboardHero } from "@/components/DashboardHero";
import { AddTopicForm } from "@/components/AddTopicForm";
import { StudyTimer } from "@/components/StudyTimer";
import { FocusMiniPlayer } from "@/components/FocusMiniPlayer";
import { QuickStartChecklist } from "@/components/QuickStartChecklist";
import { applyCustomColors, CustomThemeDialog } from "@/components/CustomThemeDialog";
import { BottomNav } from "@/components/BottomNav";
import { useStudyDashboard } from "@/hooks/useStudyDashboard";
import { useStudyTimer } from "@/hooks/useStudyTimer";
import { useOnboardingGuard } from "@/hooks/useOnboardingGuard";
import { useFloraEvents } from "@/hooks/useFloraEvents";
import { loadStringStorage } from "@/lib/storage";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 as Loader2Icon } from "lucide-react";
import { loadAIActivities } from "@/lib/aiActivityStore";
import { floraStudyNow, floraStudyNowFollowup } from "@/lib/floraClient";
import { toast } from "sonner";
import { FloraConfirmationBanner } from "@/components/FloraConfirmationBanner";
import { FloraFirstAction } from "@/components/FloraFirstAction";
import { FloraIcon } from "@/components/FloraIcon";
import { toLocalDateStr } from "@/lib/dateUtils";
import { prefetchRoute, startIdlePrefetch, prefetchForContext } from "@/lib/prefetch";
import { countDueFlashcards } from "@/lib/flashcardScheduler";
import { Sparkles } from "lucide-react";


// Lazy: heavy components that DON'T appear on first render
const FloraChatPanel = lazy(() => import("@/components/FloraChatPanel").then(m => ({ default: m.FloraChatPanel })));
const FocusModeOverlay = lazy(() => import("@/components/FocusModeOverlay").then(m => ({ default: m.FocusModeOverlay })));
const QuizDialog = lazy(() => import("@/components/QuizDialog").then(m => ({ default: m.QuizDialog })));
const FlashcardSessionDialog = lazy(() => import("@/components/FlashcardSessionDialog").then(m => ({ default: m.FlashcardSessionDialog })));
const TopicNotesDialog = lazy(() => import("@/components/TopicNotesDialog").then(m => ({ default: m.TopicNotesDialog })));
const WeeklySchedule = lazy(() => import("@/components/WeeklySchedule").then(m => ({ default: m.WeeklySchedule })));
const ReactMarkdown = lazy(() => import("react-markdown"));

// Lazy: below-fold heavy components (recharts = 212KB, revision tables, stats)
const StudyHoursCards = lazy(() => import("@/components/StudyHoursCards").then(m => ({ default: m.StudyHoursCards })));
const GamificationCard = lazy(() => import("@/components/GamificationCard").then(m => ({ default: m.GamificationCard })));
const StatsCards = lazy(() => import("@/components/StatsCards").then(m => ({ default: m.StatsCards })));
const OverdueRevisions = lazy(() => import("@/components/OverdueRevisions").then(m => ({ default: m.OverdueRevisions })));
const TodayRevisions = lazy(() => import("@/components/TodayRevisions").then(m => ({ default: m.TodayRevisions })));
const WeeklyRevisionSummary = lazy(() => import("@/components/WeeklyRevisionSummary").then(m => ({ default: m.WeeklyRevisionSummary })));
const UpcomingRevisions = lazy(() => import("@/components/UpcomingRevisions").then(m => ({ default: m.UpcomingRevisions })));
const RevisionTable = lazy(() => import("@/components/RevisionTable").then(m => ({ default: m.RevisionTable })));

// Lazy: concurso-specific dashboards (only mounted for users with objetivo === "concurso")
const ConcursoDashboard = lazy(() => import("@/components/ConcursoDashboard").then(m => ({ default: m.ConcursoDashboard })));
const ConcursoTrails = lazy(() => import("@/components/ConcursoTrails").then(m => ({ default: m.ConcursoTrails })));

// Skeleton fallback for sections that take space
function SectionSkeleton({ className = "" }: { className?: string }) {
  return (
    <div className={`animate-pulse rounded-2xl border border-border/50 bg-card/50 ${className}`}>
      <div className="p-4 sm:p-5 space-y-3">
        <div className="h-4 w-1/3 rounded bg-muted" />
        <div className="h-3 w-2/3 rounded bg-muted/70" />
        <div className="h-20 rounded-xl bg-muted/50" />
      </div>
    </div>
  );
}

type Tab = "revisao" | "semanal";

export default function Index() {
  const { user, profile, isAdmin, signOut } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { theme, setTheme } = useTheme();

  const cycleTheme = () => {
    if (theme === "light") setTheme("dark");
    else if (theme === "dark") setTheme("black");
    else setTheme("light");
  };
  const ThemeIcon = theme === "light" ? Sun : theme === "dark" ? Moon : CircleDot;

  // Deep link de notificações: rola até a seção pedida
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

  // Apply custom colors on mount + start idle prefetch
  useEffect(() => {
    import("@/components/CustomThemeDialog").then(m => m.applyCustomColors());
    startIdlePrefetch();
    prefetchForContext("dashboard");
  }, []);

  // Flora: trigger proactive analysis on dashboard load (once per session)
  useEffect(() => {
    if (!user) return;
    const key = `flora-analyze-${user.id}-${new Date().toISOString().split("T")[0]}`;
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, "1");
    supabase.functions.invoke("flora-engine", {
      body: { action: "analyze_and_suggest" },
    }).then(() => {
      window.dispatchEvent(new Event("flora-decisions-updated"));
    }).catch(() => {});
  }, [user]);

  // Force onboarding for logged-in users who haven't completed it (admins skip)
  const onboardingChecked = useOnboardingGuard(user, isAdmin);

  // Lê objetivo do aluno para direcionar o link "Banco" (ENEM vs concurso).
  const [objetivo, setObjetivo] = useState<string>("");
  useEffect(() => {
    if (!user) return;
    supabase
      .from("student_onboarding")
      .select("objetivo")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => setObjetivo(data?.objetivo ?? ""));
  }, [user]);
  const bancoRoute = objetivo === "concurso" ? "/banco-concurso" : "/banco";
  const bancoLabel = objetivo === "concurso" ? "Banco Concurso" : "Banco";

  const {
    topics,
    setTopics,
    weekly,
    sessions,
    hydrated,
    canRestoreFromLocal,
    syncStatus,
    todayRevisions,
    overdueRevisions,
    upcomingRevisions,
    stats,
    momentum,
    hoursStats,
    dailyData,
    gamification,
    goalStatus,
    activeTopic,
    recommendedTopic,
    weakTopics,
    topicsWithoutNotes,
    topicsWithoutFlashcards,
    setWeekly,
    handleSessionEnd,
    handleToggleRevision,
    handleRatingChange,
    handleDelete,
    handleStartStudy,
    handleClearActiveStudy,
    handleRescheduleOverdue,
    handleAdd,
    handleUpdateNotes,
    handleUpdateFlashcards,
    handleSaveQuizResult,
    handleRestoreFromLocal,
  } = useStudyDashboard();

  
  const [tab, setTab] = useState<Tab>(() => {
    if (typeof window === "undefined") return "revisao";
    const savedTab = loadStringStorage("studyflow.activeTab");
    return savedTab === "semanal" ? "semanal" : "revisao";
  });
  const [notesTopic, setNotesTopic] = useState<StudyTopic | null>(null);
  const [quizTopic, setQuizTopic] = useState<StudyTopic | null>(null);
  const [quizInitialQuestions, setQuizInitialQuestions] = useState<any[] | undefined>(undefined);
  const [addTopicOpenSignal, setAddTopicOpenSignal] = useState(0);
  const [flashcardSessionOpen, setFlashcardSessionOpen] = useState(false);
  const hasNotebookActivity = useMemo(
    () => loadAIActivities().some((item) => item.notebookId),
    []
  );
  const timer = useStudyTimer({
    onSessionEnd: handleSessionEnd,
    activeTopicId: activeTopic?.id ?? null,
    activeSubject: activeTopic?.materia ?? null,
  });

  // ── Flora event listeners (extraídos para hook dedicado) ──
  useFloraEvents({
    topics,
    setTopics,
    setWeekly,
    setQuizTopic,
    setQuizInitialQuestions,
    setNotesTopic,
    setTab,
    timer,
    dailyGoals: gamification.dailyGoals,
  });

  const firstName = (() => {
    const profileName = profile?.display_name;
    if (typeof profileName === "string" && profileName.trim()) {
      return profileName.trim().split(" ")[0];
    }

    const metaName = user?.user_metadata?.full_name || user?.user_metadata?.name;
    if (typeof metaName === "string" && metaName.trim()) {
      return metaName.trim().split(" ")[0];
    }

    if (user?.email) {
      return user.email.split("@")[0];
    }

    return undefined;
  })();

  const dailyGoals = [
    {
      id: "minutes" as const,
      label: "Tempo estudado",
      current: gamification.todayStudyMinutes,
      target: gamification.dailyGoals.studyMinutes,
      unit: "min",
    },
    {
      id: "revisions" as const,
      label: "Revisadas",
      current: gamification.todayRevisions,
      target: gamification.dailyGoals.revisions,
      unit: "itens",
    },
    {
      id: "quiz" as const,
      label: "Quiz",
      current: gamification.todayQuizCount,
      target: gamification.dailyGoals.quizCount,
      unit: "quiz",
    },
  ];

  const handleNotesDialogUpdate = useCallback((topicId: string, notas: string) => {
    handleUpdateNotes(topicId, notas);
    setNotesTopic((prev) => (prev && prev.id === topicId ? { ...prev, notas } : prev));
  }, [handleUpdateNotes]);

  const handleFlashcardsDialogUpdate = useCallback((topicId: string, flashcards: StudyTopic["flashcards"]) => {
    handleUpdateFlashcards(topicId, flashcards);
    setNotesTopic((prev) => (prev && prev.id === topicId ? { ...prev, flashcards } : prev));
  }, [handleUpdateFlashcards]);

  const dueFlashcardsCount = useMemo(() => countDueFlashcards(topics), [topics]);

  const handleStartStudyNow = useCallback((topic: StudyTopic) => {
    handleStartStudy(topic);
    timer.start();
  }, [handleStartStudy, timer]);

  useEffect(() => {
    window.localStorage.setItem("studyflow.activeTab", tab);
  }, [tab]);

  const tabs = [
    { id: "revisao" as Tab, label: "Cronograma de Revisao", icon: CalendarDays },
    { id: "semanal" as Tab, label: "Cronograma Semanal", icon: LayoutGrid },
  ];

  const [studyNowLoading, setStudyNowLoading] = useState(false);
  const [studyNowContent, setStudyNowContent] = useState<{ tema: string; materia: string; conteudo: string } | null>(null);
  const [studyNowMessages, setStudyNowMessages] = useState<Array<{ role: "flora" | "user"; content: string }>>([]);
  const [studyNowFollowupInput, setStudyNowFollowupInput] = useState("");
  const [studyNowFollowupLoading, setStudyNowFollowupLoading] = useState(false);
  const [studyChoiceOpen, setStudyChoiceOpen] = useState(false);

  const runFloraStudyNow = useCallback(async () => {
    setStudyNowLoading(true);
    try {
      const result = await floraStudyNow();
      if (result && result.conteudo) {
        setStudyNowContent(result);
        setStudyNowMessages([{ role: "flora", content: result.conteudo }]);
      } else if (recommendedTopic) {
        handleStartStudyNow(recommendedTopic);
      } else {
        toast.info("Adicione um tema ao cronograma para a Flora sugerir o que estudar.");
      }
    } catch {
      if (recommendedTopic) handleStartStudyNow(recommendedTopic);
    } finally {
      setStudyNowLoading(false);
    }
  }, [handleStartStudyNow, recommendedTopic]);

  const sendStudyNowFollowup = useCallback(async (request: string) => {
    if (!studyNowContent || !request.trim() || studyNowFollowupLoading) return;
    setStudyNowMessages((prev) => [...prev, { role: "user", content: request }]);
    setStudyNowFollowupInput("");
    setStudyNowFollowupLoading(true);
    try {
      const previousContent = studyNowMessages
        .filter((m) => m.role === "flora")
        .map((m) => m.content)
        .join("\n\n---\n\n");
      const res = await floraStudyNowFollowup({
        tema: studyNowContent.tema,
        materia: studyNowContent.materia,
        previousContent,
        userRequest: request,
      });
      if (res?.conteudo) {
        setStudyNowMessages((prev) => [...prev, { role: "flora", content: res.conteudo }]);
      } else {
        toast.error("A Flora não conseguiu responder agora. Tenta de novo?");
      }
    } finally {
      setStudyNowFollowupLoading(false);
    }
  }, [studyNowContent, studyNowMessages, studyNowFollowupLoading]);

  const closeStudyNow = useCallback(() => {
    setStudyNowContent(null);
    setStudyNowMessages([]);
    setStudyNowFollowupInput("");
  }, []);

  const handlePrimaryAction = async () => {
    setTab("revisao");

    if (topics.length === 0 && !user) {
      setAddTopicOpenSignal((prev) => prev + 1);
      return;
    }

    // If logged in: pergunta antes — não decide sozinho.
    if (user) {
      if (topics.length === 0) {
        setAddTopicOpenSignal((prev) => prev + 1);
        toast.info("Crie seu primeiro tema para começar a estudar.");
        return;
      }
      setStudyChoiceOpen(true);
      return;
    }

    if (recommendedTopic) {
      handleStartStudyNow(recommendedTopic);
    }
  };

  const primaryLabel = studyNowLoading
    ? "Flora preparando..."
    : topics.length === 0 && !user
    ? "Criar primeiro tema"
    : user
    ? "Estudar agora"
    : momentum.comebackMode
      ? "Retomar pelo mais facil"
      : "Comecar agora";

  if (!hydrated || (user && !onboardingChecked)) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2Icon className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-16 md:pb-0">
      {/* Header */}
      <header className="border-b border-border bg-card sticky top-0 z-10">
        <div className="container max-w-7xl mx-auto px-3 sm:px-4 py-3 flex items-center gap-2 sm:gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
            <BookOpen className="w-5 h-5 text-primary-foreground" />
          </div>
          <div className="flex-1 min-w-[120px]">
            <h1 className="font-heading font-bold text-lg sm:text-xl">StudyFlow</h1>
            <p className="text-xs text-muted-foreground hidden sm:block">Seu plano de estudos inteligente</p>
          </div>
          {/* Desktop nav links */}
          <div className="hidden md:flex items-center gap-2">
            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => navigate("/notebooks")} onMouseEnter={() => prefetchRoute("/notebooks")}>
              <NotebookPen className="w-4 h-4" /> Cadernos
            </Button>
            {user && (
              <Button variant="outline" size="sm" className="gap-1.5" onClick={() => navigate(bancoRoute)} onMouseEnter={() => prefetchRoute(bancoRoute)}>
                <Library className="w-4 h-4" /> {bancoLabel}
              </Button>
            )}
            {user && (
              <Button variant="outline" size="sm" className="gap-1.5" onClick={() => navigate("/redacao")} onMouseEnter={() => prefetchRoute("/redacao")}>
                <FileText className="w-4 h-4" /> Redação
              </Button>
            )}
            {user && (
              <Button variant="outline" size="sm" className="gap-1.5" onClick={() => navigate("/analise")} onMouseEnter={() => prefetchRoute("/analise")}>
                <BarChart3 className="w-4 h-4" /> Análise
              </Button>
            )}
          </div>
          {/* Always visible: palette, theme, settings, logout */}
          <div className="flex items-center gap-1">
            <CustomThemeDialog />
            <Button variant="ghost" size="icon" className="h-9 w-9" onClick={cycleTheme} aria-label="Trocar tema">
              <ThemeIcon className="w-4 h-4" />
            </Button>
            {user && (
              <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => navigate("/settings")} aria-label="Configurações">
                <Settings className="w-4 h-4" />
              </Button>
            )}
            {user && (
              <Button variant="ghost" size="icon" className="h-9 w-9" onClick={signOut}>
                <LogOut className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
      </header>


      <main className="container max-w-7xl mx-auto px-3 sm:px-4 py-4 sm:py-6 space-y-4 sm:space-y-6">
        <DashboardHero
          firstName={firstName}
          isLoggedIn={Boolean(user)}
          streakDays={momentum.streakDays}
          weeklyProgressPercent={momentum.weeklyProgressPercent}
          weeklyCompleted={momentum.weeklyCompleted}
          weeklyTotal={momentum.weeklyTotal}
          dailyGoals={dailyGoals}
          todayMinutes={momentum.todayMinutes}
          revisionsCompletedToday={momentum.revisionsCompletedToday}
          comebackMode={momentum.comebackMode}
          onPrimaryAction={handlePrimaryAction}
          primaryLabel={primaryLabel}
        />

        {/* Flora: confirmações pendentes */}
        {user && <FloraConfirmationBanner />}

        {/* Flora: primeira ação recomendada (pós-onboarding) */}
        {user && <FloraFirstAction onStartStudy={handlePrimaryAction} />}

        {/* Sync agora é automático e silencioso em segundo plano */}

        <QuickStartChecklist
          isLoggedIn={Boolean(user)}
          topicCount={topics.length}
          sessionCount={sessions.length}
          hasStartedStudySession={sessions.length > 0}
          onCreateTopic={() => {
            setTab("revisao");
            setAddTopicOpenSignal((prev) => prev + 1);
          }}
          onStartStudy={() => {
            if (recommendedTopic) {
              handleStartStudyNow(recommendedTopic);
              return;
            }
            setTab("revisao");
            setAddTopicOpenSignal((prev) => prev + 1);
          }}
        />

        {dueFlashcardsCount > 0 && (
          <button
            onClick={() => setFlashcardSessionOpen(true)}
            className="w-full flex items-center justify-between gap-3 rounded-2xl border border-accent/30 bg-accent/5 hover:bg-accent/10 transition-colors px-4 py-3 text-left"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-full bg-accent/15 flex items-center justify-center shrink-0">
                <Sparkles className="w-4 h-4 text-accent" />
              </div>
              <div className="min-w-0">
                <p className="font-heading font-semibold text-sm">Flashcards pendentes</p>
                <p className="text-xs text-muted-foreground truncate">
                  {dueFlashcardsCount} card{dueFlashcardsCount > 1 ? "s" : ""} para revisar hoje
                </p>
              </div>
            </div>
            <span className="shrink-0 inline-flex items-center justify-center min-w-[28px] h-7 px-2 rounded-full bg-accent text-accent-foreground text-xs font-bold">
              {dueFlashcardsCount}
            </span>
          </button>
        )}

        {/* Timer + Hours + Media */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
          <StudyTimer
            running={timer.running}
            formattedTime={timer.formattedTime}
            onStart={timer.start}
            onPause={timer.pause}
            onResume={timer.resume}
            onStop={timer.stop}
            onReset={timer.reset}
            onOpenFocusMode={timer.openFocusMode}
            activeTopicName={activeTopic?.tema}
            onClearActiveTopic={activeTopic ? handleClearActiveStudy : undefined}
          />
          <Suspense fallback={<SectionSkeleton className="min-h-[180px]" />}>
            <StudyHoursCards {...hoursStats} sessions={sessions} />
          </Suspense>
        </div>

        <Suspense fallback={<SectionSkeleton className="min-h-[120px]" />}>
          <GamificationCard
            streak={gamification.streak}
            xp={gamification.xp}
            level={gamification.level}
            todayStudyMinutes={gamification.todayStudyMinutes}
            todayRevisions={gamification.todayRevisions}
            todayQuizCount={gamification.todayQuizCount}
            goals={gamification.dailyGoals}
          />
        </Suspense>


        <Suspense fallback={<SectionSkeleton className="min-h-[80px]" />}>
          <StatsCards {...stats} />
        </Suspense>

        {/* Painéis específicos de concurso */}
        {objetivo === "concurso" && (
          <>
            <Suspense fallback={<SectionSkeleton className="min-h-[120px]" />}>
              <ConcursoDashboard />
            </Suspense>
            <Suspense fallback={<SectionSkeleton className="min-h-[120px]" />}>
              <ConcursoTrails onAddTopic={handleAdd} />
            </Suspense>
          </>
        )}

        <Suspense fallback={<SectionSkeleton className="min-h-[80px]" />}>
          <div id="revisoes-atrasadas" className="scroll-mt-20">
            <OverdueRevisions
              revisions={overdueRevisions}
              onComplete={handleToggleRevision}
              onReschedule={handleRescheduleOverdue}
            />
          </div>
        </Suspense>

        <Suspense fallback={<SectionSkeleton className="min-h-[80px]" />}>
          <div id="revisoes-hoje" className="scroll-mt-20">
            <TodayRevisions revisions={todayRevisions} onComplete={handleToggleRevision} />
          </div>
        </Suspense>

        <Suspense fallback={<SectionSkeleton className="min-h-[120px]" />}>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
            <WeeklyRevisionSummary topics={topics} />
            <UpcomingRevisions revisions={upcomingRevisions} />
          </div>
        </Suspense>

        {/* Tabs */}
        <div className="overflow-x-auto">
          <div className="flex gap-1 bg-muted rounded-xl p-1 w-max min-w-full sm:min-w-0 sm:w-fit">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap
                ${tab === t.id ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
            >
              <t.icon className="w-4 h-4" />
              {t.label}
            </button>
          ))}
          </div>
        </div>

        {/* Content */}
        <div
          key={tab}
          className="animate-fade-in"
        >
          {tab === "revisao" ? (
            <div className="space-y-4">
              <AddTopicForm onAdd={handleAdd} openSignal={addTopicOpenSignal} />
              <Suspense fallback={<SectionSkeleton className="min-h-[200px]" />}>
                <RevisionTable
                  topics={topics}
                  onToggleRevision={handleToggleRevision}
                  onRatingChange={handleRatingChange}
                  onDelete={handleDelete}
                  onOpenNotes={setNotesTopic}
                  onOpenQuiz={(topic) => { setQuizInitialQuestions(undefined); setQuizTopic(topic); }}
                  onStartStudy={handleStartStudyNow}
                />
              </Suspense>
            </div>
          ) : (
            <Suspense fallback={<SectionSkeleton className="min-h-[300px]" />}>
              <WeeklySchedule slots={weekly} onChange={setWeekly} />
            </Suspense>
          )}
        </div>
      </main>

      {/* Dialogs — lazy, only mount when open */}
      {notesTopic && (
        <Suspense fallback={null}>
          <TopicNotesDialog
            topic={notesTopic}
            open={!!notesTopic}
            onClose={() => setNotesTopic(null)}
            onUpdateNotes={handleNotesDialogUpdate}
            onUpdateFlashcards={handleFlashcardsDialogUpdate}
          />
        </Suspense>
      )}
      {quizTopic && (
        <Suspense fallback={null}>
          <QuizDialog
            topic={quizTopic}
            open={!!quizTopic}
            onClose={() => { setQuizTopic(null); setQuizInitialQuestions(undefined); }}
            onSaveResult={handleSaveQuizResult}
            initialQuestions={quizInitialQuestions}
          />
        </Suspense>
      )}
      {flashcardSessionOpen && (
        <Suspense fallback={null}>
          <FlashcardSessionDialog
            open={flashcardSessionOpen}
            topics={topics}
            onClose={() => setFlashcardSessionOpen(false)}
            onUpdateFlashcards={handleFlashcardsDialogUpdate}
          />
        </Suspense>
      )}
      {timer.isFocusModeOpen && (
        <Suspense fallback={
          <div className="fixed inset-0 z-50 bg-background flex items-center justify-center">
            <Loader2Icon className="w-8 h-8 animate-spin text-primary" />
          </div>
        }>
          <FocusModeOverlay
            isOpen={timer.isFocusModeOpen}
            onClose={timer.closeFocusMode}
            formattedTime={timer.formattedTime}
            elapsed={timer.elapsed}
            topicName={activeTopic?.tema}
            subjectName={activeTopic?.materia}
            running={timer.running}
            onPause={timer.pause}
            onResume={timer.resume}
            onStop={timer.stop}
            onReset={timer.reset}
          />
        </Suspense>
      )}

      <FocusMiniPlayer
        visible={!timer.isFocusModeOpen && (timer.running || timer.elapsed > 0)}
        formattedTime={timer.formattedTime}
        topicName={activeTopic?.tema}
        running={timer.running}
        onOpen={timer.openFocusMode}
      />

      {/* Flora Chat */}
      <FloraButton />

      {/* Study Now Content Dialog */}
      {studyNowContent && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl shadow-xl max-w-2xl w-full max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between p-5 border-b border-border">
              <div>
                <h2 className="font-heading text-xl font-bold">{studyNowContent.tema}</h2>
                <p className="text-sm text-muted-foreground">{studyNowContent.materia} · briefing com a Flora</p>
              </div>
              <Button variant="ghost" size="sm" onClick={closeStudyNow}>X</Button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {studyNowMessages.map((msg, i) => (
                <div key={i} className={msg.role === "user" ? "flex justify-end" : "flex justify-start"}>
                  <div className={`max-w-[90%] rounded-2xl px-4 py-3 text-sm ${msg.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                    {msg.role === "flora" ? (
                      <div className="prose prose-sm max-w-none dark:prose-invert break-words [&_pre]:whitespace-pre-wrap [&_pre]:break-words [&_code]:break-words">
                        <Suspense fallback={<p className="text-sm text-muted-foreground">Carregando...</p>}>
                          <ReactMarkdown>{msg.content}</ReactMarkdown>
                        </Suspense>
                      </div>
                    ) : (
                      <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                    )}
                  </div>
                </div>
              ))}
              {studyNowFollowupLoading && (
                <div className="flex justify-start">
                  <div className="bg-muted rounded-2xl px-4 py-3 text-sm text-muted-foreground">Flora está pensando...</div>
                </div>
              )}
            </div>

            <div className="border-t border-border p-4 space-y-3">
              <div className="flex flex-wrap gap-2">
                {[
                  "Explica de outro jeito",
                  "Dá mais exemplos",
                  "Aprofunda esse tema",
                  "Por onde começar a ler",
                ].map((q) => (
                  <Button
                    key={q}
                    size="sm"
                    variant="outline"
                    disabled={studyNowFollowupLoading}
                    onClick={() => sendStudyNowFollowup(q)}
                  >
                    {q}
                  </Button>
                ))}
              </div>
              <form
                className="flex gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  sendStudyNowFollowup(studyNowFollowupInput);
                }}
              >
                <input
                  type="text"
                  value={studyNowFollowupInput}
                  onChange={(e) => setStudyNowFollowupInput(e.target.value)}
                  placeholder="Pergunta algo antes de começar..."
                  className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm"
                  disabled={studyNowFollowupLoading}
                />
                <Button type="submit" variant="outline" size="sm" disabled={studyNowFollowupLoading || !studyNowFollowupInput.trim()}>
                  Enviar
                </Button>
              </form>
              <div className="flex gap-2 justify-end pt-1">
                <Button variant="ghost" onClick={closeStudyNow}>Fechar</Button>
                <Button onClick={() => {
                  closeStudyNow();
                  timer.start();
                  toast.success("Tudo certo. Boa sessão!");
                }}>Tudo claro — iniciar cronômetro</Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Study Choice Dialog */}
      {studyChoiceOpen && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setStudyChoiceOpen(false)}>
          <div className="bg-card border border-border rounded-2xl shadow-xl max-w-md w-full p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
            <div>
              <h2 className="font-heading text-lg font-bold">Por onde quer começar?</h2>
              <p className="text-sm text-muted-foreground">Escolha como iniciar sua sessão.</p>
            </div>
            <div className="space-y-2">
              {recommendedTopic && (
                <Button
                  variant="outline"
                  className="w-full justify-start h-auto py-3"
                  onClick={() => {
                    setStudyChoiceOpen(false);
                    handleStartStudyNow(recommendedTopic);
                  }}
                >
                  <div className="text-left">
                    <p className="font-semibold text-sm">Recomendado pela Flora</p>
                    <p className="text-xs text-muted-foreground truncate">{recommendedTopic.tema} · {recommendedTopic.materia}</p>
                  </div>
                </Button>
              )}
              <Button
                variant="outline"
                className="w-full justify-start h-auto py-3"
                onClick={() => {
                  setStudyChoiceOpen(false);
                  void runFloraStudyNow();
                }}
              >
                <div className="text-left">
                  <p className="font-semibold text-sm">Resumo rápido pela Flora</p>
                  <p className="text-xs text-muted-foreground">Conteúdo curto antes de iniciar o timer</p>
                </div>
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start h-auto py-3"
                onClick={() => {
                  setStudyChoiceOpen(false);
                  timer.start();
                  toast.success("Cronômetro iniciado. Boa sessão!");
                }}
              >
                <div className="text-left">
                  <p className="font-semibold text-sm">Só iniciar o cronômetro</p>
                  <p className="text-xs text-muted-foreground">Sem matéria fixa — você escolhe enquanto estuda</p>
                </div>
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start h-auto py-3"
                onClick={() => {
                  setStudyChoiceOpen(false);
                  navigate("/aulao");
                }}
              >
                <div className="text-left">
                  <p className="font-semibold text-sm">Aulão com a Flora</p>
                  <p className="text-xs text-muted-foreground">Aula explicada com macetes, redação e busca de conteúdo</p>
                </div>
              </Button>
            </div>
            <div className="flex justify-end pt-1">
              <Button variant="ghost" size="sm" onClick={() => setStudyChoiceOpen(false)}>Cancelar</Button>
            </div>
          </div>
        </div>
      )}

      {/* Loading overlay for Study Now */}
      {studyNowLoading && (
        <div className="fixed inset-0 z-50 bg-background/60 backdrop-blur-sm flex items-center justify-center">
          <div className="text-center space-y-3">
            <FloraIcon className="w-10 h-10 text-primary mx-auto animate-pulse" />
            <p className="text-sm text-muted-foreground">Flora esta preparando seu estudo...</p>
          </div>
        </div>
      )}

      {/* Bottom Navigation - mobile only */}
      <BottomNav />
    </div>
  );
}

function FloraButton() {
  const [open, setOpen] = useState(false);
  const [initialMessage, setInitialMessage] = useState<string | undefined>();

  // Abertura via ?flora=1 (vinda do FloraSuggestionChip do caderno, p.ex.)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("flora") === "1") {
      const stored = sessionStorage.getItem("flora.suggestedQuestion");
      if (stored) {
        setInitialMessage(stored);
        sessionStorage.removeItem("flora.suggestedQuestion");
      }
      setOpen(true);
      params.delete("flora");
      const newSearch = params.toString();
      const newUrl = window.location.pathname + (newSearch ? `?${newSearch}` : "") + window.location.hash;
      window.history.replaceState({}, "", newUrl);
    }
  }, []);

  // Abertura via BottomNav
  useEffect(() => {
    const handler = () => setOpen(true);
    window.addEventListener("open-flora-chat", handler);
    return () => window.removeEventListener("open-flora-chat", handler);
  }, []);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-16 md:bottom-4 right-4 z-40 w-12 h-12 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center hover:scale-105 transition-transform"
        aria-label="Falar com Flora"
      >
        <FloraIcon className="w-6 h-6" />
      </button>
      <Suspense fallback={null}>
        <FloraChatPanel
          isOpen={open}
          onClose={() => { setOpen(false); setInitialMessage(undefined); }}
          initialMessage={initialMessage}
        />
      </Suspense>
    </>
  );
}
