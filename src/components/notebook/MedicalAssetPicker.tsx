import { useMemo, useState } from "react";
import { Images, Layers, Search, ShieldCheck } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { notebookMedicalAssets, type MedicalAssetCategory, type NotebookMedicalAsset } from "@/lib/notebookMedicalAssets";
import "./notebook-premium.css";

interface MedicalAssetPickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onInsert: (asset: NotebookMedicalAsset, mode: "cutout" | "study") => void;
}

const categories: Array<"Todas" | MedicalAssetCategory> = ["Todas", "Camadas", "Órgãos", "Sistemas", "Patologia", "Desenvolvimento"];

export function MedicalAssetPicker({ open, onOpenChange, onInsert }: MedicalAssetPickerProps) {
  const [category, setCategory] = useState<(typeof categories)[number]>("Todas");
  const [query, setQuery] = useState("");
  const [insertMode, setInsertMode] = useState<"cutout" | "study">("cutout");
  const categoryCounts = useMemo(() => Object.fromEntries(categories.map((item) => [
    item,
    item === "Todas" ? notebookMedicalAssets.length : notebookMedicalAssets.filter((asset) => asset.category === item).length,
  ])), []);
  const filtered = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase("pt-BR");
    return notebookMedicalAssets.filter((asset) => {
      if (category !== "Todas" && asset.category !== category) return false;
      return !normalizedQuery || `${asset.label} ${asset.description}`.toLocaleLowerCase("pt-BR").includes(normalizedQuery);
    });
  }, [category, query]);

  return <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="nb-medical-picker max-w-5xl overflow-hidden p-0">
      <DialogHeader className="nb-medical-picker-header">
        <span><Images /></span>
        <div><DialogTitle>Biblioteca anatômica</DialogTitle><DialogDescription>Insira órgãos isolados, camadas, sistemas, desenvolvimento ou comparações patológicas e desenhe setas, rótulos e relações sobre a figura.</DialogDescription></div>
      </DialogHeader>

      <div className="nb-medical-picker-controls">
        <label><Search /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar órgão, sistema, alteração ou fase…" autoFocus /></label>
        <div>{categories.map((item) => <button key={item} type="button" className={category === item ? "active" : ""} onClick={() => setCategory(item)}>{item}<span>{categoryCounts[item]}</span></button>)}</div>
        <div className="nb-medical-insert-modes" role="group" aria-label="Modo de inserção"><button type="button" className={insertMode === "cutout" ? "active" : ""} onClick={() => setInsertMode("cutout")}><Layers />Figura livre</button><button type="button" className={insertMode === "study" ? "active" : ""} onClick={() => setInsertMode("study")}>Figura + ficha</button></div>
      </div>

      <div className="nb-medical-assets-grid">
        {filtered.map((asset) => <button key={asset.id} type="button" onClick={() => { onInsert(asset, insertMode); onOpenChange(false); }}>
          <span className={asset.transparent ? "transparent" : "scene"}><img src={asset.src} alt="" loading="lazy" />{asset.transparent && <i>PNG SEM FUNDO</i>}</span>
          <div><small>{asset.category}{asset.orientation ? ` · ${asset.orientation}` : ""}</small><strong>{asset.label}</strong><p>{asset.description}</p></div>
        </button>)}
        {filtered.length === 0 && <div className="nb-medical-assets-empty"><Search /><strong>Nenhuma imagem encontrada</strong><p>Tente um termo mais amplo ou escolha outra categoria.</p></div>}
      </div>

      <footer><ShieldCheck /><span>Ilustrações educacionais do Atlas Flora. Confirme detalhes anatômicos nas fontes indicadas pela área Medicina; não use para diagnóstico.</span></footer>
    </DialogContent>
  </Dialog>;
}
