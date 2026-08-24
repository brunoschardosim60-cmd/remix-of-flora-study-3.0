import { useEffect, useMemo, useState, type CSSProperties } from "react";
import {
  Activity, ArrowRight, Bone, Check, CircleDot, Droplets, Ear, Eye, ExternalLink, Flashlight,
  Gauge, Hammer, HeartPulse, Microscope, Pipette, Radio, Ruler, ScanLine, Scissors, Search,
  ShieldCheck, Sparkles, Stethoscope, Syringe, TestTube2, Thermometer, Wrench, Wind, X, Zap,
  type LucideIcon,
} from "lucide-react";
import {
  instrumentQuizOptions, medicalInstrumentCategories, medicalInstruments,
  type MedicalInstrument, type MedicalInstrumentCategory, type MedicalInstrumentIcon,
} from "@/lib/medicalInstruments";
import { medicalSources, type MedicineLevel } from "@/lib/medicineData";

const iconMap: Record<MedicalInstrumentIcon, LucideIcon> = {
  stethoscope: Stethoscope,
  activity: Activity,
  thermometer: Thermometer,
  eye: Eye,
  ear: Ear,
  syringe: Syringe,
  scissors: Scissors,
  heart: HeartPulse,
  microscope: Microscope,
  tool: Wrench,
  wind: Wind,
  droplet: Droplets,
  test: TestTube2,
  scan: ScanLine,
  gauge: Gauge,
  flashlight: Flashlight,
  hammer: Hammer,
  bone: Bone,
  zap: Zap,
  pipette: Pipette,
  ruler: Ruler,
  weight: Gauge,
  radio: Radio,
};

const levelOrder: MedicineLevel[] = ["Iniciante", "Ciclo básico", "Ciclo clínico", "Internato", "Residência"];

function normalized(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR");
}

function InstrumentGlyph({ instrument, concealed = false }: { instrument: MedicalInstrument; concealed?: boolean }) {
  const Icon = iconMap[instrument.icon];
  const category = medicalInstrumentCategories.find((item) => item.id === instrument.category)!;
  return <div className={`med-instrument-glyph ${instrument.image ? "photographic" : ""} ${concealed ? "concealed" : ""}`} style={{ "--instrument": category.color } as CSSProperties}>
    {instrument.image ? <img src={instrument.image} alt={concealed ? "Instrumento oculto para o desafio" : `Render educacional de ${instrument.name}`} loading="lazy" /> : <><div className="med-instrument-grid" /><i /><Icon /></>}
    <span>{concealed ? "?" : instrument.image ? "HD" : instrument.name.charAt(0)}</span>
  </div>;
}

