/**
 * KonvaDrawingCanvas — canvas de desenho do Flora Canvas
 *
 * Melhorias v2:
 *  - Pressure sensitivity via pointer.pressure (caneta stylus / touch)
 *  - Stroke width variável baseado na velocidade (simula tinta real)
 *  - Catmull-Rom spline para traços ultra-suaves
 *  - Palm rejection: ignora touches com área grande (palma da mão)
 *  - Caneta: largura varia 0.3x–2x baseada em pressão e velocidade
 *  - Marcador: opacidade 0.3, largura fixa, sem variação
 *  - Borracha: cursor circular proporcional ao tamanho
 *  - Linha/forma: segura Shift para linhas retas
 */

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import { getStroke } from "perfect-freehand";
import {
  type Stroke,
  type StrokeBounds,
  type DrawingCanvasRef,
  type BrushKind,
  getStrokesBounds,
} from "./drawingTypes";

const IMAGE_EXPORT_PADDING = 28;

interface StrokePoint {
  x: number;
  y: number;
  pressure: number; // 0-1
  width: number;    // largura calculada neste ponto
}

interface RichStroke extends Omit<Stroke, "points"> {
  points: StrokePoint[];
}

interface KonvaDrawingCanvasProps {
  strokes: Stroke[];
  onStrokesChange: (strokes: Stroke[]) => void;
  active: boolean;
  penColor: string;
  penWidth: number;
  tool: "pen" | "marker" | "eraser" | "select" | "line" | "rect" | "circle";
  brush?: BrushKind;
  zoom?: number;
  onSelectionChange?: (bounds: StrokeBounds | null) => void;
}

// Perfil de cada pincel (perfect-freehand options)
function brushOptions(brush: BrushKind, size: number) {
  switch (brush) {
    case "gel":
      return {
        size: size * 1.6,
        thinning: 0.35,
        smoothing: 0.55,
        streamline: 0.55,
        easing: (t: number) => t,
        start: { taper: 4, cap: true },
        end: { taper: 12, cap: true },
      };
    case "fineliner":
      return {
        size: size,
        thinning: 0.05,
        smoothing: 0.5,
        streamline: 0.45,
        easing: (t: number) => t,
        start: { taper: 0, cap: true },
        end: { taper: 0, cap: true },
      };
    case "pencil":
      return {
        size: size * 1.1,
        thinning: 0.7,
        smoothing: 0.5,
        streamline: 0.35,
        easing: (t: number) => Math.sin((t * Math.PI) / 2),
        simulatePressure: true,
        start: { taper: 8, cap: true },
        end: { taper: 20, cap: true },
      };
    case "marker":
      return {
        size: size * 2.4,
        thinning: 0.15,
        smoothing: 0.5,
        streamline: 0.5,
        start: { taper: 0, cap: true },
        end: { taper: 0, cap: true },
      };
    case "highlighter":
      return {
        size: size * 3.2,
        thinning: 0,
        smoothing: 0.6,
        streamline: 0.6,
        start: { taper: 0, cap: false },
        end: { taper: 0, cap: false },
      };
    case "ballpoint":
    default:
      return {
        size: size * 1.25,
        thinning: 0.6,
        smoothing: 0.5,
        streamline: 0.5,
        easing: (t: number) => t * t,
        start: { taper: 6, cap: true },
        end: { taper: 18, cap: true },
      };
  }
}

function brushAlpha(brush: BrushKind): number {
  if (brush === "highlighter") return 0.32;
  if (brush === "pencil") return 0.85;
  return 1;
}

function brushComposite(brush: BrushKind): GlobalCompositeOperation {
  if (brush === "highlighter") return "multiply";
  return "source-over";
}

function pointsForFreehand(pts: StrokePoint[]): [number, number, number][] {
  return pts.map((p) => [p.x, p.y, p.pressure ?? 0.5]);
}

