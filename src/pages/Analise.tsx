import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft, BarChart3, Loader2, AlertTriangle, Trophy, Target,
  TrendingUp, TrendingDown, Calendar, Flame, BookOpen, Brain,
  Clock, Zap, FileDown,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { loadRemoteStudyState } from "@/lib/studyStateStore";
import { predictENEMScore, toENEMScale, getTopContributors } from "@/lib/predictENEM";
import { loadGamification } from "@/lib/gamification";
import type { StudyTopic, Subject } from "@/lib/studyData";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  Cell, CartesianGrid, LineChart, Line, RadarChart, Radar,
  PolarGrid, PolarAngleAxis, PolarRadiusAxis, Legend,
  AreaChart, Area,
} from "recharts";
import { ConcursoDashboard } from "@/components/ConcursoDashboard";
import { DetailedProgressReport } from "@/components/DetailedProgressReport";
import { ConcursoSimuladoHistory } from "@/components/ConcursoSimuladoHistory";
import { SubjectHeatmap } from "@/components/dashboard/SubjectHeatmap";
import { EvolutionChart } from "@/components/dashboard/EvolutionChart";
import { WeakSpotsCard } from "@/components/dashboard/WeakSpotsCard";
import { HourDayHeatmap } from "@/components/dashboard/HourDayHeatmap";
import { computeSubjectAlerts, type AttemptLike } from "@/lib/analiseInsights";

// ─── Tipos ────────────────────────────────────────────────────────────────────
interface StudySession {
  id: string; created_at: string; duration_ms: number;
  subject: string | null; topic_id: string | null;
}
interface UserAction {
  id: string; created_at: string; action: string;
  materia: string | null; metadata: Record<string, unknown>;
}
interface StudentPerf {
  materia: string; accuracy: number; acertos: number;
  erros: number; erro_recorrente: boolean; prioridade: number;
}
interface SpacedReview {
  id: string; scheduled_date: string; completed: boolean;
  completed_at: string | null; materia: string; interval_days: number;
}
interface EssayRow {
  id: string; nota_total: number | null; status: string;
  competencia_1: number | null; competencia_2: number | null;
  competencia_3: number | null; competencia_4: number | null;
  competencia_5: number | null; corrected_at: string | null;
  created_at: string;
}
interface WeeklySlotRow {
  id: string; dia: number; horario: string; concluido: boolean;
  materia: string | null;
}
interface OnboardingRow {
  objetivo: string; tempo_disponivel_min: number;
}

const SUBJECT_HEX: Partial<Record<Subject, string>> = {
  "Matemática": "#3b82f6", "Biologia": "#10b981", "Química": "#f59e0b",
  "Física": "#8b5cf6", "Português": "#ef4444", "História": "#f97316",
  "Geografia": "#14b8a6", "Inglês": "#ec4899", "Redação": "#06b6d4",
  "Simulado": "#64748b",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmtMin(ms: number) {
  const m = Math.round(ms / 60000);
  if (m < 60) return `${m}min`;
  return `${Math.floor(m / 60)}h${m % 60 > 0 ? ` ${m % 60}min` : ""}`;
}

function last7Days() {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (6 - i));
    return d.toISOString().split("T")[0];
  });
}

function last30Days() {
  return Array.from({ length: 30 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (29 - i));
    return d.toISOString().split("T")[0];
  });
}

