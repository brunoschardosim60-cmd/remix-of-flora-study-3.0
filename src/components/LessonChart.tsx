/**
 * src/components/LessonChart.tsx
 *
 * Gráficos interativos inline para o player de aula.
 * Detecta automaticamente o tipo de gráfico pelo conteúdo da aula.
 * Zero chamadas de IA — tudo gerado localmente com Recharts.
 *
 * Tipos suportados:
 *   "line"   → funções matemáticas, crescimento, evolução
 *   "bar"    → estatística, comparações, distribuições
 *   "pie"    → proporções, porcentagens, composição
 *   "area"   → acumulados, integrais, áreas
 *   "scatter"→ dispersão, correlação
 *   "cycle"  → ciclos biogeoquímicos, fases (SVG animado)
 *   "timeline" → linha do tempo histórica (SVG animado)
 *   "reaction" → equação química balanceada (SVG animado)
 */

import React, { useState, useMemo, useCallback, useRef, useEffect } from "react";
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  AreaChart, Area, ScatterChart, Scatter,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, ReferenceLine,
} from "recharts";
import { TrendingUp, BarChart2, PieChart as PieIcon, Layers, Activity, RefreshCw } from "lucide-react";

// ─── Paleta usando CSS vars do tema ──────────────────────────────────────────
const COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--accent))",
  "hsl(230 70% 60%)",
  "hsl(160 60% 45%)",
  "hsl(350 70% 55%)",
  "hsl(40 90% 55%)",
];

// ─── Detecção automática do tipo de gráfico ──────────────────────────────────
export type ChartKind =
  | "line" | "bar" | "pie" | "area" | "scatter"
  | "cycle" | "timeline" | "reaction" | "none";

interface ChartSpec {
  kind: ChartKind;
  title: string;
  data: any[];
  xKey?: string;
  lines?: { key: string; label: string }[];
  unit?: string;
  formula?: string; // para line charts de funções
}