function pathFromStrokeOutline(outline: number[][]): Path2D | null {
  if (outline.length < 2) return null;
  const path = new Path2D();
  const [x0, y0] = outline[0];
  path.moveTo(x0, y0);
  for (let i = 1; i < outline.length; i++) {
    const [x, y] = outline[i];
    path.lineTo(x, y);
  }
  path.closePath();
  return path;
}

// Desenha um stroke com largura variável (simula tinta real)
function drawRichStroke(ctx: CanvasRenderingContext2D, stroke: Stroke) {
  const pts = stroke.points as unknown as StrokePoint[];
  if (!pts || pts.length < 1) return;
  ctx.save();
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  if (stroke.tool === "eraser") {
    ctx.globalCompositeOperation = "destination-out";
    ctx.strokeStyle = "rgba(0,0,0,1)";
    ctx.lineWidth = stroke.width * 2;
    if (pts.length === 1) {
      ctx.beginPath();
      ctx.arc(pts[0].x, pts[0].y, stroke.width, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.beginPath();
      ctx.moveTo(pts[0].x, pts[0].y);
      for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
      ctx.stroke();
    }
    ctx.restore();
    return;
  }

  // Pen/marker family — renderização vetorial via perfect-freehand.
  // Mapeia tool legado → brush quando o stroke não tiver brush explícito.
  const inferredBrush: BrushKind =
    stroke.brush ?? (stroke.tool === "marker" ? "highlighter" : "ballpoint");
  const opts = brushOptions(inferredBrush, stroke.width);
  const outline = getStroke(pointsForFreehand(pts), opts);
  const path = pathFromStrokeOutline(outline as number[][]);
  if (!path) {
    ctx.restore();
    return;
  }
  ctx.globalCompositeOperation = brushComposite(inferredBrush);
  ctx.globalAlpha = brushAlpha(inferredBrush);
  ctx.fillStyle = stroke.color;
  ctx.fill(path);

  // Lápis: textura granulada por cima (linhas finas com baixa opacidade)
  if (inferredBrush === "pencil" && pts.length > 1) {
    ctx.globalAlpha = 0.18;
    ctx.strokeStyle = stroke.color;
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) {
      const jitterX = (Math.sin(i * 12.9898) * 43758.5453) % 1;
      const jitterY = (Math.cos(i * 78.233) * 43758.5453) % 1;
      ctx.lineTo(pts[i].x + jitterX * 0.6, pts[i].y + jitterY * 0.6);
    }
    ctx.stroke();
  }
  ctx.restore();
}

