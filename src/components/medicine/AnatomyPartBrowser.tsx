import { useMemo, useState } from "react";
import { Activity, ArrowUpRight, Bone, Box, HeartPulse, Search, X } from "lucide-react";
import { anatomyPartLibrary, type AnatomyPartGroup } from "@/lib/anatomyPartLibrary";
import { anatomyCandidateStatus, anatomyModelSelection, matchesAnatomyQuery, type AnatomyPresentation } from "@/lib/anatomyModelSelection";
import "./anatomy-part-library.css";
import { anatomySpecimens } from "@/lib/anatomySpecimens";

export function AnatomyPartBrowser({ activeId, onOpen, onClose, onOpenSpecimen }: {
  activeId: string | null; onOpen: (id: string) => void; onClose: () => void; onOpenSpecimen?: (id: string) => void;
}) {
  const [group, setGroup] = useState<AnatomyPartGroup | "Todas">("Todas");
  const [query, setQuery] = useState("");
  const [presentation, setPresentation] = useState<AnatomyPresentation | "Todas">("Todas");
  const results = useMemo(() => {
    // Existing segmented models are didactic references, not photographic specimens.
    if (presentation === "Realistas") return [];
    return anatomyPartLibrary.filter((part) => (group === "Todas" || part.group === group)
      && matchesAnatomyQuery(`${part.label} ${part.studyTargets.join(" ")}`, query));
  }, [group, query, presentation]);
  const specimens = anatomySpecimens.filter((part) => presentation !== "Didáticos" && (group === "Todas" || group === "Órgãos") && matchesAnatomyQuery(`${part.label} ${part.description}`, query));
  const availableCount = results.length + specimens.length;
  const candidates = anatomyModelSelection.filter((part) => part.status !== "integrated" && part.id !== "witmerlab-skull" && (presentation === "Todas" || part.presentation === presentation)
    && (group === "Todas" || part.group === group)
    && matchesAnatomyQuery(`${part.label} ${part.author} ${part.description}`, query));
  const clearFilters = () => { setQuery(""); setGroup("Todas"); setPresentation("Todas"); };
  return <section className="med-3d-part-library" aria-label="Biblioteca de peças 3D">
    <header><div><span>ACERVO ANATÔMICO · FLORA</span><h2>Do corpo à peça.</h2><p>Abra uma estrutura isolada, explore seus detalhes e volte ao sistema.</p></div>
      <button type="button" onClick={onClose} aria-label="Fechar biblioteca de peças"><X /></button></header>
    <div className="med-3d-presentation-filter" role="group" aria-label="Tipo de representação">
      {(["Todas", "Realistas", "Didáticos"] as const).map((item) => <button type="button" key={item} aria-pressed={presentation === item} onClick={() => setPresentation(item)}>{item}</button>)}
      <p>{presentation === "Realistas" ? "Texturas orgânicas e superfície externa. A anatomia interna permanece nas peças didáticas; referências pendentes aparecem separadamente." : "Atlas preservado: combine sistemas ou explore uma peça realista ou didática."}</p>
    </div>
    <div className="med-3d-part-library-tools">
      <div role="group" aria-label="Filtrar peças por sistema">{(["Todas", "Órgãos", "Ossos e articulações", "Músculos"] as const).map((item) =>
        <button key={item} type="button" aria-pressed={group === item} onClick={() => setGroup(item)}>{item}</button>)}</div>
      <label><Search /><input aria-label="Buscar peça anatômica" placeholder="Crânio, mão, pâncreas…" value={query} onChange={(event) => setQuery(event.target.value)} /></label>
    </div>
    <h3 className="med-3d-library-section-title">Disponíveis no Flora <span>{availableCount}</span></h3>
    <div className="med-3d-part-grid">
      {specimens.map((part) => <button key={part.id} type="button" className="med-3d-part-card organs" disabled={!onOpenSpecimen} onClick={() => onOpenSpecimen?.(part.id)} aria-label={`Abrir modelo realista: ${part.label}`}><span className="med-3d-part-icon"><HeartPulse /></span><span className="med-3d-part-copy"><small>Realista · texturas 2K</small><strong>{part.label}</strong><span>Superfície externa · {part.author}</span></span><ArrowUpRight /></button>)}
      {results.map((part) => {
        const Icon = part.layer === "organs" ? HeartPulse : part.layer === "skeletal" ? Bone : Activity;
        return <button key={part.id} type="button" className={`med-3d-part-card ${part.layer}`} aria-pressed={activeId === part.id} onClick={() => onOpen(part.id)} aria-label={`Abrir peça: ${part.label}`}>
          <span className="med-3d-part-icon"><Icon /></span><span className="med-3d-part-copy"><small>{part.sourceLabel}</small><strong>{part.label}</strong><span>{part.studyTargets.slice(0, 2).join(" · ")}</span></span><ArrowUpRight />
        </button>;
      })}
      {!availableCount && <div className="med-3d-part-empty"><Search /><p>Nenhuma peça encontrada com estes filtros.</p><button type="button" onClick={clearFilters}>Limpar filtros</button></div>}
    </div>
    {!!candidates.length && <details className="med-3d-candidate-selection" key={presentation} open={presentation === "Realistas"}>
      <summary>Seleção para integrar · {candidates.length} {candidates.length === 1 ? "referência externa" : "referências externas"}</summary>
      <p>Estes modelos não estão disponíveis no atlas. As páginas dos autores abrem em outra aba; nenhum visualizador externo carrega automaticamente.</p>
      <div className="med-3d-candidate-grid">{candidates.map((part) => <article key={part.id} className="med-3d-candidate-card">
        <small>{part.presentation} · {part.group}</small><h3>{part.label}</h3><p>{part.description}</p>
        <span className="med-3d-candidate-status">{anatomyCandidateStatus[part.status]}</span>
        <p>{part.limitation}</p><small>{part.author} · {part.license}</small>
        <a href={part.url} target="_blank" rel="noopener noreferrer" aria-label={`Ver referência externa: ${part.label}`}>Ver na fonte <ArrowUpRight size={15} /></a>
      </article>)}</div>
    </details>}
    <footer><Box /><span>{availableCount} {availableCount === 1 ? "peça disponível" : "peças disponíveis"} neste filtro · Modelos texturizados, peças dedicadas e recortes do atlas são identificados separadamente. Modelos artísticos não são fotografias de dissecação.</span></footer>
  </section>;
}
