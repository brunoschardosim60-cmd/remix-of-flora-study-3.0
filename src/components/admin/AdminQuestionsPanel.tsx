import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Loader2, RefreshCcw, Save, Search, Trash2, Plus, X } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { reportError } from "@/lib/errorHandling";

type Alternativa = { letra: string; texto: string };
type AdminQuestion = {
  id: string;
  ano: number | null;
  numero: number | null;
  area: string;
  disciplina: string;
  tema: string;
  enunciado: string;
  alternativas: Alternativa[];
  correta: string;
  explicacao: string;
  imagem_urls: string[];
  tem_imagem: boolean;
  incomplete: boolean;
};

type Filter = "all" | "incomplete_flag" | "incomplete_alts" | "short" | "no_correct" | "placeholder" | "no_image_marked";

const FILTERS: Array<{ value: Filter; label: string; description: string }> = [
  { value: "incomplete_flag", label: "Marcadas incompletas (flag)", description: "Questões com flag incomplete=true" },
  { value: "incomplete_alts", label: "Alternativas < 5", description: "Questões sem todas as 5 alternativas" },
  { value: "short", label: "Enunciado curto (< 30)", description: "Provavelmente quebradas" },
  { value: "no_correct", label: "Sem gabarito", description: "Campo correta vazio" },
  { value: "placeholder", label: "Com [[placeholder]]", description: "Resíduo do parser" },
  { value: "no_image_marked", label: "Marcada com imagem mas sem URL", description: "tem_imagem = true e imagem_urls vazio" },
  { value: "all", label: "Todas com problema", description: "União de todos os filtros" },
];

function normalizeAlts(raw: unknown): Alternativa[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((a: any, i: number) => ({
    letra: String(a?.letra ?? String.fromCharCode(65 + i)).toUpperCase(),
    texto: String(a?.texto ?? a?.text ?? ""),
  }));
}

