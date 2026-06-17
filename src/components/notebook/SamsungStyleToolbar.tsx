import {
  Pen, Highlighter, Eraser, BoxSelect, Minus, Square, Circle,
  Type, Pencil, Sparkles, Undo2, Trash2, StickyNote, PenTool, Feather, Paintbrush,
} from "lucide-react";
import "./notebook-premium.css";

const PEN_COLORS = [
  "#1a1a1a", "#ef4444", "#3b82f6", "#22c55e",
  "#f59e0b", "#8b5cf6", "#ec4899", "#06b6d4",
];

const PEN_WIDTHS = [1.5, 3, 6, 10];

const STICKY_COLORS = ["#fef08a", "#fbcfe8", "#bfdbfe", "#bbf7d0", "#e9d5ff"];

export type DrawingTool = "pen" | "marker" | "eraser" | "select" | "line" | "rect" | "circle";
export type DrawingBrush = "ballpoint" | "gel" | "pencil" | "fineliner" | "marker";

const BRUSHES: { id: DrawingBrush; label: string; Icon: typeof Pen }[] = [
  { id: "ballpoint", label: "Esferográfica", Icon: Pen },
  { id: "gel", label: "Gel", Icon: PenTool },
  { id: "fineliner", label: "Fineliner", Icon: Feather },
  { id: "pencil", label: "Lápis 6B", Icon: Pencil },
  { id: "marker", label: "Caneta hidrográfica", Icon: Paintbrush },
];

interface SamsungStyleToolbarProps {
  mode: "text" | "draw";
  onModeChange: (mode: "text" | "draw") => void;
  drawTool: DrawingTool;
  onDrawToolChange: (tool: DrawingTool) => void;
  drawBrush: DrawingBrush;
  onDrawBrushChange: (brush: DrawingBrush) => void;
  penColor: string;
  onColorChange: (color: string) => void;
  penWidth: number;
  onWidthChange: (width: number) => void;
  onClear: () => void;
  onUndo: () => void;
  onAddSticky: (color: string) => void;
  onToggleFlora: () => void;
  floraOpen: boolean;
  mathStatus: "idle" | "processing" | "resolved";
  autoSolveEnabled: boolean;
  onToggleAutoSolve: (enabled: boolean) => void;
  solvingMath: boolean;
  onSolveSelection?: () => void;
  hasSelection?: boolean;
}

function ToolBtn({
  active, onClick, children, title,
}: {
  active?: boolean; onClick: () => void; children: React.ReactNode; title: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={`nb-toolbar-btn ${active ? "active" : ""}`}
    >
      {active && <span className="glow" />}
      {children}
    </button>
  );
}

