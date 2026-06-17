import { useState } from "react";
import { type Editor } from "@tiptap/react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sigma, GitBranch, X, Copy, Check } from "lucide-react";
import { toast } from "sonner";

interface LatexDiagramPanelProps {
  editor: Editor | null;
  onClose: () => void;
}

const LATEX_TEMPLATES = [
  { label: "Fração", code: "\\frac{a}{b}" },
  { label: "Raiz", code: "\\sqrt{x}" },
  { label: "Raiz n", code: "\\sqrt[n]{x}" },
  { label: "Somatório", code: "\\sum_{i=1}^{n} x_i" },
  { label: "Integral", code: "\\int_{a}^{b} f(x)\\,dx" },
  { label: "Limite", code: "\\lim_{x \\to \\infty} f(x)" },
  { label: "Derivada", code: "\\frac{d}{dx} f(x)" },
  { label: "Matriz 2x2", code: "\\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix}" },
  { label: "Sistema", code: "\\begin{cases} x + y = 1 \\\\ x - y = 0 \\end{cases}" },
  { label: "Vetor", code: "\\vec{v} = (v_1, v_2, v_3)" },
  { label: "Produto escalar", code: "\\vec{a} \\cdot \\vec{b}" },
  { label: "Norma", code: "\\|\\vec{v}\\|" },
  { label: "Binomial", code: "\\binom{n}{k}" },
  { label: "Logaritmo", code: "\\log_{b}(x)" },
  { label: "Seno/Cosseno", code: "\\sin(\\theta) + \\cos(\\theta)" },
];

const DIAGRAM_TEMPLATES = [
  {
    label: "Fluxograma",
    code: `flowchart TD
    A[Início] --> B{Condição?}
    B -->|Sim| C[Ação A]
    B -->|Não| D[Ação B]
    C --> E[Fim]
    D --> E`,
  },
  {
    label: "Sequência",
    code: `sequenceDiagram
    participant A as Aluno
    participant F as Flora
    A->>F: Pergunta
    F-->>A: Resposta`,
  },
  {
    label: "Mapa Mental",
    code: `mindmap
  root((Tema Central))
    Subtema 1
      Detalhe A
      Detalhe B
    Subtema 2
      Detalhe C`,
  },
  {
    label: "Linha do Tempo",
    code: `timeline
    title Linha do Tempo
    section Período 1
      Evento A : Descrição A
    section Período 2
      Evento B : Descrição B`,
  },
  {
    label: "Diagrama de Classes",
    code: `classDiagram
    class Animal {
      +String nome
      +falar()
    }
    class Cachorro {
      +latir()
    }
    Animal <|-- Cachorro`,
  },
];

