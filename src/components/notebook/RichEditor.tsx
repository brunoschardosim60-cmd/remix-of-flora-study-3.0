import { useEditor, EditorContent } from "@tiptap/react";
import { BubbleMenu } from "@tiptap/react/menus";
import StarterKit from "@tiptap/starter-kit";
import Highlight from "@tiptap/extension-highlight";
import Image from "@tiptap/extension-image";
import Placeholder from "@tiptap/extension-placeholder";
import TextAlign from "@tiptap/extension-text-align";
import { TextStyle } from "@tiptap/extension-text-style";
import { Color } from "@tiptap/extension-color";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Wand2, CheckCircle2, Minimize2, Sparkles, Loader2 } from "lucide-react";
import { EditorToolbar } from "./EditorToolbar";
import { ReactNodeViewRenderer } from "@tiptap/react";
import { ResizableImageView } from "./ResizableImageView";
import { GhostText } from "./GhostTextExtension";

interface RichEditorProps {
  content: string;
  onChange: (html: string) => void;
  userId: string;
  notebookId: string;
  darkMode: boolean;
  onToggleDarkMode: () => void;
  template?: "blank" | "lined" | "grid" | "dotted" | "physics" | "chemistry" | "essay";
  zoom?: number;
  /** Overlay rendered on top of the paper sheet (e.g. drawing canvas, sticky notes). */
  paperOverlay?: ReactNode;
  /** When true, paper takes more horizontal space (focus/fullscreen mode). */
  wide?: boolean;
  /** Tipografia manuscrita (Caveat) opcional. */
  handwriting?: boolean;
  /** Margem vermelha clássica de caderno. */
  showMargin?: boolean;
}

const TEMPLATE_CLASS: Record<string, string> = {
  blank: "",
  lined: "notebook-lined",
  grid: "notebook-grid",
  dotted: "notebook-dotted",
  physics: "notebook-physics",
  chemistry: "notebook-chemistry",
  essay: "notebook-essay",
};

