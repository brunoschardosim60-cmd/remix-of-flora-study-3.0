import { useState } from "react";
import {
  ArrowUpRight, Bot, BoxSelect, ChevronDown, Circle, Copy, Eraser, Feather, Highlighter,
  Paintbrush, Pen, Pencil, PenTool, Redo2, Sparkles, Square,
  StickyNote, Trash2, Type, Undo2,
} from "lucide-react";
import "./notebook-premium.css";

const PEN_COLORS = ["#18221f", "#df5c61", "#3278d4", "#2d9a67", "#e69b32", "#8460c7", "#d9589a"];
const PEN_WIDTHS = [1.5, 3, 6, 10];
const STICKY_COLORS = ["#fff1a8", "#ffd9e6", "#cfe4ff", "#d4f1dc", "#e6d9ff"];

export type DrawingTool = "pen" | "marker" | "eraser" | "select" | "line" | "rect" | "circle";
export type DrawingBrush = "ballpoint" | "gel" | "pencil" | "fineliner" | "marker";

const BRUSHES: { id: DrawingBrush; label: string; Icon: typeof Pen }[] = [
  { id: "ballpoint", label: "Esferográfica", Icon: Pen },
  { id: "gel", label: "Caneta gel", Icon: PenTool },
  { id: "fineliner", label: "Traço fino", Icon: Feather },
  { id: "pencil", label: "Lápis", Icon: Pencil },
  { id: "marker", label: "Hidrográfica", Icon: Paintbrush },
];

interface NotebookStudioToolbarProps {
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
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onAddSticky: (color: string) => void;
  onToggleFlora: () => void;
  floraOpen: boolean;
  mathStatus: "idle" | "processing" | "resolved";
  autoSolveEnabled: boolean;
  onToggleAutoSolve: (enabled: boolean) => void;
  solvingMath: boolean;
  onSolveSelection?: () => void;
  hasSelection?: boolean;
  onDuplicateSelection?: () => void;
  onDeleteSelection?: () => void;
}

function StudioButton({ active, label, onClick, children, disabled }: {
  active?: boolean;
  label: string;
  onClick: () => void;
  children: React.ReactNode;
  disabled?: boolean;
}) {
  return <button type="button" className={`nb-studio-tool ${active ? "active" : ""}`} onClick={onClick} title={label} aria-label={label} disabled={disabled}>{children}</button>;
}

