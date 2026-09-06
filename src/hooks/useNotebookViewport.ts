import { useEffect, useLayoutEffect, useRef, type RefObject } from "react";

export function anchoredScroll(scroll: number, cursor: number, fromZoom: number, toZoom: number) {
  return Math.max(0, (scroll + cursor) * toZoom / fromZoom - cursor);
}

/** Keeps wheel/pinch zoom inside the notebook and remembers each page's reading position. */
export function useNotebookViewport(containerRef: RefObject<HTMLElement>, ready: boolean, pageKey: string | undefined,
  zoom: number, setZoom: (value: number) => void) {
  const zoomRef = useRef(zoom);
  const zoomSetter = useRef(setZoom);
  const anchor = useRef<{ left: number; top: number } | null>(null);
  zoomSetter.current = setZoom;

  useLayoutEffect(() => {
    zoomRef.current = zoom;
    const container = containerRef.current;
    if (container && anchor.current) {
      container.scrollLeft = anchor.current.left;
      container.scrollTop = anchor.current.top;
      anchor.current = null;
    }
  }, [zoom, containerRef]);

  useEffect(() => {
    const container = containerRef.current;
    if (!ready || !container) return;
    function zoomAt(next: number, clientX: number, clientY: number) {
      const clamped = Math.min(2.5, Math.max(0.35, next));
      const rect = container!.getBoundingClientRect();
      const previous = anchor.current ?? { left: container!.scrollLeft, top: container!.scrollTop };
      anchor.current = {
        left: anchoredScroll(previous.left, clientX - rect.left, zoomRef.current, clamped),
        top: anchoredScroll(previous.top, clientY - rect.top, zoomRef.current, clamped),
      };
      zoomRef.current = clamped;
      zoomSetter.current(clamped);
    }
    const wheel = (event: WheelEvent) => {
      if (!event.ctrlKey && !event.metaKey) return;
      event.preventDefault();
      zoomAt(zoomRef.current * Math.exp(-event.deltaY * 0.002), event.clientX, event.clientY);
    };
    let pinch: { distance: number; zoom: number } | null = null;
    const distance = (touches: TouchList) => Math.hypot(touches[0].clientX - touches[1].clientX, touches[0].clientY - touches[1].clientY);
    const touchStart = (event: TouchEvent) => {
      if (event.touches.length !== 2) return;
      pinch = { distance: distance(event.touches), zoom: zoomRef.current };
    };
    const touchMove = (event: TouchEvent) => {
      if (!pinch || event.touches.length !== 2 || pinch.distance === 0) return;
      event.preventDefault();
      zoomAt(pinch.zoom * distance(event.touches) / pinch.distance,
        (event.touches[0].clientX + event.touches[1].clientX) / 2,
        (event.touches[0].clientY + event.touches[1].clientY) / 2);
    };
    const touchEnd = () => { pinch = null; };
    container.addEventListener("wheel", wheel, { passive: false });
    container.addEventListener("touchstart", touchStart, { passive: true });
    container.addEventListener("touchmove", touchMove, { passive: false });
    container.addEventListener("touchend", touchEnd);
    container.addEventListener("touchcancel", touchEnd);
    return () => {
      container.removeEventListener("wheel", wheel);
      container.removeEventListener("touchstart", touchStart);
      container.removeEventListener("touchmove", touchMove);
      container.removeEventListener("touchend", touchEnd);
      container.removeEventListener("touchcancel", touchEnd);
    };
  }, [containerRef, ready]);

  useEffect(() => {
    const container = containerRef.current;
    if (!ready || !container || !pageKey) return;
    const key = `notebook-scroll:${pageKey}`;
    let frame = window.requestAnimationFrame(() => {
      try {
        const position = JSON.parse(sessionStorage.getItem(key) || "null");
        container.scrollTop = Number(position?.top) * zoomRef.current || 0;
        container.scrollLeft = Number(position?.left) * zoomRef.current || 0;
      } catch { container.scrollTop = 0; container.scrollLeft = 0; }
    });
    let position = { top: 0, left: 0 };
    const save = () => {
      position = { top: container.scrollTop / zoomRef.current, left: container.scrollLeft / zoomRef.current };
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => {
        try { sessionStorage.setItem(key, JSON.stringify(position)); } catch { /* Optional reading preference */ }
      });
    };
    container.addEventListener("scroll", save, { passive: true });
    return () => {
      window.cancelAnimationFrame(frame);
      container.removeEventListener("scroll", save);
    };
  }, [containerRef, ready, pageKey]);
}
