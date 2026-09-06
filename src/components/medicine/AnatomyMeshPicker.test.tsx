import { act, cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { BoxGeometry, Mesh, MeshBasicMaterial, PerspectiveCamera, Raycaster } from "three";
import { AnatomyMeshPicker } from "./AnatomyMeshPicker";

const fiber = vi.hoisted(() => ({ state: null as unknown }));
vi.mock("@react-three/fiber", () => ({ useThree: () => fiber.state }));

function pointer(canvas: HTMLCanvasElement, type: string, values: Partial<PointerEvent> = {}) {
  const event = new Event(type);
  Object.assign(event, { clientX: 100, clientY: 100, pointerId: 1, pointerType: "mouse", isPrimary: true, button: 0, buttons: 0, ...values });
  act(() => { canvas.dispatchEvent(event); });
}

describe("native anatomy picker input budget", () => {
  let canvas: HTMLCanvasElement;
  let mesh: Mesh;
  let raycaster: Raycaster;

  beforeEach(() => {
    vi.useFakeTimers();
    canvas = document.createElement("canvas");
    canvas.getBoundingClientRect = () => ({ x: 0, y: 0, left: 0, top: 0, bottom: 200, right: 200, width: 200, height: 200, toJSON: () => ({}) });
    const camera = new PerspectiveCamera(45, 1, .1, 100);
    camera.position.z = 5;
    camera.updateProjectionMatrix();
    raycaster = new Raycaster();
    fiber.state = { camera, raycaster, gl: { domElement: canvas } };
    mesh = new Mesh(new BoxGeometry(), new MeshBasicMaterial());
  });
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    mesh.geometry.dispose();
  });

  it("coalesces pointer movement to at most ten raycasts per second", () => {
    const onHover = vi.fn();
    render(<AnatomyMeshPicker root={mesh} onPick={vi.fn()} onHover={onHover} />);
    act(() => { vi.advanceTimersByTime(1); }); // scheduled acceleration preparation
    const cast = vi.spyOn(raycaster, "intersectObject");
    for (let index = 0; index < 20; index += 1) pointer(canvas, "pointermove");
    act(() => { vi.advanceTimersByTime(1); });
    expect(cast).toHaveBeenCalledTimes(1);
    expect(onHover).toHaveBeenCalledTimes(1);
    for (let index = 0; index < 20; index += 1) pointer(canvas, "pointermove");
    act(() => { vi.advanceTimersByTime(98); });
    expect(cast).toHaveBeenCalledTimes(1);
    act(() => { vi.advanceTimersByTime(2); });
    expect(cast).toHaveBeenCalledTimes(2);
    expect(onHover.mock.calls[0][1]).toEqual({ x: 114, y: 114 });
  });

  it("never raycasts while orbiting, and a drag returning to the start is not a click", () => {
    const onPick = vi.fn();
    render(<AnatomyMeshPicker root={mesh} onPick={onPick} onHover={vi.fn()} />);
    act(() => { vi.advanceTimersByTime(1); });
    const cast = vi.spyOn(raycaster, "intersectObject");
    pointer(canvas, "pointerdown", { buttons: 1 });
    pointer(canvas, "pointermove", { clientX: 150, buttons: 1 });
    act(() => { vi.advanceTimersByTime(200); });
    pointer(canvas, "pointermove", { clientX: 100, buttons: 1 });
    pointer(canvas, "pointerup");
    expect(cast).not.toHaveBeenCalled();
    expect(onPick).not.toHaveBeenCalled();
    pointer(canvas, "pointerdown", { buttons: 1 });
    pointer(canvas, "pointerup");
    expect(cast).toHaveBeenCalledTimes(1);
    expect(onPick).toHaveBeenCalledTimes(1);
  });

  it("cancels pending hover on leave and removes listeners on unmount", () => {
    const onHover = vi.fn();
    const { unmount } = render(<AnatomyMeshPicker root={mesh} onPick={vi.fn()} onHover={onHover} />);
    act(() => { vi.advanceTimersByTime(1); });
    const cast = vi.spyOn(raycaster, "intersectObject");
    pointer(canvas, "pointermove");
    pointer(canvas, "pointerleave");
    act(() => { vi.advanceTimersByTime(200); });
    expect(cast).not.toHaveBeenCalled();
    pointer(canvas, "pointermove");
    unmount();
    act(() => { vi.advanceTimersByTime(200); });
    pointer(canvas, "pointerdown", { buttons: 1 });
    pointer(canvas, "pointerup");
    expect(cast).not.toHaveBeenCalled();
    expect(onHover).not.toHaveBeenCalled();
  });

  it("does not register picking handlers when inactive", () => {
    render(<AnatomyMeshPicker active={false} root={mesh} onPick={vi.fn()} onHover={vi.fn()} />);
    const cast = vi.spyOn(raycaster, "intersectObject");
    pointer(canvas, "pointermove");
    pointer(canvas, "pointerdown", { buttons: 1 });
    pointer(canvas, "pointerup");
    act(() => { vi.advanceTimersByTime(500); });
    expect(cast).not.toHaveBeenCalled();
  });
});