export function NotebookStudioToolbar({
  mode, onModeChange, drawTool, onDrawToolChange, drawBrush, onDrawBrushChange,
  penColor, onColorChange, penWidth, onWidthChange, onClear, onUndo, onRedo,
  canUndo, canRedo, onAddSticky, onToggleFlora, floraOpen, mathStatus,
  autoSolveEnabled, onToggleAutoSolve, solvingMath, onSolveSelection,
  hasSelection, onDuplicateSelection, onDeleteSelection,
}: NotebookStudioToolbarProps) {
  const [brushesOpen, setBrushesOpen] = useState(false);
  const [notesOpen, setNotesOpen] = useState(false);
  const currentBrush = BRUSHES.find((brush) => brush.id === drawBrush) ?? BRUSHES[0];
  const CurrentBrushIcon = currentBrush.Icon;

  return <div className={`nb-studio-dock ${mode === "draw" ? "is-drawing" : ""}`}>
    <div className="nb-studio-mode" aria-label="Modo do caderno">
      <button type="button" className={mode === "text" ? "active" : ""} onClick={() => onModeChange("text")}><Type /><span>Escrever</span></button>
      <button type="button" className={mode === "draw" ? "active" : ""} onClick={() => onModeChange("draw")}><Pencil /><span>Desenhar</span></button>
    </div>

    <span className="nb-studio-divider" />

    {mode === "draw" ? <div className="nb-studio-drawing-tools">
      <div className="nb-studio-group">
        <StudioButton active={drawTool === "pen"} onClick={() => onDrawToolChange("pen")} label="Caneta"><Pen /></StudioButton>
        <StudioButton active={drawTool === "marker"} onClick={() => onDrawToolChange("marker")} label="Marca-texto"><Highlighter /></StudioButton>
        <StudioButton active={drawTool === "eraser"} onClick={() => onDrawToolChange("eraser")} label="Borracha"><Eraser /></StudioButton>
        <StudioButton active={drawTool === "select"} onClick={() => onDrawToolChange("select")} label="Selecionar desenho"><BoxSelect /></StudioButton>
      </div>

      <div className="nb-studio-popover-wrap">
        <button type="button" className="nb-studio-brush-trigger" onClick={() => setBrushesOpen((open) => !open)} title="Escolher tipo de caneta"><CurrentBrushIcon /><span>{currentBrush.label}</span><ChevronDown /></button>
        {brushesOpen && <div className="nb-studio-popover nb-brush-popover">{BRUSHES.map(({ id, label, Icon }) => <button key={id} type="button" className={drawBrush === id ? "active" : ""} onClick={() => { onDrawBrushChange(id); setBrushesOpen(false); }}><Icon /><span>{label}</span></button>)}</div>}
      </div>

      <div className="nb-studio-group nb-studio-shapes">
        <StudioButton active={drawTool === "line"} onClick={() => onDrawToolChange("line")} label="Seta"><ArrowUpRight /></StudioButton>
        <StudioButton active={drawTool === "rect"} onClick={() => onDrawToolChange("rect")} label="Retângulo"><Square /></StudioButton>
        <StudioButton active={drawTool === "circle"} onClick={() => onDrawToolChange("circle")} label="Círculo"><Circle /></StudioButton>
      </div>

      <div className="nb-studio-colors" aria-label="Cores da caneta">
        {PEN_COLORS.slice(0, 5).map((color) => <button key={color} type="button" className={penColor === color ? "active" : ""} style={{ backgroundColor: color }} onClick={() => onColorChange(color)} aria-label={`Cor ${color}`} />)}
        <label title="Mais cores"><input type="color" value={penColor} onChange={(event) => onColorChange(event.target.value)} /><span style={{ background: `conic-gradient(#ed5d66, #e9a133, #3aaf74, #3982dc, #9a61cf, #ed5d66)` }} /></label>
      </div>

      <div className="nb-studio-widths" aria-label="Espessura do traço">{PEN_WIDTHS.map((width) => <button type="button" key={width} className={penWidth === width ? "active" : ""} onClick={() => onWidthChange(width)} title={`${width}px`}><span style={{ width: Math.max(3, width), height: Math.max(3, width), backgroundColor: penColor }} /></button>)}</div>

      {drawTool === "select" && hasSelection && <div className="nb-studio-group nb-selection-actions">
        {onSolveSelection && <StudioButton active onClick={onSolveSelection} label="Explicar seleção com a Flora" disabled={solvingMath}>{solvingMath ? <span className="nb-studio-spinner" /> : <Sparkles />}</StudioButton>}
        <StudioButton onClick={() => onDuplicateSelection?.()} label="Duplicar seleção"><Copy /></StudioButton>
        <StudioButton onClick={() => onDeleteSelection?.()} label="Apagar seleção"><Trash2 /></StudioButton>
      </div>}

      <div className="nb-studio-group nb-history-tools">
        <StudioButton onClick={onUndo} label="Desfazer" disabled={!canUndo}><Undo2 /></StudioButton>
        <StudioButton onClick={onRedo} label="Refazer" disabled={!canRedo}><Redo2 /></StudioButton>
        <StudioButton onClick={onClear} label="Limpar desenhos"><Trash2 /></StudioButton>
      </div>

      <button type="button" className={`nb-studio-ai ${autoSolveEnabled ? "active" : ""}`} onClick={() => onToggleAutoSolve(!autoSolveEnabled)} title="Reconhecer contas desenhadas"><Sparkles /><span>Reconhecer</span>{mathStatus !== "idle" && <i className={mathStatus} />}</button>
    </div> : <div className="nb-studio-text-hint"><span>Use a barra no topo do papel para formatar o texto e inserir imagens.</span></div>}

    <span className="nb-studio-divider" />

    <div className="nb-studio-popover-wrap">
      <button type="button" className="nb-studio-secondary" onClick={() => setNotesOpen((open) => !open)}><StickyNote /><span>Nota</span></button>
      {notesOpen && <div className="nb-studio-popover nb-note-popover"><strong>Cor da nota</strong><div>{STICKY_COLORS.map((color) => <button key={color} type="button" style={{ backgroundColor: color }} onClick={() => { onAddSticky(color); setNotesOpen(false); }} aria-label={`Adicionar nota ${color}`} />)}</div></div>}
    </div>

    <button type="button" className={`nb-studio-flora ${floraOpen ? "active" : ""}`} onClick={onToggleFlora}><Bot /><span>Flora</span></button>
  </div>;
}