/** Renderização compartilhada para exportar páginas sem precisar trocar a página visível. */
export function renderStrokesToDataUrl(strokes: Stroke[], width = 794, height = 1123, backgroundColor: string | null = "#ffffff"): string {
  const canvas = document.createElement("canvas");
  const dpr = 2;
  canvas.width = width * dpr;
  canvas.height = height * dpr;
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";
  if (backgroundColor) {
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  strokes.forEach((stroke) => drawRichStroke(ctx, stroke));
  return canvas.toDataURL("image/png");
}

export const KonvaDrawingCanvas = forwardRef<DrawingCanvasRef, KonvaDrawingCanvasProps>(
  ({ strokes, onStrokesChange, active, penColor, penWidth, tool, brush = "ballpoint", zoom = 1, onSelectionChange }, ref) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [size, setSize] = useState({ width: 800, height: 600 });
    const isDrawingRef = useRef(false);
    const currentStrokeRef = useRef<Stroke | null>(null);
    const lastPointRef = useRef<{ x: number; y: number; t: number } | null>(null);
    const [selection, setSelection] = useState<StrokeBounds | null>(null);
    const selectionStartRef = useRef<{ x: number; y: number } | null>(null);
    const selectionDragRef = useRef<{ x: number; y: number; original: Stroke[]; indexes: Set<number> } | null>(null);
    // Para shapes (linha, rect, circle)
    const shapeStartRef = useRef<{ x: number; y: number } | null>(null);

    const redraw = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      const dpr = window.devicePixelRatio || 1;
      ctx.setTransform(dpr * zoom, 0, 0, dpr * zoom, 0, 0);
      ctx.clearRect(0, 0, canvas.width / dpr / zoom, canvas.height / dpr / zoom);
      for (const s of strokes) drawRichStroke(ctx, s);
      if (currentStrokeRef.current) drawRichStroke(ctx, currentStrokeRef.current);
    };

    const selectedIndexes = () => {
      if (!selection) return [];
      return strokes.flatMap((stroke, index) => {
        const bounds = getStrokesBounds([stroke]);
        if (!bounds) return [];
        const intersects = bounds.x <= selection.x + selection.width
          && bounds.x + bounds.width >= selection.x
          && bounds.y <= selection.y + selection.height
          && bounds.y + bounds.height >= selection.y;
        return intersects ? [index] : [];
      });
    };

    const translateStroke = (stroke: Stroke, dx: number, dy: number): Stroke => ({
      ...stroke,
      points: stroke.points.map((point) => ({ ...point, x: point.x + dx, y: point.y + dy })),
    });

    useImperativeHandle(ref, () => ({
      getImageData: (bounds?: StrokeBounds | null) => {
        const canvas = canvasRef.current;
        if (!canvas) return null;
        const useBounds = bounds ?? selection ?? getStrokesBounds(strokes);
        const dpr = window.devicePixelRatio || 1;
        const w = useBounds ? useBounds.width + IMAGE_EXPORT_PADDING * 2 : size.width;
        const h = useBounds ? useBounds.height + IMAGE_EXPORT_PADDING * 2 : size.height;
        const ox = useBounds ? Math.max(0, useBounds.x - IMAGE_EXPORT_PADDING) : 0;
        const oy = useBounds ? Math.max(0, useBounds.y - IMAGE_EXPORT_PADDING) : 0;
        const tmp = document.createElement("canvas");
        tmp.width = Math.ceil(w * dpr);
        tmp.height = Math.ceil(h * dpr);
        const ctx = tmp.getContext("2d");
        if (!ctx) return null;
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, tmp.width, tmp.height);
        ctx.setTransform(dpr, 0, 0, dpr, -ox * dpr, -oy * dpr);
        for (const s of strokes) drawRichStroke(ctx, s);
        return tmp.toDataURL("image/png");
      },
      clearCanvas: () => { onStrokesChange([]); setSelection(null); onSelectionChange?.(null); },
      getStrokeBounds: () => getStrokesBounds(strokes),
      getCanvasSize: () => size,
      getSelectionBounds: () => selection,
      clearSelection: () => { setSelection(null); onSelectionChange?.(null); },
      moveSelection: (dx, dy) => {
        const indexes = new Set(selectedIndexes());
        if (!indexes.size || !selection) return;
        onStrokesChange(strokes.map((stroke, index) => indexes.has(index) ? translateStroke(stroke, dx, dy) : stroke));
        const next = { ...selection, x: selection.x + dx, y: selection.y + dy };
        setSelection(next);
        onSelectionChange?.(next);
      },
      duplicateSelection: () => {
        const indexes = new Set(selectedIndexes());
        if (!indexes.size || !selection) return;
        const copies = strokes.filter((_, index) => indexes.has(index)).map((stroke) => translateStroke(stroke, 24, 24));
        onStrokesChange([...strokes, ...copies]);
        const next = { ...selection, x: selection.x + 24, y: selection.y + 24 };
        setSelection(next);
        onSelectionChange?.(next);
      },
      deleteSelection: () => {
        const indexes = new Set(selectedIndexes());
        if (!indexes.size) return;
        onStrokesChange(strokes.filter((_, index) => !indexes.has(index)));
        setSelection(null);
        onSelectionChange?.(null);
      },
      getSelectedStrokeCount: () => selectedIndexes().length,
    }));

    useEffect(() => {
      const el = containerRef.current?.parentElement;
      if (!el) return;

      // O papel usa CSS zoom. getBoundingClientRect() devolve o tamanho visual
      // já ampliado; usá-lo aqui ampliava o canvas uma segunda vez e fazia o
      // traço nascer longe da caneta. clientWidth/scrollHeight permanecem no
      // sistema de coordenadas lógico da folha.
      const measure = () => setSize({
        width: Math.max(1, el.clientWidth),
        height: Math.max(1, el.clientHeight, el.scrollHeight),
      });
      const obs = new ResizeObserver(measure);
      obs.observe(el);
      measure();
      return () => obs.disconnect();
    }, []);

    useEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.max(1, Math.floor(size.width * dpr));
      canvas.height = Math.max(1, Math.floor(size.height * dpr));
      canvas.style.width = `${size.width}px`;
      canvas.style.height = `${size.height}px`;
      redraw();
    }, [size.width, size.height]);

    useEffect(() => { redraw(); }, [strokes, zoom]);

    useEffect(() => {
      if (tool !== "select" && selection) { setSelection(null); onSelectionChange?.(null); }
    }, [tool]);

    const getPos = (e: React.PointerEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current!;
      const rect = canvas.getBoundingClientRect();
      // Converte da posição visual (afetada pelo zoom CSS) para a coordenada
      // lógica persistida no desenho. Funciona em qualquer nível de zoom.
      const scaleX = rect.width > 0 ? size.width / rect.width : 1;
      const scaleY = rect.height > 0 ? size.height / rect.height : 1;
      return {
        x: (e.clientX - rect.left) * scaleX,
        y: (e.clientY - rect.top) * scaleY,
      };
    };

    // Calcula largura do ponto baseado em pressão + velocidade
    const calcPointWidth = (e: React.PointerEvent<HTMLCanvasElement>, baseWidth: number): number => {
      const pressure = e.pressure > 0 ? e.pressure : 0.5; // fallback 0.5 para mouse
      const now = Date.now();
      let speedFactor = 1;
      if (lastPointRef.current) {
        const pos = getPos(e);
        const dx = pos.x - lastPointRef.current.x;
        const dy = pos.y - lastPointRef.current.y;
        const dt = Math.max(1, now - lastPointRef.current.t);
        const speed = Math.sqrt(dx * dx + dy * dy) / dt;
        // Traço rápido = mais fino; lento = mais grosso (igual caneta real)
        speedFactor = Math.max(0.4, Math.min(1.8, 1 - speed * 0.8));
      }
      return baseWidth * pressure * 1.5 * speedFactor;
    };

    const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
      if (!active) return;
      // Palm rejection: toque com área grande é palma da mão
      if (e.pointerType === "touch" && e.width > 40) return;
      e.preventDefault();
      (e.target as HTMLCanvasElement).setPointerCapture(e.pointerId);

      const pos = getPos(e);

      if (tool === "select") {
        if (selection && pos.x >= selection.x && pos.x <= selection.x + selection.width && pos.y >= selection.y && pos.y <= selection.y + selection.height) {
          selectionDragRef.current = { x: pos.x, y: pos.y, original: strokes, indexes: new Set(selectedIndexes()) };
          isDrawingRef.current = true;
          return;
        }
        selectionStartRef.current = pos;
        setSelection({ x: pos.x, y: pos.y, width: 0, height: 0 });
        isDrawingRef.current = true;
        return;
      }

      if (tool === "line" || tool === "rect" || tool === "circle") {
        shapeStartRef.current = pos;
        isDrawingRef.current = true;
        return;
      }

      const w = calcPointWidth(e, penWidth);
      lastPointRef.current = { x: pos.x, y: pos.y, t: Date.now() };
      currentStrokeRef.current = {
        points: [{ x: pos.x, y: pos.y, pressure: e.pressure || 0.5, width: w }],
        color: penColor,
        width: penWidth,
        tool: tool as "pen" | "marker" | "eraser",
        brush: tool === "marker" ? "highlighter" : tool === "eraser" ? undefined : brush,
      };
      isDrawingRef.current = true;
    };

    const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
      if (!active || !isDrawingRef.current) return;
      if (e.pointerType === "touch" && e.width > 40) return;
      e.preventDefault();
      const pos = getPos(e);

      if (tool === "select" && selectionStartRef.current) {
        const start = selectionStartRef.current;
        const next = { x: Math.min(start.x, pos.x), y: Math.min(start.y, pos.y), width: Math.abs(pos.x - start.x), height: Math.abs(pos.y - start.y) };
        setSelection(next);
        onSelectionChange?.(next);
        return;
      }
      if (tool === "select" && selectionDragRef.current && selection) {
        const dx = pos.x - selectionDragRef.current.x;
        const dy = pos.y - selectionDragRef.current.y;
        const indexes = selectionDragRef.current.indexes;
        onStrokesChange(selectionDragRef.current.original.map((stroke, index) => indexes.has(index) ? translateStroke(stroke, dx, dy) : stroke));
        const next = { ...selection, x: selection.x + dx, y: selection.y + dy };
        selectionDragRef.current.x = pos.x;
        selectionDragRef.current.y = pos.y;
        selectionDragRef.current.original = selectionDragRef.current.original.map((stroke, index) => indexes.has(index) ? translateStroke(stroke, dx, dy) : stroke);
        setSelection(next);
        onSelectionChange?.(next);
        return;
      }

      if ((tool === "line" || tool === "rect" || tool === "circle") && shapeStartRef.current) {
        // Preview da shape na tela
        redraw();
        const ctx = canvasRef.current?.getContext("2d");
        if (ctx) {
          const dpr = window.devicePixelRatio || 1;
          ctx.save();
          ctx.setTransform(dpr * zoom, 0, 0, dpr * zoom, 0, 0);
          ctx.strokeStyle = penColor;
          ctx.lineWidth = penWidth;
          ctx.lineCap = "round";
          ctx.beginPath();
          const s = shapeStartRef.current;
          if (tool === "line") {
            const angle = Math.atan2(pos.y - s.y, pos.x - s.x);
            const head = Math.max(11, Math.min(24, Math.hypot(pos.x - s.x, pos.y - s.y) * 0.18));
            ctx.moveTo(s.x, s.y);
            ctx.lineTo(pos.x, pos.y);
            ctx.moveTo(pos.x, pos.y);
            ctx.lineTo(pos.x - head * Math.cos(angle - Math.PI / 6), pos.y - head * Math.sin(angle - Math.PI / 6));
            ctx.moveTo(pos.x, pos.y);
            ctx.lineTo(pos.x - head * Math.cos(angle + Math.PI / 6), pos.y - head * Math.sin(angle + Math.PI / 6));
          }
          else if (tool === "rect") { ctx.rect(s.x, s.y, pos.x - s.x, pos.y - s.y); }
          else { const rx = Math.abs(pos.x - s.x) / 2; const ry = Math.abs(pos.y - s.y) / 2; ctx.ellipse(s.x + (pos.x - s.x) / 2, s.y + (pos.y - s.y) / 2, rx, ry, 0, 0, Math.PI * 2); }
          ctx.stroke();
          ctx.restore();
        }
        return;
      }

      if (!currentStrokeRef.current) return;
      const w = calcPointWidth(e, penWidth);
      currentStrokeRef.current.points.push({ x: pos.x, y: pos.y, pressure: e.pressure || 0.5, width: w });
      lastPointRef.current = { x: pos.x, y: pos.y, t: Date.now() };
      redraw();
    };

    const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
      if (!isDrawingRef.current) return;
      isDrawingRef.current = false;
      lastPointRef.current = null;
      const pos = getPos(e);

      if (tool === "select") {
        selectionDragRef.current = null;
        selectionStartRef.current = null;
        if (selection && (selection.width < 8 || selection.height < 8)) { setSelection(null); onSelectionChange?.(null); }
        return;
      }

      if ((tool === "line" || tool === "rect" || tool === "circle") && shapeStartRef.current) {
        const s = shapeStartRef.current;
        shapeStartRef.current = null;
        // Converte shape para pontos
        let shapePts: Stroke["points"] = [];
        if (tool === "line") {
          const angle = Math.atan2(pos.y - s.y, pos.x - s.x);
          const head = Math.max(11, Math.min(24, Math.hypot(pos.x - s.x, pos.y - s.y) * 0.18));
          const wingOne = { x: pos.x - head * Math.cos(angle - Math.PI / 6), y: pos.y - head * Math.sin(angle - Math.PI / 6) };
          const wingTwo = { x: pos.x - head * Math.cos(angle + Math.PI / 6), y: pos.y - head * Math.sin(angle + Math.PI / 6) };
          shapePts = [
            { x: s.x, y: s.y, pressure: 0.5, width: penWidth },
            { x: pos.x, y: pos.y, pressure: 0.5, width: penWidth },
            { ...wingOne, pressure: 0.5, width: penWidth },
            { x: pos.x, y: pos.y, pressure: 0.5, width: penWidth },
            { ...wingTwo, pressure: 0.5, width: penWidth },
          ];
        } else if (tool === "rect") {
          const pts = [[s.x, s.y],[pos.x, s.y],[pos.x, pos.y],[s.x, pos.y],[s.x, s.y]];
          shapePts = pts.map(([x, y]) => ({ x, y, pressure: 0.5, width: penWidth }));
        } else {
          const cx = (s.x + pos.x) / 2; const cy = (s.y + pos.y) / 2;
          const rx = Math.abs(pos.x - s.x) / 2; const ry = Math.abs(pos.y - s.y) / 2;
          shapePts = Array.from({ length: 64 }, (_, i) => {
            const a = (i / 63) * Math.PI * 2;
            return { x: cx + Math.cos(a) * rx, y: cy + Math.sin(a) * ry, pressure: 0.5, width: penWidth };
          });
        }
        onStrokesChange([...strokes, { points: shapePts, color: penColor, width: penWidth, tool: "pen" }]);
        return;
      }

      const stroke = currentStrokeRef.current;
      currentStrokeRef.current = null;
      if (stroke && stroke.points.length >= 1) {
        onStrokesChange([...strokes, stroke]);
      } else {
        redraw();
      }
    };

    const cursor = !active ? "pointer-events-none z-10" :
      tool === "eraser" ? "z-20 cursor-cell" :
      tool === "select" ? "z-20 cursor-crosshair" : "z-20 cursor-crosshair";

    return (
      <div ref={containerRef} className={`absolute inset-0 ${cursor}`} style={{ touchAction: active ? "none" : "auto" }}>
        <canvas
          ref={canvasRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          onPointerLeave={handlePointerUp}
          style={{ display: "block", width: "100%", height: "100%" }}
        />
        {selection && tool === "select" && (
          <div
            className="absolute border-2 border-primary bg-primary/10 pointer-events-none rounded-sm shadow-[0_0_0_1px_white]"
            style={{ left: selection.x * zoom, top: selection.y * zoom, width: selection.width * zoom, height: selection.height * zoom }}
          >
            {[[0,0],[100,0],[0,100],[100,100]].map(([x,y]) => (
              <span key={`${x}-${y}`} className="absolute h-3 w-3 rounded-full border-2 border-white bg-primary shadow" style={{ left: `${x}%`, top: `${y}%`, transform: "translate(-50%, -50%)" }} />
            ))}
          </div>
        )}
      </div>
    );
  }
);

KonvaDrawingCanvas.displayName = "KonvaDrawingCanvas";