function norm(s: string) {
  return (s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

function has(hay: string, terms: string[]) {
  return terms.some((t) => hay.includes(t));
}

// Gera pontos para funções matemáticas comuns
function evalFn(expr: string, xMin = -5, xMax = 5, steps = 40): { x: number; y: number | null }[] {
  const pts: { x: number; y: number | null }[] = [];
  const step = (xMax - xMin) / steps;
  const safeEval = (x: number): number | null => {
    try {
      // eslint-disable-next-line no-new-func
      const fn = new Function("x", `"use strict"; try { return ${expr}; } catch { return null; }`);
      const r = fn(x);
      return typeof r === "number" && isFinite(r) ? r : null;
    } catch { return null; }
  };
  for (let i = 0; i <= steps; i++) {
    const x = parseFloat((xMin + i * step).toFixed(3));
    pts.push({ x, y: safeEval(x) });
  }
  return pts;
}

export function detectChartSpec(materia: string, titulo: string, conteudo: string): ChartSpec | null {
  const hay = norm(`${materia} ${titulo} ${conteudo}`);

  // ── Ciclos biogeoquímicos (Biologia / Geografia) ─────────────────────────
  if (has(hay, ["ciclo do carbono", "ciclo do nitrogenio", "ciclo da agua", "ciclo biogeoquimico", "ciclo hidrologico"])) {
    return { kind: "cycle", title: "Ciclo Biogeoquímico", data: [] };
  }

  // ── Reações químicas ──────────────────────────────────────────────────────
  if (has(hay, ["equacao quimica", "reacao quimica", "balanceamento", "estequiometria", "reagente", "produto quimico"])) {
    return { kind: "reaction", title: "Reação Química", data: [] };
  }

  // ── Linha do tempo histórica ──────────────────────────────────────────────
  if (has(hay, ["linha do tempo", "cronologia", "periodo historico", "seculo", "revoluc", "guerra mundial", "independencia", "proclamacao"])) {
    const events = extractHistoricalEvents(hay);
    if (events.length >= 2) return { kind: "timeline", title: "Linha do Tempo", data: events };
  }

  // ── Funções matemáticas ───────────────────────────────────────────────────
  if (has(hay, ["funcao quadratica", "parabola", "funcao do 2"])) {
    return { kind: "line", title: "f(x) = ax² + bx + c", formula: "x*x - 2*x - 3", data: evalFn("x*x - 2*x - 3"), xKey: "x", lines: [{ key: "y", label: "f(x) = x² − 2x − 3" }] };
  }
  if (has(hay, ["funcao linear", "funcao afim", "funcao do 1", "proporcional"])) {
    return { kind: "line", title: "f(x) = ax + b", formula: "2*x + 1", data: evalFn("2*x + 1"), xKey: "x", lines: [{ key: "y", label: "f(x) = 2x + 1" }] };
  }
  if (has(hay, ["funcao exponencial", "crescimento exponencial", "decaimento exponencial"])) {
    return { kind: "line", title: "f(x) = aˣ", formula: "Math.pow(2, x)", data: evalFn("Math.pow(2,x)", -3, 4, 30), xKey: "x", lines: [{ key: "y", label: "f(x) = 2ˣ" }] };
  }
  if (has(hay, ["logaritmo", "funcao logaritmica", "log"])) {
    return { kind: "line", title: "f(x) = log(x)", formula: "Math.log(x)/Math.log(2)", data: evalFn("x > 0 ? Math.log(x)/Math.log(2) : null", 0.1, 8, 40), xKey: "x", lines: [{ key: "y", label: "f(x) = log₂(x)" }] };
  }
  if (has(hay, ["seno", "cosseno", "tangente", "trigonometria", "funcao trigonometrica"])) {
    const d = evalFn("Math.sin(x)", -6.5, 6.5, 60).map((p) => ({ x: p.x, seno: p.y, cosseno: Math.cos(p.x) }));
    return { kind: "line", title: "Funções Trigonométricas", data: d, xKey: "x", lines: [{ key: "seno", label: "sen(x)" }, { key: "cosseno", label: "cos(x)" }] };
  }

  // ── Estatística / Probabilidade ───────────────────────────────────────────
  if (has(hay, ["distribuicao normal", "curva de gauss", "curva normal", "desvio padrao"])) {
    const gauss = Array.from({ length: 41 }, (_, i) => {
      const x = -4 + i * 0.2;
      return { x: parseFloat(x.toFixed(1)), y: parseFloat((Math.exp(-0.5 * x * x) / Math.sqrt(2 * Math.PI)).toFixed(4)) };
    });
    return { kind: "area", title: "Distribuição Normal (Curva de Gauss)", data: gauss, xKey: "x", lines: [{ key: "y", label: "P(x)" }] };
  }
  if (has(hay, ["media", "mediana", "moda", "estatistica", "histograma", "frequencia"])) {
    const data = [
      { faixa: "0-20", freq: 3 }, { faixa: "20-40", freq: 8 }, { faixa: "40-60", freq: 15 },
      { faixa: "60-80", freq: 11 }, { faixa: "80-100", freq: 5 },
    ];
    return { kind: "bar", title: "Distribuição de Frequência", data, xKey: "faixa", lines: [{ key: "freq", label: "Frequência" }] };
  }
  if (has(hay, ["probabilidade", "evento", "espaco amostral", "frequencia relativa"])) {
    const data = [
      { evento: "A", prob: 30 }, { evento: "B", prob: 25 }, { evento: "C", prob: 20 },
      { evento: "D", prob: 15 }, { evento: "E", prob: 10 },
    ];
    return { kind: "pie", title: "Espaço Amostral", data, lines: [{ key: "prob", label: "%" }] };
  }

  // ── Cinemática / Física ───────────────────────────────────────────────────
  if (has(hay, ["movimento uniforme", "mru", "velocidade constante", "espaco tempo"])) {
    const data = Array.from({ length: 6 }, (_, i) => ({ t: i, s: 10 * i }));
    return { kind: "line", title: "MRU — Espaço × Tempo", data, xKey: "t", lines: [{ key: "s", label: "s (m)" }], unit: "m" };
  }
  if (has(hay, ["movimento uniformemente variado", "mruv", "aceleracao", "queda livre"])) {
    const data = Array.from({ length: 6 }, (_, i) => ({ t: i, s: 5 * i * i, v: 10 * i }));
    return { kind: "line", title: "MRUV — Posição e Velocidade", data, xKey: "t", lines: [{ key: "s", label: "s (m)" }, { key: "v", label: "v (m/s)" }] };
  }

  // ── Economia / Crescimento populacional ──────────────────────────────────
  if (has(hay, ["crescimento populacional", "populacao mundial", "demografia", "taxa de crescimento"])) {
    const data = [
      { ano: "1800", pop: 1 }, { ano: "1900", pop: 1.6 }, { ano: "1950", pop: 2.5 },
      { ano: "1975", pop: 4 }, { ano: "2000", pop: 6.1 }, { ano: "2025", pop: 8.2 },
    ];
    return { kind: "area", title: "Crescimento Populacional Mundial (bilhões)", data, xKey: "ano", lines: [{ key: "pop", label: "Pop. (bi)" }] };
  }

  return null;
}

// Extrai eventos históricos simples do texto
function extractHistoricalEvents(hay: string): { year: number; event: string }[] {
  const KNOWN: { terms: string[]; year: number; label: string }[] = [
    { terms: ["1822"], year: 1822, label: "Independência do Brasil" },
    { terms: ["1888"], year: 1888, label: "Abolição da Escravatura" },
    { terms: ["1889"], year: 1889, label: "Proclamação da República" },
    { terms: ["primeira guerra"], year: 1914, label: "1ª Guerra Mundial" },
    { terms: ["segunda guerra"], year: 1939, label: "2ª Guerra Mundial" },
    { terms: ["revolucao francesa"], year: 1789, label: "Revolução Francesa" },
    { terms: ["revolucao industrial"], year: 1760, label: "Rev. Industrial" },
    { terms: ["revolucao russa"], year: 1917, label: "Revolução Russa" },
    { terms: ["queda do muro"], year: 1989, label: "Queda do Muro de Berlim" },
    { terms: ["1500"], year: 1500, label: "Chegada dos Portugueses" },
  ];
  return KNOWN.filter((e) => e.terms.some((t) => hay.includes(t)))
    .sort((a, b) => a.year - b.year)
    .map((e) => ({ year: e.year, event: e.label }));
}

// ─── Componentes de gráfico ───────────────────────────────────────────────────

const TICK_STYLE = { fontSize: 11, fill: "hsl(var(--muted-foreground))" };
const GRID_PROPS = { strokeDasharray: "3 3", stroke: "hsl(var(--border))" };

function ChartTooltipStyle() {
  return (
    <style>{`
      .recharts-tooltip-wrapper .recharts-default-tooltip {
        background: hsl(var(--popover)) !important;
        border: 1px solid hsl(var(--border)) !important;
        border-radius: 8px !important;
        font-size: 12px !important;
        color: hsl(var(--foreground)) !important;
      }
    `}</style>
  );
}

function LineChartWidget({ spec }: { spec: ChartSpec }) {
  const [hoveredLine, setHoveredLine] = useState<string | null>(null);
  const lines = spec.lines || [];
  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={spec.data} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
        <CartesianGrid {...GRID_PROPS} />
        <XAxis dataKey={spec.xKey || "x"} tick={TICK_STYLE} />
        <YAxis tick={TICK_STYLE} width={36} />
        <Tooltip contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
        {lines.length > 1 && <Legend wrapperStyle={{ fontSize: 12 }} />}
        {lines.map((l, i) => (
          <Line
            key={l.key} type="monotone" dataKey={l.key} name={l.label}
            stroke={COLORS[i % COLORS.length]}
            strokeWidth={hoveredLine === l.key ? 3 : 2}
            dot={false} activeDot={{ r: 5 }}
            onMouseEnter={() => setHoveredLine(l.key)}
            onMouseLeave={() => setHoveredLine(null)}
            connectNulls={false}
          />
        ))}
        {spec.formula && <ReferenceLine y={0} stroke="hsl(var(--muted-foreground))" strokeDasharray="2 2" />}
      </LineChart>
    </ResponsiveContainer>
  );
}

function AreaChartWidget({ spec }: { spec: ChartSpec }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={spec.data} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
            <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid {...GRID_PROPS} />
        <XAxis dataKey={spec.xKey || "x"} tick={TICK_STYLE} />
        <YAxis tick={TICK_STYLE} width={36} />
        <Tooltip contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
        {(spec.lines || []).map((l, i) => (
          <Area key={l.key} type="monotone" dataKey={l.key} name={l.label}
            stroke={COLORS[i]} fill="url(#areaGrad)" strokeWidth={2} dot={false} />
        ))}
      </AreaChart>
    </ResponsiveContainer>
  );
}

