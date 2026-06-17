import { forwardRef, lazy, Suspense } from "react";
import type { DrawingCanvasRef } from "./drawingTypes";
import type { ComponentProps } from "react";

// Konva + react-konva são ~150KB gz. Carrega só quando o caderno abre.
const KonvaDrawingCanvas = lazy(() =>
  import("./KonvaDrawingCanvas").then((m) => ({ default: m.KonvaDrawingCanvas })),
);

type Props = ComponentProps<typeof KonvaDrawingCanvas>;

export const LazyKonvaDrawingCanvas = forwardRef<DrawingCanvasRef, Props>((props, ref) => (
  <Suspense fallback={<div className="absolute inset-0 pointer-events-none" />}>
    <KonvaDrawingCanvas ref={ref} {...props} />
  </Suspense>
));

LazyKonvaDrawingCanvas.displayName = "LazyKonvaDrawingCanvas";