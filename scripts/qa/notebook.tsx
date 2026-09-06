// Local interaction fixture. No real account, network writes or production route.
import { useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { RichEditor } from "../../src/components/notebook/RichEditor";
import { NotebookStudioToolbar, type DrawingTool, type DrawingBrush } from "../../src/components/notebook/NotebookStudioToolbar";
import { KonvaDrawingCanvas } from "../../src/components/notebook/KonvaDrawingCanvas";
import type { Stroke } from "../../src/components/notebook/drawingTypes";
import { getTemplatesForSubject } from "../../src/lib/notebookTemplates";
import { useNotebookViewport } from "../../src/hooks/useNotebookViewport";
import "../../src/index.css";
import "../../src/components/notebook/notebook-premium.css";
import "../../src/components/notebook/notebook-workspace.css";

function Fixture() {
  const [content, setContent] = useState(`<h1>Caderno de Medicina</h1><p>Teste local · nenhum conteúdo será enviado.</p>${getTemplatesForSubject("HAM")[0].html}<p>Notas da aula</p>${"<p>Espaço para anotações e revisão.</p>".repeat(22)}`);
  const [host, setHost] = useState<HTMLDivElement | null>(null);
  const [mode, setMode] = useState<"text" | "draw">("text");
  const [tool, setTool] = useState<DrawingTool>("pen");
  const [brush, setBrush] = useState<DrawingBrush>("ballpoint");
  const [color, setColor] = useState("#18221f");
  const [width, setWidth] = useState(3);
  const [zoom, setZoom] = useState(1);
  const [touch, setTouch] = useState(false);
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [grid, setGrid] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useNotebookViewport(ref, true, undefined, zoom, setZoom);
  return <div className="nb-editor-container nb-workspace-v2 min-h-dvh bg-background flex flex-col">
    <header className="nb-editor-header"><div className="nb-editor-topline"><strong>Flora · Medicina / teste local</strong><button onClick={() => setZoom(Math.max(.35, zoom - .1))}>Diminuir zoom</button><span>{Math.round(zoom * 100)}%</span><button onClick={() => setZoom(Math.min(2.5, zoom + .1))}>Aumentar zoom</button><button onClick={() => setGrid(!grid)}>Alternar papel</button><button onClick={() => setContent('<h1>Imagem médica</h1><img src="/medicine/organs/heart-anterior-v1.png" alt="Coração de teste" width="360" data-transparent="true"/><p>Texto depois da imagem</p>')}>Testar imagem</button></div></header>
    <NotebookStudioToolbar mode={mode} onModeChange={setMode} textTools={<div ref={setHost} className="nb-text-tools-host"/>}
      drawTool={tool} onDrawToolChange={setTool} drawBrush={brush} onDrawBrushChange={setBrush} penColor={color} onColorChange={setColor} penWidth={width} onWidthChange={setWidth}
      drawWithTouch={touch} onToggleTouch={() => setTouch(!touch)} onClear={() => setStrokes([])} onUndo={() => setStrokes(strokes.slice(0,-1))} onRedo={() => {}} canUndo={strokes.length > 0} canRedo={false}
      onAddSticky={() => {}} onToggleFlora={() => {}} floraOpen={false} mathStatus="idle" autoSolveEnabled={false} onToggleAutoSolve={() => {}} solvingMath={false}/>
    <div className="nb-layout"><div ref={ref} className="nb-paper-area"><RichEditor content={content} onChange={setContent} userId="local-fixture" notebookId="local-fixture" darkMode={false} onToggleDarkMode={() => {}} toolbarHost={host} drawing={mode === "draw"} zoom={zoom} template={grid ? "grid" : "blank"} paperOverlay={<KonvaDrawingCanvas strokes={strokes} onStrokesChange={setStrokes} active={mode === "draw"} drawWithTouch={touch} penColor={color} penWidth={width} tool={tool} brush={brush}/>} /></div></div>
  </div>;
}
if (import.meta.env.DEV) createRoot(document.getElementById("root")!).render(<Fixture/>);
