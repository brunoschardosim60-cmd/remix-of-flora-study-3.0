import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Flame, Target, TrendingUp, Clock, RefreshCw, Brain, CheckCircle2, Sparkles } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { seenToday, markSeenToday } from "@/lib/messageDedup";

interface DailyGoalCard {
  id: "minutes" | "revisions" | "quiz";
  label: string;
  current: number;
  target: number;
  unit: string;
}

interface DashboardHeroProps {
  firstName?: string;
  isLoggedIn: boolean;
  streakDays: number;
  weeklyProgressPercent: number;
  weeklyCompleted: number;
  weeklyTotal: number;
  dailyGoals: DailyGoalCard[];
  todayMinutes: number;
  revisionsCompletedToday: number;
  comebackMode: boolean;
  onPrimaryAction: () => void;
  onFocusAction?: () => void;
  primaryLabel: string;
  timeOfDay?: "morning" | "afternoon" | "evening" | "night";
  minutesAway?: number;
}

function greetingLabel(firstName: string | undefined, isLoggedIn: boolean, timeOfDay?: string, minutesAway?: number) {
  if (!isLoggedIn) return "Pronto para estudar?";
  
  let greeting = "Bom te ver";
  if (timeOfDay === "morning") greeting = "Bom dia";
  if (timeOfDay === "afternoon") greeting = "Boa tarde";
  if (timeOfDay === "evening" || timeOfDay === "night") greeting = "Boa noite";

  return firstName ? `${greeting}, ${firstName}` : greeting;
}

export function DashboardHero({
  firstName,
  isLoggedIn,
  streakDays,
  weeklyProgressPercent,
  weeklyCompleted,
  weeklyTotal,
  dailyGoals,
  todayMinutes,
  revisionsCompletedToday,
  comebackMode,
  onPrimaryAction,
  onFocusAction,
  primaryLabel,
  timeOfDay,
  minutesAway,
}: DashboardHeroProps) {
  const { user } = useAuth();
  // Badge "Ritmo em dia / Bem-vindo de volta / Sentimos sua falta": mostra 1x por dia
  // por status, evitando repetir toda vez que o aluno volta ao dashboard.
  const statusKey = minutesAway === undefined
    ? null
    : minutesAway > 120 ? "hero-badge:away-long"
    : minutesAway > 30  ? "hero-badge:away-short"
    : "hero-badge:on-track";
  const [showBadge, setShowBadge] = useState<boolean>(() =>
    statusKey ? !seenToday(user?.id, statusKey) : true
  );
  useEffect(() => {
    if (!statusKey) return;
    if (showBadge) markSeenToday(user?.id, statusKey);
  }, [statusKey, showBadge, user?.id]);

  return (
    <section className="relative overflow-hidden rounded-[28px] border border-border/60 bg-gradient-to-br from-primary/10 via-card to-secondary/10 p-5 sm:p-7">
      <div className="absolute inset-y-0 right-0 w-1/2 bg-[radial-gradient(circle_at_top_right,hsl(var(--primary)/0.12),transparent_60%)]" />
      <div className="relative space-y-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-3 max-w-2xl">
            {showBadge && (
              <Badge variant="secondary" className="w-fit">
                {minutesAway !== undefined && minutesAway > 120 ? "Sentimos sua falta" : (minutesAway !== undefined && minutesAway > 30 ? "Bem-vindo de volta" : "Ritmo em dia")}
              </Badge>
            )}
            <div className="space-y-1">
              <h2 className="font-heading text-2xl font-bold sm:text-3xl">{greetingLabel(firstName, isLoggedIn, timeOfDay, minutesAway)}</h2>
              <p className="text-sm text-muted-foreground sm:text-base">
                {isLoggedIn
                  ? "Hoje está tudo organizado para você seguir sem pensar demais no próximo passo."
                  : "Escolhe um bloco e começa."}
              </p>
            </div>
            <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-3">
              <Button size="lg" className="w-full sm:w-auto sm:min-w-[180px]" onClick={onPrimaryAction}>
                {primaryLabel}
              </Button>
              <div className="w-full sm:w-auto rounded-2xl border border-border/70 bg-background/70 px-4 py-3">
                <p className="text-xs text-muted-foreground">Resumo de hoje</p>
                <p className="font-medium">
                  {todayMinutes} min estudados · {revisionsCompletedToday} revis{revisionsCompletedToday === 1 ? "ada" : "adas"}
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 min-w-0 lg:min-w-[360px] w-full lg:w-auto">
            <div className="rounded-2xl border border-border/70 bg-background/75 p-4">
              <div className="flex items-center gap-2 text-muted-foreground text-sm">
                <Flame className="w-4 h-4 text-orange-500" />
                Streak diário
              </div>
              <p className="mt-2 font-heading text-3xl font-bold">{streakDays}</p>
              <p className="text-xs text-muted-foreground">dias seguidos com atividade</p>
            </div>
            <div className="rounded-2xl border border-border/70 bg-background/75 p-4">
              <div className="flex items-center gap-2 text-muted-foreground text-sm">
                <TrendingUp className="w-4 h-4 text-secondary" />
                Semana
              </div>
              <p className="mt-2 font-heading text-3xl font-bold">{weeklyProgressPercent}%</p>
              <p className="text-xs text-muted-foreground">{weeklyCompleted}/{weeklyTotal} revisões da semana</p>
            </div>
          </div>
        </div>

        {(() => {
          const goalsPercent = dailyGoals.map((g) =>
            g.target > 0 ? Math.min(100, Math.round((g.current / g.target) * 100)) : 0
          );
          const overall = goalsPercent.length
            ? Math.round(goalsPercent.reduce((a, b) => a + b, 0) / goalsPercent.length)
            : 0;
          const completedCount = goalsPercent.filter((p) => p >= 100).length;
          const iconFor = (id: DailyGoalCard["id"]) =>
            id === "minutes" ? Clock : id === "revisions" ? RefreshCw : Brain;

          return (
            <div className="rounded-2xl border border-border/70 bg-background/75 p-4 sm:p-5">
              <div className="flex items-center justify-between gap-3 mb-4">
                <div className="flex items-center gap-2 text-muted-foreground text-sm">
                  <Target className="w-4 h-4 text-primary" />
                  <span className="font-heading font-semibold text-foreground">Meta do dia</span>
                </div>
                <span className="text-xs text-muted-foreground">
                  {completedCount}/{dailyGoals.length} concluídas · {overall}%
                </span>
              </div>

              <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
                {dailyGoals.map((goal, idx) => {
                  const percent = goalsPercent[idx];
                  const done = percent >= 100;
                  const Icon = iconFor(goal.id);
                  return (
                    <div
                      key={goal.id}
                      className="rounded-2xl border border-border/70 bg-background/75 p-4"
                    >
                      <div className="flex items-center justify-between gap-2 text-muted-foreground text-sm">
                        <div className="flex items-center gap-2 min-w-0">
                          <Icon className="w-4 h-4 text-primary shrink-0" />
                          <span className="truncate">{goal.label}</span>
                        </div>
                        {done && <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />}
                      </div>
                      <p className="mt-2 font-heading text-3xl font-bold tabular-nums">{percent}%</p>
                      <p className="text-xs text-muted-foreground">
                        {goal.current}/{goal.target} {goal.unit}
                      </p>
                      <div className="mt-3 h-1.5 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full rounded-full bg-primary transition-all duration-500"
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })()}

      </div>
    </section>
  );
}// Trigger deploy
