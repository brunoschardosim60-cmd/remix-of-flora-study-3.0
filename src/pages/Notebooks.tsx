import { useCallback, useEffect, useMemo, useState, type CSSProperties } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ArrowDownAZ, ArrowLeft, Baby, BookOpen, BrainCircuit, Clock3, FileHeart,
  FolderOpen, HeartPulse, LayoutGrid, List, Loader2, NotebookPen, Pill, Plus,
  Search, Star, Stethoscope, Trash2, type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";
import { ALL_SUBJECTS } from "@/lib/studyData";
import {
  medicalNotebookTemplates,
  type MedicalNotebookTemplate,
} from "@/lib/medicalNotebookTemplates";
import { prepareMedicalNotebookHtml } from "@/lib/notebookMedicalAssets";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import "@/components/notebook/notebooks-studio.css";

interface Notebook {
  id: string;
  title: string;
  subject: string | null;
  cover_color: string;
  created_at: string;
  updated_at: string;
  folder: string | null;
  is_favorite: boolean;
  topic_id: string | null;
}

interface NotebookPreview {
  text: string;
  image: string | null;
  template: string;
  pageCount: number;
}

type ViewMode = "grid" | "list";
type SortMode = "updated" | "created" | "title";

const VIEW_STORAGE_KEY = "flora.notebooks.view";
const SORT_STORAGE_KEY = "flora.notebooks.sort";
const COVER_COLORS = ["#397563", "#B05561", "#80649A", "#D98757", "#4B77A6", "#C3983D", "#397E89", "#6E6A9E"];
const FIXED_FOLDERS = ["Medicina", "Provas", "Resumos"];
const TEMPLATE_ICONS: LucideIcon[] = [Stethoscope, HeartPulse, Baby, BrainCircuit, Pill, FileHeart, NotebookPen];

function plainTextFromHtml(html: string) {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;|&#160;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/\s+/g, " ")
    .trim();
}

function imageFromHtml(html: string) {
  return html.match(/<img[^>]+src=["']([^"']+)["']/i)?.[1] ?? null;
}

