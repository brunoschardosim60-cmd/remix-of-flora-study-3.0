import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, BookOpen, Trash2, Loader2, ArrowLeft, Star, FolderOpen, Search, Clock3, LayoutGrid } from "lucide-react";
import { toast } from "sonner";
import { ALL_SUBJECTS } from "@/lib/studyData";
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

const COVER_COLORS = [
  "#3B82F6", "#8B5CF6", "#EC4899", "#F97316",
  "#10B981", "#EF4444", "#06B6D4", "#6366F1",
];

const FIXED_FOLDERS = ["Provas", "Resumos"];

export default function Notebooks() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [notebooks, setNotebooks] = useState<Notebook[]>([]);
  const [subjectFolders, setSubjectFolders] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newSubject, setNewSubject] = useState<string>("");
  const [newColor, setNewColor] = useState(COVER_COLORS[0]);
  const [newFolder, setNewFolder] = useState<string>("");
  const [activeFolder, setActiveFolder] = useState<string | null>(null);
  const [showFavorites, setShowFavorites] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [contentMatches, setContentMatches] = useState<Record<string, string>>({});
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    if (user) {
      loadNotebooks();
      loadSubjectFolders();
    }
  }, [user]);

  // Search inside notebook page content when query has 3+ chars
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
        for (const p of data || []) {
          if (!matches[p.notebook_id]) {
            const idx = p.content.toLowerCase().indexOf(searchQuery.toLowerCase());
            const start = Math.max(0, idx - 30);
            const end = Math.min(p.content.length, idx + searchQuery.length + 30);
            matches[p.notebook_id] = "..." + p.content.slice(start, end).replace(/\n/g, " ") + "...";
          }
        }
        setContentMatches(matches);
      } catch {
        // ignore
      } finally {
        setSearching(false);
      }
    }, 400);
    return () => clearTimeout(timeout);
  }, [searchQuery, user]);

  const loadSubjectFolders = async () => {
    const { data } = await supabase
      .from("study_state")
      .select("topics")
      .eq("user_id", user!.id)
      .maybeSingle();
    if (data?.topics && Array.isArray(data.topics)) {
      const subjects = [...new Set(data.topics.flatMap((topic) => {
        if (typeof topic !== "object" || topic === null || !("materia" in topic)) return [];
        const subject = (topic as { materia?: unknown }).materia;
        return typeof subject === "string" && subject.trim() ? [subject] : [];
      }))];
      setSubjectFolders(subjects);
    }
  };

  const loadNotebooks = async () => {
    const { data, error } = await supabase
      .from("notebooks")
      .select("*")
      .order("updated_at", { ascending: false });
    if (error) {
      toast.error("Erro ao carregar cadernos");
      console.error(error);
    } else {
      setNotebooks((data || []) as Notebook[]);
    }
    setLoading(false);
  };

  const createNotebook = async () => {
    if (!newTitle.trim()) return;
    setCreating(true);
    const { data, error } = await supabase
      .from("notebooks")
      .insert({
        title: newTitle.trim(),
        subject: newSubject || null,
        cover_color: newColor,
        user_id: user!.id,
        folder: newFolder || null,
        is_favorite: false,
      })
      .select()
      .single();
    if (error) {
      toast.error("Erro ao criar caderno");
      console.error(error);
    } else if (data) {
      setNotebooks((prev) => [data as Notebook, ...prev]);
      setShowNew(false);
      setNewTitle("");
      setNewSubject("");
      setNewFolder("");
      toast.success("Caderno criado!");
      navigate(`/notebooks/${data.id}`);
    }
    setCreating(false);
  };

  const deleteNotebook = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Apagar este caderno e todas as páginas?")) return;
    const { error } = await supabase.from("notebooks").delete().eq("id", id);
    if (error) toast.error("Erro ao apagar");
    else setNotebooks((prev) => prev.filter((n) => n.id !== id));
  };

  const toggleFavorite = async (id: string, current: boolean, e: React.MouseEvent) => {
    e.stopPropagation();
    const { error } = await supabase.from("notebooks").update({ is_favorite: !current }).eq("id", id);
    if (!error) {
      setNotebooks((prev) => prev.map((n) => n.id === id ? { ...n, is_favorite: !current } : n));
    }
  };

  // Build dynamic folders: subjects from topics + any custom folders from notebooks
  // Order: alphabetical subject/custom folders first, then fixed folders (Provas, Resumos) last
  const customFolders = [...new Set(notebooks.map((n) => n.folder).filter(Boolean))] as string[];
  const dynamicFolders = [...new Set([...subjectFolders, ...customFolders])]
    .filter((f) => !FIXED_FOLDERS.includes(f))
    .sort((a, b) => a.localeCompare(b, "pt-BR"));
  const allFolders = [...dynamicFolders, ...FIXED_FOLDERS];

  // Filter notebooks (title, subject, folder + page content)
  const filtered = notebooks.filter((nb) => {
    if (showFavorites && !nb.is_favorite) return false;
    if (activeFolder && nb.folder !== activeFolder) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        nb.title.toLowerCase().includes(q) ||
        (nb.subject || "").toLowerCase().includes(q) ||
        (nb.folder || "").toLowerCase().includes(q) ||
        contentMatches[nb.id]
      );
    }
    return true;
  });

  if (loading) {
    return (
      <div className="notebooks-studio animate-fade-in">
        <div className="notebooks-content">
          <div className="h-56 rounded-[28px] bg-white/70 animate-pulse" />
          <div className="mt-7 grid grid-cols-2 gap-4 lg:grid-cols-4">
            {[1,2,3,4].map(i => <div key={i} className="h-72 rounded-2xl bg-white/70 animate-pulse" />)}
          </div>
        </div>
      </div>
    );
  }

  const activeLabel = showFavorites ? "Favoritos" : activeFolder || "Todos os cadernos";
  const folderCount = (folder: string) => notebooks.filter((notebook) => notebook.folder === folder).length;
  const favoriteCount = notebooks.filter((notebook) => notebook.is_favorite).length;
  const formatUpdatedAt = (date: string) => new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short" }).format(new Date(date));

  return (
    <div className="notebooks-studio">
      <header className="notebooks-topbar">
        <button className="notebooks-back" onClick={() => navigate("/")} title="Voltar" aria-label="Voltar"><ArrowLeft /></button>
        <div className="notebooks-brand"><span><BookOpen /></span><div><small>FLORA CANVAS</small><strong>Cadernos</strong></div></div>
        <div className="notebooks-top-actions">
          <label className="notebooks-search">
            {searching ? <Loader2 className="animate-spin" /> : <Search />}
            <input value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="Buscar título, matéria ou conteúdo…" />
          </label>
          <button className="notebooks-new-button" onClick={() => setShowNew(true)}><Plus /><span>Novo caderno</span></button>
        </div>
      </header>

      <main className="notebooks-content">
        <section className="notebooks-hero">
          <div className="notebooks-hero-copy">
            <span className="notebooks-eyebrow">SEU ESPAÇO DE PENSAMENTO</span>
            <h1>Escreva, desenhe e conecte ideias no mesmo papel.</h1>
            <p>Um caderno flexível para anotações livres, PDFs, imagens, mapas visuais e estudos guiados — com suas páginas sempre organizadas.</p>
            <div className="notebooks-stats">
              <span><b>{notebooks.length}</b> caderno{notebooks.length === 1 ? "" : "s"}</span>
              <span><b>{allFolders.length}</b> pasta{allFolders.length === 1 ? "" : "s"}</span>
              <span><b>{favoriteCount}</b> favorito{favoriteCount === 1 ? "" : "s"}</span>
            </div>
          </div>
          <div className="notebooks-hero-art" aria-hidden="true"><div className="notebooks-paper-stack" /><div className="notebooks-pen-art" /></div>
        </section>

        <div className="notebooks-workspace">
          <aside className="notebooks-folders">
            <span>BIBLIOTECA</span>
            <button className={`notebooks-folder-button ${!activeFolder && !showFavorites ? "active" : ""}`} onClick={() => { setActiveFolder(null); setShowFavorites(false); }}><LayoutGrid />Todos<b>{notebooks.length}</b></button>
            <button className={`notebooks-folder-button favorite ${showFavorites ? "active" : ""}`} onClick={() => { setShowFavorites(true); setActiveFolder(null); }}><Star />Favoritos<b>{favoriteCount}</b></button>
            {allFolders.map((folder) => <button key={folder} className={`notebooks-folder-button ${activeFolder === folder ? "active" : ""}`} onClick={() => { setActiveFolder(folder); setShowFavorites(false); }}><FolderOpen />{folder}<b>{folderCount(folder)}</b></button>)}
          </aside>

          <section className="notebooks-main">
            <header className="notebooks-main-heading">
              <div><h2>{activeLabel}</h2><p>{filtered.length} resultado{filtered.length === 1 ? "" : "s"}{searchQuery ? ` para “${searchQuery}”` : ""}</p></div>
              <span className="notebooks-view-chip"><LayoutGrid /> Capas</span>
            </header>

            {showNew && <section className="notebooks-create-panel">
              <header><span><Plus /></span><div><h3>Novo caderno</h3><p>Escolha uma capa agora; você pode organizar o conteúdo depois.</p></div></header>
              <div className="notebooks-create-grid">
                <label className="notebooks-create-field"><span>Nome do caderno</span><Input value={newTitle} onChange={(event) => setNewTitle(event.target.value)} onKeyDown={(event) => event.key === "Enter" && void createNotebook()} placeholder="Ex.: Anatomia — sistema nervoso" autoFocus /></label>
                <label className="notebooks-create-field"><span>Matéria</span><Select value={newSubject} onValueChange={(value) => { const selected = value === "__none__" ? "" : value; setNewSubject(selected); if (selected) setNewFolder(selected); }}><SelectTrigger><SelectValue placeholder="Sem matéria" /></SelectTrigger><SelectContent><SelectItem value="__none__">Sem matéria</SelectItem>{ALL_SUBJECTS.map((subject) => <SelectItem key={subject} value={subject}>{subject}</SelectItem>)}</SelectContent></Select></label>
                <label className="notebooks-create-field"><span>Pasta</span><Select value={newFolder} onValueChange={(value) => setNewFolder(value === "__none__" ? "" : value)}><SelectTrigger><SelectValue placeholder="Sem pasta" /></SelectTrigger><SelectContent><SelectItem value="__none__">Sem pasta</SelectItem>{allFolders.map((folder) => <SelectItem key={folder} value={folder}>{folder}</SelectItem>)}</SelectContent></Select></label>
              </div>
              <label className="notebooks-create-field mt-4"><span>Cor da capa</span><div className="notebooks-cover-picker">{COVER_COLORS.map((color) => <button key={color} type="button" className={newColor === color ? "active" : ""} style={{ backgroundColor: color }} onClick={() => setNewColor(color)} aria-label={`Usar capa ${color}`} />)}</div></label>
              <div className="notebooks-create-actions"><Button variant="ghost" onClick={() => setShowNew(false)}>Cancelar</Button><Button onClick={() => void createNotebook()} disabled={creating || !newTitle.trim()}>{creating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Criar e abrir</Button></div>
            </section>}

            {filtered.length === 0 && !showNew ? <div className="notebooks-empty">
              <span><BookOpen /></span>
              <h3>{notebooks.length === 0 ? "Seu primeiro caderno começa aqui" : "Nada encontrado"}</h3>
              <p>{notebooks.length === 0 ? "Crie uma página em branco ou abra um template completo pela área Medicina." : "Tente outro termo ou volte para todos os cadernos."}</p>
              {notebooks.length === 0 && <Button onClick={() => setShowNew(true)}><Plus className="mr-2 h-4 w-4" />Criar caderno</Button>}
            </div> : <div className="notebooks-grid">
              {filtered.map((notebook) => <article key={notebook.id} className="notebook-studio-card" onClick={() => navigate(`/notebooks/${notebook.id}`)}>
                <div className="notebook-cover" style={{ "--cover": notebook.cover_color } as React.CSSProperties}>
                  <div className="notebook-cover-top">
                    <span className="notebook-subject-pill">{notebook.subject || notebook.folder || "CADERNO LIVRE"}</span>
                    <div className="notebook-card-actions">
                      <button onClick={(event) => void toggleFavorite(notebook.id, notebook.is_favorite, event)} title={notebook.is_favorite ? "Remover dos favoritos" : "Favoritar"} aria-label={notebook.is_favorite ? "Remover dos favoritos" : "Favoritar"}><Star className={notebook.is_favorite ? "fill-amber-300 text-amber-300" : ""} /></button>
                      <button onClick={(event) => void deleteNotebook(notebook.id, event)} title="Apagar caderno" aria-label="Apagar caderno"><Trash2 /></button>
                    </div>
                  </div>
                  <div className="notebook-cover-copy">
                    <h3>{notebook.title?.trim().length > 1 ? notebook.title : "Sem título"}</h3>
                    <p>{notebook.folder ? `Pasta ${notebook.folder}` : "Anotações livres"}</p>
                    {contentMatches[notebook.id] && <span className="notebook-search-match">{contentMatches[notebook.id].replace(/<[^>]*>/g, " ")}</span>}
                  </div>
                </div>
                <div className="notebook-card-meta"><Clock3 /><span>Atualizado {formatUpdatedAt(notebook.updated_at)}</span>{notebook.topic_id && <span>Vinculado</span>}</div>
              </article>)}
            </div>}
          </section>
        </div>
      </main>
    </div>
  );
}
