import { describe, expect, it, vi } from "vitest";
import { drawNotebookShape } from "./drawingShapes";
import type { Stroke } from "./drawingTypes";
const rectangle: Stroke = { tool: "pen", shape: "rect", color: "#123456", width: 3,
  points: [{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 100, y: 70 }, { x: 0, y: 70 }, { x: 0, y: 0 }],
};
const context = () => ({ beginPath: vi.fn(), moveTo: vi.fn(), lineTo: vi.fn(), closePath: vi.fn(), stroke: vi.fn() });
describe("persistent notebook shapes", () => {
  it("retains square corners after saving and reopening", () => {
    const ctx = context();
    expect(drawNotebookShape(ctx as unknown as CanvasRenderingContext2D, JSON.parse(JSON.stringify(rectangle)))).toBe(true);
    expect(ctx.lineTo).toHaveBeenCalledWith(100, 0);
    expect(ctx.lineTo).toHaveBeenCalledWith(100, 70);
    expect(ctx.closePath).toHaveBeenCalledOnce();
    expect(ctx.stroke).toHaveBeenCalledOnce();
  });
  it("does not join the arrow wing back to the shaft origin", () => {
    const ctx = context();
    drawNotebookShape(ctx as unknown as CanvasRenderingContext2D, { ...rectangle, shape: "line" });
    expect(ctx.closePath).not.toHaveBeenCalled();
  });
  it("preserves the existing handwriting renderer for legacy strokes", () => {
    expect(drawNotebookShape(context() as unknown as CanvasRenderingContext2D, { ...rectangle, shape: undefined })).toBe(false);
  });
});
