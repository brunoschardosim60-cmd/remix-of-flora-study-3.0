import { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence, Reorder } from "framer-motion";
import {
  Settings2, GripVertical, Eye, EyeOff, RotateCcw, Check, X,
  BarChart3, Trophy, Brain, Calendar, AlertTriangle, Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export interface DashboardWidget {
  id: string;
  label: string;
  description: string;
  icon: React.ElementType;
  visible: boolean;
  order: number;
}

const WIDGET_DEFINITIONS: Omit<DashboardWidget, "visible" | "order">[] = [
  { id: "gamification", label: "Gamificação", description: "XP, nível e metas diárias", icon: Trophy },
  { id: "stats", label: "Estatísticas", description: "Horas, questões e streak", icon: BarChart3 },
  { id: "flashcards_banner", label: "Banner de Flashcards", description: "Atalho para flashcards pendentes", icon: Brain },
  { id: "overdue", label: "Revisões atrasadas", description: "Lista de revisões em atraso", icon: AlertTriangle },
  { id: "today_revisions", label: "Revisões de hoje", description: "Revisões agendadas para hoje", icon: Clock },
  { id: "weekly_summary", label: "Resumo semanal", description: "Próximas revisões e visão da semana", icon: Calendar },
];

const DEFAULT_WIDGETS: DashboardWidget[] = WIDGET_DEFINITIONS.map((w, i) => ({
  ...w, visible: true, order: i,
}));

const STORAGE_KEY = "flora-dashboard-widgets-v2";
const STORAGE_EVENT = "flora-dashboard-widgets-changed";

function loadWidgets(): DashboardWidget[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_WIDGETS;
    const saved = JSON.parse(raw) as Array<Omit<DashboardWidget, "icon">>;
    const validIds = new Set(WIDGET_DEFINITIONS.map((d) => d.id));
    const filtered = saved.filter((w) => validIds.has(w.id));
    const savedIds = new Set(filtered.map((w) => w.id));
    const missing = DEFAULT_WIDGETS.filter((w) => !savedIds.has(w.id))
      .map((w, i) => ({ ...w, order: filtered.length + i }));
    return [...filtered, ...missing].map((w) => {
      const def = WIDGET_DEFINITIONS.find((d) => d.id === w.id)!;
      return { ...w, icon: def.icon, label: def.label, description: def.description };
    }).sort((a, b) => a.order - b.order);
  } catch {
    return DEFAULT_WIDGETS;
  }
}

function saveWidgets(widgets: DashboardWidget[]): void {
  const toSave = widgets.map(({ icon: _i, ...rest }) => rest);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
  window.dispatchEvent(new Event(STORAGE_EVENT));
}

export function DashboardCustomizer() {
  const [isOpen, setIsOpen] = useState(false);
  const [widgets, setWidgets] = useState<DashboardWidget[]>(loadWidgets);
  const [hasChanges, setHasChanges] = useState(false);

  const toggleWidget = useCallback((id: string) => {
    setWidgets((prev) => prev.map((w) => w.id === id ? { ...w, visible: !w.visible } : w));
    setHasChanges(true);
  }, []);

  const handleReorder = useCallback((newOrder: DashboardWidget[]) => {
    setWidgets(newOrder.map((w, i) => ({ ...w, order: i })));
    setHasChanges(true);
  }, []);

  const saveChanges = useCallback(() => {
    saveWidgets(widgets);
    setHasChanges(false);
    toast.success("Dashboard personalizado salvo!");
    setIsOpen(false);
  }, [widgets]);

  const resetToDefault = useCallback(() => {
    setWidgets(DEFAULT_WIDGETS);
    saveWidgets(DEFAULT_WIDGETS);
    setHasChanges(false);
    toast.success("Dashboard restaurado para o padrão.");
  }, []);

  const visibleCount = widgets.filter((w) => w.visible).length;

  return (
    <div className="relative">
      <Button variant="outline" size="sm" className="gap-2" onClick={() => setIsOpen((v) => !v)}>
        <Settings2 className="w-4 h-4" />
        Personalizar Dashboard
        {hasChanges && <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />}
      </Button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -10 }}
            className="absolute left-0 sm:right-0 sm:left-auto top-10 z-50 w-[min(20rem,calc(100vw-2rem))] sm:w-96 rounded-2xl border bg-card shadow-xl overflow-hidden"
          >
            <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/30">
              <div>
                <h3 className="font-bold text-sm">Personalizar Dashboard</h3>
                <p className="text-xs text-muted-foreground">{visibleCount} de {widgets.length} visíveis</p>
              </div>
              <Button variant="ghost" size="icon" className="w-7 h-7" onClick={() => setIsOpen(false)}>
                <X className="w-4 h-4" />
              </Button>
            </div>

            <div className="max-h-96 overflow-y-auto p-3">
              <p className="text-xs text-muted-foreground mb-2 px-1">
                Arraste para reordenar. Clique no olho para mostrar/ocultar.
              </p>
              <Reorder.Group axis="y" values={widgets} onReorder={handleReorder} className="space-y-1.5">
                {widgets.map((widget) => {
                  const Icon = widget.icon;
                  return (
                    <Reorder.Item
                      key={widget.id}
                      value={widget}
                      className={`flex items-center gap-2 rounded-xl border p-2.5 cursor-grab active:cursor-grabbing transition-colors ${
                        widget.visible ? "bg-card border-border" : "bg-muted/30 border-border/50 opacity-60"
                      }`}
                    >
                      <GripVertical className="w-4 h-4 text-muted-foreground shrink-0" />
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${widget.visible ? "bg-primary/10" : "bg-muted"}`}>
                        <Icon className={`w-4 h-4 ${widget.visible ? "text-primary" : "text-muted-foreground"}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate">{widget.label}</p>
                        <p className="text-[10px] text-muted-foreground truncate">{widget.description}</p>
                      </div>
                      <button
                        onClick={() => toggleWidget(widget.id)}
                        className={`p-1.5 rounded-lg transition-colors shrink-0 ${
                          widget.visible ? "text-primary hover:bg-primary/10" : "text-muted-foreground hover:bg-muted"
                        }`}
                        title={widget.visible ? "Ocultar" : "Mostrar"}
                      >
                        {widget.visible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                      </button>
                    </Reorder.Item>
                  );
                })}
              </Reorder.Group>
            </div>

            <div className="flex items-center gap-2 px-3 py-3 border-t bg-muted/20">
              <Button variant="ghost" size="sm" className="gap-1.5 text-xs" onClick={resetToDefault}>
                <RotateCcw className="w-3.5 h-3.5" /> Padrão
              </Button>
              <Button size="sm" className="flex-1 gap-1.5" onClick={saveChanges} disabled={!hasChanges}>
                <Check className="w-4 h-4" /> Salvar
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function useDashboardWidgets() {
  const [widgets, setWidgets] = useState<DashboardWidget[]>(loadWidgets);

  useEffect(() => {
    const handler = () => setWidgets(loadWidgets());
    window.addEventListener("storage", handler);
    window.addEventListener(STORAGE_EVENT, handler);
    return () => {
      window.removeEventListener("storage", handler);
      window.removeEventListener(STORAGE_EVENT, handler);
    };
  }, []);

  const isVisible = useCallback(
    (id: string) => widgets.find((w) => w.id === id)?.visible ?? true,
    [widgets]
  );

  return { widgets, isVisible };
}
