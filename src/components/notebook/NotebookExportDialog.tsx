import { Check, ClipboardCopy, Code2, FileImage, FileText, Loader2, NotebookPen, Smartphone } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export type NotebookExportAction = "samsung" | "pdf" | "png" | "html" | "markdown" | "text" | "copy";

interface NotebookExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  exporting: NotebookExportAction | null;
  onExport: (action: NotebookExportAction) => void;
}

const options: Array<{ id: NotebookExportAction; icon: typeof FileText; title: string; description: string; badge?: string }> = [
  { id: "samsung", icon: Smartphone, title: "Samsung Notes", description: "PDF A4 vertical pronto para importar e escrever com a S Pen.", badge: "RECOMENDADO" },
  { id: "pdf", icon: FileText, title: "PDF universal", description: "Mantém páginas, imagens anatômicas, desenhos e notas adesivas." },
  { id: "png", icon: FileImage, title: "Página em PNG", description: "Imagem nítida da página atual para Galeria, Goodnotes e apresentações." },
  { id: "html", icon: Code2, title: "HTML editável", description: "Arquivo completo com imagens incorporadas para navegador e editores compatíveis." },
  { id: "markdown", icon: NotebookPen, title: "Markdown", description: "Texto estruturado para Notion, Obsidian, GitHub e outros aplicativos." },
  { id: "text", icon: FileText, title: "Texto simples", description: "Conteúdo leve e universal, sem depender do visual da página." },
  { id: "copy", icon: ClipboardCopy, title: "Copiar página atual", description: "Copia texto formatado para colar no OneNote, Google Docs ou Notion." },
];

export function NotebookExportDialog({ open, onOpenChange, exporting, onExport }: NotebookExportDialogProps) {
  return <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="nb-export-dialog max-w-3xl overflow-hidden p-0">
      <DialogHeader className="nb-export-header">
        <span><Smartphone /></span>
        <div><DialogTitle>Levar o caderno para outro aplicativo</DialogTitle><DialogDescription>Escolha o formato conforme o que deseja preservar: escrita, edição ou aparência completa.</DialogDescription></div>
      </DialogHeader>
      <div className="nb-export-samsung-note"><Check /><span><strong>Compatibilidade com Samsung Notes</strong>O PDF é importado como páginas e continua disponível para texto, desenho e anotações com S Pen. A orientação gerada é A4 vertical.</span></div>
      <div className="nb-export-grid">
        {options.map((option) => {
          const Icon = option.icon;
          const active = exporting === option.id;
          return <button key={option.id} type="button" disabled={Boolean(exporting)} onClick={() => onExport(option.id)}>
            <span><Icon /></span><div>{option.badge && <small>{option.badge}</small>}<strong>{option.title}</strong><p>{option.description}</p></div>{active ? <Loader2 className="animate-spin" /> : <span className="arrow">→</span>}
          </button>;
        })}
      </div>
      <footer>O formato proprietário <strong>.sdocx</strong> não é gerado fora do Samsung Notes. Por isso, a opção Samsung utiliza PDF, formato oficialmente aceito pelo aplicativo.</footer>
    </DialogContent>
  </Dialog>;
}
