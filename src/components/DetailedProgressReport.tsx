import { useMemo } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  Cell, CartesianGrid, LineChart, Line, RadarChart, Radar,
  PolarGrid, PolarAngleAxis, PolarRadiusAxis, Legend,
  AreaChart, Area, PieChart, Pie,
} from "recharts";
import { TrendingUp, TrendingDown, Target, AlertTriangle, CheckCircle, Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface SubjectPerformance {
  subject: string;
  accuracy: number;
  totalQuestions: number;
  studyMinutes: number;
  trend: "up" | "down" | "stable";
}

interface WeeklyData {
  day: string;
  minutes: number;
  questions: number;
  revisions: number;
}

interface DetailedProgressReportProps {
  subjectPerformances: SubjectPerformance[];
  weeklyData: WeeklyData[];
  totalXP: number;
  level: number;
  streak: number;
  totalStudyHours: number;
  strongSubjects: string[];
  weakSubjects: string[];
}

const SUBJECT_COLORS: Record<string, string> = {
  "Matemática": "#3b82f6",
  "Biologia": "#10b981",
  "Química": "#f59e0b",
  "Física": "#8b5cf6",
  "Português": "#ef4444",
  "História": "#f97316",
  "Geografia": "#14b8a6",
  "Inglês": "#ec4899",
  "Redação": "#06b6d4",
  default: "#64748b",
};

function getSubjectColor(subject: string): string {
  return SUBJECT_COLORS[subject] || SUBJECT_COLORS.default;
}

function getAccuracyLabel(accuracy: number): { label: string; color: string } {
  if (accuracy >= 80) return { label: "Excelente", color: "text-green-500" };
  if (accuracy >= 60) return { label: "Bom", color: "text-blue-500" };
  if (accuracy >= 40) return { label: "Regular", color: "text-yellow-500" };
  return { label: "Precisa melhorar", color: "text-red-500" };
}

export function DetailedProgressReport({
  subjectPerformances,
  weeklyData,
  totalXP,
  level,
  streak,
  totalStudyHours,
  strongSubjects,
  weakSubjects,
}: DetailedProgressReportProps) {
  const radarData = useMemo(
    () =>
      subjectPerformances.slice(0, 6).map((s) => ({
        subject: s.subject.length > 8 ? s.subject.slice(0, 8) + "." : s.subject,
        accuracy: s.accuracy,
        fullMark: 100,
      })),
    [subjectPerformances]
  );

  const pieData = useMemo(
    () =>
      subjectPerformances.map((s) => ({
        name: s.subject,
        value: s.studyMinutes,
        color: getSubjectColor(s.subject),
      })),
    [subjectPerformances]
  );

  const avgAccuracy = useMemo(() => {
    if (subjectPerformances.length === 0) return 0;
    return Math.round(
      subjectPerformances.reduce((acc, s) => acc + s.accuracy, 0) / subjectPerformances.length
    );
  }, [subjectPerformances]);

  return (
    <div className="space-y-6">
      {/* Resumo executivo */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-xl border bg-card p-3 text-center">
          <p className="text-2xl font-bold text-primary">{level}</p>
          <p className="text-xs text-muted-foreground">Nível</p>
        </div>
        <div className="rounded-xl border bg-card p-3 text-center">
          <p className="text-2xl font-bold text-orange-500">{streak}</p>
          <p className="text-xs text-muted-foreground">Dias seguidos</p>
        </div>
        <div className="rounded-xl border bg-card p-3 text-center">
          <p className="text-2xl font-bold text-blue-500">{totalStudyHours}h</p>
          <p className="text-xs text-muted-foreground">Horas estudadas</p>
        </div>
        <div className="rounded-xl border bg-card p-3 text-center">
          <p className="text-2xl font-bold text-green-500">{avgAccuracy}%</p>
          <p className="text-xs text-muted-foreground">Precisão média</p>
        </div>
      </div>

      {/* Pontos fortes e fracos */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="rounded-xl border bg-card p-4">
          <h4 className="font-semibold text-sm flex items-center gap-2 mb-3">
            <CheckCircle className="w-4 h-4 text-green-500" />
            Pontos Fortes
          </h4>
          {strongSubjects.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {strongSubjects.map((s) => (
                <Badge key={s} variant="secondary" className="bg-green-500/10 text-green-700 dark:text-green-400">
                  {s}
                </Badge>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">Continue estudando para identificar seus pontos fortes!</p>
          )}
        </div>
        <div className="rounded-xl border bg-card p-4">
          <h4 className="font-semibold text-sm flex items-center gap-2 mb-3">
            <AlertTriangle className="w-4 h-4 text-yellow-500" />
            Precisa de Atenção
          </h4>
          {weakSubjects.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {weakSubjects.map((s) => (
                <Badge key={s} variant="secondary" className="bg-yellow-500/10 text-yellow-700 dark:text-yellow-400">
                  {s}
                </Badge>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">Ótimo! Nenhuma matéria crítica identificada.</p>
          )}
        </div>
      </div>

      {/* Gráfico de atividade semanal */}
      {weeklyData.length > 0 && (
        <div className="rounded-xl border bg-card p-4">
          <h4 className="font-semibold text-sm mb-4">Atividade dos Últimos 7 Dias</h4>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={weeklyData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="minutesGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="day" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip
                formatter={(v: number) => [`${v} min`, "Estudo"]}
                contentStyle={{ fontSize: 12, borderRadius: 8 }}
              />
              <Area
                type="monotone"
                dataKey="minutes"
                stroke="#6366f1"
                fill="url(#minutesGrad)"
                strokeWidth={2}
                name="Minutos"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Desempenho por matéria */}
      {subjectPerformances.length > 0 && (
        <div className="rounded-xl border bg-card p-4">
          <h4 className="font-semibold text-sm mb-4">Desempenho por Matéria</h4>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart
              data={subjectPerformances}
              margin={{ top: 5, right: 5, left: -20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis
                dataKey="subject"
                tick={{ fontSize: 10 }}
                tickFormatter={(v) => v.length > 6 ? v.slice(0, 6) + "." : v}
              />
              <YAxis tick={{ fontSize: 11 }} domain={[0, 100]} />
              <Tooltip
                formatter={(v: number) => [`${v}%`, "Acertos"]}
                contentStyle={{ fontSize: 12, borderRadius: 8 }}
              />
              <Bar dataKey="accuracy" radius={[4, 4, 0, 0]}>
                {subjectPerformances.map((entry, index) => (
                  <Cell key={index} fill={getSubjectColor(entry.subject)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Radar de competências */}
      {radarData.length >= 3 && (
        <div className="rounded-xl border bg-card p-4">
          <h4 className="font-semibold text-sm mb-4">Mapa de Competências</h4>
          <ResponsiveContainer width="100%" height={220}>
            <RadarChart data={radarData}>
              <PolarGrid stroke="hsl(var(--border))" />
              <PolarAngleAxis dataKey="subject" tick={{ fontSize: 11 }} />
              <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 10 }} />
              <Radar
                name="Precisão"
                dataKey="accuracy"
                stroke="#6366f1"
                fill="#6366f1"
                fillOpacity={0.3}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Distribuição de tempo */}
      {pieData.length > 0 && (
        <div className="rounded-xl border bg-card p-4">
          <h4 className="font-semibold text-sm mb-4">Distribuição do Tempo de Estudo</h4>
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  dataKey="value"
                  nameKey="name"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={index} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(v: number) => [`${v} min`, "Tempo"]}
                  contentStyle={{ fontSize: 12, borderRadius: 8 }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex flex-col gap-1.5 min-w-0">
              {pieData.map((entry) => (
                <div key={entry.name} className="flex items-center gap-2 text-xs">
                  <div
                    className="w-3 h-3 rounded-sm shrink-0"
                    style={{ backgroundColor: entry.color }}
                  />
                  <span className="truncate">{entry.name}</span>
                  <span className="text-muted-foreground ml-auto">{entry.value}min</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tabela de desempenho detalhada */}
      {subjectPerformances.length > 0 && (
        <div className="rounded-xl border bg-card p-4">
          <h4 className="font-semibold text-sm mb-3">Relatório Detalhado por Matéria</h4>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 pr-4 text-xs text-muted-foreground font-medium">Matéria</th>
                  <th className="text-center py-2 px-2 text-xs text-muted-foreground font-medium">Precisão</th>
                  <th className="text-center py-2 px-2 text-xs text-muted-foreground font-medium">Questões</th>
                  <th className="text-center py-2 px-2 text-xs text-muted-foreground font-medium">Tempo</th>
                  <th className="text-center py-2 pl-2 text-xs text-muted-foreground font-medium">Tendência</th>
                </tr>
              </thead>
              <tbody>
                {subjectPerformances.map((s) => {
                  const { label, color } = getAccuracyLabel(s.accuracy);
                  return (
                    <tr key={s.subject} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                      <td className="py-2 pr-4">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-2.5 h-2.5 rounded-full"
                            style={{ backgroundColor: getSubjectColor(s.subject) }}
                          />
                          <span className="font-medium">{s.subject}</span>
                        </div>
                      </td>
                      <td className="text-center py-2 px-2">
                        <span className={`font-semibold ${color}`}>{s.accuracy}%</span>
                        <p className={`text-[10px] ${color}`}>{label}</p>
                      </td>
                      <td className="text-center py-2 px-2 text-muted-foreground">
                        {s.totalQuestions}
                      </td>
                      <td className="text-center py-2 px-2 text-muted-foreground">
                        {s.studyMinutes}min
                      </td>
                      <td className="text-center py-2 pl-2">
                        {s.trend === "up" ? (
                          <TrendingUp className="w-4 h-4 text-green-500 mx-auto" />
                        ) : s.trend === "down" ? (
                          <TrendingDown className="w-4 h-4 text-red-500 mx-auto" />
                        ) : (
                          <Target className="w-4 h-4 text-muted-foreground mx-auto" />
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
