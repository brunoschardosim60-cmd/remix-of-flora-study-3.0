export type BrushKind =
  | "ballpoint"
  | "gel"
  | "pencil"
  | "fineliner"
  | "marker"
  | "highlighter";

export interface Stroke {
  points: { x: number; y: number; pressure?: number; width?: number }[];
  color: string;
  width: number;
  tool: "pen" | "marker" | "eraser";
  /** Brush variant para renderização realista (perfect-freehand). */
  brush?: BrushKind;
}

export interface StrokeBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface DrawingCanvasRef {
  getImageData: (bounds?: StrokeBounds | null) => string | null;
  clearCanvas: () => void;
  getStrokeBounds: () => StrokeBounds | null;
  getCanvasSize: () => { width: number; height: number } | null;
  /** Bounds da seleção retangular ativa (modo select). */
  getSelectionBounds?: () => StrokeBounds | null;
  /** Limpa a seleção ativa. */
  clearSelection?: () => void;
  /** Move todos os traços incluídos na seleção ativa. */
  moveSelection?: (dx: number, dy: number) => void;
  /** Duplica os traços selecionados com um pequeno deslocamento. */
  duplicateSelection?: () => void;
  /** Remove os traços selecionados. */
  deleteSelection?: () => void;
  /** Quantidade de traços incluídos na seleção. */
  getSelectedStrokeCount?: () => number;
}

export const getStrokeBounds = (stroke: Stroke): StrokeBounds | null => {
  if (!stroke.points.length) return null;

  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;

  for (const point of stroke.points) {
    minX = Math.min(minX, point.x);
    minY = Math.min(minY, point.y);
    maxX = Math.max(maxX, point.x);
    maxY = Math.max(maxY, point.y);
  }

  return {
    x: minX - stroke.width / 2,
    y: minY - stroke.width / 2,
    width: Math.max(0, maxX - minX + stroke.width),
    height: Math.max(0, maxY - minY + stroke.width),
  };
};

export const getStrokesBounds = (strokes: Stroke[]): StrokeBounds | null => {
  if (!strokes.length) return null;

  const validBounds = strokes
    .map(getStrokeBounds)
    .filter((bounds): bounds is StrokeBounds => Boolean(bounds));
  if (!validBounds.length) return null;

  const minX = Math.min(...validBounds.map((b) => b.x));
  const minY = Math.min(...validBounds.map((b) => b.y));
  const maxX = Math.max(...validBounds.map((b) => b.x + b.width));
  const maxY = Math.max(...validBounds.map((b) => b.y + b.height));

  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
};
