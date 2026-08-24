import { Plus, Trash2, Pin, Sparkles, Pencil } from "lucide-react";
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
  onReorderPages?: (fromIdx: number, toIdx: number) => void;
  pageMeta?: Record<string, PageMeta>;
  notebookId?: string;
  hasActivity?: (pageId: string) => boolean;
}

// Extrai texto puro do HTML para preview
function htmlToText(html: string, max = 150): string {
  const tmp = document.createElement("div");
  tmp.innerHTML = html || "";
  return (tmp.textContent || "").trim().slice(0, max) || "Página vazia";
}

export function PageSidebarGrid({
  pages,
  currentPage,
  onSelectPage,
  onAddPage,
  onDeletePage,
  onReorderPages,
  pageMeta = {},
  notebookId,
  hasActivity,
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

  return (
    <aside className="nb-page-sidebar">
      {pages.map((page, idx) => {
        const key = notebookId ? `${notebookId}:${page.id}` : "";
        const meta = key ? pageMeta[key] : undefined;
        const isPinned = meta?.pinned;
        const hasAi = hasActivity ? hasActivity(page.id) : false;
        const hasDrawings = page.drawing_data?.strokes?.length > 0;

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
                ) : typeof document !== "undefined" ? htmlToText(page.content) : "..."}
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

            {pages.length > 1 && (
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onDeletePage(idx); }}
                className="absolute top-0 right-1 w-6 h-6 rounded-full bg-destructive text-destructive-foreground opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity flex items-center justify-center shadow-md z-10"
                title="Deletar página"
                aria-label={`Excluir página ${idx + 1}`}
              >
                <Trash2 className="w-3 h-3" />
              </button>
            )}
          </div>
        );
      })}

      <div style={{ padding: "0 10px" }}>
        <button
          type="button"
          onClick={onAddPage}
          className="nb-page-add"
          title="Nova página"
          aria-label="Adicionar nova página"
        >
          <Plus className="w-5 h-5" />
        </button>
      </div>
    </aside>
  );
}
