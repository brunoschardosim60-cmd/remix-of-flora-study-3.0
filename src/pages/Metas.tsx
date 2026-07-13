import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Target, Check, X, Play, Pause, Archive, Trash2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type GoalStatus = "active" | "paused" | "done" | "archived";
interface Goal {
  id: string;
  kind: string;
  title: string;
  description: string | null;
  target_date: string | null;
  priority: 1 | 2 | 3;
  progress: number;
  status: GoalStatus;
  created_at: string;
  updated_at: string;
}

const STATUS_LABEL: Record<GoalStatus, string> = {
  active: "Ativas",
  paused: "Pausadas",
  done: "Concluídas",
  archived: "Arquivadas",
};

/**
 * Página completa de metas — mostra todas as metas do aluno agrupadas por status.
 * O card do dashboard só mostra as ativas; aqui o aluno vê o histórico completo.
 */
export default function Metas() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from("student_goals_v2")
      .select("*")
      .eq("user_id", user.id)
      .order("priority", { ascending: false })
      .order("created_at", { ascending: false });
    setGoals((data ?? []) as Goal[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, [user?.id]);

  const updateStatus = async (id: string, status: GoalStatus) => {
    const { error } = await supabase.from("student_goals_v2").update({ status }).eq("id", id);
    if (error) return toast.error("Não foi possível atualizar.");
    toast.success("Meta atualizada.");
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("Remover essa meta?")) return;
    await supabase.from("student_goals_v2").delete().eq("id", id);
    toast.success("Meta removida.");
    load();
  };

  const byStatus: Record<GoalStatus, Goal[]> = {
    active: goals.filter((g) => g.status === "active"),
    paused: goals.filter((g) => g.status === "paused"),
    done: goals.filter((g) => g.status === "done"),
    archived: goals.filter((g) => g.status === "archived"),
  };

  const renderList = (list: Goal[], status: GoalStatus) => {
    if (list.length === 0) {
      return <div className="text-sm text-muted-foreground py-8 text-center">Nenhuma meta {STATUS_LABEL[status].toLowerCase()}.</div>;
    }
    return (
      <div className="space-y-2">
        {list.map((g) => (
          <div key={g.id} className="p-3 rounded-xl bg-muted/30 border border-border/40 space-y-2">
            <div className="flex items-start gap-2">
              <div className="flex-1 min-w-0">
                <div className="font-medium">{g.title}</div>
                {g.target_date && (
                  <div className="text-xs text-muted-foreground">Até {g.target_date}</div>
                )}
                {g.description && (
                  <div className="text-xs text-muted-foreground mt-1">{g.description}</div>
                )}
              </div>
              <div className="flex items-center gap-1">
                {status === "active" && (
                  <button onClick={() => updateStatus(g.id, "paused")} className="p-1.5 rounded-md text-muted-foreground hover:bg-muted" title="Pausar">
                    <Pause className="w-4 h-4" />
                  </button>
                )}
                {status === "paused" && (
                  <button onClick={() => updateStatus(g.id, "active")} className="p-1.5 rounded-md text-muted-foreground hover:bg-muted" title="Retomar">
                    <Play className="w-4 h-4" />
                  </button>
                )}
                {(status === "active" || status === "paused") && (
                  <button onClick={() => updateStatus(g.id, "done")} className="p-1.5 rounded-md text-emerald-500 hover:bg-emerald-500/10" title="Concluir">
                    <Check className="w-4 h-4" />
                  </button>
                )}
                {status !== "archived" && (
                  <button onClick={() => updateStatus(g.id, "archived")} className="p-1.5 rounded-md text-muted-foreground hover:bg-muted" title="Arquivar">
                    <Archive className="w-4 h-4" />
                  </button>
                )}
                {status === "archived" && (
                  <button onClick={() => updateStatus(g.id, "active")} className="p-1.5 rounded-md text-muted-foreground hover:bg-muted" title="Reativar">
                    <Play className="w-4 h-4" />
                  </button>
                )}
                <button onClick={() => remove(g.id)} className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10" title="Remover">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
            {(status === "active" || status === "paused") && (
              <div className="flex items-center gap-2">
                <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                  <div className="h-full bg-primary transition-all" style={{ width: `${g.progress}%` }} />
                </div>
                <span className="text-xs tabular-nums text-muted-foreground w-10 text-right">{g.progress}%</span>
              </div>
            )}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto p-4 sm:p-6 space-y-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="p-2 rounded-lg hover:bg-muted"
            aria-label="Voltar"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <Target className="w-5 h-5 text-primary" />
            <h1 className="font-heading text-2xl font-semibold">Minhas metas</h1>
          </div>
        </div>

        {loading ? (
          <div className="text-sm text-muted-foreground">Carregando…</div>
        ) : (
          <Tabs defaultValue="active">
            <TabsList>
              <TabsTrigger value="active">Ativas ({byStatus.active.length})</TabsTrigger>
              <TabsTrigger value="paused">Pausadas ({byStatus.paused.length})</TabsTrigger>
              <TabsTrigger value="done">Concluídas ({byStatus.done.length})</TabsTrigger>
              <TabsTrigger value="archived">Arquivadas ({byStatus.archived.length})</TabsTrigger>
            </TabsList>
            <TabsContent value="active" className="mt-4">{renderList(byStatus.active, "active")}</TabsContent>
            <TabsContent value="paused" className="mt-4">{renderList(byStatus.paused, "paused")}</TabsContent>
            <TabsContent value="done" className="mt-4">{renderList(byStatus.done, "done")}</TabsContent>
            <TabsContent value="archived" className="mt-4">{renderList(byStatus.archived, "archived")}</TabsContent>
          </Tabs>
        )}
      </div>
    </div>
  );
}