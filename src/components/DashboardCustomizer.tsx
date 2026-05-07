import { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence, Reorder } from "framer-motion";
import {
  Settings2, GripVertical, Eye, EyeOff, RotateCcw, Check,
  BarChart3, Trophy, Calendar, BookOpen, Brain, Flame,
  Clock, Target, Users, WifiOff, X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export interface DashboardWidget {
  id: string;
  label: string;
  description: string;
  icon: React.ElementType;
  visible: boolean;
  order: number;
  category: "progress" | "study" | "social" | "tools";
}

const WIDGET_DEFINITIONS: Omit<DashboardWidget, "visible" | "order">[] = [
  {
    id: "gamification",
    label: "Gamificação",
    description: "XP, nível e metas diárias",
    icon: Trophy,
    category: "progress",
  },
  {
    id: "rewards",
    label: "Recompensas",
    description: "Badges, avatares e conquistas",
    icon: Trophy,
    category: "progress",
  },
  {
    id: "stats",
    label: "Estatísticas",
    description: "Horas estudadas, questões e streak",
    icon: BarChart3,
    category: "progress",
  },
  {
    id: "streak",
    label: "Sequência de Estudos",
    description: "Dias consecutivos de estudo",
    icon: Flame,
    category: "progress",
  },
  {
    id: "schedule",
    label: "Cronograma Semanal",
    description: "Agenda de estudos da semana",
    icon: Calendar,
    category: "study",
  },
  {
    id: "topics",
    label: "Tópicos de Estudo",
    description: "Progresso nos tópicos",
    icon: BookOpen,
    category: "study",
  },
  {
    id: "flashcards",
    label: "Flashcards",
    description: "Revisão com flashcards",
    icon: Brain,
    category: "study",
  },
  {
    id: "focus",
    label: "Modo Foco",
    description: "Timer Pomodoro e foco",
    icon: Clock,
    category: "study",
  },
  {
    id: "goals",
    label: "Metas",
    description: "Metas de estudo e progresso",
    icon: Target,
    category: "progress",
  },
  {
    id: "communities",
    label: "Comunidades",
    description: "Grupos de estudo e discussões",
    icon: Users,
    category: "social",
  },
  {
    id: "offline",
    label: "Modo Offline",
    description: "Conteúdo disponível offline",
    icon: WifiOff,
    category: "tools",
  },
  {
    id: "calendar",
    label: "Calendário",
    description: "Integração com Google Calendar e Outlook",
    icon: Calendar,
    category: "tools",
  },
];

const DEFAULT_WIDGETS: DashboardWidget[] = WIDGET_DEFINITIONS.map((w, i) => ({
  ...w,
  visible: true,
  order: i,
}));

const STORAGE_KEY = "flora-dashboard-widgets";

function loadWidgets(): DashboardWidget[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_WIDGETS;
    const saved = JSON.parse(raw) as DashboardWidget[];
    // Merge with definitions to pick up new widgets
    const savedIds = new Set(saved.map((w) => w.id));
    const newWidgets = DEFAULT_WIDGETS.filter((w) => !savedIds.has(w.id)).map((w, i) => ({
      ...w,
      order: saved.length + i,
    }));
    return [...saved, ...newWidgets].map((w) => {
      const def = WIDGET_DEFINITIONS.find((d) => d.id === w.id);
      return def ? { ...w, icon: def.icon, label: def.label, description: def.description } : w;
    });
  } catch {
    return DEFAULT_WIDGETS;
  }
}

function saveWidgets(widgets: DashboardWidget[]): void {
  const toSave = widgets.map(({ icon: _icon, ...rest }) => rest);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
}

const CATEGORY_LABELS: Record<DashboardWidget["category"], string> = {
  progress: "Progresso",
  study: "Estudo",
  social: "Social",
  tools: "Ferramentas",
};

const CATEGORY_COLORS: Record<DashboardWidget["category"], string> = {
  progress: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
  study: "bg-green-500/10 text-green-700 dark:text-green-400",
  social: "bg-purple-500/10 text-purple-700 dark:text-purple-400",
  tools: "bg-orange-500/10 text-orange-700 dark:text-orange-400",
};

interface DashboardCustomizerProps {
  onWidgetsChange?: (widgets: DashboardWidget[]) => void;
}