// predictENEMScore importado de @/lib/predictENEM
// ─── Componente principal ─────────────────────────────────────────────────────
export default function Analise() {
  const navigate = useNavigate();
  const { user, profile, loading: authLoading } = useAuth();


  const [topics, setTopics] = useState<StudyTopic[]>([]);
  const [sessions, setSessions] = useState<StudySession[]>([]);
  const [actions, setActions] = useState<UserAction[]>([]);
  const [perfs, setPerfs] = useState<StudentPerf[]>([]);
  const [reviews, setReviews] = useState<SpacedReview[]>([]);
  const [gamification, setGamification] = useState<any>(null);

  const [essays, setEssays] = useState<EssayRow[]>([]);
  const [slots, setSlots] = useState<WeeklySlotRow[]>([]);
  const [onboarding, setOnboarding] = useState<OnboardingRow | null>(null);
  const [attempts, setAttempts] = useState<AttemptLike[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"geral" | "vivo" | "evolucao" | "enem" | "revisoes" | "relatorio">("geral");
  const [period, setPeriod] = useState<"7d" | "30d" | "all">("7d");
  const [exporting, setExporting] = useState(false);


  useEffect(() => {
    if (!authLoading && !user) navigate("/auth", { replace: true });
  }, [authLoading, user, navigate]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    setLoading(true);

    Promise.all([
      loadRemoteStudyState(user.id),
      supabase.from("study_sessions").select("*").eq("user_id", user.id)
        .order("created_at", { ascending: true }).limit(90),
      supabase.from("user_actions").select("*").eq("user_id", user.id)
        .order("created_at", { ascending: false }).limit(200),
      supabase.from("student_performance").select("*").eq("user_id", user.id),
      supabase.from("spaced_reviews").select("*").eq("user_id", user.id)
        .order("scheduled_date").limit(100),
      supabase.from("essays").select("id,nota_total,status,competencia_1,competencia_2,competencia_3,competencia_4,competencia_5,corrected_at,created_at")
        .eq("user_id", user.id).order("created_at", { ascending: false }).limit(50),
      supabase.from("weekly_slots").select("id,dia,horario,concluido,materia").eq("user_id", user.id),
      supabase.from("student_onboarding").select("objetivo,tempo_disponivel_min").eq("user_id", user.id).maybeSingle(),
      supabase.from("gamification_profiles").select("*").eq("user_id", user.id).maybeSingle(),
      supabase.from("question_attempts")
        .select("created_at,acertou,question:questions(disciplina)")
        .eq("user_id", user.id)
        .gte("created_at", new Date(Date.now() - 28 * 24 * 60 * 60 * 1000).toISOString())
        .order("created_at", { ascending: false })
        .limit(500),
    ]).then(([state, { data: sess }, { data: acts }, { data: pf }, { data: rev }, { data: ess }, { data: sl }, { data: onb }, { data: gami }, { data: att }]) => {
      if (cancelled) return;
      setTopics(state?.topics ?? []);
      setSessions((sess ?? []) as StudySession[]);
      setActions((acts ?? []) as UserAction[]);
      setPerfs((pf ?? []) as StudentPerf[]);
      setReviews((rev ?? []) as SpacedReview[]);
      setEssays((ess ?? []) as EssayRow[]);
      setSlots((sl ?? []) as WeeklySlotRow[]);
      setOnboarding((onb ?? null) as OnboardingRow | null);
      setGamification(gami);
      setAttempts((att ?? []) as unknown as AttemptLike[]);

    }).catch(() => undefined).finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [user]);

  // ─── Filtro de período ─────────────────────────────────────────────────────
  const periodCutoff = useMemo(() => {
    if (period === "all") return null;
    const d = new Date();
    d.setDate(d.getDate() - (period === "7d" ? 7 : 30));
    return d.toISOString();
  }, [period]);

  const filteredSessions = useMemo(() =>
    periodCutoff ? sessions.filter(s => s.created_at >= periodCutoff) : sessions,
    [sessions, periodCutoff]);

  const filteredActions = useMemo(() =>
    periodCutoff ? actions.filter(a => a.created_at >= periodCutoff) : actions,
    [actions, periodCutoff]);

  // ─── Dados computados ──────────────────────────────────────────────────────

  const totalStudyMs = useMemo(() =>
    filteredSessions.reduce((a, s) => a + s.duration_ms, 0), [filteredSessions]);

  const streak = useMemo(() => {
    const days = new Set(filteredSessions.map(s => s.created_at.split("T")[0]));
    let count = 0;
    const today = new Date();
    for (let i = 0; i < 60; i++) {
      const d = new Date(today); d.setDate(today.getDate() - i);
      if (days.has(d.toISOString().split("T")[0])) count++;
      else if (i > 0) break;
    }
    return count;
  }, [filteredSessions]);

  // Heatmap — horas por dia no período
  const heatmapData = useMemo(() => {
    const map: Record<string, number> = {};
    filteredSessions.forEach(s => {
      const day = s.created_at.split("T")[0];
      map[day] = (map[day] ?? 0) + s.duration_ms / 60000;
    });
    const days = period === "7d" ? last7Days() : last30Days();
    return days.map(d => ({
      date: d,
      label: new Date(d + "T12:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
      min: Math.round(map[d] ?? 0),
    }));
  }, [filteredSessions, period]);

  // Evolução de acerto ao longo do tempo (por semana)
  const evolutionData = useMemo(() => {
    const quizActions = filteredActions.filter(a =>
      (a.action === "quiz_correct" || a.action === "quiz_wrong") && a.created_at
    ).reverse();

    if (quizActions.length < 3) return [];

    const weeks: Record<string, { correct: number; total: number }> = {};
    quizActions.forEach(a => {
      const d = new Date(a.created_at);
      d.setDate(d.getDate() - d.getDay());
      const wk = d.toISOString().split("T")[0];
      if (!weeks[wk]) weeks[wk] = { correct: 0, total: 0 };
      weeks[wk].total++;
      if (a.action === "quiz_correct") weeks[wk].correct++;
    });

    return Object.entries(weeks).slice(-8).map(([wk, v]) => ({
      semana: new Date(wk + "T12:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
      acerto: Math.round((v.correct / v.total) * 100),
      questoes: v.total,
    }));
  }, [filteredActions]);

  // Radar por matéria
  const radarData = useMemo(() => {
    return perfs.slice(0, 7).map(p => ({
      materia: p.materia.slice(0, 4),
      acerto: p.accuracy,
      fullName: p.materia,
    }));
  }, [perfs]);

  // Revisões: completadas vs pendentes por matéria
  const reviewStats = useMemo(() => {
    const map: Record<string, { done: number; pending: number }> = {};
    reviews.forEach(r => {
      if (!map[r.materia]) map[r.materia] = { done: 0, pending: 0 };
      if (r.completed) map[r.materia].done++;
      else map[r.materia].pending++;
    });
    return Object.entries(map).map(([materia, v]) => ({
      materia,
      ...v,
      taxa: Math.round((v.done / Math.max(1, v.done + v.pending)) * 100),
    })).sort((a, b) => b.pending - a.pending);
  }, [reviews]);

  const overdueCt = reviews.filter(r => !r.completed && r.scheduled_date < new Date().toISOString().split("T")[0]).length;

  // Predição ENEM
  const enemPred = useMemo(
    () => predictENEMScore(perfs, filteredSessions, essays, reviews, slots),
    [perfs, filteredSessions, essays, reviews, slots]
  );

  // Aba ENEM só aparece se objetivo for enem/vestibular (ou sem onboarding ainda)
  const showEnemTab = !onboarding || ["enem", "vestibular"].includes((onboarding.objetivo || "").toLowerCase());
  const isConcurso = (onboarding?.objetivo || "").toLowerCase() === "concurso";

  // Tópicos críticos (erro recorrente)
  const criticalTopics = useMemo(() =>
    topics.filter(t => (t.quizErrors?.length ?? 0) >= 3)
      .sort((a, b) => (b.quizErrors?.length ?? 0) - (a.quizErrors?.length ?? 0))
      .slice(0, 5),
  [topics]);

  // ─── Guard: se a aba ENEM sumir (usuário concurso), volta pra "geral" ────────
  // Feito em useEffect para não chamar setState durante o render (causa warning)
  useEffect(() => {
    if (activeTab === "enem" && !showEnemTab) {
      setActiveTab("geral");
    }
  }, [activeTab, showEnemTab]);

  const handleExportPDF = async () => {
    setExporting(true);
    try {
      // Import dynamicly to avoid bloat
      const { jsPDF } = await import("jspdf");
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      
      // Header
      doc.setFontSize(20);
      doc.setTextColor(59, 130, 246); // Primary color
      doc.text("Relatório de Desempenho StudyFlow", 15, 20);
      
      doc.setFontSize(10);
      doc.setTextColor(100, 116, 139);
      doc.text(`Gerado em: ${new Date().toLocaleDateString("pt-BR")} às ${new Date().toLocaleTimeString("pt-BR")}`, 15, 28);
      doc.text(`Usuário: ${profile?.display_name || user?.email || "Estudante"}`, 15, 33);
      
      // Divider
      doc.setDrawColor(226, 232, 240);
      doc.line(15, 38, pageWidth - 15, 38);
      
      // Summary section
      doc.setFontSize(14);
      doc.setTextColor(30, 41, 59);
      doc.text("Resumo Geral", 15, 48);
      
      doc.setFontSize(11);
      doc.text(`Tempo Total de Estudo: ${fmtMin(totalStudyMs)}`, 20, 58);
      doc.text(`Sequência (Streak): ${streak} dias`, 20, 65);
      doc.text(`Total de Tópicos: ${topics.length}`, 20, 72);
      doc.text(`Taxa Média de Acerto: ${perfs.length > 0 ? Math.round(perfs.reduce((a, p) => a + p.accuracy, 0) / perfs.length) : 0}%`, 20, 79);
      
      // Subject Performance
      doc.setFontSize(14);
      doc.text("Desempenho por Matéria", 15, 95);
      
      let y = 105;
      const sortedPerfs = [...perfs].sort((a, b) => b.accuracy - a.accuracy);
      
      doc.setFontSize(10);
      doc.setTextColor(100, 116, 139);
      doc.text("Matéria", 20, y);
      doc.text("Acertos", 100, y);
      doc.text("Erros", 130, y);
      doc.text("Precisão", 160, y);
      
      y += 5;
      doc.line(15, y, pageWidth - 15, y);
      y += 8;
      
      doc.setTextColor(30, 41, 59);
      sortedPerfs.slice(0, 15).forEach((p) => {
        if (y > 270) {
          doc.addPage();
          y = 20;
        }
        doc.text(p.materia, 20, y);
        doc.text(String(p.acertos), 100, y);
        doc.text(String(p.erros), 130, y);
        doc.text(`${p.accuracy}%`, 160, y);
        y += 8;
      });
      
      if (showEnemTab) {
        doc.addPage();
        doc.setFontSize(16);
        doc.setTextColor(59, 130, 246);
        doc.text("Predição ENEM", 15, 20);
        
        doc.setFontSize(11);
        doc.setTextColor(30, 41, 59);
        doc.text(`Nota Geral Estimada: ${Math.round(toENEMScale(enemPred.score))}`, 15, 35);
        
        y = 50;
        doc.text("Detalhamento por Área:", 15, y);
        y += 10;
        
        enemPred.breakdown.forEach((b) => {
          doc.text(`${b.area}: ${Math.round(toENEMScale(b.score))}`, 20, y);
          y += 8;
        });
        
        y += 10;
        doc.text(`Redação Estimada: ${Math.round(toENEMScale(enemPred.factors.essayScore))}`, 15, y);
      }

      
      doc.save(`Relatorio_StudyFlow_${new Date().toISOString().split('T')[0]}.pdf`);
      toast.success("Relatório PDF gerado com sucesso!");
    } catch (error) {
      console.error("Erro ao gerar PDF:", error);
      toast.error("Não foi possível gerar o PDF. Tente novamente.");
    } finally {
      setExporting(false);
    }
  };

  // ─── Render ────────────────────────────────────────────────────────────────

  if (authLoading || !user) {
    return <div className="flex min-h-dvh items-center justify-center bg-background"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  }

  const hasData = sessions.length > 0 || perfs.length > 0 || topics.length > 0;

  const TABS = [
    { id: "geral" as const, label: "Visão geral" },
    { id: "vivo" as const, label: "Dashboard vivo" },
    { id: "evolucao" as const, label: "Evolução" },
    ...(showEnemTab ? [{ id: "enem" as const, label: "Predição ENEM" }] : []),
    { id: "revisoes" as const, label: "Revisões" },
    { id: "relatorio" as const, label: "Relatório Detalhado" },
  ];

  return (
    <div className="min-h-dvh bg-background">
      <div className="mx-auto max-w-6xl px-3 py-4 sm:px-4 sm:py-6">

        {/* Header */}
        <div className="mb-5 flex items-center gap-3">
          <Button variant="outline" size="icon" onClick={() => navigate("/")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" />
              <h1 className="font-heading text-2xl font-bold">Análise de desempenho</h1>
            </div>
            <p className="text-sm text-muted-foreground">Evolução, pontos fracos e predição de nota.</p>
          </div>
        </div>

        {/* Tabs + Period filter */}
        <div className="mb-5 flex flex-col sm:flex-row gap-2">
          <div className="flex gap-1 overflow-x-auto rounded-xl bg-muted p-1 flex-1">
            {TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition-all min-w-[90px] ${
                  activeTab === tab.id
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <div className="flex gap-1 rounded-xl bg-muted p-1 self-start">
            {([["7d", "7 dias"], ["30d", "30 dias"], ["all", "Tudo"]] as const).map(([id, label]) => (
              <button
                key={id}
                onClick={() => setPeriod(id)}
                className={`whitespace-nowrap rounded-lg px-3 py-2 text-xs font-medium transition-all ${
                  period === id
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="flex min-h-[300px] items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : !hasData ? (
          <div className="rounded-2xl border border-border bg-card/70 p-8 text-center">
            <BarChart3 className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
            <p className="font-heading text-lg font-semibold">Sem dados ainda</p>
            <p className="mt-1 text-sm text-muted-foreground">Faça quizzes e registre sessões de estudo para ver sua análise aqui.</p>
          </div>
        ) : (

          <>
            {/* ── ABA: VISÃO GERAL ─────────────────────────────────── */}
            {activeTab === "geral" && (
              <div className="space-y-4">

                {/* Alertas proativos baseados em question_attempts (últimas 4 semanas) */}
                {(() => {
                  const alerts = computeSubjectAlerts(attempts).filter(a => a.direction === "down").slice(0, 3);
                  if (alerts.length === 0) return null;
                  return (
                    <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-4">
                      <h2 className="mb-2 flex items-center gap-2 font-heading text-base font-semibold text-destructive">
                        <AlertTriangle className="h-4 w-4" /> Atenção
                      </h2>
                      <ul className="space-y-1 text-sm">
                        {alerts.map(a => (
                          <li key={a.materia} className="flex items-center justify-between gap-2">
                            <span>
                              <strong>{a.materia}</strong> caiu {Math.abs(Math.round(a.deltaPct))}% nas últimas 2 semanas
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {Math.round(a.recentAccuracy * 100)}% vs {Math.round(a.prevAccuracy * 100)}%
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  );
                })()}

                {/* KPIs */}
                <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
                  {[
                    { icon: Clock, label: "Tempo total", value: fmtMin(totalStudyMs), color: "text-blue-500" },
                    { icon: Flame, label: "Sequência", value: `${streak} dias`, color: "text-orange-500" },
                    { icon: BookOpen, label: "Tópicos", value: topics.length, color: "text-green-500" },
                    { icon: Brain, label: "Taxa de acerto", value: `${perfs.length > 0 ? Math.round(perfs.reduce((a, p) => a + p.accuracy, 0) / perfs.length) : 0}%`, color: "text-purple-500" },
                  ].map(({ icon: Icon, label, value, color }) => (
                    <div key={label} className="rounded-2xl border border-border bg-card/70 p-4">
                      <div className="flex items-center gap-2 text-muted-foreground mb-1">
                        <Icon className={`h-4 w-4 ${color}`} />
                        <span className="text-xs font-medium uppercase tracking-wide">{label}</span>
                      </div>
                      <p className="font-heading text-2xl font-bold">{value}</p>
                    </div>
                  ))}
                </div>

                {isConcurso && (
                  <>
                    <ConcursoDashboard />
                    <ConcursoSimuladoHistory />
                  </>
                )}

                {/* Heatmap de estudo */}
                <div className="rounded-2xl border border-border bg-card/70 p-4">
                  <h2 className="mb-3 font-heading text-base font-semibold flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-primary" /> Atividade nos últimos {period === "7d" ? "7" : period === "30d" ? "30" : "todos os"} dias
                  </h2>
                  <div className="flex flex-wrap gap-1">
                    {heatmapData.map(d => {
                      const intensity = d.min === 0 ? 0 : d.min < 15 ? 1 : d.min < 30 ? 2 : d.min < 60 ? 3 : 4;
                      const bg = ["bg-muted", "bg-blue-200 dark:bg-blue-900", "bg-blue-400 dark:bg-blue-700", "bg-blue-500 dark:bg-blue-600", "bg-blue-700 dark:bg-blue-400"][intensity];
                      return (
                        <div
                          key={d.date}
                          title={`${d.label}: ${d.min}min`}
                          className={`h-6 w-6 rounded-sm ${bg} cursor-default`}
                        />
                      );
                    })}
                  </div>
                  <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                    <span>Menos</span>
                    {["bg-muted", "bg-blue-200 dark:bg-blue-900", "bg-blue-400 dark:bg-blue-700", "bg-blue-500 dark:bg-blue-600", "bg-blue-700 dark:bg-blue-400"].map((bg, i) => (
                      <div key={i} className={`h-3 w-3 rounded-sm ${bg}`} />
                    ))}
                    <span>Mais</span>
                  </div>
                </div>

                {/* Heatmap horário × dia */}
                <HourDayHeatmap sessions={sessions} />

                {/* Radar de matérias */}
                {radarData.length >= 3 && (
                  <div className="rounded-2xl border border-border bg-card/70 p-4">
                    <h2 className="mb-3 font-heading text-base font-semibold flex items-center gap-2">
                      <Target className="h-4 w-4 text-primary" /> Radar de desempenho
                    </h2>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <RadarChart data={radarData}>
                          <PolarGrid stroke="hsl(var(--border))" />
                          <PolarAngleAxis dataKey="materia" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                          <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
                          <Radar dataKey="acerto" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.25} strokeWidth={2} />
                        </RadarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}

                {/* Tópicos críticos */}
                {criticalTopics.length > 0 && (
                  <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-4">
                    <h2 className="mb-3 font-heading text-base font-semibold flex items-center gap-2 text-destructive">
                      <AlertTriangle className="h-4 w-4" /> Tópicos com erros recorrentes
                    </h2>
                    <div className="space-y-2">
                      {criticalTopics.map(t => (
                        <div key={t.id} className="flex items-center justify-between rounded-lg border border-border/60 bg-background/50 px-3 py-2">
                          <div>
                            <p className="text-sm font-medium">{t.tema}</p>
                            <p className="text-xs text-muted-foreground">{t.materia}</p>
                          </div>
                          <span className="text-sm font-bold text-destructive">{t.quizErrors?.length ?? 0} erros</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Desempenho por matéria */}
                {perfs.length > 0 && (
                  <div className="rounded-2xl border border-border bg-card/70 p-4">
                    <h2 className="mb-3 font-heading text-base font-semibold">Acerto por matéria</h2>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={perfs.slice(0, 8).map(p => ({ materia: p.materia.slice(0, 5), acerto: p.accuracy, erros: p.erros }))} margin={{ top: 8, right: 8, left: -10, bottom: 8 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                          <XAxis dataKey="materia" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                          <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                          <Tooltip
                            contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
                            formatter={(v: number, n: string) => [n === "acerto" ? `${v}%` : v, n === "acerto" ? "Acerto" : "Erros"]}
                          />
                          <Bar dataKey="acerto" name="acerto" radius={[4, 4, 0, 0]}>
                            {perfs.slice(0, 8).map((p, i) => (
                              <Cell key={i} fill={SUBJECT_HEX[p.materia as Subject] ?? "#3b82f6"} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ── ABA: DASHBOARD VIVO ──────────────────────────────── */}
            {activeTab === "vivo" && (
              <div className="space-y-4">
                <SubjectHeatmap sessions={sessions} days={14} />
                <EvolutionChart sessions={sessions} actions={actions} days={30} />
                <WeakSpotsCard
                  perfs={perfs}
                  topics={topics.map(t => ({
                    id: (t as any).id,
                    tema: (t as any).tema,
                    materia: (t as any).materia,
                    quizErrors: (t as any).quizErrors,
                    quizLastScore: (t as any).quizLastScore ?? null,
                    rating: (t as any).rating ?? 0,
                  }))}
                />
              </div>
            )}

            {/* ── ABA: EVOLUÇÃO ────────────────────────────────────── */}
            {activeTab === "evolucao" && (
              <div className="space-y-4">
                {evolutionData.length >= 2 ? (
                  <>
                    <div className="rounded-2xl border border-border bg-card/70 p-4">
                      <h2 className="mb-1 font-heading text-base font-semibold flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 text-green-500" /> Evolução do acerto por semana
                      </h2>
                      <p className="text-xs text-muted-foreground mb-4">Média de acerto nos quizzes nas últimas semanas.</p>
                      <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={evolutionData} margin={{ top: 8, right: 8, left: -10, bottom: 8 }}>
                            <defs>
                              <linearGradient id="acertoGrad" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                            <XAxis dataKey="semana" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                            <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                            <Tooltip
                              contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
                              formatter={(v: number, n: string) => [`${v}%`, "Acerto médio"]}
                            />
                            <Area type="monotone" dataKey="acerto" stroke="#3b82f6" strokeWidth={2} fill="url(#acertoGrad)" />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-border bg-card/70 p-4">
                      <h2 className="mb-1 font-heading text-base font-semibold">Questões por semana</h2>
                      <p className="text-xs text-muted-foreground mb-4">Volume de questões respondidas.</p>
                      <div className="h-48">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={evolutionData} margin={{ top: 4, right: 8, left: -10, bottom: 4 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                            <XAxis dataKey="semana" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                            <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                            <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                            <Bar dataKey="questoes" name="Questões" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="rounded-2xl border border-border bg-card/70 p-8 text-center">
                    <TrendingUp className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
                    <p className="font-heading text-base font-semibold">Dados insuficientes</p>
                    <p className="mt-1 text-sm text-muted-foreground">Faça quizzes por pelo menos 2 semanas para ver a evolução.</p>
                  </div>
                )}

                {/* Tempo de estudo por matéria */}
                {sessions.length > 0 && (() => {
                  const bySubject: Record<string, number> = {};
                  sessions.forEach(s => {
                    const k = s.subject ?? "Geral";
                    bySubject[k] = (bySubject[k] ?? 0) + s.duration_ms / 60000;
                  });
                  const data = Object.entries(bySubject).map(([s, m]) => ({ subject: s, min: Math.round(m) })).sort((a, b) => b.min - a.min).slice(0, 8);
                  return (
                    <div className="rounded-2xl border border-border bg-card/70 p-4">
                      <h2 className="mb-1 font-heading text-base font-semibold flex items-center gap-2">
                        <Clock className="h-4 w-4 text-blue-500" /> Tempo de estudo por matéria
                      </h2>
                      <div className="mt-4 space-y-2">
                        {data.map(d => (
                          <div key={d.subject} className="flex items-center gap-3">
                            <span className="w-24 truncate text-xs text-muted-foreground">{d.subject}</span>
                            <div className="flex-1 rounded-full bg-muted h-2 overflow-hidden">
                              <div className="h-full rounded-full bg-blue-500" style={{ width: `${Math.min(100, (d.min / data[0].min) * 100)}%` }} />
                            </div>
                            <span className="text-xs font-medium w-14 text-right">{fmtMin(d.min * 60000)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}

            {/* ── ABA: PREDIÇÃO ENEM ───────────────────────────────── */}
            {activeTab === "enem" && (
              <div className="space-y-4">
                <div className="rounded-2xl border border-primary/30 bg-primary/5 p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Nota estimada ENEM</p>
                      <div className="flex items-baseline gap-2 mt-1">
                        <span className="font-heading text-5xl font-bold text-primary">{toENEMScale(enemPred.score)}</span>
                        <span className="text-lg text-muted-foreground">/1000</span>
                        {enemPred.trend === "up" && <TrendingUp className="h-5 w-5 text-green-500" />}
                        {enemPred.trend === "down" && <TrendingDown className="h-5 w-5 text-red-500" />}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Confiança: {enemPred.confidence}% · Baseado em {perfs.length} matérias e {sessions.length} sessões
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">Média nacional</p>
                      <p className="font-heading text-2xl font-bold text-muted-foreground">550</p>
                    </div>
                  </div>

                  {/* Barra visual — escala ENEM 300-1000 */}
                  <div className="mt-4 rounded-full bg-muted h-3 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-primary transition-all"
                      style={{ width: `${((toENEMScale(enemPred.score) - 300) / 700) * 100}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground mt-1">
                    <span>300</span><span>550</span><span>1000</span>
                  </div>
                </div>

                {/* Maiores contribuições */}
                {enemPred.score > 0 && (() => {
                  const top = getTopContributors(enemPred.factors, enemPred.weights);
                  return (
                    <div className="rounded-2xl border border-border bg-card/70 p-4" data-testid="top-contributors">
                      <h2 className="mb-3 font-heading text-base font-semibold flex items-center gap-2">
                        <Zap className="h-4 w-4 text-amber-500" /> Maiores contribuições
                      </h2>
                      <div className="space-y-2">
                        {top.map((c, i) => (
                          <div key={c.label} className="flex items-center justify-between rounded-lg bg-background/50 border border-border/50 px-3 py-2">
                            <span className="text-sm font-medium">
                              <span className="text-muted-foreground mr-1.5">{i + 1}.</span>
                              {c.label}
                              <span className="text-muted-foreground font-normal ml-1.5">({c.weight}% peso)</span>
                            </span>
                            <span className="text-sm font-semibold text-primary">+{c.contribution} pts</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}

                {/* Como foi calculado — pesos e fontes reais */}
                <div className="rounded-2xl border border-border bg-card/70 p-4">
                  <h2 className="mb-3 font-heading text-base font-semibold flex items-center gap-2">
                    <Target className="h-4 w-4 text-primary" /> Como foi calculado
                  </h2>
                  <div className="space-y-2.5">
                    {[
                      { label: "Quizzes", weight: enemPred.weights.quizzes, score: enemPred.factors.quizScore, detail: perfs.length > 0 ? `${Math.round(perfs.reduce((a,p)=>a+p.accuracy,0)/perfs.length)}% acerto` : "Sem dados", active: perfs.length > 0, color: "bg-blue-500" },
                      { label: "Redações", weight: enemPred.weights.essays, score: enemPred.factors.essayScore, detail: enemPred.factors.hasEssays ? `${enemPred.factors.essayCount} corrigida(s)` : "Sem dados", active: enemPred.factors.hasEssays, color: "bg-cyan-500" },
                      { label: "Revisões", weight: enemPred.weights.reviews, score: enemPred.factors.reviewScore, detail: enemPred.factors.hasReviews ? `${enemPred.factors.reviewRate}% em dia` : "Sem dados", active: enemPred.factors.hasReviews, color: "bg-green-500" },
                      { label: "Volume de estudo", weight: enemPred.weights.volume, score: enemPred.factors.volumeScore, detail: fmtMin(enemPred.factors.studyVolumeMin * 60000), active: sessions.length > 0, color: "bg-purple-500" },
                      { label: "Cronograma", weight: enemPred.weights.schedule, score: enemPred.factors.scheduleScore, detail: enemPred.factors.hasSchedule ? `${enemPred.factors.scheduleAdherence}% concluído` : "Sem dados", active: enemPred.factors.hasSchedule, color: "bg-orange-500" },
                    ].filter(f => f.weight > 0).map(f => (
                      <div key={f.label}>
                        <div className="flex justify-between text-xs mb-1">
                          <span className={`font-medium ${f.active ? "text-foreground" : "text-muted-foreground"}`}>
                            {f.label} <span className="text-muted-foreground font-normal">· peso {f.weight}%</span>
                          </span>
                          <span className={`font-semibold ${f.active ? "text-foreground" : "text-muted-foreground"}`}>
                            {toENEMScale(f.score)}
                            <span className="font-normal text-muted-foreground ml-1.5">{f.detail}</span>
                          </span>
                        </div>
                        <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                          <div className={`h-full rounded-full ${f.color}`} style={{ width: `${(f.score / 1000) * 100}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                  {(!enemPred.factors.hasEssays || !enemPred.factors.hasReviews || !enemPred.factors.hasSchedule) && (
                    <p className="mt-3 text-xs text-muted-foreground">
                      Adicione {!enemPred.factors.hasEssays && "redações"}{!enemPred.factors.hasEssays && (!enemPred.factors.hasReviews || !enemPred.factors.hasSchedule) && ", "}{!enemPred.factors.hasReviews && "revisões"}{!enemPred.factors.hasReviews && !enemPred.factors.hasSchedule && " e "}{!enemPred.factors.hasSchedule && "cronograma"} pra aumentar a precisão da predição.
                    </p>
                  )}
                </div>

                {/* Por área */}
                <div className="grid gap-3 sm:grid-cols-2">
                  {enemPred.breakdown.map(b => (
                    <div key={b.area} className="rounded-2xl border border-border bg-card/70 p-4">
                      <p className="text-xs text-muted-foreground mb-1">{b.area}</p>
                      <p className="font-heading text-2xl font-bold" style={{ color: b.color }}>{toENEMScale(b.score)}</p>
                      <div className="mt-2 rounded-full bg-muted h-2 overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${(b.score / 1000) * 100}%`, background: b.color }} />
                      </div>
                    </div>
                  ))}
                </div>

                {/* O que fazer */}
                {perfs.filter(p => p.accuracy < 60).length > 0 && (
                  <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-4">
                    <h2 className="mb-3 font-heading text-base font-semibold flex items-center gap-2">
                      <Zap className="h-4 w-4 text-amber-500" /> Para subir a nota
                    </h2>
                    <div className="space-y-2">
                      {perfs.filter(p => p.accuracy < 60).slice(0, 4).map(p => (
                        <div key={p.materia} className="flex items-center justify-between rounded-lg bg-background/50 border border-border/50 px-3 py-2">
                          <span className="text-sm">{p.materia}</span>
                          <span className="text-xs text-amber-600 font-medium">{p.accuracy}% → meta 70%</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <p className="text-xs text-muted-foreground text-center">
                  Predição baseada no seu desempenho atual. Não reflete o gabarito oficial do INEP.
                </p>
              </div>
            )}

            {/* ── ABA: RELATÓRIO ────────────────────────────────────── */}
            {activeTab === "relatorio" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-4 flex-wrap bg-primary/5 border border-primary/20 rounded-2xl p-5">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
                      <FileDown className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-primary mb-1">Exportar Relatório Detalhado</h3>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        Gere um PDF completo com seu progresso, pontos fortes, fracos e predição de nota para salvar ou compartilhar com tutores/pais.
                      </p>
                    </div>
                  </div>
                  <Button 
                    onClick={handleExportPDF} 
                    disabled={exporting}
                    className="gap-2 rounded-xl"
                  >
                    {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4" />}
                    {exporting ? "Gerando..." : "Baixar PDF"}
                  </Button>
                </div>
                
                <DetailedProgressReport
                  totalXP={0} // Gamification profile is not directly available here in the same shape
                  level={1}
                  streak={streak}
                  totalStudyHours={Math.round(totalStudyMs / 3600000)}
                  strongSubjects={perfs.filter(p => p.accuracy >= 75).map(p => p.materia)}
                  weakSubjects={perfs.filter(p => p.accuracy < 60).map(p => p.materia)}
                  subjectPerformances={perfs.map(p => ({
                    subject: p.materia,
                    accuracy: p.accuracy,
                    totalQuestions: p.acertos + p.erros,
                    studyMinutes: Math.round(filteredSessions.filter(s => s.subject === p.materia).reduce((a, s) => a + s.duration_ms, 0) / 60000),
                    trend: p.accuracy >= 70 ? "up" : p.accuracy < 50 ? "down" : "stable"
                  }))}
                  weeklyData={heatmapData.map(d => ({
                    day: d.label,
                    minutes: d.min,
                    questions: filteredActions.filter(a => a.created_at.startsWith(d.date) && (a.action === "quiz_correct" || a.action === "quiz_wrong")).length,
                    revisions: reviews.filter(r => r.completed_at && r.completed_at.startsWith(d.date)).length
                  }))}
                />
              </div>
            )}

            {/* ── ABA: REVISÕES ────────────────────────────────────── */}
            {activeTab === "revisoes" && (

              <div className="space-y-4">
                <div className="grid gap-3 grid-cols-3">
                  {[
                    { label: "Total agendadas", value: reviews.length, color: "text-primary" },
                    { label: "Completadas", value: reviews.filter(r => r.completed).length, color: "text-green-500" },
                    { label: "Atrasadas", value: overdueCt, color: overdueCt > 0 ? "text-destructive" : "text-muted-foreground" },
                  ].map(({ label, value, color }) => (
                    <div key={label} className="rounded-2xl border border-border bg-card/70 p-4 text-center">
                      <p className={`font-heading text-3xl font-bold ${color}`}>{value}</p>
                      <p className="text-xs text-muted-foreground mt-1">{label}</p>
                    </div>
                  ))}
                </div>

                {reviewStats.length > 0 ? (
                  <div className="rounded-2xl border border-border bg-card/70 p-4">
                    <h2 className="mb-3 font-heading text-base font-semibold">Taxa de revisão por matéria</h2>
                    <div className="space-y-3">
                      {reviewStats.map(r => (
                        <div key={r.materia}>
                          <div className="flex justify-between text-sm mb-1">
                            <span className="font-medium">{r.materia}</span>
                            <span className="text-muted-foreground">{r.taxa}% · {r.pending} pendentes</span>
                          </div>
                          <div className="h-2 rounded-full bg-muted overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${r.taxa >= 70 ? "bg-green-500" : r.taxa >= 40 ? "bg-amber-500" : "bg-red-500"}`}
                              style={{ width: `${r.taxa}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="rounded-2xl border border-border bg-card/70 p-8 text-center">
                    <Calendar className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
                    <p className="font-heading text-base font-semibold">Sem revisões agendadas</p>
                    <p className="mt-1 text-sm text-muted-foreground">Adicione tópicos para começar a revisão espaçada.</p>
                  </div>
                )}

                {/* Próximas revisões */}
                {reviews.filter(r => !r.completed).length > 0 && (
                  <div className="rounded-2xl border border-border bg-card/70 p-4">
                    <h2 className="mb-3 font-heading text-base font-semibold">Próximas revisões</h2>
                    <div className="space-y-2">
                      {reviews.filter(r => !r.completed).slice(0, 8).map(r => {
                        const isOverdue = r.scheduled_date < new Date().toISOString().split("T")[0];
                        return (
                          <div key={r.id} className={`flex items-center justify-between rounded-lg border px-3 py-2 ${isOverdue ? "border-destructive/30 bg-destructive/5" : "border-border/60 bg-background/40"}`}>
                            <div>
                              <p className="text-sm font-medium">{r.materia}</p>
                              <p className="text-xs text-muted-foreground">Intervalo: {r.interval_days} dias</p>
                            </div>
                            <span className={`text-xs font-medium ${isOverdue ? "text-destructive" : "text-muted-foreground"}`}>
                              {isOverdue ? "Atrasada" : new Date(r.scheduled_date + "T12:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
            {/* ── ABA: RELATÓRIO DETALHADO ────────────────────────── */}
            {activeTab === "relatorio" && (
              <DetailedProgressReport
                subjectPerformances={perfs.map(p => ({
                  subject: p.materia,
                  accuracy: p.accuracy,
                  totalQuestions: p.acertos + p.erros,
                  studyMinutes: Math.round(
                    sessions
                      .filter(s => s.subject === p.materia)
                      .reduce((acc, s) => acc + s.duration_ms, 0) / 60000
                  ),
                  trend: p.erro_recorrente ? "down" : p.accuracy >= 70 ? "up" : "stable",
                }))}
                weeklyData={last7Days().map(d => ({
                  day: new Date(d + "T12:00:00").toLocaleDateString("pt-BR", { weekday: "short" }),
                  minutes: Math.round(
                    sessions
                      .filter(s => s.created_at.startsWith(d))
                      .reduce((acc, s) => acc + s.duration_ms, 0) / 60000
                  ),
                  questions: actions.filter(a => a.created_at.startsWith(d) && a.action === "quiz_answer").length,
                  revisions: actions.filter(a => a.created_at.startsWith(d) && a.action === "revision_done").length,
                }))}
                totalXP={loadGamification().xp}
                level={loadGamification().level}
                streak={streak}
                totalStudyHours={Math.round(sessions.reduce((acc, s) => acc + s.duration_ms, 0) / 3600000)}
                strongSubjects={perfs.filter(p => p.accuracy >= 70).map(p => p.materia)}
                weakSubjects={perfs.filter(p => p.accuracy < 50 || p.erro_recorrente).map(p => p.materia)}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}
