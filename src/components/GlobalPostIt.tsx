import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { useLocation } from "react-router-dom";
import { ExternalLink, Plus, X, GripHorizontal } from "lucide-react";
import { useGlobalPostIt, type GlobalPostItNote } from "@/hooks/useGlobalPostIt";

// Inject some basic styles for the PiP window if it's open
const PIP_STYLES = `
  body {
    margin: 0;
    padding: 0;
    background: transparent;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
    overflow: hidden;
  }
  * {
    box-sizing: border-box;
  }
`;

function DraggableNote({
  note,
  onUpdate,
  onRemove,
  isPip,
}: {
  note: GlobalPostItNote;
  onUpdate: (id: string, updates: Partial<GlobalPostItNote>) => void;
  onRemove: (id: string) => void;
  isPip: boolean;
}) {
  const [isDragging, setIsDragging] = useState(false);
  const startPos = useRef({ x: 0, y: 0 });
  const [pos, setPos] = useState({ x: note.x, y: note.y });
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Sync external changes
  useEffect(() => {
    if (!isDragging) {
      setPos({ x: note.x, y: note.y });
    }
  }, [note.x, note.y, isDragging]);

  const handlePointerDown = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).tagName === "TEXTAREA" || (e.target as HTMLElement).tagName === "BUTTON") {
      return;
    }
    setIsDragging(true);
    startPos.current = {
      x: e.clientX - pos.x,
      y: e.clientY - pos.y,
    };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    const newX = e.clientX - startPos.current.x;
    const newY = e.clientY - startPos.current.y;
    setPos({ x: newX, y: newY });
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!isDragging) return;
    setIsDragging(false);
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    onUpdate(note.id, { x: pos.x, y: pos.y });
  };

  if (!note.isOpen) return null;

  return (
    <div
      style={{
        position: isPip ? "absolute" : "fixed",
        top: isPip ? 0 : pos.y,
        left: isPip ? 0 : pos.x,
        width: isPip ? "100%" : note.width,
        height: isPip ? "100%" : note.height,
        backgroundColor: note.color,
        boxShadow: isPip ? "none" : "0 10px 30px rgba(0,0,0,0.15), 0 2px 8px rgba(0,0,0,0.1)",
        borderRadius: isPip ? 0 : "4px",
        zIndex: 9999,
        display: "flex",
        flexDirection: "column",
        borderBottomRightRadius: isPip ? 0 : "20px 4px",
        transition: isDragging ? "none" : "box-shadow 0.2s",
      }}
    >
      {/* Header / Drag Handle */}
      <div
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        style={{
          height: 24,
          backgroundColor: "rgba(0,0,0,0.05)",
          cursor: isPip ? "default" : (isDragging ? "grabbing" : "grab"),
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 6px",
          borderTopLeftRadius: isPip ? 0 : "4px",
          borderTopRightRadius: isPip ? 0 : "4px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 4, opacity: 0.5 }}>
          {!isPip && <GripHorizontal size={14} />}
        </div>
        <button
          onClick={() => onRemove(note.id)}
          style={{
            background: "transparent",
            border: "none",
            cursor: "pointer",
            padding: 2,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "rgba(0,0,0,0.5)",
          }}
          title="Fechar"
        >
          <X size={14} />
        </button>
      </div>

      {/* Content */}
      <textarea
        ref={textareaRef}
        value={note.text}
        onChange={(e) => onUpdate(note.id, { text: e.target.value })}
        placeholder="Nota rápida..."
        style={{
          flex: 1,
          width: "100%",
          background: "transparent",
          border: "none",
          padding: "10px 12px",
          fontSize: "14px",
          lineHeight: "1.5",
          color: "rgba(0,0,0,0.8)",
          resize: "none",
          outline: "none",
          fontFamily: "inherit",
        }}
      />
      
      {!isPip && (
        <div
          style={{
            position: "absolute",
            bottom: 0,
            right: 0,
            width: 20,
            height: 20,
            cursor: "nwse-resize",
            background: "linear-gradient(135deg, transparent 50%, rgba(0,0,0,0.05) 50%)",
            borderBottomRightRadius: "4px",
          }}
          onPointerDown={(e) => {
            e.stopPropagation();
            const startW = note.width;
            const startH = note.height;
            const startX = e.clientX;
            const startY = e.clientY;
            
            const handleMove = (me: PointerEvent) => {
              onUpdate(note.id, {
                width: Math.max(150, startW + (me.clientX - startX)),
                height: Math.max(100, startH + (me.clientY - startY)),
              });
            };
            
            const handleUp = () => {
              window.removeEventListener("pointermove", handleMove);
              window.removeEventListener("pointerup", handleUp);
            };
            
            window.addEventListener("pointermove", handleMove);
            window.addEventListener("pointerup", handleUp);
          }}
        />
      )}
    </div>
  );
}

export function GlobalPostIt() {
  const { notes, updateNote, addNote, removeNote, openInPiP, isPipActive, pipWindow } = useGlobalPostIt();
  const [hasPipSupport, setHasPipSupport] = useState(false);
  const location = useLocation();
  // Only show launcher + on-page notes on notebook routes. PiP (once open) keeps working everywhere.
  const isNotebookRoute = location.pathname.startsWith("/notebooks");

  useEffect(() => {
    setHasPipSupport("documentPictureInPicture" in window);
  }, []);

  // When PiP is active, we render the notes inside the PiP window's document body using a portal
  if (isPipActive && pipWindow) {
    // Inject styles once
    if (!pipWindow.document.head.querySelector("#pip-styles")) {
      const styleEl = pipWindow.document.createElement("style");
      styleEl.id = "pip-styles";
      styleEl.textContent = PIP_STYLES;
      pipWindow.document.head.appendChild(styleEl);
    }

    return createPortal(
      <div style={{ width: "100%", height: "100vh", position: "relative" }}>
        {notes.filter(n => n.isOpen).map((note) => (
          <DraggableNote
            key={note.id}
            note={note}
            onUpdate={updateNote}
            onRemove={removeNote}
            isPip={true}
          />
        ))}
        {notes.filter(n => n.isOpen).length === 0 && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "rgba(0,0,0,0.4)" }}>
            Nenhuma nota aberta
          </div>
        )}
      </div>,
      pipWindow.document.body
    );
  }

  // Outside notebook routes: render nothing on screen (PiP would have its own window).
  if (!isNotebookRoute) return null;

  // Render on the main screen (fallback or normal usage before PiP)
  return (
    <>
      {notes.filter(n => n.isOpen).map((note) => (
        <DraggableNote
          key={note.id}
          note={note}
          onUpdate={updateNote}
          onRemove={removeNote}
          isPip={false}
        />
      ))}

      {/* Floating launcher button if PiP is supported, otherwise just a way to add notes */}
      <div style={{ position: "fixed", bottom: 24, right: 24, zIndex: 9998, display: "flex", gap: 8, opacity: 0.85 }}>
        <button
          onClick={addNote}
          className="w-9 h-9 rounded-full bg-yellow-200 text-yellow-800 shadow-md flex items-center justify-center hover:bg-yellow-300 transition-colors border border-yellow-300"
          title="Nova nota rápida"
        >
          <Plus size={18} />
        </button>
        {hasPipSupport && (
          <button
            onClick={openInPiP}
            className="w-9 h-9 rounded-full bg-background border border-border text-foreground shadow-md flex items-center justify-center hover:bg-muted transition-colors"
            title="Abrir nota flutuante (Picture-in-Picture)"
          >
            <ExternalLink size={16} />
          </button>
        )}
      </div>
    </>
  );
}
