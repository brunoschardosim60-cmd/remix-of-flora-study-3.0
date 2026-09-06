import { NodeViewWrapper, type NodeViewProps } from "@tiptap/react";
import { useRef, useState, useCallback, useEffect } from "react";
import { AlignCenter, AlignLeft, AlignRight, Crop, RotateCcw, RotateCw, Trash2, WrapText } from "lucide-react";
import { notebookImageLayout } from "@/lib/notebookImageLayout";

/**
 * Imagem do caderno: arrastável (drag nativo do ProseMirror) e
 * redimensionável via alça com Pointer Events (mouse + touch + caneta).
 * - Largura/altura ficam salvas como atributos no nó tiptap (persistem).
 * - Touch-action: none na alça evita conflito com scroll/zoom.
 */
export function ResizableImageView({ node, updateAttributes, deleteNode, selected }: NodeViewProps) {
  const imgRef = useRef<HTMLImageElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const [resizing, setResizing] = useState(false);
  const [naturalRatio, setNaturalRatio] = useState(1);
  const [editingCrop, setEditingCrop] = useState(false);
  useEffect(() => { if (!selected) setEditingCrop(false); }, [selected]);

  const width = (node.attrs.width as number | string | null) ?? null;
  const alignment = (node.attrs.alignment as "left" | "center" | "right" | null) ?? "center";
  const transparent = Boolean(node.attrs.transparent);
  const medicalAsset = Boolean(node.attrs.medicalAsset);
  const wrap = Boolean(node.attrs.wrap);
  const rotation = Number(node.attrs.rotation || 0);
  const cropEnabled = Boolean(node.attrs.cropEnabled);
  const cropAspect = String(node.attrs.cropAspect || "4:3") as "1:1" | "4:3" | "16:9";
  const cropX = Number(node.attrs.cropX ?? 50);
  const cropY = Number(node.attrs.cropY ?? 50);
  const cropZoom = Number(node.attrs.cropZoom ?? 1);
  const imageWidth = floatingWidth(width, wrap && alignment !== "center");
  const { aspectRatio, imageStyle } = notebookImageLayout({ naturalRatio, rotation, cropEnabled, cropAspect, cropX, cropY, cropZoom });

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const viewport = viewportRef.current;
      if (!viewport) return;
      const startX = e.clientX;
      const rect = viewport.getBoundingClientRect();
      const startW = viewport.offsetWidth || rect.width;
      const visualToLocal = rect.width > 0 ? startW / rect.width : 1;
      const target = e.currentTarget as HTMLElement;
      target.setPointerCapture(e.pointerId);
      setResizing(true);

      const onMove = (ev: PointerEvent) => {
        if (ev.pointerId !== e.pointerId) return;
        const delta = (ev.clientX - startX) * visualToLocal;
        const next = Math.max(80, Math.min(1400, startW + delta));
        updateAttributes({ width: Math.round(next) });
      };
      const onUp = (ev: PointerEvent) => {
        if (ev.pointerId !== e.pointerId) return;
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
      className={`nb-img-wrap ${transparent ? "is-transparent" : ""} ${medicalAsset ? "is-medical-asset" : ""} ${floating ? "is-wrapped" : ""}`}
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
          width: imageWidth,
          maxWidth: "100%",
          outline: "none",
          borderRadius: 8,
        }}
      >
        {selected && <div className="nb-image-controls" contentEditable={false} onPointerDown={(event) => event.stopPropagation()}>
          <button type="button" className={alignment === "left" ? "active" : ""} onClick={() => updateAttributes({ alignment: "left" })} title="Alinhar imagem à esquerda" aria-label="Alinhar imagem à esquerda"><AlignLeft /></button>
          <button type="button" className={alignment === "center" ? "active" : ""} onClick={() => updateAttributes({ alignment: "center" })} title="Centralizar imagem" aria-label="Centralizar imagem"><AlignCenter /></button>
          <button type="button" className={alignment === "right" ? "active" : ""} onClick={() => updateAttributes({ alignment: "right" })} title="Alinhar imagem à direita" aria-label="Alinhar imagem à direita"><AlignRight /></button>
          <span />
          <button type="button" className={wrap ? "active" : ""} onClick={() => updateAttributes({ wrap: !wrap, alignment: alignment === "center" ? "left" : alignment })} title="Fazer o texto contornar a imagem" aria-label="Alternar texto ao redor da imagem"><WrapText /></button>
          <button type="button" className={editingCrop ? "active" : ""} onClick={() => { if (!cropEnabled) updateAttributes({ cropEnabled: true }); setEditingCrop((value) => !value); }} title="Editar recorte" aria-label="Alternar recorte da imagem" aria-pressed={editingCrop}><Crop /></button>
          <button type="button" onClick={() => updateAttributes({ rotation: rotation - 90 })} title="Girar à esquerda" aria-label="Girar imagem à esquerda"><RotateCcw /></button>
          <button type="button" onClick={() => updateAttributes({ rotation: rotation + 90 })} title="Girar à direita" aria-label="Girar imagem à direita"><RotateCw /></button>
          <span />
          <button type="button" className="danger" onClick={deleteNode} title="Remover imagem" aria-label="Remover imagem"><Trash2 /></button>
        </div>}
        {selected && editingCrop && cropEnabled && <div className="nb-image-crop-controls" contentEditable={false} onPointerDown={(event) => event.stopPropagation()}>
          <div className="nb-image-crop-aspects" role="group" aria-label="Formato do recorte">
            {(["1:1", "4:3", "16:9"] as const).map((value) => <button key={value} type="button" className={cropAspect === value ? "active" : ""} onClick={() => updateAttributes({ cropAspect: value })}>{value}</button>)}
          </div>
          <label><span>Horizontal</span><input type="range" min="0" max="100" value={cropX} onChange={(event) => updateAttributes({ cropX: Number(event.target.value) })} /></label>
          <label><span>Vertical</span><input type="range" min="0" max="100" value={cropY} onChange={(event) => updateAttributes({ cropY: Number(event.target.value) })} /></label>
          <label><span>Zoom</span><input type="range" min="1" max="3" step="0.05" value={cropZoom} onChange={(event) => updateAttributes({ cropZoom: Number(event.target.value) })} /></label>
          <button type="button" className="nb-image-crop-reset" onClick={() => updateAttributes({ cropX: 50, cropY: 50, cropZoom: 1, cropAspect: "4:3" })}>Redefinir</button>
          <button type="button" className="nb-image-crop-reset" onClick={() => { updateAttributes({ cropEnabled: false }); setEditingCrop(false); }}>Remover recorte</button>
          <button type="button" className="nb-image-crop-reset" onClick={() => setEditingCrop(false)}>Concluir recorte</button>
        </div>}
        <div
          ref={viewportRef}
          className="nb-image-viewport"
          style={{
            position: "relative",
            width: "100%",
            maxWidth: "100%",
            aspectRatio,
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
            onLoad={(event) => {
              const image = event.currentTarget;
              if (image.naturalHeight) {
                const ratio = image.naturalWidth / image.naturalHeight;
                setNaturalRatio(ratio);
                if (node.attrs.naturalRatio !== ratio) updateAttributes({ naturalRatio: ratio });
              }
            }}
            style={{
              position: "absolute",
              ...imageStyle,
              display: "block",
              maxWidth: "none",
              objectFit: "contain",
              objectPosition: "center",
              borderRadius: transparent ? 0 : 8,
              background: "transparent",
              transformOrigin: "center",
              cursor: "grab",
              userSelect: "none",
              WebkitUserDrag: "element",
            } as React.CSSProperties}
          />
        </div>
        {/* Resize handle (bottom-right) */}
        {selected && <span
          role="slider"
          aria-label="Redimensionar imagem"
          tabIndex={0}
          aria-valuemin={80}
          aria-valuemax={1400}
          aria-valuenow={typeof width === "number" ? width : 720}
          onKeyDown={(event) => {
            if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
            event.preventDefault();
            const current = viewportRef.current?.clientWidth ?? 720;
            updateAttributes({ width: Math.max(80, Math.min(1400, current + (event.key === "ArrowRight" ? 10 : -10))) });
          }}
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
        />}
      </div>
    </NodeViewWrapper>
  );
}

function floatingWidth(width: number | string | null, floating: boolean) {
  if (floating) return "100%";
  if (typeof width === "number") return `${width}px`;
  return width || "min(100%, 720px)";
}