export function RichEditor({ content, onChange, userId, notebookId, darkMode, onToggleDarkMode, template = "blank", zoom = 1, paperOverlay, wide = false, handwriting = false, showMargin = true }: RichEditorProps) {
  const isExternalUpdate = useRef(false);
  const [floraBusy, setFloraBusy] = useState<null | string>(null);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Highlight.configure({ multicolor: true }),
      Image.extend({
        draggable: true,
        selectable: true,
        addAttributes() {
          return {
            ...this.parent?.(),
            width: {
              default: null,
              parseHTML: (el) => {
                const w = el.getAttribute("width") || el.style.width;
                if (!w) return null;
                const n = parseInt(String(w).replace("px", ""), 10);
                return Number.isFinite(n) ? n : w;
              },
              renderHTML: (attrs) => (attrs.width ? { width: attrs.width } : {}),
            },
            alignment: {
              default: "center",
              parseHTML: (el) => el.getAttribute("data-alignment") || "center",
              renderHTML: (attrs) =>
                attrs.alignment ? { "data-alignment": attrs.alignment } : {},
            },
          };
        },
        addNodeView() {
          return ReactNodeViewRenderer(ResizableImageView);
        },
      }).configure({
        inline: false,
        allowBase64: true,
        HTMLAttributes: { class: "nb-editor-image" },
      }),
      Placeholder.configure({ placeholder: "Comece a escrever..." }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      TextStyle,
      Color,
      GhostText,
    ],
    content: content || "<p></p>",
    onUpdate: ({ editor }) => {
      if (!isExternalUpdate.current) {
        onChange(editor.getHTML());
      }
    },
      editorProps: {
        attributes: {
          class: "prose prose-sm sm:prose-base max-w-none focus:outline-none min-h-[60vh] notebook-paper-text",
        },
      },
  });

  // Sync external content changes (page switches)
  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      isExternalUpdate.current = true;
      editor.commands.setContent(content || "<p></p>");
      isExternalUpdate.current = false;
    }
  }, [content, editor]);

  const runFlora = async (mode: "fix" | "formal" | "simple" | "summary") => {
    if (!editor) return;
    const { from, to } = editor.state.selection;
    if (from === to) return;
    const text = editor.state.doc.textBetween(from, to, " ");
    if (!text.trim()) return;
    setFloraBusy(mode);
    try {
      const { data, error } = await supabase.functions.invoke("flora-engine", {
        body: { action: "rewrite_selection", data: { text, mode } },
      });
      if (error) throw error;
      const result = (data as any)?.result;
      if (!result) {
        toast.error("Flora não conseguiu responder.");
        return;
      }
      editor.chain().focus().insertContentAt({ from, to }, result).run();
      toast.success("Flora aplicou a edição.");
    } catch (e: any) {
      toast.error(e?.message || "Erro ao chamar Flora.");
    } finally {
      setFloraBusy(null);
    }
  };

  return (
    <div className={`flex flex-col h-full ${darkMode ? "text-gray-100" : ""}`}>
      <EditorToolbar
        editor={editor}
        userId={userId}
        notebookId={notebookId}
        darkMode={darkMode}
        onToggleDarkMode={onToggleDarkMode}
      />
      {editor && (
        <BubbleMenu
          editor={editor}
          shouldShow={({ editor: ed, from, to }) => from !== to && !ed.state.selection.empty}
        >
          <div className="flex items-center gap-1 rounded-lg border border-border bg-popover/95 backdrop-blur shadow-lg px-1.5 py-1">
            <button
              onClick={() => runFlora("fix")}
              disabled={!!floraBusy}
              className="flex items-center gap-1 text-xs px-2 py-1 rounded hover:bg-accent/30 disabled:opacity-50"
              title="Corrigir ortografia/gramática"
            >
              {floraBusy === "fix" ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
              Corrigir
            </button>
            <button
              onClick={() => runFlora("simple")}
              disabled={!!floraBusy}
              className="flex items-center gap-1 text-xs px-2 py-1 rounded hover:bg-accent/30 disabled:opacity-50"
              title="Reescrever simples"
            >
              {floraBusy === "simple" ? <Loader2 className="w-3 h-3 animate-spin" /> : <Wand2 className="w-3 h-3" />}
              Simples
            </button>
            <button
              onClick={() => runFlora("formal")}
              disabled={!!floraBusy}
              className="flex items-center gap-1 text-xs px-2 py-1 rounded hover:bg-accent/30 disabled:opacity-50"
              title="Reescrever formal"
            >
              {floraBusy === "formal" ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
              Formal
            </button>
            <button
              onClick={() => runFlora("summary")}
              disabled={!!floraBusy}
              className="flex items-center gap-1 text-xs px-2 py-1 rounded hover:bg-accent/30 disabled:opacity-50"
              title="Resumir"
            >
              {floraBusy === "summary" ? <Loader2 className="w-3 h-3 animate-spin" /> : <Minimize2 className="w-3 h-3" />}
              Resumir
            </button>
          </div>
        </BubbleMenu>
      )}
      <div className="flex-1 overflow-auto py-4 sm:py-6 px-2 sm:px-3">
        <div
          className={`relative mx-auto w-full ${wide ? "max-w-[1400px]" : "max-w-[1180px]"} rounded-2xl transition-shadow duration-300 animate-fade-in notebook-paper-realistic ${showMargin ? "with-margin" : ""} ${handwriting ? "notebook-handwriting" : ""} ${
            darkMode
              ? "bg-gray-900 shadow-[0_8px_30px_rgba(0,0,0,0.5)] [&_.ProseMirror]:text-gray-100 [&_.ProseMirror_h1]:text-gray-50 [&_.ProseMirror_h2]:text-gray-50 [&_.ProseMirror_h3]:text-gray-50"
              : "bg-white shadow-[0_4px_24px_rgba(0,0,0,0.06)] hover:shadow-[0_8px_32px_rgba(0,0,0,0.08)]"
          } ${TEMPLATE_CLASS[template] || ""}`}
          style={{
            padding: "56px 64px",
            minHeight: "85vh",
            transform: `scale(${zoom})`,
            transformOrigin: "top center",
          }}
        >
          <EditorContent editor={editor} className="min-h-dvh" />
          {paperOverlay}
        </div>
      </div>
    </div>
  );
}
