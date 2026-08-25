import { useMemo, useState, type CSSProperties } from "react";
import {
  Activity, ArrowRight, BookOpenCheck, Check, CheckCircle2, ChevronRight, ClipboardList,
  FileHeart, HeartPulse, Info, Lightbulb, ListChecks, LockKeyhole, MessageCircleHeart,
  RotateCcw, Search, ShieldCheck, Sparkles, Stethoscope, Target, TriangleAlert,
} from "lucide-react";
import { toast } from "sonner";
import { medicalSources, type MedicineLevel } from "@/lib/medicineData";
import {
  semiologyModules, semiologyTechniques, semiologyTerms, semiologyVitalChecks,
  type SemiologyModule,
} from "@/lib/semiologyCurriculum";

type AcademyTab = "trail" | "lab" | "glossary" | "record";
type Destination = "anamnesis" | "clinic" | "notebook";

const phases = ["Fundamentos", "Coleta clínica", "Integração", "Prática segura"] as const;
const abdomenOrder = ["inspection", "auscultation", "percussion", "palpation"];
const systems = [
  ["Cardiovascular", "Perfusão, pulsos, precórdio e sons cardíacos no contexto clínico."],
  ["Respiratório", "Padrão respiratório, expansibilidade, percussão e ausculta comparativa."],
  ["Abdominal", "Inspeção, ausculta antes da manipulação, percussão e palpação progressiva."],
  ["Neurológico", "Estado mental, nervos cranianos, força, sensibilidade, reflexos e coordenação."],
  ["Cabeça e pescoço", "Olhos, ouvidos, nariz, boca, orofaringe, pescoço e linfonodos."],
  ["Musculoesquelético", "Postura, marcha, amplitude, força, articulações e funcionalidade."],
] as const;

const levelMessage: Record<MedicineLevel, string> = {
  Iniciante: "Comece pela conversa, descrição objetiva e técnica segura.",
  "Ciclo básico": "Conecte anatomia e fisiologia aos achados do exame.",
  "Ciclo clínico": "Transforme achados em problemas e hipóteses testáveis.",
  Internato: "Treine síntese, priorização, documentação e reavaliação.",
  Residência: "Revise comunicação, segurança e decisões sob incerteza.",
};

function loadCompleted() {
  try {
    const parsed = JSON.parse(localStorage.getItem("flora.medicine.semiology.completed") ?? "[]");
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === "string") : [];
  } catch {
    return [];
  }
}

function sourceTitle(id: string) {
  return medicalSources[id]?.title ?? id;
}