export default function Notebooks() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [notebooks, setNotebooks] = useState<Notebook[]>([]);
  const [previews, setPreviews] = useState<Record<string, NotebookPreview>>({});
  const [subjectFolders, setSubjectFolders] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<MedicalNotebookTemplate | null>(null);
  const [newTitle, setNewTitle] = useState("");
  const [newSubject, setNewSubject] = useState<string>("");
  const [newColor, setNewColor] = useState(COVER_COLORS[0]);
  const [newFolder, setNewFolder] = useState<string>("");
  const [activeFolder, setActiveFolder] = useState<string | null>(null);
  const [showFavorites, setShowFavorites] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [contentMatches, setContentMatches] = useState<Record<string, string>>({});
  const [searching, setSearching] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    if (typeof window === "undefined") return "grid";
    return window.localStorage.getItem(VIEW_STORAGE_KEY) === "list" ? "list" : "grid";
  });
  const [sortMode, setSortMode] = useState<SortMode>(() => {
    if (typeof window === "undefined") return "updated";
    const stored = window.localStorage.getItem(SORT_STORAGE_KEY);
    return stored === "created" || stored === "title" ? stored : "updated";
  });

  useEffect(() => {
    window.localStorage.setItem(VIEW_STORAGE_KEY, viewMode);
  }, [viewMode]);

  useEffect(() => {
    window.localStorage.setItem(SORT_STORAGE_KEY, sortMode);
  }, [sortMode]);

  useEffect(() => {
    if (!user || searchQuery.length < 3) {
      setContentMatches({});
      return;
    }
    const timeout = setTimeout(async () => {
      setSearching(true);
      try {
        const { data } = await supabase
          .from("notebook_pages")
          .select("notebook_id, content")
          .eq("user_id", user.id)
          .ilike("content", `%${searchQuery}%`);
        const matches: Record<string, string> = {};
        for (const page of data || []) {
          if (matches[page.notebook_id]) continue;
          const text = plainTextFromHtml(page.content);
          const index = text.toLocaleLowerCase("pt-BR").indexOf(searchQuery.toLocaleLowerCase("pt-BR"));
          const start = Math.max(0, index - 35);
          matches[page.notebook_id] = `…${text.slice(start, start + 105)}…`;
        }
        setContentMatches(matches);
      } finally {
        setSearching(false);
      }
    }, 350);
    return () => clearTimeout(timeout);
  }, [searchQuery, user]);

  const loadSubjectFolders = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase.from("study_state").select("topics").eq("user_id", user.id).maybeSingle();
    if (data?.topics && Array.isArray(data.topics)) {
      const subjects = [...new Set(data.topics.flatMap((topic) => {
        if (typeof topic !== "object" || topic === null || !("materia" in topic)) return [];
        const subject = (topic as { materia?: unknown }).materia;
        return typeof subject === "string" && subject.trim() ? [subject] : [];
      }))];
      setSubjectFolders(subjects);
    }
  }, [user]);

  const loadNotebooks = useCallback(async () => {
    if (!user) return;
    const [notebookResult, previewResult, pageCountResult] = await Promise.all([
      supabase.from("notebooks").select("*").order("updated_at", { ascending: false }),
      supabase.from("notebook_pages").select("notebook_id, content, template").eq("user_id", user.id).eq("page_number", 1),
      supabase.from("notebook_pages").select("notebook_id").eq("user_id", user.id),
    ]);
    if (notebookResult.error) {
      toast.error("Erro ao carregar cadernos");
      console.error(notebookResult.error);
    } else {
      setNotebooks((notebookResult.data || []) as Notebook[]);
    }
    if (!previewResult.error && !pageCountResult.error) {
      const next: Record<string, NotebookPreview> = {};
      for (const page of pageCountResult.data || []) {
        next[page.notebook_id] ??= { text: "", image: null, template: "blank", pageCount: 0 };
        next[page.notebook_id].pageCount += 1;
      }
      for (const page of previewResult.data || []) {
        const current = next[page.notebook_id] ?? { text: "", image: null, template: "blank", pageCount: 1 };
        next[page.notebook_id] = {
          ...current,
          text: plainTextFromHtml(page.content),
          image: imageFromHtml(page.content),
          template: page.template || "blank",
        };
      }
      setPreviews(next);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    if (user) {
      void loadNotebooks();
      void loadSubjectFolders();
    }
  }, [loadNotebooks, loadSubjectFolders, user]);

  const resetCreation = () => {
    setShowNew(false);
    setSelectedTemplate(null);
    setNewTitle("");
    setNewSubject("");
    setNewFolder("");
    setNewColor(COVER_COLORS[0]);
  };

  const openBlankNotebook = () => {
    setSelectedTemplate(null);
    setNewTitle("");
    setNewSubject("");
    setNewFolder("");
    setNewColor(COVER_COLORS[0]);
    setShowNew(true);
  };

  const openMedicalTemplate = (template: MedicalNotebookTemplate) => {
    setSelectedTemplate(template);
    setNewTitle(template.name);
    setNewSubject("Medicina");
    setNewFolder("Medicina");
    setNewColor(template.accent);
    setShowNew(true);
    window.setTimeout(() => document.querySelector<HTMLElement>(".notebooks-create-panel")?.scrollIntoView({ behavior: "smooth", block: "center" }), 50);
  };

  const createNotebook = async () => {
    if (!newTitle.trim() || !user) return;
    setCreating(true);
    const { data, error } = await supabase.from("notebooks").insert({
      title: newTitle.trim(),
      subject: newSubject || null,
      cover_color: newColor,
      user_id: user.id,
      folder: newFolder || null,
      is_favorite: false,
    }).select().single();

    if (error || !data) {
      toast.error("Erro ao criar caderno");
      console.error(error);
      setCreating(false);
      return;
    }

    if (selectedTemplate) {
      const { error: pageError } = await supabase.from("notebook_pages").insert(
        selectedTemplate.pages.map((page, index) => ({
          notebook_id: data.id,
          user_id: user.id,
          page_number: index + 1,
          content: prepareMedicalNotebookHtml(page.html),
          template: page.paper ?? "blank",
          tags: ["medicina", selectedTemplate.id, page.title.toLocaleLowerCase("pt-BR")],
        })),
      );
      if (pageError) {
        await supabase.from("notebooks").delete().eq("id", data.id);
        toast.error("Não foi possível preparar as páginas médicas. Nenhum caderno incompleto foi mantido.");
        setCreating(false);
        return;
      }
    }

    toast.success(selectedTemplate ? `${selectedTemplate.pages.length} páginas médicas preparadas.` : "Caderno criado!");
    resetCreation();
    setCreating(false);
    navigate(`/notebooks/${data.id}`);
  };

  const deleteNotebook = async (id: string, event: React.MouseEvent) => {
    event.stopPropagation();
    if (!confirm("Apagar este caderno e todas as páginas?")) return;
    const { error } = await supabase.from("notebooks").delete().eq("id", id);
    if (error) toast.error("Erro ao apagar");
    else setNotebooks((current) => current.filter((notebook) => notebook.id !== id));
  };

  const toggleFavorite = async (id: string, current: boolean, event: React.MouseEvent) => {
    event.stopPropagation();
    const { error } = await supabase.from("notebooks").update({ is_favorite: !current }).eq("id", id);
    if (!error) setNotebooks((items) => items.map((item) => item.id === id ? { ...item, is_favorite: !current } : item));
  };

  const customFolders = [...new Set(notebooks.map((notebook) => notebook.folder).filter(Boolean))] as string[];
  const dynamicFolders = [...new Set([...subjectFolders, ...customFolders])]
    .filter((folder) => !FIXED_FOLDERS.includes(folder))
    .sort((a, b) => a.localeCompare(b, "pt-BR"));
  const allFolders = [...dynamicFolders, ...FIXED_FOLDERS];
  const favoriteCount = notebooks.filter((notebook) => notebook.is_favorite).length;

  const filtered = useMemo(() => notebooks
    .filter((notebook) => {
      if (showFavorites && !notebook.is_favorite) return false;
      if (activeFolder && notebook.folder !== activeFolder) return false;
      if (!searchQuery) return true;
      const query = searchQuery.toLocaleLowerCase("pt-BR");
      return notebook.title.toLocaleLowerCase("pt-BR").includes(query)
        || (notebook.subject || "").toLocaleLowerCase("pt-BR").includes(query)
        || (notebook.folder || "").toLocaleLowerCase("pt-BR").includes(query)
        || Boolean(contentMatches[notebook.id]);
    })
    .sort((a, b) => {
      if (sortMode === "title") return a.title.localeCompare(b.title, "pt-BR");
      const field = sortMode === "created" ? "created_at" : "updated_at";
      return new Date(b[field]).getTime() - new Date(a[field]).getTime();
    }), [activeFolder, contentMatches, notebooks, searchQuery, showFavorites, sortMode]);

  if (loading) {
    return <div className="notebooks-studio animate-fade-in"><div className="notebooks-content"><div className="h-44 rounded-[28px] bg-white/70 animate-pulse" /><div className="mt-7 grid grid-cols-2 gap-4 lg:grid-cols-4">{[1, 2, 3, 4].map((item) => <div key={item} className="h-72 rounded-2xl bg-white/70 animate-pulse" />)}</div></div></div>;
  }

  const activeLabel = showFavorites ? "Favoritos" : activeFolder || "Todas as notas";
  const folderCount = (folder: string) => notebooks.filter((notebook) => notebook.folder === folder).length;
  const formatUpdatedAt = (date: string) => new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(date));

  return <div className="notebooks-studio">
    <header className="notebooks-topbar">
      <button className="notebooks-back" onClick={() => navigate("/")} title="Voltar" aria-label="Voltar"><ArrowLeft /></button>
      <div className="notebooks-brand"><span><NotebookPen /></span><div><small>FLORA NOTES</small><strong>Caderno médico</strong></div></div>
      <div className="notebooks-top-actions">
        <label className="notebooks-search">{searching ? <Loader2 className="animate-spin" /> : <Search />}<input value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="Buscar nas suas notas…" /></label>
        <button className="notebooks-new-button" onClick={openBlankNotebook}><Plus /><span>Nova nota</span></button>
      </div>
    </header>

    <main className="notebooks-content">
      <section className="notebooks-overview">
        <div className="notebooks-overview-copy">
          <span className="notebooks-eyebrow">SEU ESPAÇO DE ESTUDO</span>
          <h1>Todas as notas</h1>
          <p>Escreva, desenhe, marque PDFs e organize o raciocínio médico no mesmo lugar.</p>
        </div>
        <div className="notebooks-stats"><span><b>{notebooks.length}</b> notas</span><span><b>{allFolders.length}</b> pastas</span><span><b>{favoriteCount}</b> favoritas</span></div>
      </section>

      <section className="notebooks-medical-start">
        <header><div><span className="notebooks-eyebrow">MODELOS MÉDICOS</span><h2>Comece com uma estrutura pronta</h2><p>Páginas editáveis com conteúdo visual, perguntas e espaço para anotações.</p></div><button type="button" onClick={openBlankNotebook}><Plus /> Em branco</button></header>
        <div className="notebooks-template-strip">
          {medicalNotebookTemplates.map((template, index) => {
            const Icon = TEMPLATE_ICONS[index] ?? Stethoscope;
            return <button key={template.id} type="button" className="notebooks-template-card" onClick={() => openMedicalTemplate(template)} style={{ "--template-accent": template.accent } as CSSProperties}>
              <span className="notebooks-template-visual"><img src={template.coverImage} alt="" loading="lazy" /><i><Icon /></i></span>
              <span className="notebooks-template-copy"><small>{template.eyebrow}</small><strong>{template.name}</strong><em>{template.pages.length} páginas prontas</em></span>
            </button>;
          })}
        </div>
      </section>

      {showNew && <section className="notebooks-create-panel">
        <header><span>{selectedTemplate ? <Stethoscope /> : <Plus />}</span><div><h3>{selectedTemplate ? `Criar “${selectedTemplate.name}”` : "Nova nota"}</h3><p>{selectedTemplate ? `${selectedTemplate.pages.length} páginas médicas serão montadas automaticamente.` : "Comece em branco e escolha o papel dentro do editor."}</p></div></header>
        <div className="notebooks-create-grid">
          <label className="notebooks-create-field"><span>Nome do caderno</span><Input value={newTitle} onChange={(event) => setNewTitle(event.target.value)} onKeyDown={(event) => event.key === "Enter" && void createNotebook()} placeholder="Ex.: HAM — Sistema nervoso" autoFocus /></label>
          <label className="notebooks-create-field"><span>Matéria</span><Select value={newSubject} onValueChange={(value) => { const selected = value === "__none__" ? "" : value; setNewSubject(selected); if (selected) setNewFolder(selected); }}><SelectTrigger><SelectValue placeholder="Sem matéria" /></SelectTrigger><SelectContent><SelectItem value="__none__">Sem matéria</SelectItem><SelectItem value="Medicina">Medicina</SelectItem>{ALL_SUBJECTS.map((subject) => <SelectItem key={subject} value={subject}>{subject}</SelectItem>)}</SelectContent></Select></label>
          <label className="notebooks-create-field"><span>Pasta</span><Select value={newFolder} onValueChange={(value) => setNewFolder(value === "__none__" ? "" : value)}><SelectTrigger><SelectValue placeholder="Sem pasta" /></SelectTrigger><SelectContent><SelectItem value="__none__">Sem pasta</SelectItem>{allFolders.map((folder) => <SelectItem key={folder} value={folder}>{folder}</SelectItem>)}</SelectContent></Select></label>
        </div>
        <label className="notebooks-create-field mt-4"><span>Cor de identificação</span><div className="notebooks-cover-picker">{COVER_COLORS.map((color) => <button key={color} type="button" className={newColor === color ? "active" : ""} style={{ backgroundColor: color }} onClick={() => setNewColor(color)} aria-label={`Usar cor ${color}`} />)}</div></label>
        <div className="notebooks-create-actions"><Button variant="ghost" onClick={resetCreation}>Cancelar</Button><Button onClick={() => void createNotebook()} disabled={creating || !newTitle.trim()}>{creating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{selectedTemplate ? "Criar páginas e abrir" : "Criar e abrir"}</Button></div>
      </section>}

      <div className="notebooks-workspace">
        <aside className="notebooks-folders">
          <span>BIBLIOTECA</span>
          <button className={`notebooks-folder-button ${!activeFolder && !showFavorites ? "active" : ""}`} onClick={() => { setActiveFolder(null); setShowFavorites(false); }}><LayoutGrid />Todas<b>{notebooks.length}</b></button>
          <button className={`notebooks-folder-button favorite ${showFavorites ? "active" : ""}`} onClick={() => { setShowFavorites(true); setActiveFolder(null); }}><Star />Favoritas<b>{favoriteCount}</b></button>
          {allFolders.map((folder) => <button key={folder} className={`notebooks-folder-button ${activeFolder === folder ? "active" : ""}`} onClick={() => { setActiveFolder(folder); setShowFavorites(false); }}><FolderOpen />{folder}<b>{folderCount(folder)}</b></button>)}
        </aside>

        <section className="notebooks-main">
          <header className="notebooks-main-heading">
            <div><h2>{activeLabel}</h2><p>{filtered.length} resultado{filtered.length === 1 ? "" : "s"}{searchQuery ? ` para “${searchQuery}”` : ""}</p></div>
            <div className="notebooks-library-tools">
              <label><ArrowDownAZ /><Select value={sortMode} onValueChange={(value) => setSortMode(value as SortMode)}><SelectTrigger aria-label="Ordenar notas"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="updated">Editadas recentemente</SelectItem><SelectItem value="created">Criadas recentemente</SelectItem><SelectItem value="title">Ordem alfabética</SelectItem></SelectContent></Select></label>
              <div className="notebooks-view-toggle" aria-label="Modo de exibição"><button type="button" className={viewMode === "grid" ? "active" : ""} onClick={() => setViewMode("grid")} aria-label="Ver em grade"><LayoutGrid /></button><button type="button" className={viewMode === "list" ? "active" : ""} onClick={() => setViewMode("list")} aria-label="Ver em lista"><List /></button></div>
            </div>
          </header>

          {filtered.length === 0 && !showNew ? <div className="notebooks-empty">
            <span><BookOpen /></span><h3>{notebooks.length === 0 ? "Sua primeira nota começa aqui" : "Nada encontrado"}</h3><p>{notebooks.length === 0 ? "Crie uma página em branco ou escolha um dos modelos médicos acima." : "Tente outro termo ou volte para todas as notas."}</p>{notebooks.length === 0 && <Button onClick={openBlankNotebook}><Plus className="mr-2 h-4 w-4" />Nova nota</Button>}
          </div> : <div className={`notebooks-grid ${viewMode === "list" ? "is-list" : ""}`}>
            {filtered.map((notebook) => {
              const preview = previews[notebook.id];
              const previewText = contentMatches[notebook.id] || preview?.text || "Comece a escrever, desenhar ou importar um PDF nesta página.";
              return <article key={notebook.id} className="notebook-studio-card" onClick={() => navigate(`/notebooks/${notebook.id}`)} style={{ "--cover": notebook.cover_color } as CSSProperties}>
                <div className={`notebook-paper-preview template-${preview?.template || "blank"}`}>
                  <div className="notebook-preview-top"><span><i />{notebook.subject || notebook.folder || "Nota livre"}</span><div className="notebook-card-actions"><button onClick={(event) => void toggleFavorite(notebook.id, notebook.is_favorite, event)} title={notebook.is_favorite ? "Remover dos favoritos" : "Favoritar"} aria-label={notebook.is_favorite ? "Remover dos favoritos" : "Favoritar"}><Star className={notebook.is_favorite ? "is-favorite" : ""} /></button><button onClick={(event) => void deleteNotebook(notebook.id, event)} title="Apagar caderno" aria-label="Apagar caderno"><Trash2 /></button></div></div>
                  <div className="notebook-preview-content">{preview?.image && <img src={preview.image} alt="" loading="lazy" />}<div><h3>{notebook.title?.trim().length > 1 ? notebook.title : "Sem título"}</h3><p>{previewText}</p></div></div>
                  <span className="notebook-page-count">{preview?.pageCount || 1} pág.</span>
                </div>
                <div className="notebook-card-meta"><Clock3 /><span>Editado {formatUpdatedAt(notebook.updated_at)}</span>{notebook.is_favorite && <Star className="is-favorite" />}</div>
              </article>;
            })}
          </div>}
        </section>
      </div>
    </main>
  </div>;
}
