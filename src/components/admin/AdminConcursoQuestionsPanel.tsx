import { useEffect, useMemo, useState } from "react";
import { Loader2, Plus, RefreshCcw, Save, Search, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { reportError } from "@/lib/errorHandling";
import { GenerateQuestionsDialog } from "./GenerateQuestionsDialog";

type Alternativa = { letra: string; texto: string };
type Tipo = "multipla_escolha" | "certo_errado";
type Nivel = "facil" | "medio" | "dificil";

type ConcursoQuestion = {
  id: string;
  banca: string;
  ano: number | null;
  orgao: string;
  cargo: string;
  disciplina: string;
  tema: string;
  tipo: Tipo;
  nivel: Nivel;
  enunciado: string;
  afirmativa: string;
  alternativas: Alternativa[];
  correta: string;
  explicacao: string;
  tags: string[];
  origem: string;
};

const BANCAS = ["CESPE/Cebraspe", "FCC", "FGV", "Vunesp", "IBFC", "Quadrix", "AOCP", "Outra"];
const DISCIPLINAS = ["Português", "Matemática", "Direito Constitucional", "Direito Administrativo", "Raciocínio Lógico", "Informática", "Atualidades", "Conhecimentos Gerais", "Outra"];
const NIVEIS: Nivel[] = ["facil", "medio", "dificil"];

function emptyDraft(): ConcursoQuestion {
  return {
    id: "",
    banca: "FGV",
    ano: new Date().getFullYear(),
    orgao: "",
    cargo: "",
    disciplina: "Português",
    tema: "",
    tipo: "multipla_escolha",
    nivel: "medio",
    enunciado: "",
    afirmativa: "",
    alternativas: [
      { letra: "A", texto: "" },
      { letra: "B", texto: "" },
      { letra: "C", texto: "" },
      { letra: "D", texto: "" },
    ],
    correta: "",
    explicacao: "",
    tags: [],
    origem: "manual",
  };
}

function normalizeAlts(raw: unknown): Alternativa[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((a: any, i: number) => ({
    letra: String(a?.letra ?? String.fromCharCode(65 + i)).toUpperCase(),
    texto: String(a?.texto ?? a?.text ?? ""),
  }));
}

export function AdminConcursoQuestionsPanel() {
  const [list, setList] = useState<ConcursoQuestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [filterBanca, setFilterBanca] = useState<string>("Todas");
  const [draft, setDraft] = useState<ConcursoQuestion | null>(null);
  const [tagInput, setTagInput] = useState("");

  async function load() {
    setLoading(true);
    try {
      let q = supabase
        .from("concurso_questions")
        .select("id,banca,ano,orgao,cargo,disciplina,tema,tipo,nivel,enunciado,afirmativa,alternativas,correta,explicacao,tags,origem")
        .order("created_at", { ascending: false })
        .limit(500);
      if (filterBanca !== "Todas") q = q.eq("banca", filterBanca);
      const { data, error } = await q;
      if (error) throw error;
      const next = (data ?? []).map((r: any) => ({
        id: r.id,
        banca: r.banca || "",
        ano: r.ano,
        orgao: r.orgao || "",
        cargo: r.cargo || "",
        disciplina: r.disciplina || "",
        tema: r.tema || "",
        tipo: (r.tipo as Tipo) || "multipla_escolha",
        nivel: (r.nivel as Nivel) || "medio",
        enunciado: r.enunciado || "",
        afirmativa: r.afirmativa || "",
        alternativas: normalizeAlts(r.alternativas),
        correta: r.correta || "",
        explicacao: r.explicacao || "",
        tags: Array.isArray(r.tags) ? r.tags : [],
        origem: r.origem || "manual",
      })) as ConcursoQuestion[];
      setList(next);
    } catch (e) {
      reportError("Erro ao carregar questões de concurso", e, { devOnly: true });
      toast.error("Erro ao carregar questões.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [filterBanca]);

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    if (!s) return list;
    return list.filter((q) =>
      q.enunciado.toLowerCase().includes(s) ||
      q.disciplina.toLowerCase().includes(s) ||
      q.tema.toLowerCase().includes(s) ||
      q.banca.toLowerCase().includes(s) ||
      (q.tags || []).some((t) => t.toLowerCase().includes(s))
    );
  }, [list, search]);

  function startNew() {
    setDraft(emptyDraft());
  }

  function pickToEdit(q: ConcursoQuestion) {
    setDraft(structuredClone(q));
  }

  function update<K extends keyof ConcursoQuestion>(k: K, v: ConcursoQuestion[K]) {
    if (!draft) return;
    setDraft({ ...draft, [k]: v });
  }

  function changeTipo(t: Tipo) {
    if (!draft) return;
    if (t === "certo_errado") {
      setDraft({ ...draft, tipo: t, alternativas: [], correta: draft.correta === "certo" || draft.correta === "errado" ? draft.correta : "" });
    } else {
      setDraft({
        ...draft,
        tipo: t,
        afirmativa: "",
        alternativas: draft.alternativas.length >= 2 ? draft.alternativas : [
          { letra: "A", texto: "" }, { letra: "B", texto: "" }, { letra: "C", texto: "" }, { letra: "D", texto: "" },
        ],
        correta: ["A", "B", "C", "D", "E"].includes(draft.correta) ? draft.correta : "",
      });
    }
  }

  function updateAlt(i: number, field: "letra" | "texto", v: string) {
    if (!draft) return;
    const next = [...draft.alternativas];
    next[i] = { ...next[i], [field]: field === "letra" ? v.toUpperCase().slice(0, 1) : v };
    setDraft({ ...draft, alternativas: next });
  }

  function addAlt() {
    if (!draft) return;
    const used = new Set(draft.alternativas.map((a) => a.letra));
    const next = ["A", "B", "C", "D", "E"].find((l) => !used.has(l)) || "";
    setDraft({ ...draft, alternativas: [...draft.alternativas, { letra: next, texto: "" }] });
  }

  function removeAlt(i: number) {
    if (!draft) return;
    setDraft({ ...draft, alternativas: draft.alternativas.filter((_, idx) => idx !== i) });
  }

  function addTag() {
    if (!draft || !tagInput.trim()) return;
    const t = tagInput.trim();
    if (draft.tags.includes(t)) { setTagInput(""); return; }
    setDraft({ ...draft, tags: [...draft.tags, t] });
    setTagInput("");
  }

  function removeTag(t: string) {
    if (!draft) return;
    setDraft({ ...draft, tags: draft.tags.filter((x) => x !== t) });
  }

  async function save() {
    if (!draft) return;
    if (!draft.banca || !draft.disciplina || !draft.enunciado.trim()) {
      toast.error("Preencha banca, disciplina e enunciado.");
      return;
    }
    if (draft.tipo === "multipla_escolha") {
      if (draft.alternativas.length < 2) { toast.error("Pelo menos 2 alternativas."); return; }
      if (!draft.correta) { toast.error("Selecione a alternativa correta."); return; }
      if (!draft.alternativas.find((a) => a.letra === draft.correta)) {
        toast.error(`Letra correta "${draft.correta}" não existe nas alternativas.`); return;
      }
    } else {
      if (!draft.afirmativa.trim()) { toast.error("Preencha a afirmativa para certo/errado."); return; }
      if (!["certo", "errado"].includes(draft.correta)) { toast.error("Marque se a afirmativa é certa ou errada."); return; }
    }

    setSaving(true);
    try {
      const payload = {
        banca: draft.banca,
        ano: draft.ano,
        orgao: draft.orgao,
        cargo: draft.cargo,
        disciplina: draft.disciplina,
        tema: draft.tema,
        tipo: draft.tipo,
        nivel: draft.nivel,
        enunciado: draft.enunciado,
        afirmativa: draft.afirmativa,
        alternativas: draft.alternativas as any,
        correta: draft.correta,
        explicacao: draft.explicacao,
        tags: draft.tags,
        origem: draft.origem || "manual",
      };

      if (draft.id) {
        const { error } = await supabase.from("concurso_questions").update(payload).eq("id", draft.id);
        if (error) throw error;
        toast.success("Questão atualizada.");
      } else {
        const { data: u } = await supabase.auth.getUser();
        const { data, error } = await supabase
          .from("concurso_questions")
          .insert({ ...payload, created_by: u?.user?.id ?? null })
          .select("id")
          .single();
        if (error) throw error;
        toast.success("Questão criada.");
        setDraft({ ...draft, id: data!.id });
      }
      await load();
    } catch (e: any) {
      reportError("Erro ao salvar concurso_question", e, { devOnly: true });
      toast.error(e?.message || "Erro ao salvar.");
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!draft?.id) return;
    if (!window.confirm("Excluir esta questão?")) return;
    try {
      const { error } = await supabase.from("concurso_questions").delete().eq("id", draft.id);
      if (error) throw error;
      toast.success("Questão excluída.");
      setDraft(null);
      await load();
    } catch (e: any) {
      toast.error(e?.message || "Erro ao excluir.");
    }
  }

  return (
    <Card className="p-4">
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Select value={filterBanca} onValueChange={setFilterBanca}>
          <SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="Todas">Todas as bancas</SelectItem>
            {BANCAS.map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}
          </SelectContent>
        </Select>

        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar enunciado, tema, tag…" className="pl-9" />
        </div>

        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCcw className="w-4 h-4 mr-2" />}
          Recarregar
        </Button>

        <Button size="sm" onClick={startNew}>
          <Plus className="w-4 h-4 mr-1" /> Nova questão
        </Button>

        <GenerateQuestionsDialog onGenerated={load} />

        <Badge variant="secondary" className="ml-auto">{filtered.length} questões</Badge>
      </div>

      <div className="grid lg:grid-cols-[300px_1fr] gap-4">
        {/* Lista */}
        <div className="border border-border rounded-lg bg-muted/20 max-h-[600px] overflow-y-auto">
          {loading ? (
            <div className="p-6 text-center text-sm text-muted-foreground">
              <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2" /> Carregando…
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-6 text-center text-sm text-muted-foreground">Nenhuma questão.</div>
          ) : (
            filtered.map((q) => (
              <button
                key={q.id}
                onClick={() => pickToEdit(q)}
                className={`w-full text-left px-3 py-2.5 border-b border-border/50 transition-colors ${
                  draft?.id === q.id ? "bg-primary/10" : "hover:bg-muted/40"
                }`}
              >
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0">{q.banca}</Badge>
                  {q.ano && <Badge variant="outline" className="text-[10px] px-1.5 py-0">{q.ano}</Badge>}
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                    {q.tipo === "certo_errado" ? "C/E" : "ME"}
                  </Badge>
                  <span className="text-[10px] text-muted-foreground">{q.nivel}</span>
                </div>
                <p className="text-xs text-foreground/70 line-clamp-2">
                  {q.enunciado.slice(0, 100) || q.afirmativa.slice(0, 100) || <span className="italic">(vazio)</span>}
                </p>
                <p className="text-[10px] text-muted-foreground mt-0.5">{q.disciplina}{q.tema ? ` · ${q.tema}` : ""}</p>
              </button>
            ))
          )}
        </div>

        {/* Editor */}
        {draft ? (
          <div className="space-y-4">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="secondary">{draft.id ? "Editando" : "Nova"}</Badge>
              {draft.id && <span className="text-xs text-muted-foreground font-mono truncate">{draft.id}</span>}
              <div className="ml-auto flex gap-2">
                {draft.id && (
                  <Button variant="destructive" size="sm" onClick={remove}>
                    <Trash2 className="w-4 h-4 mr-1" /> Excluir
                  </Button>
                )}
                <Button size="sm" onClick={save} disabled={saving}>
                  {saving ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Save className="w-4 h-4 mr-1" />}
                  Salvar
                </Button>
              </div>
            </div>

            <div className="grid sm:grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Banca</label>
                <Select value={draft.banca} onValueChange={(v) => update("banca", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{BANCAS.map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Ano</label>
                <Input type="number" value={draft.ano ?? ""} onChange={(e) => update("ano", e.target.value ? Number(e.target.value) : null)} />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Nível</label>
                <Select value={draft.nivel} onValueChange={(v) => update("nivel", v as Nivel)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{NIVEIS.map((n) => <SelectItem key={n} value={n}>{n}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Órgão</label>
                <Input value={draft.orgao} onChange={(e) => update("orgao", e.target.value)} placeholder="Ex: SEFAZ" />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Cargo</label>
                <Input value={draft.cargo} onChange={(e) => update("cargo", e.target.value)} placeholder="Ex: Auditor Fiscal" />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Tipo</label>
                <Select value={draft.tipo} onValueChange={(v) => changeTipo(v as Tipo)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="multipla_escolha">Múltipla escolha</SelectItem>
                    <SelectItem value="certo_errado">Certo / Errado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Disciplina</label>
                <Select value={draft.disciplina} onValueChange={(v) => update("disciplina", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{DISCIPLINAS.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="sm:col-span-2">
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Tema/Assunto</label>
                <Input value={draft.tema} onChange={(e) => update("tema", e.target.value)} placeholder="Ex: Interpretação de texto" />
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">
                Enunciado <span className="text-foreground/40">({draft.enunciado.length} chars)</span>
              </label>
              <Textarea value={draft.enunciado} onChange={(e) => update("enunciado", e.target.value)} rows={6} className="text-sm" />
            </div>

            {draft.tipo === "certo_errado" ? (
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Afirmativa (Cebraspe)</label>
                  <Textarea value={draft.afirmativa} onChange={(e) => update("afirmativa", e.target.value)} rows={3} placeholder="Julgue o item..." className="text-sm" />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Gabarito</label>
                  <div className="flex gap-2">
                    {["certo", "errado"].map((v) => (
                      <button
                        key={v}
                        type="button"
                        onClick={() => update("correta", v)}
                        className={`px-4 py-2 rounded-md border-2 text-sm font-medium capitalize ${
                          draft.correta === v ? "border-emerald-500 bg-emerald-500/15 text-emerald-600" : "border-border hover:border-primary/50"
                        }`}
                      >
                        {v}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-medium text-muted-foreground">Alternativas ({draft.alternativas.length})</label>
                  <Button variant="ghost" size="sm" onClick={addAlt} disabled={draft.alternativas.length >= 5}>
                    <Plus className="w-3.5 h-3.5 mr-1" /> Adicionar
                  </Button>
                </div>
                <div className="space-y-2">
                  {draft.alternativas.map((alt, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <button
                        type="button"
                        onClick={() => update("correta", alt.letra)}
                        className={`shrink-0 w-9 h-9 rounded-md border-2 font-semibold text-sm ${
                          draft.correta === alt.letra ? "border-emerald-500 bg-emerald-500/15 text-emerald-600" : "border-border hover:border-primary/50"
                        }`}
                        title="Marcar como correta"
                      >
                        {alt.letra || "?"}
                      </button>
                      <Textarea value={alt.texto} onChange={(e) => updateAlt(i, "texto", e.target.value)} rows={2} className="text-sm" placeholder={`Texto da alternativa ${alt.letra}`} />
                      <Button variant="ghost" size="icon" onClick={() => removeAlt(i)} className="shrink-0"><X className="w-4 h-4" /></Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Explicação</label>
              <Textarea value={draft.explicacao} onChange={(e) => update("explicacao", e.target.value)} rows={4} className="text-sm" placeholder="Explicação detalhada da resposta correta…" />
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Tags</label>
              <div className="flex flex-wrap gap-2 mb-2">
                {draft.tags.map((t) => (
                  <Badge key={t} variant="secondary" className="gap-1">
                    {t}
                    <button onClick={() => removeTag(t)} className="ml-1 opacity-60 hover:opacity-100"><X className="w-3 h-3" /></button>
                  </Badge>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTag(); } }}
                  placeholder="Adicionar tag e pressionar Enter"
                  className="text-sm"
                />
                <Button variant="outline" size="sm" onClick={addTag}>Adicionar</Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="border border-dashed border-border rounded-lg p-12 text-center text-sm text-muted-foreground">
            Selecione uma questão à esquerda ou clique em <strong>Nova questão</strong>.
          </div>
        )}
      </div>
    </Card>
  );
}