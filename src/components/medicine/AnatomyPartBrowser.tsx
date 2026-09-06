import { useMemo, useState } from "react";
import { Activity, ArrowUpRight, Bone, Box, HeartPulse, Search, X } from "lucide-react";
import { anatomyPartLibrary, type AnatomyPartGroup } from "@/lib/anatomyPartLibrary";

export function AnatomyPartBrowser({ activeId, onOpen, onClose }: {
  activeId: string | null; onOpen: (id: string) => void; onClose: () => void;
}) {
  const [group, setGroup] = useState<AnatomyPartGroup | "Todas">("Todas");
  const [query, setQuery] = useState("");
  const results = useMemo(() => {
    const normalize = (text: string) => text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
    const term = normalize(query.trim());
    return anatomyPartLibrary.filter((part) => (group === "Todas" || part.group === group)
      && normalize(`${part.label} ${part.studyTargets.join(" ")}`).includes(term));
  }, [group, query]);
  return <section className="med-3d-part-library" aria-label="Biblioteca de peças 3D">
    <header><div><span>ACERVO ANATÔMICO · FLORA</span><h2>Do corpo à peça.</h2><p>Abra uma estrutura isolada, explore seus detalhes e volte ao sistema.</p></div>
      <button type="button" onClick={onClose} aria-label="Fechar biblioteca de peças"><X /></button></header>
    <div className="med-3d-part-library-tools">
      <div role="group" aria-label="Filtrar peças por sistema">{(["Todas", "Órgãos", "Ossos e articulações", "Músculos"] as const).map((item) =>
        <button key={item} type="button" aria-pressed={group === item} onClick={() => setGroup(item)}>{item}</button>)}</div>
      <label><Search /><input aria-label="Buscar peça anatômica" placeholder="Crânio, mão, pâncreas…" value={query} onChange={(event) => setQuery(event.target.value)} /></label>
    </div>
    <div className="med-3d-part-grid">
      {results.map((part) => {
        const Icon = part.layer === "organs" ? HeartPulse : part.layer === "skeletal" ? Bone : Activity;
        return <button key={part.id} type="button" className={`med-3d-part-card ${part.layer}`} aria-pressed={activeId === part.id} onClick={() => onOpen(part.id)} aria-label={`Abrir peça: ${part.label}`}>
          <span className="med-3d-part-icon"><Icon /></span><span className="med-3d-part-copy"><small>{part.sourceLabel}</small><strong>{part.label}</strong><span>{part.studyTargets.slice(0, 2).join(" · ")}</span></span><ArrowUpRight />
        </button>;
      })}
      {!results.length && <div className="med-3d-part-empty"><Search /><p>Nenhuma peça encontrada.</p><button type="button" onClick={() => { setQuery(""); setGroup("Todas"); }}>Limpar filtros</button></div>}
    </div>
    <footer><Box /><span>{results.length} peças disponíveis · Peças dedicadas e recortes das malhas existentes. As referências segmentadas não são fotografias de dissecação.</span></footer>
  </section>;
}