export function LatexDiagramPanel({ editor, onClose }: LatexDiagramPanelProps) {
  const [latexInput, setLatexInput] = useState("");
  const [diagramInput, setDiagramInput] = useState(DIAGRAM_TEMPLATES[0].code);
  const [copied, setCopied] = useState<string | null>(null);

  const insertLatex = (inline: boolean) => {
    if (!editor) return;
    const code = latexInput.trim();
    if (!code) {
      toast.error("Digite uma expressão LaTeX primeiro.");
      return;
    }
    const wrapped = inline ? `$${code}$` : `$$\n${code}\n$$`;
    editor.chain().focus().insertContent(wrapped + "\n").run();
    toast.success("Fórmula inserida!");
    onClose();
  };

  const insertTemplate = (code: string, inline = true) => {
    if (!editor) return;
    const wrapped = inline ? `$${code}$` : `$$\n${code}\n$$`;
    editor.chain().focus().insertContent(wrapped + " ").run();
    toast.success("Template inserido!");
  };

  const insertDiagram = () => {
    if (!editor) return;
    const code = diagramInput.trim();
    if (!code) {
      toast.error("Digite o código do diagrama primeiro.");
      return;
    }
    // Insere como bloco de código com linguagem mermaid
    editor.chain().focus().insertContent(`\`\`\`mermaid\n${code}\n\`\`\`\n`).run();
    toast.success("Diagrama inserido como bloco de código Mermaid!");
    onClose();
  };

  const copyToClipboard = async (text: string, id: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="border border-border rounded-xl bg-card shadow-lg p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-sm flex items-center gap-2">
          <Sigma className="w-4 h-4 text-primary" />
          LaTeX & Diagramas
        </h3>
        <Button variant="ghost" size="icon" className="w-6 h-6" onClick={onClose} aria-label="Fechar painel LaTeX">
          <X className="w-4 h-4" />
        </Button>
      </div>

      <Tabs defaultValue="latex">
        <TabsList className="w-full">
          <TabsTrigger value="latex" className="flex-1">
            <Sigma className="w-3.5 h-3.5 mr-1" /> LaTeX
          </TabsTrigger>
          <TabsTrigger value="diagrams" className="flex-1">
            <GitBranch className="w-3.5 h-3.5 mr-1" /> Diagramas
          </TabsTrigger>
        </TabsList>

        {/* LaTeX */}
        <TabsContent value="latex" className="space-y-3 mt-3">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">
              Expressão LaTeX
            </label>
            <textarea
              value={latexInput}
              onChange={(e) => setLatexInput(e.target.value)}
              placeholder="Ex: \frac{a}{b} ou \sum_{i=1}^{n} x_i"
              className="w-full h-16 rounded-lg border border-border bg-background px-3 py-2 text-sm font-mono resize-none focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" className="flex-1" onClick={() => insertLatex(true)}>
              Inline ($...$)
            </Button>
            <Button size="sm" className="flex-1" onClick={() => insertLatex(false)}>
              Bloco ($$...$$)
            </Button>
          </div>

          <div>
            <p className="text-xs text-muted-foreground mb-2">Templates rápidos:</p>
            <div className="grid grid-cols-2 gap-1 max-h-48 overflow-y-auto">
              {LATEX_TEMPLATES.map((t) => (
                <div
                  key={t.label}
                  className="flex items-center justify-between gap-1 px-2 py-1.5 rounded-lg border border-border hover:border-primary/30 hover:bg-muted/50 transition-colors group"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium truncate">{t.label}</p>
                    <p className="text-[10px] text-muted-foreground font-mono truncate">{t.code}</p>
                  </div>
                  <div className="flex gap-0.5 shrink-0">
                    <button
                      onClick={() => copyToClipboard(t.code, t.label)}
                      className="p-1 rounded text-muted-foreground hover:text-foreground"
                      title="Copiar"
                    >
                      {copied === t.label ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
                    </button>
                    <button
                      onClick={() => insertTemplate(t.code)}
                      className="p-1 rounded text-muted-foreground hover:text-primary text-xs"
                      title="Inserir inline"
                    >
                      +
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </TabsContent>

        {/* Diagramas */}
        <TabsContent value="diagrams" className="space-y-3 mt-3">
          <div>
            <p className="text-xs text-muted-foreground mb-2">Templates de diagrama (Mermaid):</p>
            <div className="flex gap-1 flex-wrap mb-2">
              {DIAGRAM_TEMPLATES.map((t) => (
                <button
                  key={t.label}
                  onClick={() => setDiagramInput(t.code)}
                  className="text-xs px-2 py-1 rounded-full border border-border hover:border-primary/50 hover:bg-muted/50 transition-colors"
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">
              Código Mermaid
            </label>
            <textarea
              value={diagramInput}
              onChange={(e) => setDiagramInput(e.target.value)}
              className="w-full h-32 rounded-lg border border-border bg-background px-3 py-2 text-xs font-mono resize-none focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          <Button size="sm" className="w-full" onClick={insertDiagram}>
            <GitBranch className="w-4 h-4 mr-2" />
            Inserir Diagrama
          </Button>
          <p className="text-xs text-muted-foreground">
            O diagrama será inserido como bloco de código Mermaid. Renderização disponível em visualizadores compatíveis.
          </p>
        </TabsContent>
      </Tabs>
    </div>
  );
}