export function SemiologyAcademy({ level, onNavigate, onLearningEvent }: {
  level: MedicineLevel;
  onNavigate: (destination: Destination) => void;
  onLearningEvent?: (event: { id: string; label: string; correct: boolean }) => void;
}) {
  const [tab, setTab] = useState<AcademyTab>("trail");
  const [completed, setCompleted] = useState<string[]>(loadCompleted);
  const [activeId, setActiveId] = useState(() => semiologyModules.find((module) => !completed.includes(module.id))?.id ?? semiologyModules[0].id);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [termQuery, setTermQuery] = useState("");
  const [techniqueOrder, setTechniqueOrder] = useState<string[]>([]);
  const [soap, setSoap] = useState({ subjective: "", objective: "", assessment: "", plan: "" });
  const [recordReviewed, setRecordReviewed] = useState(false);

  const activeModule = semiologyModules.find((module) => module.id === activeId) ?? semiologyModules[0];
  const progress = Math.round((completed.length / semiologyModules.length) * 100);
  const filteredTerms = useMemo(() => {
    const normalized = termQuery.trim().toLocaleLowerCase("pt-BR");
    if (!normalized) return semiologyTerms;
    return semiologyTerms.filter(([term, definition]) => `${term} ${definition}`.toLocaleLowerCase("pt-BR").includes(normalized));
  }, [termQuery]);

  const persistCompletion = (next: string[]) => {
    const unique = Array.from(new Set(next));
    setCompleted(unique);
    try { localStorage.setItem("flora.medicine.semiology.completed", JSON.stringify(unique)); } catch { /* progresso local opcional */ }
  };

  const answerModule = (module: SemiologyModule, option: number) => {
    setAnswers((current) => ({ ...current, [module.id]: option }));
    onLearningEvent?.({ id: `semiology:${module.id}`, label: module.title, correct: option === module.question.answer });
    if (option === module.question.answer && !completed.includes(module.id)) {
      persistCompletion([...completed, module.id]);
      toast.success("Módulo concluído", { description: "O progresso foi registrado na sua trilha médica." });
    }
  };

  const openModule = (id: string) => {
    setActiveId(id);
    setTab("trail");
    window.requestAnimationFrame(() => document.querySelector(".sem-module-detail")?.scrollIntoView({ behavior: "smooth", block: "start" }));
  };

  const chooseTechnique = (id: string) => {
    if (techniqueOrder.includes(id) || techniqueOrder.length >= abdomenOrder.length) return;
    setTechniqueOrder((current) => [...current, id]);
  };

  const techniqueCorrect = techniqueOrder.length === abdomenOrder.length && techniqueOrder.every((id, index) => id === abdomenOrder[index]);
  const soapComplete = Object.values(soap).every((value) => value.trim().length >= 20);

  return <div className="sem-academy">
    <section className="sem-hero">
      <div className="sem-hero-copy">
        <span className="sem-eyebrow"><ShieldCheck /> Trilha inicial · prática segura</span>
        <h1>Semiologia: do primeiro contato ao raciocínio clínico</h1>
        <p>{levelMessage[level]} Uma jornada guiada para aprender a conversar, observar, examinar, registrar e só então integrar os achados.</p>
        <div className="sem-hero-actions">
          <button onClick={() => openModule(semiologyModules.find((module) => !completed.includes(module.id))?.id ?? semiologyModules[0].id)}><BookOpenCheck /> {progress ? "Continuar trilha" : "Começar do início"}</button>
          <button className="secondary" onClick={() => onNavigate("anamnesis")}><FileHeart /> Treinar anamnese</button>
        </div>
      </div>
      <div className="sem-progress-card" aria-label={`${progress}% da trilha concluída`}>
        <div className="sem-progress-ring" style={{ "--sem-progress": `${progress * 3.6}deg` } as CSSProperties}><span><strong>{progress}%</strong><small>concluído</small></span></div>
        <div><strong>{completed.length} de {semiologyModules.length} módulos</strong><span>{progress === 100 ? "Base concluída. Continue praticando em casos simulados." : "Seu próximo módulo fica destacado na trilha."}</span></div>
      </div>
    </section>

    <nav className="sem-tabs" aria-label="Áreas da academia">
      <button className={tab === "trail" ? "active" : ""} onClick={() => setTab("trail")}><BookOpenCheck /> Trilha</button>
      <button className={tab === "lab" ? "active" : ""} onClick={() => setTab("lab")}><Stethoscope /> Laboratório</button>
      <button className={tab === "glossary" ? "active" : ""} onClick={() => setTab("glossary")}><Search /> Glossário</button>
      <button className={tab === "record" ? "active" : ""} onClick={() => setTab("record")}><ClipboardList /> Prontuário SOAP</button>
    </nav>

    {tab === "trail" && <div className="sem-trail-layout">
      <aside className="sem-roadmap">
        <div className="sem-panel-heading"><div><span>PROGRESSÃO</span><h2>12 módulos essenciais</h2></div><strong>{completed.length}/{semiologyModules.length}</strong></div>
        {phases.map((phase) => <div className="sem-phase" key={phase}>
          <h3>{phase}</h3>
          {semiologyModules.filter((module) => module.phase === phase).map((module) => {
            const done = completed.includes(module.id);
            const active = activeId === module.id;
            return <button key={module.id} className={`${active ? "active" : ""} ${done ? "done" : ""}`} onClick={() => setActiveId(module.id)}>
              <span className="sem-module-number">{done ? <Check /> : module.number}</span>
              <span><strong>{module.title}</strong><small>{module.duration} · {module.subtitle}</small></span>
              <ChevronRight />
            </button>;
          })}
        </div>)}
      </aside>

      <article className="sem-module-detail">
        <header>
          <div><span className="sem-module-kicker">MÓDULO {String(activeModule.number).padStart(2, "0")} · {activeModule.phase}</span><h2>{activeModule.title}</h2><p>{activeModule.subtitle}</p></div>
          <span className={`sem-status ${completed.includes(activeModule.id) ? "done" : ""}`}>{completed.includes(activeModule.id) ? <><CheckCircle2 /> Concluído</> : <><Activity /> Em estudo</>}</span>
        </header>

        <section className="sem-goals"><span><Target /> Ao terminar, você consegue</span><ul>{activeModule.goals.map((goal) => <li key={goal}><Check /> {goal}</li>)}</ul></section>
        <div className="sem-concept-grid">{activeModule.concepts.map((concept, index) => <section key={concept.title}><span>{String(index + 1).padStart(2, "0")}</span><h3>{concept.title}</h3><p>{concept.text}</p></section>)}</div>
        <div className="sem-callouts">
          <div><Lightbulb /><span><strong>Pérola clínica</strong>{activeModule.pearl}</span></div>
          <div className="warning"><TriangleAlert /><span><strong>Limite de segurança</strong>{activeModule.warning}</span></div>
        </div>

        <section className="sem-checkpoint">
          <div className="sem-panel-heading"><div><span>CHECAGEM ATIVA</span><h2>Antes de avançar</h2></div><Sparkles /></div>
          <p>{activeModule.question.prompt}</p>
          <div className="sem-options">{activeModule.question.options.map((option, index) => {
            const answered = answers[activeModule.id];
            const selected = answered === index;
            const correct = index === activeModule.question.answer;
            const state = answered === undefined ? "" : selected ? (correct ? "correct" : "wrong") : correct ? "reveal" : "";
            return <button key={option} className={state} onClick={() => answerModule(activeModule, index)} disabled={answered !== undefined}>
              <span>{String.fromCharCode(65 + index)}</span>{option}{state === "correct" || state === "reveal" ? <Check /> : null}
            </button>;
          })}</div>
          {answers[activeModule.id] !== undefined && <div className={`sem-feedback ${answers[activeModule.id] === activeModule.question.answer ? "correct" : "wrong"}`}><Info /><span><strong>{answers[activeModule.id] === activeModule.question.answer ? "Boa leitura." : "Revise o raciocínio."}</strong>{activeModule.question.explanation}</span></div>}
        </section>

        <footer className="sem-module-footer">
          <div><span>Fontes deste módulo</span>{activeModule.sourceIds.map((id) => <a key={id} href={medicalSources[id]?.url} target="_blank" rel="noreferrer">{sourceTitle(id)}</a>)}</div>
          <button onClick={() => {
            const next = semiologyModules[(activeModule.number) % semiologyModules.length];
            setActiveId(next.id);
            window.scrollTo({ top: 0, behavior: "smooth" });
          }}>Próximo módulo <ArrowRight /></button>
        </footer>
      </article>
    </div>}

    {tab === "lab" && <div className="sem-lab">
      <section className="sem-lab-intro"><span className="sem-eyebrow"><Stethoscope /> Laboratório guiado</span><h2>Treine a sequência antes de examinar alguém</h2><p>Exercícios educacionais de preparação. A técnica prática deve ser ensinada e supervisionada presencialmente.</p></section>
      <div className="sem-lab-grid">
        <section className="sem-technique-lab">
          <div className="sem-panel-heading"><div><span>DESAFIO 01</span><h2>Exame abdominal</h2></div><button aria-label="Reiniciar sequência" onClick={() => setTechniqueOrder([])}><RotateCcw /></button></div>
          <p>Selecione as quatro técnicas na ordem apropriada para o exame abdominal básico.</p>
          <div className="sem-technique-stage">{[0, 1, 2, 3].map((index) => {
            const technique = semiologyTechniques.find((item) => item.id === techniqueOrder[index]);
            return <div key={index} className={technique ? "filled" : ""}><span>{index + 1}</span><strong>{technique?.name ?? "Escolha uma técnica"}</strong></div>;
          })}</div>
          <div className="sem-technique-bank">{semiologyTechniques.map((technique) => <button key={technique.id} disabled={techniqueOrder.includes(technique.id)} onClick={() => chooseTechnique(technique.id)} style={{ "--tech-color": technique.color } as CSSProperties}><span /> <strong>{technique.name}</strong><small>{technique.description}</small></button>)}</div>
          {techniqueOrder.length === 4 && <div className={`sem-feedback ${techniqueCorrect ? "correct" : "wrong"}`}><Info /><span><strong>{techniqueCorrect ? "Sequência correta." : "A sequência precisa ser revista."}</strong>No abdome, a ausculta antecede percussão e palpação para reduzir a chance de alterar os sons intestinais.</span></div>}
        </section>

        <section className="sem-vitals-lab">
          <div className="sem-panel-heading"><div><span>DESAFIO 02</span><h2>Sinais vitais sem atalhos</h2></div><HeartPulse /></div>
          <p>O número só ganha sentido quando técnica, contexto e tendência são conferidos.</p>
          <div>{semiologyVitalChecks.map((check) => <details key={check.id}><summary><span><Activity /></span><strong>{check.label}</strong><ChevronRight /></summary><p><b>Preparar:</b> {check.equipment}</p><p><b>Conferir:</b> {check.verify}</p></details>)}</div>
        </section>
      </div>

      <section className="sem-systems-lab"><div className="sem-panel-heading"><div><span>MAPA DO EXAME</span><h2>Exame físico por sistemas</h2></div><ListChecks /></div><div>{systems.map(([name, description]) => <article key={name}><span><Check /></span><h3>{name}</h3><p>{description}</p></article>)}</div></section>
      <section className="sem-reasoning-flow"><div><span>01</span><strong>Coletar</strong><small>História e exame</small></div><ArrowRight /><div><span>02</span><strong>Representar</strong><small>Síntese objetiva</small></div><ArrowRight /><div><span>03</span><strong>Priorizar</strong><small>Problemas e riscos</small></div><ArrowRight /><div><span>04</span><strong>Testar</strong><small>Hipóteses e dados</small></div><ArrowRight /><div><span>05</span><strong>Reavaliar</strong><small>Resposta e incerteza</small></div></section>
    </div>}

    {tab === "glossary" && <section className="sem-glossary">
      <header><div><span className="sem-eyebrow"><Search /> Terminologia médica</span><h2>Entenda o termo; não apenas decore</h2><p>Busque pela palavra ou pelo significado. Termos descrevem achados — não substituem investigação clínica.</p></div><label><Search /><input value={termQuery} onChange={(event) => setTermQuery(event.target.value)} placeholder="Ex.: falta de ar, edema, disfagia…" /></label></header>
      <div className="sem-term-grid">{filteredTerms.map(([term, definition]) => <article key={term}><span>{term.slice(0, 1)}</span><div><h3>{term}</h3><p>{definition}.</p></div></article>)}</div>
      {!filteredTerms.length && <div className="sem-empty"><Search /><strong>Nenhum termo encontrado</strong><span>Tente outra palavra ou parte da definição.</span></div>}
    </section>}

    {tab === "record" && <section className="sem-record">
      <header><div><span className="sem-eyebrow"><ClipboardList /> Oficina de registro</span><h2>Prontuário e evolução em SOAP</h2><p>Organize o raciocínio sem misturar relato, achado, avaliação e plano.</p></div><div className="sem-privacy"><LockKeyhole /><span><strong>Somente caso fictício</strong>Não insira dados de pacientes reais.</span></div></header>
      <div className="sem-record-layout">
        <aside><span>CASO SIMULADO</span><h3>“Cansaço para subir escadas”</h3><p>Marina, 29 anos, refere cansaço progressivo há três semanas e menstruação mais intensa nos últimos meses. Nega dor torácica. Está alerta, fala frases completas e apresenta palidez cutaneomucosa. FC 104 bpm, PA 108/68 mmHg, FR 18 irpm, SpO₂ 98% em ar ambiente.</p><div><Info /><span>O objetivo não é fechar um diagnóstico, mas separar os dados e construir um registro claro.</span></div></aside>
        <div className="sem-soap-form">
          {([
            ["subjective", "S · Subjetivo", "O que foi relatado pela pessoa, incluindo sintomas e contexto"],
            ["objective", "O · Objetivo", "O que foi observado ou medido no exame"],
            ["assessment", "A · Avaliação", "Problemas, síntese e hipóteses com grau de incerteza"],
            ["plan", "P · Plano", "Próximos passos, segurança, orientação e reavaliação"],
          ] as const).map(([key, label, placeholder]) => <label key={key}><span>{label}</span><textarea value={soap[key]} onChange={(event) => { setSoap((current) => ({ ...current, [key]: event.target.value })); setRecordReviewed(false); }} placeholder={placeholder} /></label>)}
          <button disabled={!soapComplete} onClick={() => setRecordReviewed(true)}><ClipboardList /> Revisar meu registro</button>
          {!soapComplete && <small>Escreva ao menos 20 caracteres em cada bloco para liberar a revisão.</small>}
        </div>
      </div>
      {recordReviewed && <div className="sem-record-review"><CheckCircle2 /><div><strong>Estrutura completa para revisão.</strong><p>Agora confira: o relato ficou em S? As medidas estão em O? A avaliação evita certeza indevida? O plano informa próximos passos e reavaliação? Um registro completo também precisa de data, hora, identificação e requisitos institucionais aplicáveis.</p></div></div>}
    </section>}

    <section className="sem-next-step">
      <div><span className="sem-eyebrow"><MessageCircleHeart /> Transforme teoria em encontro clínico</span><h2>Pronto para conversar com um paciente simulado?</h2><p>A Anamnese usa perguntas, reações e decisões. A Clínica integra história, exame e raciocínio em casos progressivos.</p></div>
      <div><button onClick={() => onNavigate("anamnesis")}><FileHeart /> Abrir Anamnese <ArrowRight /></button><button onClick={() => onNavigate("clinic")}><Stethoscope /> Abrir casos clínicos</button><button onClick={() => onNavigate("notebook")}><ClipboardList /> Registrar no Caderno</button></div>
    </section>
  </div>;
}
