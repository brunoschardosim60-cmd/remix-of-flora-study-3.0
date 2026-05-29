import { useState, useEffect, useCallback, useMemo, lazy, Suspense, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { 
  CalendarDays, 
  LayoutGrid, 
  NotebookPen, 
  Library, 
  FileText, 
  BarChart3, 
  Users, 
  GraduationCap, 
  Sparkles,
  Loader2 as Loader2Icon
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { createTopic, StudyTopic, WeeklySlot, ALL_SUBJECTS, Subject, CONCURSO_SUBJECTS, ENEM_SUBJECTS } from "@/lib/studyData";
import { DashboardHero } from "@/components/DashboardHero";
import { AddTopicForm } from "@/components/AddTopicForm";
import { StudyTimer } from "@/components/StudyTimer";
import { FocusMiniPlayer } from "@/components/FocusMiniPlayer";
import { QuickStartChecklist } from "@/components/QuickStartChecklist";
import { useDashboardWidgets } from "@/components/DashboardCustomizer";
import { BottomNav } from "@/components/BottomNav";
import { useStudyDashboard } from "@/hooks/useStudyDashboard";
import { useStudyTimer } from "@/hooks/useStudyTimer";
import { useOnboardingGuard } from "@/hooks/useOnboardingGuard";
import { useFloraEvents } from "@/hooks/useFloraEvents";
import { useStudyNow } from "@/hooks/useStudyNow";
import { useDashboardDialogs } from "@/hooks/useDashboardDialogs";
import { useDashboardBootstrap } from "@/hooks/useDashboardBootstrap";
import { useStudentConfig } from "@/hooks/useStudentConfig";
import { useDashboardHeroData } from "@/hooks/useDashboardHeroData";
import { useDashboardPrimaryAction } from "@/hooks/useDashboardPrimaryAction";
import { loadStringStorage } from "@/lib/storage";
import { loadAIActivities } from "@/lib/aiActivityStore";
import { toast } from "sonner";
import { FloraConfirmationBanner } from "@/components/FloraConfirmationBanner";
import { FloraFirstAction } from "@/components/FloraFirstAction";
import { FloraIcon } from "@/components/FloraIcon";
import { toLocalDateStr } from "@/lib/dateUtils";
import { countDueFlashcards } from "@/lib/flashcardScheduler";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { StudyNowDialog } from "@/components/dashboard/StudyNowDialog";
import { StudyChoiceDialog } from "@/components/dashboard/StudyChoiceDialog";
import { FloraButton } from "@/components/dashboard/FloraButton";
import { Button } from "@/components/ui/button";

// Lazy: heavy components that DON'T appear on first render
const FocusModeOverlay = lazy(() => import("@/components/FocusModeOverlay").then(m => ({ default: m.FocusModeOverlay })));
const QuizDialog = lazy(() => import("@/components/QuizDialog").then(m => ({ default: m.QuizDialog })));
const FlashcardSessionDialog = lazy(() => import("@/components/FlashcardSessionDialog").then(m => ({ default: m.FlashcardSessionDialog })));
const TopicNotesDialog = lazy(() => import("@/components/TopicNotesDialog").then(m => ({ default: m.TopicNotesDialog })));
const WeeklySchedule = lazy(() => import("@/components/WeeklySchedule").then(m => ({ default: m.WeeklySchedule })));

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
  const mounted = useRef(false);

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  // Bootstrap: deep-link, custom colors, idle prefetch, análise Flora
  useDashboardBootstrap(user);

  // Force onboarding for logged-in users who haven't completed it (admins skip)
  const onboardingChecked = useOnboardingGuard(user, isAdmin);

  // Objetivo do aluno → rota/label do "Banco" do contexto global
  const { config: studentConfig } = useStudentConfig();
  const isConcurso = studentConfig?.isConcurso ?? false;
  const bancoRoute = studentConfig?.bancoRoute ?? "/banco";
  const bancoLabel = studentConfig?.bancoLabel ?? "Questões ENEM";
  const subjectOptions = isConcurso ? CONCURSO_SUBJECTS : ENEM_SUBJECTS;

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
  const { isVisible: isWidgetVisible } = useDashboardWidgets();

  const {
    notesTopic,
    quizTopic,
    quizInitialQuestions,
    flashcardSessionOpen,
    addTopicOpenSignal,
    setNotesTopic,
    setQuizTopic,
    setQuizInitialQuestions,
    openAddTopic,
    openQuiz,
    closeQuiz,
    openFlashcardSession,
    closeFlashcardSession,
    patchNotesTopic,
  } = useDashboardDialogs();
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

  const { firstName, dailyGoals } = useDashboardHeroData(user, profile, gamification);

  const handleNotesDialogUpdate = useCallback((topicId: string, notas: string) => {
    handleUpdateNotes(topicId, notas);
    patchNotesTopic(topicId, { notas });
  }, [handleUpdateNotes, patchNotesTopic]);

  const handleFlashcardsDialogUpdate = useCallback((topicId: string, flashcards: StudyTopic["flashcards"]) => {
    handleUpdateFlashcards(topicId, flashcards);
    patchNotesTopic(topicId, { flashcards });
  }, [handleUpdateFlashcards, patchNotesTopic]);

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

  const {
    studyChoiceOpen,
    studyNowLoading,
    studyNowContent,
    studyNowMessages,
    studyNowFollowupInput,
    studyNowFollowupLoading,
    setStudyChoiceOpen,
    setStudyNowFollowupInput,
    runFloraStudyNow,
    sendStudyNowFollowup,
    closeStudyNow,
  } = useStudyNow({ recommendedTopic, handleStartStudyNow });

  const { handlePrimaryAction, primaryLabel } = useDashboardPrimaryAction({
    user,
    topics,
    recommendedTopic,
    studyNowLoading,
    comebackMode: momentum.comebackMode,
    setTab,
    openAddTopic,
    setStudyChoiceOpen,
    handleStartStudyNow,
  });

  if (!hydrated || (user && !onboardingChecked)) {
    return (
      <div className="min-h-dvh bg-background flex items-center justify-center">
        <Loader2Icon className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-background pb-16 md:pb-0">
      <DashboardHeader user={user} bancoRoute={bancoRoute} bancoLabel={bancoLabel} onSignOut={signOut} />
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


        {/* Menu Grid (Restaurado) */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
          <button 
            onClick={() => navigate("/notebooks")} 
            className="flex flex-col items-center justify-center gap-2 p-4 rounded-2xl border border-border bg-card hover:border-primary hover:shadow-sm transition-all group"
          >
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform">
              <NotebookPen className="w-5 h-5 text-primary" />
            </div>
            <span className="text-xs font-semibold">Cadernos</span>
          </button>
          
          <button 
            onClick={() => navigate(bancoRoute)} 
            className="flex flex-col items-center justify-center gap-2 p-4 rounded-2xl border border-border bg-card hover:border-primary hover:shadow-sm transition-all group"
          >
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Library className="w-5 h-5 text-primary" />
            </div>
            <span className="text-xs font-semibold">{bancoLabel}</span>
          </button>
          
          <button 
            onClick={() => navigate("/redacao")} 
            className="flex flex-col items-center justify-center gap-2 p-4 rounded-2xl border border-border bg-card hover:border-primary hover:shadow-sm transition-all group"
          >
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform">
              <FileText className="w-5 h-5 text-primary" />
            </div>
            <span className="text-xs font-semibold">Redação</span>
          </button>
          
          <button 
            onClick={() => navigate("/analise")} 
            className="flex flex-col items-center justify-center gap-2 p-4 rounded-2xl border border-border bg-card hover:border-primary hover:shadow-sm transition-all group"
          >
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform">
              <BarChart3 className="w-5 h-5 text-primary" />
            </div>
            <span className="text-xs font-semibold">Análise</span>
          </button>
          
          <button 
            onClick={() => navigate("/comunidades")} 
            className="flex flex-col items-center justify-center gap-2 p-4 rounded-2xl border border-border bg-card hover:border-primary hover:shadow-sm transition-all group"
          >
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Users className="w-5 h-5 text-primary" />
            </div>
            <span className="text-xs font-semibold">Comunidade</span>
          </button>
          
          <button 
            onClick={() => navigate("/cursos")} 
            className="flex flex-col items-center justify-center gap-2 p-4 rounded-2xl border border-border bg-card hover:border-primary hover:shadow-sm transition-all group"
          >
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform">
              <GraduationCap className="w-5 h-5 text-primary" />
            </div>
            <span className="text-xs font-semibold">Cursos</span>
          </button>
        </div>

        {/* Sync agora é automático e silencioso em segundo plano */}

        <QuickStartChecklist
          isLoggedIn={Boolean(user)}
          topicCount={topics.length}
          sessionCount={sessions.length}
          hasStartedStudySession={sessions.length > 0}
          onCreateTopic={() => {
            setTab("revisao");
            openAddTopic();
          }}
          onStartStudy={() => {
            if (recommendedTopic) {
              handleStartStudyNow(recommendedTopic);
              return;
            }
            setTab("revisao");
            openAddTopic();
          }}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
          {dueFlashcardsCount > 0 && isWidgetVisible("flashcards_banner") && (
            <button
              onClick={openFlashcardSession}
              className="flex items-center justify-between gap-3 rounded-2xl border border-accent/30 bg-accent/5 hover:bg-accent/10 transition-colors px-4 py-3 text-left"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-full bg-accent/15 flex items-center justify-center shrink-0">
                  <Sparkles className="w-4 h-4 text-accent" />
                </div>
                <div className="min-w-0">
                  <p className="font-heading font-semibold text-sm">Flashcards pendentes</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {dueFlashcardsCount} card{dueFlashcardsCount > 1 ? "s" : ""} para hoje
                  </p>
                </div>
              </div>
              <span className="shrink-0 inline-flex items-center justify-center min-w-[28px] h-7 px-2 rounded-full bg-accent text-accent-foreground text-xs font-bold">
                {dueFlashcardsCount}
              </span>
            </button>
          )}

        </div>

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

        {isWidgetVisible("gamification") && (
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
        )}

        {isWidgetVisible("stats") && (
          <Suspense fallback={<SectionSkeleton className="min-h-[80px]" />}>
            <StatsCards {...stats} />
          </Suspense>
        )}


        {/* Painéis específicos de concurso */}
        {isConcurso && (
          <>
            <Suspense fallback={<SectionSkeleton className="min-h-[120px]" />}>
              <ConcursoDashboard />
            </Suspense>
            <Suspense fallback={<SectionSkeleton className="min-h-[120px]" />}>
              <ConcursoTrails onAddTopic={handleAdd} />
            </Suspense>
          </>
        )}

        {isWidgetVisible("overdue") && (
          <Suspense fallback={<SectionSkeleton className="min-h-[80px]" />}>
            <div id="revisoes-atrasadas" className="scroll-mt-20">
              <OverdueRevisions
                revisions={overdueRevisions}
                onComplete={handleToggleRevision}
                onReschedule={handleRescheduleOverdue}
              />
            </div>
          </Suspense>
        )}

        {isWidgetVisible("today_revisions") && (
          <Suspense fallback={<SectionSkeleton className="min-h-[80px]" />}>
            <div id="revisoes-hoje" className="scroll-mt-20">
              <TodayRevisions revisions={todayRevisions} onComplete={handleToggleRevision} />
            </div>
          </Suspense>
        )}

        {isWidgetVisible("weekly_summary") && (
          <Suspense fallback={<SectionSkeleton className="min-h-[120px]" />}>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
              <WeeklyRevisionSummary topics={topics} />
              <UpcomingRevisions revisions={upcomingRevisions} />
            </div>
          </Suspense>
        )}


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
              <AddTopicForm onAdd={handleAdd} openSignal={addTopicOpenSignal} subjects={subjectOptions} />
              <Suspense fallback={<SectionSkeleton className="min-h-[200px]" />}>
                <RevisionTable
                  topics={topics}
                  onToggleRevision={handleToggleRevision}
                  onRatingChange={handleRatingChange}
                  onDelete={handleDelete}
                  onOpenNotes={setNotesTopic}
                  onOpenQuiz={(topic) => openQuiz(topic)}
                  onStartStudy={handleStartStudyNow}
                />
              </Suspense>
            </div>
          ) : (
            <Suspense fallback={<SectionSkeleton className="min-h-[300px]" />}>
              <WeeklySchedule slots={weekly} onChange={setWeekly} subjects={subjectOptions} />
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
            onClose={closeQuiz}
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
            onClose={closeFlashcardSession}
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

      {studyNowContent && (
        <StudyNowDialog
          content={studyNowContent}
          messages={studyNowMessages}
          followupInput={studyNowFollowupInput}
          followupLoading={studyNowFollowupLoading}
          onChangeFollowupInput={setStudyNowFollowupInput}
          onSendFollowup={sendStudyNowFollowup}
          onClose={closeStudyNow}
          onConfirmStart={() => {
            closeStudyNow();
            timer.start();
            toast.success("Tudo certo. Boa sessão!");
          }}
        />
      )}

      <StudyChoiceDialog
        open={studyChoiceOpen}
        onClose={() => setStudyChoiceOpen(false)}
        recommendedTopic={recommendedTopic}
        onChooseRecommended={() => {
          setStudyChoiceOpen(false);
          if (recommendedTopic) handleStartStudyNow(recommendedTopic);
        }}
        onChooseFloraResume={() => {
          setStudyChoiceOpen(false);
          void runFloraStudyNow();
        }}
        onChooseTimerOnly={() => {
          setStudyChoiceOpen(false);
          timer.start();
          toast.success("Cronômetro iniciado. Boa sessão!");
        }}
        onChooseAulao={() => {
          setStudyChoiceOpen(false);
          navigate("/aulao");
        }}
      />

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