export function InstrumentsStudio({ level }: { level: MedicineLevel }) {
  const [mode, setMode] = useState<"catalog" | "quiz">("catalog");
  const [category, setCategory] = useState<MedicalInstrumentCategory | "Todos">("Todos");
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState(medicalInstruments[0].id);
  const [quizIndex, setQuizIndex] = useState(0);
  const [quizAnswer, setQuizAnswer] = useState<string | null>(null);
  const [quizScore, setQuizScore] = useState(0);
  const [quizStreak, setQuizStreak] = useState(0);
  const [reviewIds, setReviewIds] = useState<string[]>([]);

  const filtered = useMemo(() => {
    const needle = normalized(query.trim());
    return medicalInstruments.filter((item) => {
      const inCategory = category === "Todos" || item.category === category;
      const searchable = normalized([item.name, ...item.aliases, item.summary, item.function].join(" "));
      return inCategory && (!needle || searchable.includes(needle));
    });
  }, [category, query]);

  useEffect(() => {
    if (filtered.length && !filtered.some((item) => item.id === selectedId)) setSelectedId(filtered[0].id);
  }, [filtered, selectedId]);

  const selected = medicalInstruments.find((item) => item.id === selectedId) ?? medicalInstruments[0];
  const selectedCategory = medicalInstrumentCategories.find((item) => item.id === selected.category)!;
  const quizInstrument = medicalInstruments[quizIndex % medicalInstruments.length];
  const quizOptions = useMemo(() => instrumentQuizOptions(quizIndex), [quizIndex]);
  const correct = quizAnswer === quizInstrument.id;
  const promptKind = quizIndex % 2 === 0 ? "function" : "recognition";
  const levelRank = levelOrder.indexOf(level);
  const learnedAtLevel = medicalInstruments.filter((item) => levelOrder.indexOf(item.level) <= levelRank).length;

  const answerQuiz = (id: string) => {
    if (quizAnswer) return;
    setQuizAnswer(id);
    if (id === quizInstrument.id) {
      setQuizScore((value) => value + 1);
      setQuizStreak((value) => value + 1);
      setReviewIds((ids) => ids.filter((item) => item !== quizInstrument.id));
    } else {
      setQuizStreak(0);
      setReviewIds((ids) => Array.from(new Set([...ids, quizInstrument.id])));
    }
  };

  const nextQuiz = () => {
    setQuizIndex((value) => value + 1);
    setQuizAnswer(null);
  };

  return <div className="med-page med-instruments-page">
    <div className="med-page-heading"><span className="med-eyebrow">LABORATÓRIO VISUAL · {level}</span><h1>Instrumentos médicos</h1><p>Aprenda a reconhecer cada instrumento, entenda o que ele faz e depois teste sua memória sem ver o nome.</p></div>

    <section className="med-instrument-hero">
      <div><span className="med-eyebrow">DO BOLSO AO CENTRO CIRÚRGICO</span><h2>{medicalInstruments.length} instrumentos.<br/><em>Uma função por vez.</em></h2><p>O formato ajuda a reconhecer; a função ajuda a escolher. O uso real exige treinamento, indicação e protocolo.</p><div><button className={mode === "catalog" ? "active" : ""} onClick={() => setMode("catalog")}><Search /> Explorar catálogo</button><button className={mode === "quiz" ? "active" : ""} onClick={() => setMode("quiz")}><Sparkles /> Tentar adivinhar</button></div></div>
      <div className="med-instrument-hero-stats"><article><strong>{medicalInstruments.length}</strong><span>instrumentos descritos</span></article><article><strong>{learnedAtLevel}</strong><span>adequados ao seu nível</span></article><article><strong>{reviewIds.length}</strong><span>para revisar no quiz</span></article><ShieldCheck/><small>Conteúdo educacional. Não ensina execução autônoma de procedimentos invasivos.</small></div>
    </section>

    {mode === "catalog" ? <>
      <section className="med-instrument-filters">
        <label><Search/><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar por nome, apelido ou função…"/><span>{filtered.length} resultados</span></label>
        <div><button className={category === "Todos" ? "active" : ""} onClick={() => setCategory("Todos")}>Todos</button>{medicalInstrumentCategories.map((item) => <button key={item.id} className={category === item.id ? "active" : ""} style={{ "--instrument": item.color } as CSSProperties} onClick={() => setCategory(item.id)}><i />{item.id}<span>{medicalInstruments.filter((instrument) => instrument.category === item.id).length}</span></button>)}</div>
      </section>

      <div className="med-instrument-workspace">
        <section className="med-instrument-grid-list">{filtered.length ? filtered.map((instrument) => {
          const itemCategory = medicalInstrumentCategories.find((item) => item.id === instrument.category)!;
          return <button key={instrument.id} className={instrument.id === selected.id ? "active" : ""} style={{ "--instrument": itemCategory.color } as CSSProperties} onClick={() => setSelectedId(instrument.id)}>
            <InstrumentGlyph instrument={instrument}/><div><small>{instrument.category} · {instrument.level}</small><strong>{instrument.name}</strong><p>{instrument.summary}</p></div><ArrowRight />
          </button>;
        }) : <div className="med-instrument-empty"><Search/><strong>Nenhum instrumento encontrado</strong><button onClick={() => { setQuery(""); setCategory("Todos"); }}>Limpar filtros</button></div>}</section>

        <article className="med-instrument-detail" style={{ "--instrument": selectedCategory.color } as CSSProperties}>
          <div className="med-instrument-detail-visual"><InstrumentGlyph instrument={selected}/><span>{selected.image ? "RENDER EDUCACIONAL EM ALTA DEFINIÇÃO · CONFIRA VARIAÇÕES NA FONTE" : "REPRESENTAÇÃO VETORIAL · IMAGEM DETALHADA EM PREPARAÇÃO"}</span></div>
          <div className="med-instrument-detail-copy"><span className="med-eyebrow">{selected.category} · {selected.level}</span><h2>{selected.name}</h2><p>{selected.function}</p>
            <section><h3>Como reconhecer</h3>{selected.recognition.map((clue) => <div key={clue}><CircleDot/><span>{clue}</span></div>)}</section>
            <aside><ShieldCheck/><div><strong>Cuidado essencial</strong><p>{selected.safety}</p></div></aside>
            <footer><div><small>TAMBÉM CHAMADO</small><strong>{selected.aliases.join(" · ")}</strong></div><a href={medicalSources[selected.sourceId].url} target="_blank" rel="noreferrer">Conferir fonte <ExternalLink/></a></footer>
          </div>
        </article>
      </div>
    </> : <section className="med-instrument-quiz">
      <header><div><span className="med-eyebrow">DESAFIO {String(quizIndex + 1).padStart(2, "0")}</span><h2>Que instrumento é este?</h2></div><div><span><strong>{quizScore}</strong> acertos</span><span><strong>{quizStreak}</strong> sequência</span><span><strong>{reviewIds.length}</strong> revisar</span></div></header>
      <div className="med-instrument-quiz-body">
        <div className="med-instrument-mystery"><InstrumentGlyph instrument={quizInstrument} concealed={promptKind === "function" && !quizAnswer}/><span>{quizInstrument.category}</span><strong>{promptKind === "function" ? "Descubra pela função" : quizInstrument.image ? "Observe a imagem e reconheça" : "Descubra pelo formato"}</strong></div>
        <article><span className="med-eyebrow">PISTA PRINCIPAL</span><h3>{promptKind === "function" ? quizInstrument.function : quizInstrument.recognition.join(" · ")}</h3><div className="med-instrument-quiz-options">{quizOptions.map((option, index) => {
          const state = !quizAnswer ? "" : option.id === quizInstrument.id ? "correct" : option.id === quizAnswer ? "wrong" : "muted";
          return <button key={option.id} className={state} onClick={() => answerQuiz(option.id)}><b>{String.fromCharCode(65 + index)}</b><span>{option.name}</span>{state === "correct" && <Check/>}{state === "wrong" && <X/>}</button>;
        })}</div>
        {quizAnswer && <div className={`med-instrument-quiz-feedback ${correct ? "correct" : "review"}`}><div>{correct ? <Check/> : <Sparkles/>}</div><section><small>{correct ? "ACERTOU" : "RESPOSTA CORRETA"}</small><h4>{quizInstrument.name}</h4><p>{quizInstrument.summary}</p><aside><ShieldCheck/>{quizInstrument.safety}</aside><a href={medicalSources[quizInstrument.sourceId].url} target="_blank" rel="noreferrer">Abrir fonte <ExternalLink/></a></section></div>}
        <footer><span>Questão {quizIndex + 1} · {quizInstrument.level}</span><button disabled={!quizAnswer} onClick={nextQuiz}>Próximo instrumento <ArrowRight/></button></footer></article>
      </div>
    </section>}
  </div>;
}
