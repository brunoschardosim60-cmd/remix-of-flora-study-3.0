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
  template?: "blank" | "lined" | "grid" | "dotted" | "cornell" | "clinical" | "anatomy" | "physics" | "chemistry" | "essay";
  zoom?: number;
  /** Orientação física da folha. */
  orientation?: "portrait" | "landscape";
  /** Samsung Notes: tela contínua por padrão ou páginas físicas para impressão. */
  pageFlow?: "continuous" | "pages";
  /** Overlay rendered on top of the paper sheet (e.g. drawing canvas, sticky notes). */
  paperOverlay?: ReactNode;
  /** When true, paper takes more horizontal space (focus/fullscreen mode). */
  wide?: boolean;
  /** Tipografia manuscrita (Caveat) opcional. */
  handwriting?: boolean;
  /** Margem vermelha clássica de caderno. */
  showMargin?: boolean;
  /** Imagem persistente usada como fundo, por exemplo uma página importada de PDF. */
  backgroundImage?: string;
  /** Bloco solicitado por uma ferramenta externa, inserido na seleção atual. */
  insertionRequest?: { id: number; html: string } | null;
  onInsertionHandled?: (id: number) => void;
}

const TEMPLATE_CLASS: Record<string, string> = {
  blank: "",
  lined: "notebook-lined",
  grid: "notebook-grid",
  dotted: "notebook-dotted",
  cornell: "notebook-cornell",
  clinical: "notebook-clinical",
  anatomy: "notebook-anatomy",
  physics: "notebook-physics",
  chemistry: "notebook-chemistry",
  essay: "notebook-essay",
};

export function RichEditor({ content, onChange, userId, notebookId, darkMode, onToggleDarkMode, template = "blank", zoom = 1, orientation = "portrait", pageFlow = "continuous", paperOverlay, wide = false, handwriting = false, showMargin = true, backgroundImage, insertionRequest, onInsertionHandled }: RichEditorProps) {
  const isExternalUpdate = useRef(false);
  const lastInsertionId = useRef<number | null>(null);
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
            medicalAsset: {
              default: null,
              parseHTML: (el) => el.getAttribute("data-medical-asset"),
              renderHTML: (attrs) => attrs.medicalAsset ? { "data-medical-asset": attrs.medicalAsset } : {},
            },
            transparent: {
              default: false,
              parseHTML: (el) => el.getAttribute("data-transparent") === "true",
              renderHTML: (attrs) => attrs.transparent ? { "data-transparent": "true" } : {},
            },
            wrap: {
              default: false,
              parseHTML: (el) => el.getAttribute("data-wrap") === "true",
              renderHTML: (attrs) => attrs.wrap ? { "data-wrap": "true" } : {},
            },
            rotation: {
              default: 0,
              parseHTML: (el) => Number(el.getAttribute("data-rotation") || 0),
              renderHTML: (attrs) => attrs.rotation ? { "data-rotation": String(attrs.rotation) } : {},
            },
            cropEnabled: {
              default: false,
              parseHTML: (el) => el.getAttribute("data-crop-enabled") === "true",
              renderHTML: (attrs) => attrs.cropEnabled ? { "data-crop-enabled": "true" } : {},
            },
            cropAspect: {
              default: "4:3",
              parseHTML: (el) => el.getAttribute("data-crop-aspect") || "4:3",
              renderHTML: (attrs) => ({ "data-crop-aspect": attrs.cropAspect || "4:3" }),
            },
            cropX: {
              default: 50,
              parseHTML: (el) => Number(el.getAttribute("data-crop-x") || 50),
              renderHTML: (attrs) => ({ "data-crop-x": String(attrs.cropX ?? 50) }),
            },
            cropY: {
              default: 50,
              parseHTML: (el) => Number(el.getAttribute("data-crop-y") || 50),
              renderHTML: (attrs) => ({ "data-crop-y": String(attrs.cropY ?? 50) }),
            },
            cropZoom: {
              default: 1,
              parseHTML: (el) => Number(el.getAttribute("data-crop-zoom") || 1),
              renderHTML: (attrs) => ({ "data-crop-zoom": String(attrs.cropZoom ?? 1) }),
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

  useEffect(() => {
    if (!editor || !insertionRequest || lastInsertionId.current === insertionRequest.id) return;
    lastInsertionId.current = insertionRequest.id;
    editor.chain().focus().insertContent(insertionRequest.html).run();
    onInsertionHandled?.(insertionRequest.id);
  }, [editor, insertionRequest, onInsertionHandled]);

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
      const result = (data as { result?: string } | null)?.result;
      if (!result) {
        toast.error("Flora não conseguiu responder.");
        return;
      }
      editor.chain().focus().insertContentAt({ from, to }, result).run();
      toast.success("Flora aplicou a edição.");
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Erro ao chamar Flora.");
    } finally {
      setFloraBusy(null);
    }
  };

  return (
    <div className={`nb-rich-editor-root flex flex-col h-full is-${pageFlow} ${darkMode ? "text-gray-100" : ""}`}>
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
      <div className="nb-editor-formatbar relative z-30 border-b border-black/[0.06] bg-white/90 backdrop-blur dark:bg-gray-900/90">
        <EditorToolbar
          editor={editor}
          userId={userId}
          notebookId={notebookId}
          darkMode={darkMode}
          onToggleDarkMode={onToggleDarkMode}
        />
      </div>
      <div className={`nb-paper-viewport is-${pageFlow} flex-1 py-5 sm:py-7 px-3 sm:px-6`}>
        <div
          className={`nb-paper-zoom-stage is-${pageFlow}`}
          style={{ zoom } as React.CSSProperties}
        >
        <div
          className={`nb-paper-frame relative mx-auto overflow-hidden transition-shadow duration-300 animate-fade-in notebook-paper-realistic is-${orientation} is-${pageFlow} ${wide ? "is-wide" : ""} ${showMargin ? "with-margin" : ""} ${handwriting ? "notebook-handwriting" : ""} ${
            darkMode
              ? "bg-gray-900 shadow-[0_8px_30px_rgba(0,0,0,0.5)] [&_.ProseMirror]:text-gray-100 [&_.ProseMirror_h1]:text-gray-50 [&_.ProseMirror_h2]:text-gray-50 [&_.ProseMirror_h3]:text-gray-50"
              : "bg-white shadow-[0_4px_24px_rgba(0,0,0,0.06)] hover:shadow-[0_8px_32px_rgba(0,0,0,0.08)]"
          } ${TEMPLATE_CLASS[template] || ""}`}
        >
          <div className={`nb-paper-content is-${pageFlow} relative min-h-[calc(85vh-42px)] px-8 py-10 sm:px-14 sm:py-12`}>
            {backgroundImage && (
              <img src={backgroundImage} alt="Página importada do PDF" draggable={false} className="pointer-events-none absolute inset-0 h-full w-full select-none object-contain object-top opacity-100" />
            )}
            <EditorContent editor={editor} className="relative z-[1] min-h-[70vh]" />
            {paperOverlay}
          </div>
        </div>
        </div>
      </div>
    </div>
  );
}