function BarChartWidget({ spec }: { spec: ChartSpec }) {
  const [active, setActive] = useState<number | null>(null);
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={spec.data} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
        <CartesianGrid {...GRID_PROPS} />
        <XAxis dataKey={spec.xKey || "x"} tick={TICK_STYLE} />
        <YAxis tick={TICK_STYLE} width={36} />
        <Tooltip contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
        {(spec.lines || []).map((l) => (
          <Bar key={l.key} dataKey={l.key} name={l.label} radius={[4, 4, 0, 0]}>
            {spec.data.map((_, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]}
                opacity={active === null || active === i ? 1 : 0.45}
                cursor="pointer"
                onMouseEnter={() => setActive(i)} onMouseLeave={() => setActive(null)} />
            ))}
          </Bar>
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}

function PieChartWidget({ spec }: { spec: ChartSpec }) {
  const [active, setActive] = useState<number | null>(null);
  return (
    <ResponsiveContainer width="100%" height={220}>
      <PieChart>
        <Pie data={spec.data} dataKey={spec.lines?.[0]?.key || "value"}
          nameKey={spec.xKey || "name"} cx="50%" cy="50%" outerRadius={85}
          innerRadius={40} paddingAngle={3}
          onMouseEnter={(_, i) => setActive(i)} onMouseLeave={() => setActive(null)}>
          {spec.data.map((entry, i) => (
            <Cell key={i} fill={COLORS[i % COLORS.length]}
              opacity={active === null || active === i ? 1 : 0.5}
              stroke={active === i ? "hsl(var(--background))" : "none"}
              strokeWidth={active === i ? 3 : 0}
              style={{ transform: active === i ? "scale(1.06)" : "scale(1)", transformOrigin: "center", transition: "transform 0.15s" }} />
          ))}
        </Pie>
        <Tooltip contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
          formatter={(v) => [`${v}%`, ""]} />
        <Legend wrapperStyle={{ fontSize: 11 }} formatter={(v) => <span style={{ color: "hsl(var(--foreground))" }}>{v}</span>}
          payload={spec.data.map((d, i) => ({ value: d[spec.xKey || "name"] || d.evento, color: COLORS[i % COLORS.length], type: "circle" as any }))} />
      </PieChart>
    </ResponsiveContainer>
  );
}

// ─── SVG animado: Ciclo Biogeoquímico ────────────────────────────────────────
function CycleChart({ title }: { title: string }) {
  const isCarbono = title.toLowerCase().includes("carbono");
  const isAgua = title.toLowerCase().includes("agua") || title.toLowerCase().includes("hidrol");
  const nodes = isAgua
    ? ["Oceanos", "Evaporação", "Nuvens", "Precipitação", "Rios", "Solo"]
    : isCarbono
    ? ["Atmosfera", "Fotossíntese", "Plantas", "Respiração", "Matéria Orgânica", "Decomposição"]
    : ["Fixação", "Nitrificação", "Absorção", "Desnitrificação", "Decomposição", "Amonificação"];

  const cx = 160, cy = 110, r = 80;
  const pts = nodes.map((_, i) => {
    const a = (i / nodes.length) * 2 * Math.PI - Math.PI / 2;
    return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
  });

  return (
    <svg viewBox="0 0 320 220" width="100%" height={220} style={{ display: "block" }}>
      <defs>
        <marker id="cycArrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto">
          <path d="M0 0l10 5-10 5z" fill="hsl(var(--primary))" />
        </marker>
        <style>{`
          @keyframes cycle-dash { to { stroke-dashoffset: -200; } }
          .cycle-path { stroke-dasharray: 8 6; animation: cycle-dash 3s linear infinite; }
          @keyframes cycle-node-pop { 0%,100%{r:14} 50%{r:17} }
        `}</style>
      </defs>
      {pts.map((p, i) => {
        const next = pts[(i + 1) % pts.length];
        const mx = (p.x + next.x) / 2, my = (p.y + next.y) / 2;
        const dx = next.x - p.x, dy = next.y - p.y;
        const len = Math.sqrt(dx * dx + dy * dy);
        const nx = -dy / len * 18, ny = dx / len * 18;
        return (
          <path key={i}
            d={`M${p.x} ${p.y} Q${mx + nx} ${my + ny} ${next.x} ${next.y}`}
            fill="none" stroke="hsl(var(--primary))" strokeWidth="2"
            markerEnd="url(#cycArrow)"
            className="cycle-path"
            style={{ animationDelay: `${i * 0.5}s` }} />
        );
      })}
      {pts.map((p, i) => (
        <g key={i}>
          <circle cx={p.x} cy={p.y} r={14} fill="hsl(var(--primary))" opacity="0.15" />
          <circle cx={p.x} cy={p.y} r={10} fill="hsl(var(--primary))" opacity="0.85" />
          <text x={p.x} y={p.y - 18} textAnchor="middle" fontSize="9.5" fontWeight="600" fill="hsl(var(--foreground))" >{nodes[i]}</text>
        </g>
      ))}
    </svg>
  );
}

// ─── SVG animado: Equação química ────────────────────────────────────────────
function ReactionChart() {
  return (
    <svg viewBox="0 0 360 160" width="100%" height={160} style={{ display: "block" }}>
      <defs>
        <style>{`
          @keyframes rxn-left { 0%{opacity:0;transform:translateX(-30px)} 60%{opacity:1;transform:translateX(0)} 100%{opacity:1} }
          @keyframes rxn-right { 0%,55%{opacity:0;transform:translateX(20px)} 100%{opacity:1;transform:translateX(0)} }
          @keyframes rxn-arrow { 0%,40%{stroke-dashoffset:80} 100%{stroke-dashoffset:0} }
          .rxn-l { animation: rxn-left 1.8s ease forwards; }
          .rxn-r { animation: rxn-right 1.8s ease forwards; }
          .rxn-a { stroke-dasharray:80; animation: rxn-arrow 1.8s ease forwards; }
        `}</style>
      </defs>
      {/* Reagentes */}
      <g className="rxn-l">
        <circle cx={62} cy={80} r={26} fill="hsl(var(--primary))" opacity="0.8" />
        <text x={62} y={85} textAnchor="middle" fontSize="14" fontWeight="700" fill="white">H₂</text>
        <text x={62} y={118} textAnchor="middle" fontSize="10" fill="hsl(var(--muted-foreground))">Reagente A</text>
        <text x={110} y={85} textAnchor="middle" fontSize="20" fontWeight="800" fill="hsl(var(--foreground))">+</text>
        <circle cx={156} cy={80} r={26} fill="hsl(var(--accent))" opacity="0.8" />
        <text x={156} y={85} textAnchor="middle" fontSize="14" fontWeight="700" fill="white">O₂</text>
        <text x={156} y={118} textAnchor="middle" fontSize="10" fill="hsl(var(--muted-foreground))">Reagente B</text>
      </g>
      {/* Seta */}
      <line x1={192} y1={80} x2={248} y2={80} stroke="hsl(var(--primary))" strokeWidth="3"
        markerEnd="url(#rxnArrow)" className="rxn-a" />
      <text x={220} y={68} textAnchor="middle" fontSize="9" fill="hsl(var(--muted-foreground))">reação</text>
      <defs>
        <marker id="rxnArrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto">
          <path d="M0 0l10 5-10 5z" fill="hsl(var(--primary))" />
        </marker>
      </defs>
      {/* Produto */}
      <g className="rxn-r">
        <circle cx={298} cy={80} r={30} fill="hsl(230 70% 60%)" opacity="0.85" />
        <text x={298} y={85} textAnchor="middle" fontSize="14" fontWeight="700" fill="white">H₂O</text>
        <text x={298} y={120} textAnchor="middle" fontSize="10" fill="hsl(var(--muted-foreground))">Produto</text>
      </g>
    </svg>
  );
}

// ─── SVG animado: Linha do tempo ─────────────────────────────────────────────
function TimelineChart({ data }: { data: { year: number; event: string }[] }) {
  const [revealed, setRevealed] = useState(0);
  useEffect(() => {
    if (revealed >= data.length) return;
    const t = setTimeout(() => setRevealed((v) => v + 1), 500);
    return () => clearTimeout(t);
  }, [revealed, data.length]);

  const W = 320, H = 160, pad = 24;
  const minY = data[0]?.year || 0, maxY = data[data.length - 1]?.year || 1;
  const toX = (y: number) => pad + ((y - minY) / (maxY - minY || 1)) * (W - pad * 2);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} style={{ display: "block" }}>
      <line x1={pad} y1={80} x2={W - pad} y2={80} stroke="hsl(var(--border))" strokeWidth="3" strokeLinecap="round" />
      {data.map((ev, i) => {
        const x = toX(ev.year);
        const above = i % 2 === 0;
        const vis = i < revealed;
        return (
          <g key={i} style={{ opacity: vis ? 1 : 0, transition: "opacity 0.4s ease" }}>
            <circle cx={x} cy={80} r={7} fill="hsl(var(--primary))" />
            <line x1={x} y1={above ? 73 : 87} x2={x} y2={above ? 50 : 116}
              stroke="hsl(var(--primary))" strokeWidth="1.5" strokeDasharray="3 2" />
            <text x={x} y={above ? 44 : 128} textAnchor="middle" fontSize="9" fontWeight="600"
              fill="hsl(var(--primary))">{ev.year}</text>
            <text x={x} y={above ? 34 : 140} textAnchor="middle" fontSize="8"
              fill="hsl(var(--foreground))" style={{ maxWidth: 60 }}>{ev.event}</text>
          </g>
        );
      })}
    </svg>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────
interface LessonChartProps {
  materia: string;
  titulo: string;
  conteudo: string;
  /** Se true, só renderiza se detectar um gráfico relevante */
  autoDetect?: boolean;
}

export function LessonChart({ materia, titulo, conteudo, autoDetect = true }: LessonChartProps) {
  const spec = useMemo(() => detectChartSpec(materia, titulo, conteudo), [materia, titulo, conteudo]);
  const [key, setKey] = useState(0); // para replay de animações

  if (!spec || spec.kind === "none") return null;

  const ICONS: Partial<Record<ChartKind, React.ReactNode>> = {
    line: <TrendingUp size={13} />, bar: <BarChart2 size={13} />,
    pie: <PieIcon size={13} />, area: <Layers size={13} />,
    scatter: <Activity size={13} />, cycle: <Activity size={13} />,
    timeline: <Activity size={13} />, reaction: <Activity size={13} />,
  };

  return (
    <div className="ilp-lesson-chart">
      <div className="ilp-lesson-chart-header">
        <span className="ilp-lesson-chart-icon">{ICONS[spec.kind]}</span>
        <span className="ilp-lesson-chart-title">{spec.title}</span>
        {(spec.kind === "cycle" || spec.kind === "timeline" || spec.kind === "reaction") && (
          <button className="ilp-lesson-chart-replay" onClick={() => setKey((k) => k + 1)}
            title="Repetir animação" aria-label="Repetir animação">
            <RefreshCw size={11} />
          </button>
        )}
      </div>
      <div className="ilp-lesson-chart-body">
        <ChartTooltipStyle />
        {spec.kind === "line" && <LineChartWidget spec={spec} />}
        {spec.kind === "area" && <AreaChartWidget spec={spec} />}
        {spec.kind === "bar" && <BarChartWidget spec={spec} />}
        {spec.kind === "pie" && <PieChartWidget spec={spec} />}
        {spec.kind === "cycle" && <CycleChart key={key} title={spec.title} />}
        {spec.kind === "reaction" && <ReactionChart key={key} />}
        {spec.kind === "timeline" && <TimelineChart key={key} data={spec.data} />}
      </div>
    </div>
  );
}