export function AdminQuestionsPanel() {
  const [filter, setFilter] = useState<Filter>("incomplete_alts");
  const [questions, setQuestions] = useState<AdminQuestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState<AdminQuestion | null>(null);
  const [saving, setSaving] = useState(false);

  async function loadQuestions(f: Filter) {
    setLoading(true);
    try {
      let query = supabase
        .from("questions")
        .select("id,ano,numero,area,disciplina,tema,enunciado,alternativas,correta,explicacao,imagem_urls,tem_imagem,incomplete")
        .order("ano", { ascending: false, nullsFirst: false })
        .order("numero", { ascending: true })
        .limit(500);

      // Aplicar filtros via Postgrest
      if (f === "incomplete_flag") {
        query = query.eq("incomplete", true);
      } else if (f === "short") {
        query = query.filter("enunciado", "neq", "").filter("char_length(enunciado)", "lt", 30 as any);
      } else if (f === "no_correct") {
        query = query.or("correta.is.null,correta.eq.");
      } else if (f === "placeholder") {
        query = query.ilike("enunciado", "%placeholder%");
      } else if (f === "no_image_marked") {
        query = query.eq("tem_imagem", true).eq("imagem_urls", "{}" as any);
      }
      // incomplete_alts e all → filtra client-side (jsonb_array_length não é trivial via SDK)

      const { data, error } = await query;
      if (error) throw error;

      let list: AdminQuestion[] = (data || []).map((q: any) => ({
        id: q.id,
        ano: q.ano,
        numero: q.numero,
        area: q.area || "",
        disciplina: q.disciplina || "",
        tema: q.tema || "",
        enunciado: q.enunciado || "",
        alternativas: normalizeAlts(q.alternativas),
        correta: q.correta || "",
        explicacao: q.explicacao || "",
        imagem_urls: q.imagem_urls || [],
        tem_imagem: !!q.tem_imagem,
        incomplete: !!q.incomplete,
      }));

      if (f === "incomplete_alts") {
        list = list.filter((q) => q.alternativas.length < 5);
      } else if (f === "short") {
        list = list.filter((q) => (q.enunciado || "").length < 30);
      } else if (f === "all") {
        list = list.filter((q) =>
          q.alternativas.length < 5 ||
          (q.enunciado || "").length < 30 ||
          !q.correta ||
          /placeholder/i.test(q.enunciado || "") ||
          (q.tem_imagem && (!q.imagem_urls || q.imagem_urls.length === 0))
        );
      }

      setQuestions(list);
      if (list.length > 0 && !list.find((q) => q.id === selectedId)) {
        setSelectedId(list[0].id);
        setDraft(structuredClone(list[0]));
      } else if (list.length === 0) {
        setSelectedId(null);
        setDraft(null);
      }
    } catch (error) {
      reportError("Erro ao carregar questões com problema", error, { devOnly: true });
      toast.error("Não foi possível carregar as questões.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadQuestions(filter); /* eslint-disable-next-line */ }, [filter]);

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    if (!s) return questions;
    return questions.filter((q) =>
      String(q.ano || "").includes(s) ||
      String(q.numero || "").includes(s) ||
      q.disciplina.toLowerCase().includes(s) ||
      q.enunciado.toLowerCase().includes(s) ||
      q.id.toLowerCase().includes(s)
    );
  }, [questions, search]);

  function selectQuestion(id: string) {
    const q = questions.find((x) => x.id === id);
    if (!q) return;
    setSelectedId(id);
    setDraft(structuredClone(q));
  }

  function updateDraft<K extends keyof AdminQuestion>(key: K, value: AdminQuestion[K]) {
    if (!draft) return;
    setDraft({ ...draft, [key]: value });
  }

  function updateAlt(idx: number, field: "letra" | "texto", value: string) {
    if (!draft) return;
    const next = [...draft.alternativas];
    next[idx] = { ...next[idx], [field]: field === "letra" ? value.toUpperCase().slice(0, 1) : value };
    setDraft({ ...draft, alternativas: next });
  }

  function addAlt() {
    if (!draft) return;
    const usedLetters = new Set(draft.alternativas.map((a) => a.letra));
    const nextLetter = ["A", "B", "C", "D", "E"].find((l) => !usedLetters.has(l)) || "";
    setDraft({ ...draft, alternativas: [...draft.alternativas, { letra: nextLetter, texto: "" }] });
  }

  function removeAlt(idx: number) {
    if (!draft) return;
    setDraft({ ...draft, alternativas: draft.alternativas.filter((_, i) => i !== idx) });
  }

  async function save() {
    if (!draft) return;
    // Validação leve
    if (draft.alternativas.length !== 5) {
      const ok = window.confirm(`A questão tem ${draft.alternativas.length} alternativas (esperado 5). Salvar mesmo assim?`);
      if (!ok) return;
    }
    if (!draft.correta) {
      toast.error("Selecione a alternativa correta antes de salvar.");
      return;
    }
    if (!draft.alternativas.find((a) => a.letra === draft.correta)) {
      toast.error(`A letra correta "${draft.correta}" não corresponde a nenhuma alternativa.`);
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from("questions")
        .update({
          enunciado: draft.enunciado,
          alternativas: draft.alternativas as any,
          correta: draft.correta,
          explicacao: draft.explicacao,
          tema: draft.tema,
          disciplina: draft.disciplina,
          incomplete: draft.incomplete,
        })
        .eq("id", draft.id);
      if (error) throw error;
      toast.success(`Questão ${draft.ano}/Q${draft.numero} salva.`);
      // Atualiza lista local
      setQuestions((prev) => prev.map((q) => (q.id === draft.id ? draft : q)));
    } catch (error: any) {
      reportError("Erro ao salvar questão", error, { devOnly: true });
      toast.error(error?.message || "Erro ao salvar questão.");
    } finally {
      setSaving(false);
    }
  }

  async function deleteQuestion() {
    if (!draft) return;
    const ok = window.confirm(`Deletar permanentemente a questão ${draft.ano}/Q${draft.numero}? Isso não pode ser desfeito.`);
    if (!ok) return;
    try {
      const { error } = await supabase.from("questions").delete().eq("id", draft.id);
      if (error) throw error;
      toast.success("Questão deletada.");
      setQuestions((prev) => prev.filter((q) => q.id !== draft.id));
      setSelectedId(null);
      setDraft(null);
    } catch (error: any) {
      reportError("Erro ao deletar questão", error, { devOnly: true });
      toast.error(error?.message || "Erro ao deletar questão.");
    }
  }

  return (
    <Card className="p-4">
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Select value={filter} onValueChange={(v) => setFilter(v as Filter)}>
          <SelectTrigger className="w-[260px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {FILTERS.map((f) => (
              <SelectItem key={f.value} value={f.value}>
                {f.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar (ano, número, disciplina, id...)"
            className="pl-9"
          />
        </div>

        <Button variant="outline" size="sm" onClick={() => loadQuestions(filter)} disabled={loading}>
          {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCcw className="w-4 h-4 mr-2" />}
          Recarregar
        </Button>

        <Badge variant="secondary" className="ml-auto">
          {filtered.length} questão{filtered.length !== 1 && "ões"}
        </Badge>
      </div>

      <div className="grid lg:grid-cols-[280px_1fr] gap-4">
        {/* Lista */}
        <div className="border border-border rounded-lg overflow-hidden bg-muted/20 max-h-[600px] overflow-y-auto">
          {loading ? (
            <div className="p-6 text-center text-sm text-muted-foreground">
              <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2" />
              Carregando…
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-6 text-center text-sm text-muted-foreground">
              Nenhuma questão com este problema 🎉
            </div>
          ) : (
            filtered.map((q) => {
              const issues: string[] = [];
              if (q.alternativas.length < 5) issues.push(`${q.alternativas.length} alts`);
              if ((q.enunciado || "").length < 30) issues.push("texto curto");
              if (!q.correta) issues.push("sem gabarito");
              if (/placeholder/i.test(q.enunciado || "")) issues.push("placeholder");
              if (q.tem_imagem && q.imagem_urls.length === 0) issues.push("img faltando");
              if (q.incomplete) issues.unshift("flag");
              return (
                <button
                  key={q.id}
                  onClick={() => selectQuestion(q.id)}
                  className={`w-full text-left px-3 py-2.5 border-b border-border/50 transition-colors ${
                    selectedId === q.id ? "bg-primary/10" : "hover:bg-muted/40"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                      {q.ano}·Q{q.numero}
                    </Badge>
                    <span className="text-[11px] text-muted-foreground truncate">{q.disciplina}</span>
                  </div>
                  <p className="text-xs text-foreground/70 line-clamp-2 mb-1">
                    {q.enunciado.slice(0, 100) || <span className="italic">(vazio)</span>}
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {issues.map((iss) => (
                      <span key={iss} className="text-[10px] px-1.5 py-0.5 rounded bg-destructive/15 text-destructive">
                        {iss}
                      </span>
                    ))}
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Editor */}
        {draft ? (
          <div className="space-y-4">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="secondary">ENEM {draft.ano}</Badge>
              <Badge variant="outline">Q{draft.numero}</Badge>
              <span className="text-xs text-muted-foreground font-mono truncate">{draft.id}</span>
              <div className="flex items-center gap-2 ml-2 px-2 py-1 rounded-md border border-border">
                <Switch
                  id="incomplete-toggle"
                  checked={draft.incomplete}
                  onCheckedChange={(v) => updateDraft("incomplete", v)}
                />
                <label htmlFor="incomplete-toggle" className={`text-xs font-medium cursor-pointer ${draft.incomplete ? "text-amber-600" : "text-muted-foreground"}`}>
                  <AlertTriangle className="w-3 h-3 inline mr-1" />
                  Marcar como incompleta
                </label>
              </div>
              <div className="ml-auto flex gap-2">
                <Button variant="destructive" size="sm" onClick={deleteQuestion}>
                  <Trash2 className="w-4 h-4 mr-1" /> Deletar
                </Button>
                <Button size="sm" onClick={save} disabled={saving}>
                  {saving ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Save className="w-4 h-4 mr-1" />}
                  Salvar
                </Button>
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Disciplina</label>
                <Input value={draft.disciplina} onChange={(e) => updateDraft("disciplina", e.target.value)} />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Tema</label>
                <Input value={draft.tema} onChange={(e) => updateDraft("tema", e.target.value)} />
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">
                Enunciado <span className="text-foreground/40">({draft.enunciado.length} chars)</span>
              </label>
              <Textarea
                value={draft.enunciado}
                onChange={(e) => updateDraft("enunciado", e.target.value)}
                rows={8}
                className="font-mono text-sm"
              />
              {draft.imagem_urls.length > 0 && (
                <div className="mt-2 flex gap-2 flex-wrap">
                  {draft.imagem_urls.map((url, i) => (
                    <a key={i} href={url} target="_blank" rel="noreferrer" className="block">
                      <img src={url} alt={`img ${i + 1}`} className="h-20 rounded border border-border" />
                    </a>
                  ))}
                </div>
              )}
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-medium text-muted-foreground">
                  Alternativas ({draft.alternativas.length}/5)
                </label>
                <Button variant="ghost" size="sm" onClick={addAlt} disabled={draft.alternativas.length >= 5}>
                  <Plus className="w-3.5 h-3.5 mr-1" /> Adicionar
                </Button>
              </div>
              <div className="space-y-2">
                {draft.alternativas.map((alt, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <button
                      type="button"
                      onClick={() => updateDraft("correta", alt.letra)}
                      className={`shrink-0 w-9 h-9 rounded-md border-2 font-semibold text-sm transition-colors ${
                        draft.correta === alt.letra
                          ? "border-emerald-500 bg-emerald-500/15 text-emerald-600"
                          : "border-border hover:border-primary/50"
                      }`}
                      title={draft.correta === alt.letra ? "Gabarito" : "Marcar como correta"}
                    >
                      {alt.letra || "?"}
                    </button>
                    <Textarea
                      value={alt.texto}
                      onChange={(e) => updateAlt(i, "texto", e.target.value)}
                      rows={2}
                      className="text-sm"
                      placeholder={`Texto da alternativa ${alt.letra}`}
                    />
                    <Button variant="ghost" size="icon" onClick={() => removeAlt(i)} className="shrink-0">
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
              {draft.correta && (
                <p className="text-[11px] text-muted-foreground mt-2">
                  Gabarito atual: <strong className="text-emerald-600">{draft.correta}</strong>
                </p>
              )}
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Explicação (opcional)</label>
              <Textarea
                value={draft.explicacao}
                onChange={(e) => updateDraft("explicacao", e.target.value)}
                rows={3}
                className="text-sm"
              />
            </div>
          </div>
        ) : (
          <div className="border border-dashed border-border rounded-lg p-8 text-center text-sm text-muted-foreground flex items-center justify-center">
            <div>
              <AlertTriangle className="w-8 h-8 mx-auto mb-2 opacity-40" />
              Selecione uma questão à esquerda para editar.
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}