import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
import { supabase } from "@/integrations/supabase/client";

interface GhostState {
  suggestion: string;
  pos: number;
  contextHash: string;
}

const ghostKey = new PluginKey<GhostState>("flora-ghost-text");

const SET_SUGGESTION = "flora-ghost-set";
const CLEAR_SUGGESTION = "flora-ghost-clear";

function getTextBefore(doc: any, pos: number, max = 800): string {
  const from = Math.max(0, pos - max);
  return doc.textBetween(from, pos, "\n", " ");
}

function hash(s: string): string {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  return h.toString(36);
}

export const GHOST_ENABLED_KEY = "flora-ghost-enabled";

export const GhostText = Extension.create({
  name: "ghostText",

  addProseMirrorPlugins() {
    let debounceTimer: ReturnType<typeof setTimeout> | null = null;
    let inflight: AbortController | null = null;
    let lastRequestedHash = "";

    return [
      new Plugin<GhostState>({
        key: ghostKey,
        state: {
          init: () => ({ suggestion: "", pos: 0, contextHash: "" }),
          apply(tr, prev) {
            const meta = tr.getMeta(ghostKey);
            if (meta?.type === SET_SUGGESTION) {
              return { suggestion: meta.suggestion, pos: meta.pos, contextHash: meta.contextHash };
            }
            if (meta?.type === CLEAR_SUGGESTION) {
              return { suggestion: "", pos: 0, contextHash: "" };
            }
            // Clear suggestion if user typed/changed selection away
            if (tr.docChanged || tr.selectionSet) {
              const sel = tr.selection;
              if (prev.suggestion && sel.from !== prev.pos) {
                return { suggestion: "", pos: 0, contextHash: "" };
              }
              if (tr.docChanged && prev.suggestion) {
                return { suggestion: "", pos: 0, contextHash: "" };
              }
            }
            return prev;
          },
        },
        props: {
          decorations(state) {
            const s = ghostKey.getState(state);
            if (!s || !s.suggestion) return DecorationSet.empty;
            const widget = document.createElement("span");
            widget.className = "flora-ghost-text";
            widget.textContent = s.suggestion;
            widget.style.cssText = "color: hsl(var(--muted-foreground) / 0.55); pointer-events: none; font-style: italic;";
            return DecorationSet.create(state.doc, [
              Decoration.widget(s.pos, widget, { side: 1, ignoreSelection: true }),
            ]);
          },
          handleKeyDown(view, event) {
            const s = ghostKey.getState(view.state);
            if (!s?.suggestion) return false;
            if (event.key === "Tab") {
              event.preventDefault();
              const tr = view.state.tr.insertText(s.suggestion, s.pos);
              tr.setMeta(ghostKey, { type: CLEAR_SUGGESTION });
              view.dispatch(tr);
              return true;
            }
            if (event.key === "Escape") {
              event.preventDefault();
              view.dispatch(view.state.tr.setMeta(ghostKey, { type: CLEAR_SUGGESTION }));
              return true;
            }
            return false;
          },
        },
        view(view) {
          const schedule = () => {
            if (debounceTimer) clearTimeout(debounceTimer);
            debounceTimer = setTimeout(async () => {
              const { state } = view;
              const sel = state.selection;
              if (!sel.empty) return;
              const before = getTextBefore(state.doc, sel.from);
              const trimmed = before.trim();
              if (trimmed.length < 12) return;
              // Only suggest after a word boundary (space or end of sentence)
              const lastChar = before.slice(-1);
              if (!/[\s.,;:!?]/.test(lastChar)) return;
              const h = hash(before);
              if (h === lastRequestedHash) return;
              lastRequestedHash = h;
              if (inflight) inflight.abort();
              inflight = new AbortController();
              try {
                const { data, error } = await supabase.functions.invoke("flora-engine", {
                  body: { action: "ghost_complete", data: { before } },
                });
                if (error) return;
                const suggestion = ((data as any)?.suggestion || "").trim();
                if (!suggestion) return;
                // Make sure user hasn't moved/typed in the meantime
                const curSel = view.state.selection;
                if (!curSel.empty || curSel.from !== sel.from) return;
                const curBefore = getTextBefore(view.state.doc, curSel.from);
                if (hash(curBefore) !== h) return;
                const tr = view.state.tr.setMeta(ghostKey, {
                  type: SET_SUGGESTION,
                  suggestion: lastChar === " " || lastChar === "\n" ? suggestion : " " + suggestion,
                  pos: curSel.from,
                  contextHash: h,
                });
                view.dispatch(tr);
              } catch {
                // ignore
              }
            }, 800);
          };

          return {
            update(view, prevState) {
              if (view.state.doc.eq(prevState.doc) && view.state.selection.eq(prevState.selection)) return;
              schedule();
            },
            destroy() {
              if (debounceTimer) clearTimeout(debounceTimer);
              if (inflight) inflight.abort();
            },
          };
        },
      }),
    ];
  },
});