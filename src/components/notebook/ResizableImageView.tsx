import { NodeViewWrapper, type NodeViewProps } from "@tiptap/react";
import { useRef, useState, useCallback, useEffect } from "react";
import { AlignCenter, AlignLeft, AlignRight, Crop, RotateCcw, RotateCw, Trash2, WrapText } from "lucide-react";

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
  const transparent = Boolean(node.attrs.transparent);
  const wrap = Boolean(node.attrs.wrap);
  const rotation = Number(node.attrs.rotation || 0);
  const cropEnabled = Boolean(node.attrs.cropEnabled);
  const cropAspect = String(node.attrs.cropAspect || "4:3") as "1:1" | "4:3" | "16:9";
  const cropX = Number(node.attrs.cropX ?? 50);
  const cropY = Number(node.attrs.cropY ?? 50);
  const cropZoom = Number(node.attrs.cropZoom ?? 1);
  const imageWidth = floatingWidth(width, wrap && alignment !== "center");
  const aspectRatio = cropAspect === "1:1" ? "1 / 1" : cropAspect === "16:9" ? "16 / 9" : "4 / 3";

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
  const floating = wrap && alignment !== "center";

  return (
    <NodeViewWrapper
      ref={wrapperRef}
      as="div"
      className={`nb-img-wrap ${transparent ? "is-transparent" : ""} ${floating ? "is-wrapped" : ""}`}
      style={floating ? {
        display: "block",
        float: alignment,
        width: width ? `${typeof width === "number" ? width + "px" : width}` : "44%",
        maxWidth: "58%",
        margin: alignment === "left" ? "10px 22px 14px 0" : "10px 0 14px 22px",
      } : { display: "flex", justifyContent: align, clear: "both", margin: "14px 0" }}
      data-drag-handle
    >
      <div
        className={`nb-image-stage ${cropEnabled ? "is-cropping" : ""}`}
        style={{
          position: "relative",
          display: floating ? "block" : "inline-block",
          width: cropEnabled ? imageWidth : undefined,
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
          <button type="button" className={wrap ? "active" : ""} onClick={() => updateAttributes({ wrap: !wrap, alignment: alignment === "center" ? "left" : alignment })} title="Fazer o texto contornar a imagem" aria-label="Alternar texto ao redor da imagem"><WrapText /></button>
          <button type="button" className={cropEnabled ? "active" : ""} onClick={() => updateAttributes({ cropEnabled: !cropEnabled })} title="Recortar imagem" aria-label="Alternar recorte da imagem"><Crop /></button>
          <button type="button" onClick={() => updateAttributes({ rotation: rotation - 90 })} title="Girar à esquerda" aria-label="Girar imagem à esquerda"><RotateCcw /></button>
          <button type="button" onClick={() => updateAttributes({ rotation: rotation + 90 })} title="Girar à direita" aria-label="Girar imagem à direita"><RotateCw /></button>
          <span />
          <button type="button" className="danger" onClick={deleteNode} title="Remover imagem" aria-label="Remover imagem"><Trash2 /></button>
        </div>}
        {selected && cropEnabled && <div className="nb-image-crop-controls" contentEditable={false} onPointerDown={(event) => event.stopPropagation()}>
          <div className="nb-image-crop-aspects" role="group" aria-label="Formato do recorte">
            {(["1:1", "4:3", "16:9"] as const).map((value) => <button key={value} type="button" className={cropAspect === value ? "active" : ""} onClick={() => updateAttributes({ cropAspect: value })}>{value}</button>)}
          </div>
          <label><span>Horizontal</span><input type="range" min="0" max="100" value={cropX} onChange={(event) => updateAttributes({ cropX: Number(event.target.value) })} /></label>
          <label><span>Vertical</span><input type="range" min="0" max="100" value={cropY} onChange={(event) => updateAttributes({ cropY: Number(event.target.value) })} /></label>
          <label><span>Zoom</span><input type="range" min="1" max="3" step="0.05" value={cropZoom} onChange={(event) => updateAttributes({ cropZoom: Number(event.target.value) })} /></label>
          <button type="button" className="nb-image-crop-reset" onClick={() => updateAttributes({ cropX: 50, cropY: 50, cropZoom: 1, cropAspect: "4:3" })}>Redefinir</button>
        </div>}
        <div
          className="nb-image-viewport"
          style={{
            width: cropEnabled ? "100%" : floating ? "100%" : imageWidth,
            maxWidth: "100%",
            aspectRatio: cropEnabled ? aspectRatio : undefined,
            overflow: cropEnabled ? "hidden" : "visible",
            borderRadius: transparent ? 0 : 8,
          } as React.CSSProperties}
        >
          <img
            ref={imgRef}
            src={node.attrs.src as string}
            alt={(node.attrs.alt as string) || ""}
            title={(node.attrs.title as string) || undefined}
            draggable={false}
            style={{
              display: "block",
              width: "100%",
              maxWidth: "100%",
              height: cropEnabled ? "100%" : "auto",
              objectFit: cropEnabled ? "cover" : "contain",
              objectPosition: cropEnabled ? `${cropX}% ${cropY}%` : "center",
              borderRadius: transparent ? 0 : 8,
              background: "transparent",
              transform: `scale(${cropEnabled ? cropZoom : 1}) rotate(${rotation}deg)`,
              transformOrigin: "center",
              cursor: "grab",
              userSelect: "none",
              WebkitUserDrag: "element",
            } as React.CSSProperties}
          />
        </div>
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

function floatingWidth(width: number | string | null, floating: boolean) {
  if (floating) return "100%";
  if (typeof width === "number") return `${width}px`;
  return width || "min(100%, 720px)";
}