export function DashboardCustomizer({ onWidgetsChange }: DashboardCustomizerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [widgets, setWidgets] = useState<DashboardWidget[]>(loadWidgets);
  const [hasChanges, setHasChanges] = useState(false);

  const updateWidgets = useCallback((newWidgets: DashboardWidget[]) => {
    setWidgets(newWidgets);
    setHasChanges(true);
  }, []);

  const toggleWidget = useCallback((id: string) => {
    setWidgets((prev) => {
      const updated = prev.map((w) =>
        w.id === id ? { ...w, visible: !w.visible } : w
      );
      setHasChanges(true);
      return updated;
    });
  }, []);

  const handleReorder = useCallback((newOrder: DashboardWidget[]) => {
    const reordered = newOrder.map((w, i) => ({ ...w, order: i }));
    setWidgets(reordered);
    setHasChanges(true);
  }, []);

  const saveChanges = useCallback(() => {
    saveWidgets(widgets);
    onWidgetsChange?.(widgets);
    setHasChanges(false);
    toast.success("Dashboard personalizado salvo!");
    setIsOpen(false);
  }, [widgets, onWidgetsChange]);

  const resetToDefault = useCallback(() => {
    setWidgets(DEFAULT_WIDGETS);
    saveWidgets(DEFAULT_WIDGETS);
    onWidgetsChange?.(DEFAULT_WIDGETS);
    setHasChanges(false);
    toast.success("Dashboard restaurado para o padrão.");
  }, [onWidgetsChange]);

  const visibleCount = widgets.filter((w) => w.visible).length;

  return (
    <div className="relative">
      {/* Botão flutuante de personalização */}
      <Button
        variant="outline"
        size="sm"
        className="gap-2"
        onClick={() => setIsOpen((v) => !v)}
      >
        <Settings2 className="w-4 h-4" />
        Personalizar Dashboard
        {hasChanges && (
          <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
        )}
      </Button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -10 }}
            className="absolute right-0 top-10 z-50 w-80 sm:w-96 rounded-2xl border bg-card shadow-xl overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/30">
              <div>
                <h3 className="font-bold text-sm">Personalizar Dashboard</h3>
                <p className="text-xs text-muted-foreground">
                  {visibleCount} de {widgets.length} widgets visíveis
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="w-7 h-7"
                onClick={() => setIsOpen(false)}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            {/* Lista de widgets reordenável */}
            <div className="max-h-96 overflow-y-auto p-3">
              <p className="text-xs text-muted-foreground mb-2 px-1">
                Arraste para reordenar. Clique no olho para mostrar/ocultar.
              </p>
              <Reorder.Group
                axis="y"
                values={widgets}
                onReorder={handleReorder}
                className="space-y-1.5"
              >
                {widgets.map((widget) => {
                  const Icon = widget.icon;
                  return (
                    <Reorder.Item
                      key={widget.id}
                      value={widget}
                      className={`flex items-center gap-2 rounded-xl border p-2.5 cursor-grab active:cursor-grabbing transition-colors ${
                        widget.visible
                          ? "bg-card border-border"
                          : "bg-muted/30 border-border/50 opacity-60"
                      }`}
                    >
                      <GripVertical className="w-4 h-4 text-muted-foreground shrink-0" />
                      <div
                        className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                          widget.visible ? "bg-primary/10" : "bg-muted"
                        }`}
                      >
                        <Icon className={`w-4 h-4 ${widget.visible ? "text-primary" : "text-muted-foreground"}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="text-xs font-medium truncate">{widget.label}</p>
                          <Badge
                            variant="secondary"
                            className={`text-[9px] px-1 py-0 shrink-0 ${CATEGORY_COLORS[widget.category]}`}
                          >
                            {CATEGORY_LABELS[widget.category]}
                          </Badge>
                        </div>
                        <p className="text-[10px] text-muted-foreground truncate">
                          {widget.description}
                        </p>
                      </div>
                      <button
                        onClick={() => toggleWidget(widget.id)}
                        className={`p-1.5 rounded-lg transition-colors shrink-0 ${
                          widget.visible
                            ? "text-primary hover:bg-primary/10"
                            : "text-muted-foreground hover:bg-muted"
                        }`}
                        title={widget.visible ? "Ocultar widget" : "Mostrar widget"}
                      >
                        {widget.visible ? (
                          <Eye className="w-4 h-4" />
                        ) : (
                          <EyeOff className="w-4 h-4" />
                        )}
                      </button>
                    </Reorder.Item>
                  );
                })}
              </Reorder.Group>
            </div>

            {/* Footer */}
            <div className="flex items-center gap-2 px-3 py-3 border-t bg-muted/20">
              <Button
                variant="ghost"
                size="sm"
                className="gap-1.5 text-xs"
                onClick={resetToDefault}
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Restaurar padrão
              </Button>
              <Button
                size="sm"
                className="flex-1 gap-1.5"
                onClick={saveChanges}
                disabled={!hasChanges}
              >
                <Check className="w-4 h-4" />
                Salvar
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Hook para usar as configurações de widgets
export function useDashboardWidgets() {
  const [widgets, setWidgets] = useState<DashboardWidget[]>(loadWidgets);

  useEffect(() => {
    const handler = () => setWidgets(loadWidgets());
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }, []);

  const isVisible = useCallback(
    (id: string) => widgets.find((w) => w.id === id)?.visible ?? true,
    [widgets]
  );

  return { widgets, setWidgets, isVisible };
}
