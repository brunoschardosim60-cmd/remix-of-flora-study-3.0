import { useEffect, useRef } from "react";
import { useThree } from "@react-three/fiber";
import { Vector2, type Intersection, type Object3D } from "three";
import {
  ANATOMY_CLICK_SLOP_PX,
  ANATOMY_HOVER_INTERVAL_MS,
  canHoverAnatomyPointer,
  collectAnatomyPickMeshes,
  enableAnatomyPicking,
  intersectAnatomyMeshes,
  isAnatomyClick,
} from "@/lib/anatomyPicking";

type HoverPoint = { x: number; y: number };
type AnatomyMeshPickerProps = {
  active?: boolean;
  root: Object3D;
  onPick: (hit: Intersection) => void;
  onHover?: (hit: Intersection | null, point?: HoverPoint) => void;
};

/** Native canvas events bypass R3F's eager whole-scene raycast on every mouse move. */
export function AnatomyMeshPicker({ active = true, root, onPick, onHover }: AnatomyMeshPickerProps) {
  const { camera, gl, raycaster } = useThree();
  const callbacks = useRef({ onPick, onHover });
  callbacks.current = { onPick, onHover };

  useEffect(() => {
    if (!active) return;
    const canvas = gl.domElement;
    const meshes = collectAnatomyPickMeshes(root);
    const releases: Array<() => void> = [];
    const pointer = new Vector2();
    let disposed = false;
    let ready = false;
    let prepareIndex = 0;
    let prepareIdle: number | undefined;
    let prepareTimer: ReturnType<typeof setTimeout> | undefined;
    let hoverTimer: ReturnType<typeof setTimeout> | undefined;
    let nextHoverAt = 0;
    let latestPointer: HoverPoint | null = null;
    let hoverShown = false;
    let start: { id: number; x: number; y: number; moved: boolean } | null = null;

    // Yield between meshes, reusing cached BVHs on subsequent mount. Hover stays
    // paused during preparation so it cannot start an expensive native scan.
    const prepareNext = (deadline?: IdleDeadline) => {
      if (disposed) return;
      const started = performance.now();
      do {
        if (prepareIndex < meshes.length) releases.push(enableAnatomyPicking(meshes[prepareIndex++]));
      } while (prepareIndex < meshes.length && performance.now() - started < 8 && (!deadline || deadline.timeRemaining() > 4));
      if (prepareIndex >= meshes.length) {
        ready = true;
        if (latestPointer && hoverTimer === undefined) hoverTimer = setTimeout(flushHover, Math.max(0, nextHoverAt - performance.now()));
        return;
      }
      schedulePreparation();
    };
    const schedulePreparation = () => {
      if (typeof window.requestIdleCallback === "function") prepareIdle = window.requestIdleCallback(prepareNext, { timeout: 400 });
      else prepareTimer = setTimeout(prepareNext, 0);
    };
    schedulePreparation();

    const clearHover = () => {
      if (hoverTimer !== undefined) clearTimeout(hoverTimer);
      hoverTimer = undefined;
      latestPointer = null;
      if (hoverShown) callbacks.current.onHover?.(null);
      hoverShown = false;
    };
    const pickAt = ({ x, y }: HoverPoint) => {
      const bounds = canvas.getBoundingClientRect();
      if (!bounds.width || !bounds.height) return null;
      pointer.set(((x - bounds.left) / bounds.width) * 2 - 1, -((y - bounds.top) / bounds.height) * 2 + 1);
      root.updateWorldMatrix(true, true);
      camera.updateWorldMatrix(true, false);
      raycaster.setFromCamera(pointer, camera);
      return intersectAnatomyMeshes(raycaster, meshes);
    };
    const flushHover = () => {
      hoverTimer = undefined;
      const point = latestPointer;
      if (disposed || !ready || !point || start) return;
      nextHoverAt = performance.now() + ANATOMY_HOVER_INTERVAL_MS;
      const hit = pickAt(point);
      if (hit) {
        const bounds = canvas.getBoundingClientRect();
        callbacks.current.onHover?.(hit, { x: point.x - bounds.left + 14, y: point.y - bounds.top + 14 });
        hoverShown = true;
      } else if (hoverShown) {
        callbacks.current.onHover?.(null);
        hoverShown = false;
      }
    };
    const onPointerDown = (event: PointerEvent) => {
      clearHover();
      if (event.button !== 0 || !event.isPrimary) { start = null; return; }
      start = { id: event.pointerId, x: event.clientX, y: event.clientY, moved: false };
    };
    const onPointerMove = (event: PointerEvent) => {
      if (start && Math.hypot(event.clientX - start.x, event.clientY - start.y) > ANATOMY_CLICK_SLOP_PX) start.moved = true;
      if (!callbacks.current.onHover || !canHoverAnatomyPointer(event) || start) { clearHover(); return; }
      latestPointer = { x: event.clientX, y: event.clientY };
      if (hoverTimer === undefined) hoverTimer = setTimeout(flushHover, Math.max(0, nextHoverAt - performance.now()));
    };
    const onPointerUp = (event: PointerEvent) => {
      const click = isAnatomyClick(start, event);
      start = null;
      if (click) {
        const hit = pickAt({ x: event.clientX, y: event.clientY });
        if (hit) callbacks.current.onPick(hit);
      }
    };
    const cancelPointer = () => { start = null; clearHover(); };
    const onWheel = () => { clearHover(); nextHoverAt = performance.now() + ANATOMY_HOVER_INTERVAL_MS; };
    canvas.addEventListener("pointerdown", onPointerDown);
    canvas.addEventListener("pointermove", onPointerMove, { passive: true });
    canvas.addEventListener("pointerup", onPointerUp);
    canvas.addEventListener("pointercancel", cancelPointer);
    canvas.addEventListener("pointerleave", cancelPointer);
    canvas.addEventListener("wheel", onWheel, { passive: true });
    return () => {
      disposed = true;
      if (prepareIdle !== undefined) window.cancelIdleCallback(prepareIdle);
      if (prepareTimer !== undefined) clearTimeout(prepareTimer);
      clearHover();
      releases.forEach((release) => release());
      canvas.removeEventListener("pointerdown", onPointerDown);
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerup", onPointerUp);
      canvas.removeEventListener("pointercancel", cancelPointer);
      canvas.removeEventListener("pointerleave", cancelPointer);
      canvas.removeEventListener("wheel", onWheel);
    };
  }, [active, camera, gl, raycaster, root]);
  return null;
}
