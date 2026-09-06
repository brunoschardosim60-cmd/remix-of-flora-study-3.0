import type { Stroke } from "./drawingTypes";

export function drawNotebookShape(ctx: CanvasRenderingContext2D, stroke: Stroke): boolean {
  if (!stroke.shape || !stroke.points.length) return false;
  ctx.strokeStyle = stroke.color;
  ctx.lineWidth = stroke.width;
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
  for (const point of stroke.points.slice(1)) ctx.lineTo(point.x, point.y);
  if (stroke.shape !== "line") ctx.closePath();
  ctx.stroke();
  return true;
}