export function SamsungStyleToolbar({
  mode, onModeChange, drawTool, onDrawToolChange,
  drawBrush, onDrawBrushChange,
  penColor, onColorChange, penWidth, onWidthChange,
  onClear, onUndo, onAddSticky, onToggleFlora, floraOpen,
  mathStatus, autoSolveEnabled, onToggleAutoSolve,
  solvingMath, onSolveSelection, hasSelection,
}: SamsungStyleToolbarProps) {
  const statusDot: Record<string, string> = {
    idle: "",
    processing: "bg-sky-500 animate-pulse",
    resolved: "bg-emerald-500",
  };

  return (
    <div className="nb-floating-toolbar">
      {/* Mode toggle */}
      <div className="nb-mode-toggle">
        <button
          type="button"
          className={`nb-mode-btn ${mode === "text" ? "active" : ""}`}
          onClick={() => onModeChange("text")}
        >
          <Type className="w-4 h-4" />
          <span className="hidden sm:inline">Texto</span>
        </button>
        <button
          type="button"
          className={`nb-mode-btn ${mode === "draw" ? "active" : ""}`}
          onClick={() => onModeChange("draw")}
        >
          <Pencil className="w-4 h-4" />
          <span className="hidden sm:inline">Desenho</span>
        </button>
      </div>

      <div className="nb-toolbar-sep" />

      {mode === "draw" ? (
        <>
          {/* Drawing tools */}
          <div className="nb-toolbar-group">
            <ToolBtn active={drawTool === "pen"} onClick={() => onDrawToolChange("pen")} title="Caneta">
              <Pen className="w-4 h-4" />
            </ToolBtn>
            <ToolBtn active={drawTool === "marker"} onClick={() => onDrawToolChange("marker")} title="Marcador">
              <Highlighter className="w-4 h-4" />
            </ToolBtn>
            <ToolBtn active={drawTool === "eraser"} onClick={() => onDrawToolChange("eraser")} title="Borracha">
              <Eraser className="w-4 h-4" />
            </ToolBtn>
          </div>

          {/* Brush picker — só quando caneta ativa */}
          {drawTool === "pen" && (
            <div className="nb-toolbar-group" title="Tipo de pincel">
              {BRUSHES.map(({ id, label, Icon }) => (
                <ToolBtn
                  key={id}
                  active={drawBrush === id}
                  onClick={() => onDrawBrushChange(id)}
                  title={label}
                >
                  <Icon className="w-4 h-4" />
                </ToolBtn>
              ))}
            </div>
          )}

          {/* Shapes */}
          <div className="nb-toolbar-group">
            <ToolBtn active={drawTool === "line"} onClick={() => onDrawToolChange("line")} title="Linha">
              <Minus className="w-4 h-4" />
            </ToolBtn>
            <ToolBtn active={drawTool === "rect"} onClick={() => onDrawToolChange("rect")} title="Retângulo">
              <Square className="w-4 h-4" />
            </ToolBtn>
            <ToolBtn active={drawTool === "circle"} onClick={() => onDrawToolChange("circle")} title="Círculo">
              <Circle className="w-4 h-4" />
            </ToolBtn>
            <ToolBtn active={drawTool === "select"} onClick={() => onDrawToolChange("select")} title="Selecionar">
              <BoxSelect className="w-4 h-4" />
            </ToolBtn>
          </div>

          <div className="nb-toolbar-sep" />

          {/* Colors */}
          <div className="flex items-center gap-1">
            {PEN_COLORS.slice(0, 5).map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => onColorChange(c)}
                className={`nb-toolbar-color ${penColor === c ? "active" : ""}`}
                style={{ background: c }}
                title={c}
              />
            ))}
            <label title="Mais cores" className="cursor-pointer">
              <input
                type="color"
                value={penColor}
                onChange={(e) => onColorChange(e.target.value)}
                className="sr-only"
              />
              <div
                className="nb-toolbar-color flex items-center justify-center text-[8px] border-dashed"
                style={{ borderColor: "hsl(var(--muted-foreground) / 0.3)", borderWidth: 2 }}
              >
                +
              </div>
            </label>
          </div>

          <div className="nb-toolbar-sep" />

          {/* Widths */}
          <div className="flex items-center gap-1">
            {PEN_WIDTHS.map((w) => (
              <button
                key={w}
                type="button"
                onClick={() => onWidthChange(w)}
                className={`nb-toolbar-width ${penWidth === w ? "active" : ""}`}
                style={{ width: Math.max(16, w * 2.5), height: Math.max(16, w * 2.5) }}
                title={`${w}px`}
              >
                <div
                  className="rounded-full"
                  style={{
                    width: Math.max(4, w * 1.2),
                    height: Math.max(4, w * 1.2),
                    background: penColor,
                  }}
                />
              </button>
            ))}
          </div>

          <div className="nb-toolbar-sep" />

          {/* Sticky notes */}
          <div className="flex items-center gap-1">
            {STICKY_COLORS.slice(0, 3).map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => onAddSticky(c)}
                className="nb-toolbar-color"
                style={{ background: c, width: 18, height: 18, border: "1px solid rgba(0,0,0,0.08)" }}
                title="Nota adesiva"
              />
            ))}
          </div>

          <div className="nb-toolbar-sep" />

          {/* IA + Undo/Clear */}
          <button
            type="button"
            onClick={() => onToggleAutoSolve(!autoSolveEnabled)}
            title={autoSolveEnabled ? "IA ativa" : "IA inativa"}
            className={`nb-toolbar-btn ${autoSolveEnabled ? "active" : ""}`}
            style={{ width: "auto", padding: "0 10px", borderRadius: 20, gap: 4 }}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span className="text-xs hidden sm:inline">IA</span>
            {mathStatus !== "idle" && (
              <span className={`w-1.5 h-1.5 rounded-full ${statusDot[mathStatus]}`} />
            )}
          </button>

          {drawTool === "select" && hasSelection && onSolveSelection && (
            <button
              type="button"
              onClick={onSolveSelection}
              disabled={solvingMath}
              className="nb-toolbar-btn active"
              style={{ width: "auto", padding: "0 12px", borderRadius: 20 }}
            >
              {solvingMath ? (
                <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Sparkles className="w-3.5 h-3.5" />
              )}
              <span className="text-xs ml-1">Resolver</span>
            </button>
          )}

          <ToolBtn onClick={onUndo} title="Desfazer">
            <Undo2 className="w-4 h-4" />
          </ToolBtn>
          <ToolBtn onClick={onClear} title="Limpar">
            <Trash2 className="w-4 h-4" style={{ color: "hsl(var(--destructive))" }} />
          </ToolBtn>
        </>
      ) : (
        /* Text mode: show a simpler toolbar with Flora */
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground px-2">Use a barra de formatação no topo do papel</span>
        </div>
      )}

      <div className="nb-toolbar-sep" />

      {/* Flora toggle */}
      <button
        type="button"
        onClick={onToggleFlora}
        className={`nb-toolbar-flora ${floraOpen ? "ring-2 ring-white/30" : ""}`}
      >
        <Sparkles className="w-3.5 h-3.5" />
        <span>Flora</span>
      </button>
    </div>
  );
}
