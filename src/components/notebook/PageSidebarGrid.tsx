import { ChevronDown, ChevronUp, Copy, Plus, Trash2, Pin, Sparkles, Pencil, Files, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { useState } from "react";
import "./notebook-premium.css";

interface Page {
  id: string;
  page_number: number;
  content: string;
  drawing_data?: { strokes?: unknown[]; backgroundImage?: string; backgroundSource?: "pdf" | "image" } | null;
}

interface PageMeta {
  pinned?: boolean;
  tags?: string[];
}

interface PageSidebarGridProps {
  pages: Page[];
  currentPage: number;
  onSelectPage: (idx: number) => void;
  onAddPage: () => void;
  onDeletePage: (idx: number) => void;
  onDuplicatePage?: (idx: number) => void;
  onReorderPages?: (fromIdx: number, toIdx: number) => void;
  pageMeta?: Record<string, PageMeta>;
  notebookId?: string;
  hasActivity?: (pageId: string) => boolean;
  collapsed?: boolean;
  onToggleCollapsed?: () => void;
}

function pagePreview(html: string, max = 150): { image: string | null; title: string; text: string } {
  if (typeof document === "undefined") return { image: null, title: "Página", text: "" };
  const tmp = document.createElement("div");
  tmp.innerHTML = html || "";
  const image = tmp.querySelector("img")?.getAttribute("src") || null;
  const title = (tmp.querySelector("h1, h2")?.textContent || "Página").trim();
  const text = (tmp.textContent || "").replace(/\s+/g, " ").trim().slice(0, max) || "Página vazia";
  return { image, title, text };
}

export function PageSidebarGrid({
  pages,
  currentPage,
  onSelectPage,
  onAddPage,
  onDeletePage,
  onDuplicatePage,
  onReorderPages,
  pageMeta = {},
  notebookId,
  hasActivity,
  collapsed = false,
  onToggleCollapsed,
}: PageSidebarGridProps) {
  const [draggedIdx, setDraggedIdx] = useState<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);

  const handleDragStart = (e: React.DragEvent, idx: number) => {
    setDraggedIdx(idx);
    e.dataTransfer.effectAllowed = "move";
    // Torna a thumbnail semi-transparente durante o drag
    setTimeout(() => {
      if (e.target instanceof HTMLElement) {
        e.target.style.opacity = "0.5";
      }
    }, 0);
  };

  const handleDragEnd = (e: React.DragEvent) => {
    setDraggedIdx(null);
    setDragOverIdx(null);
    if (e.target instanceof HTMLElement) {
      e.target.style.opacity = "1";
    }
  };

  const handleDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (dragOverIdx !== idx) {
      setDragOverIdx(idx);
    }
  };

  const handleDrop = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    if (draggedIdx !== null && draggedIdx !== idx && onReorderPages) {
      onReorderPages(draggedIdx, idx);
    }
    setDraggedIdx(null);
    setDragOverIdx(null);
  };

  if (collapsed) {
    return (
      <aside className="nb-page-sidebar is-collapsed" aria-label="Navegação de páginas recolhida">
        <button type="button" className="nb-pages-expand" onClick={onToggleCollapsed} aria-label="Mostrar páginas" title="Mostrar páginas">
          <PanelLeftOpen />
          <span>{pages.length}</span>
        </button>
      </aside>
    );
  }

  return (
    <aside className="nb-page-sidebar">
      <div className="nb-pages-heading">
        <span><Files className="h-3.5 w-3.5" /> Páginas</span>
        <div className="nb-pages-heading-actions">
          <button type="button" onClick={onAddPage} aria-label="Adicionar nova página" title="Nova página"><Plus className="h-4 w-4" /></button>
          {onToggleCollapsed && <button type="button" onClick={onToggleCollapsed} aria-label="Esconder páginas" title="Esconder páginas"><PanelLeftClose className="h-4 w-4" /></button>}
        </div>
      </div>
      {pages.map((page, idx) => {
        const key = notebookId ? `${notebookId}:${page.id}` : "";
        const meta = key ? pageMeta[key] : undefined;
        const isPinned = meta?.pinned;
        const hasAi = hasActivity ? hasActivity(page.id) : false;
        const hasDrawings = page.drawing_data?.strokes?.length > 0;
        const preview = pagePreview(page.content);

        return (
          <div 
            key={page.id} 
            className="relative group"
            style={{ padding: "0 10px" }}
          >
            <button
              type="button"
              onClick={() => onSelectPage(idx)}
              aria-label={`Abrir página ${idx + 1}${idx === currentPage ? ", página atual" : ""}`}
              aria-current={idx === currentPage ? "page" : undefined}
              className={`nb-page-thumb ${idx === currentPage ? "active" : ""} ${
                dragOverIdx === idx ? (draggedIdx !== null && draggedIdx < idx ? "border-b-2 border-b-primary" : "border-t-2 border-t-primary") : ""
              }`}
              draggable
              onDragStart={(e) => handleDragStart(e, idx)}
              onDragEnd={handleDragEnd}
              onDragOver={(e) => handleDragOver(e, idx)}
              onDrop={(e) => handleDrop(e, idx)}
            >
              <div className="nb-page-thumb-content">
                {page.drawing_data?.backgroundImage ? (
                  <img src={page.drawing_data.backgroundImage} alt={`Miniatura da página ${idx + 1} do PDF`} className="h-full w-full object-contain object-top" loading="lazy" />
                ) : preview.image ? <>
                  <img src={preview.image} alt="" className="nb-page-inline-image" loading="lazy" />
                  <span className="nb-page-inline-title">{preview.title}</span>
                </> : <><strong>{preview.title}</strong><span>{preview.text}</span></>}
              </div>
              
              <div className="nb-page-thumb-indicators">
                {isPinned && <Pin className="w-2.5 h-2.5 text-orange-500 fill-orange-500" />}
                {hasAi && <Sparkles className="w-2.5 h-2.5 text-primary fill-primary/20" />}
                {hasDrawings && <Pencil className="w-2.5 h-2.5 text-muted-foreground" />}
              </div>

              <div className="nb-page-thumb-num">
                {idx + 1}
              </div>
            </button>

            <div className="nb-page-thumb-actions">
              {onDuplicatePage && <button type="button" onClick={(event) => { event.stopPropagation(); onDuplicatePage(idx); }} title="Duplicar página" aria-label={`Duplicar página ${idx + 1}`}><Copy /></button>}
              {onReorderPages && idx > 0 && <button type="button" onClick={(event) => { event.stopPropagation(); onReorderPages(idx, idx - 1); }} title="Mover página para cima" aria-label={`Mover página ${idx + 1} para cima`}><ChevronUp /></button>}
              {onReorderPages && idx < pages.length - 1 && <button type="button" onClick={(event) => { event.stopPropagation(); onReorderPages(idx, idx + 1); }} title="Mover página para baixo" aria-label={`Mover página ${idx + 1} para baixo`}><ChevronDown /></button>}
              {pages.length > 1 && <button type="button" className="danger" onClick={(event) => { event.stopPropagation(); onDeletePage(idx); }} title="Excluir página" aria-label={`Excluir página ${idx + 1}`}><Trash2 /></button>}
            </div>
          </div>
        );
      })}

    </aside>
  );
}
