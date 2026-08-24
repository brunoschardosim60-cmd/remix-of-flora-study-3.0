import { NodeViewWrapper, type NodeViewProps } from "@tiptap/react";
import { useRef, useState, useCallback, useEffect } from "react";
import { AlignCenter, AlignLeft, AlignRight, Trash2 } from "lucide-react";

/**
 * Imagem do caderno: arrastável (drag nativo do ProseMirror) e
 * redimensionável via alça com Pointer Events (mouse + touch + caneta).
 * - Largura/altura ficam salvas como atributos no nó tiptap (persistem).
 * - Touch-action: none na alça evita conflito com scroll/zoom.
 */
export function ResizableImageView({ node, updateAttributes, deleteNode, selected }: NodeViewProps) {
  const imgRef = useRef<HTMLImageElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [resizing, setResizing] = useState(false);

  const width = (node.attrs.width as number | string | null) ?? null;
  const alignment = (node.attrs.alignment as "left" | "center" | "right" | null) ?? "center";

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const img = imgRef.current;
      if (!img) return;
      const startX = e.clientX;
      const startW = img.getBoundingClientRect().width;
      const target = e.currentTarget as HTMLElement;
      target.setPointerCapture(e.pointerId);
      setResizing(true);

      const onMove = (ev: PointerEvent) => {
        const delta = ev.clientX - startX;
        const next = Math.max(80, Math.min(1400, startW + delta));
        updateAttributes({ width: Math.round(next) });
      };
      const onUp = (ev: PointerEvent) => {
        try { target.releasePointerCapture(ev.pointerId); } catch { /* noop */ }
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
        window.removeEventListener("pointercancel", onUp);
        setResizing(false);
      };
      window.addEventListener("pointermove", onMove, { passive: false });
      window.addEventListener("pointerup", onUp);
      window.addEventListener("pointercancel", onUp);
    },
    [updateAttributes]
  );

  useEffect(() => {
    // Garante touch-action none no wrapper enquanto redimensiona
    const w = wrapperRef.current;
    if (!w) return;
    w.style.touchAction = resizing ? "none" : "";
  }, [resizing]);

  const align = alignment === "left" ? "flex-start" : alignment === "right" ? "flex-end" : "center";

  return (
    <NodeViewWrapper
      ref={wrapperRef}
      as="div"
      className="nb-img-wrap"
      style={{ display: "flex", justifyContent: align, margin: "12px 0" }}
      data-drag-handle
    >
      <div
        style={{
          position: "relative",
          display: "inline-block",
          maxWidth: "100%",
          outline: selected ? "2px solid hsl(var(--primary))" : "none",
          borderRadius: 8,
        }}
      >
        {selected && <div className="nb-image-controls" contentEditable={false} onPointerDown={(event) => event.stopPropagation()}>
          <button type="button" className={alignment === "left" ? "active" : ""} onClick={() => updateAttributes({ alignment: "left" })} title="Alinhar imagem à esquerda" aria-label="Alinhar imagem à esquerda"><AlignLeft /></button>
          <button type="button" className={alignment === "center" ? "active" : ""} onClick={() => updateAttributes({ alignment: "center" })} title="Centralizar imagem" aria-label="Centralizar imagem"><AlignCenter /></button>
          <button type="button" className={alignment === "right" ? "active" : ""} onClick={() => updateAttributes({ alignment: "right" })} title="Alinhar imagem à direita" aria-label="Alinhar imagem à direita"><AlignRight /></button>
          <span />
          <button type="button" className="danger" onClick={deleteNode} title="Remover imagem" aria-label="Remover imagem"><Trash2 /></button>
        </div>}
        <img
          ref={imgRef}
          src={node.attrs.src as string}
          alt={(node.attrs.alt as string) || ""}
          title={(node.attrs.title as string) || undefined}
          draggable={false}
          style={{
            display: "block",
            width: width ? `${typeof width === "number" ? width + "px" : width}` : "auto",
            maxWidth: "100%",
            height: "auto",
            borderRadius: 8,
            cursor: "grab",
            userSelect: "none",
            WebkitUserDrag: "element",
          } as React.CSSProperties}
        />
        {/* Resize handle (bottom-right) */}
        <span
          role="slider"
          aria-label="Redimensionar imagem"
          onPointerDown={onPointerDown}
          style={{
            position: "absolute",
            right: -6,
            bottom: -6,
            width: 18,
            height: 18,
            borderRadius: 9,
            background: "hsl(var(--primary))",
            border: "2px solid white",
            boxShadow: "0 1px 4px rgba(0,0,0,0.25)",
            cursor: "nwse-resize",
            touchAction: "none",
            opacity: selected ? 1 : 0.55,
            transition: "opacity 120ms ease",
            zIndex: 5,
          }}
        />
      </div>
    </NodeViewWrapper>
  );
}
