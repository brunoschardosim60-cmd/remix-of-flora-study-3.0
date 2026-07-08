import { useState, useRef } from "react";
import { WeeklySlot, Subject, ALL_SUBJECTS, SUBJECT_COLORS } from "@/lib/studyData";
import { Check, Trash2, Plus, Clock, ChevronDown, ChevronUp, BookOpen, ArrowLeftRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";

const DIAS = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado", "Domingo"];
const DIAS_SHORT = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];

// Domingo=0 no Date; nosso array começa em Segunda=0
const TODAY_IDX = (() => {
  const d = new Date().getDay(); // 0..6 (dom..sáb)
  return d === 0 ? 6 : d - 1;
})();

const DEFAULT_HORARIOS = [
  "07:00", "08:00", "09:00", "10:00", "11:00",
  "13:00", "14:00", "15:00", "16:00",
  "18:00", "19:00", "20:00", "21:00",
];

interface WeeklyScheduleProps {
  slots: WeeklySlot[];
  onChange: (slots: WeeklySlot[]) => void;
  subjects?: Subject[];
}

export function WeeklySchedule({ slots, onChange, subjects }: WeeklyScheduleProps) {
  const subjectOptions = subjects && subjects.length ? subjects : ALL_SUBJECTS;
  const [editingSlot, setEditingSlot] = useState<string | null>(null);
  const [showAddRow, setShowAddRow] = useState(false);
  const [newHorario, setNewHorario] = useState("");
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [flashIds, setFlashIds] = useState<string[]>([]);
  const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const horarios = [...new Set(slots.map((s) => s.horario))].sort();

  const getSlot = (horario: string, dia: number) =>
    slots.find((s) => s.horario === horario && s.dia === dia);

  const updateSlot = (id: string, updates: Partial<WeeklySlot>) => {
    onChange(slots.map((s) => (s.id === id ? { ...s, ...updates } : s)));
  };

  const clearSlot = (id: string) => {
    onChange(slots.map((s) => (s.id === id ? { ...s, materia: null, descricao: "", concluido: false } : s)));
  };

  const toggleConcluido = (id: string) => {
    const slot = slots.find((s) => s.id === id);
    if (!slot) return;
    onChange(slots.map((s) => (s.id === id ? { ...s, concluido: !s.concluido } : s)));
  };

  // Drag & drop: troca o conteúdo (materia/descricao/concluido) entre dois slots
  const swapSlots = (sourceId: string, targetId: string) => {
    if (sourceId === targetId) return;
    const src = slots.find((s) => s.id === sourceId);
    const tgt = slots.find((s) => s.id === targetId);
    if (!src || !tgt) return;
    const prevSlots = slots;
    onChange(
      slots.map((s) => {
        if (s.id === sourceId) return { ...s, materia: tgt.materia, descricao: tgt.descricao, concluido: tgt.concluido };
        if (s.id === targetId) return { ...s, materia: src.materia, descricao: src.descricao, concluido: src.concluido };
        return s;
      })
    );
    // Flash animation nos dois slots envolvidos
    setFlashIds([sourceId, targetId]);
    if (flashTimer.current) clearTimeout(flashTimer.current);
    flashTimer.current = setTimeout(() => setFlashIds([]), 480);
    // Undo
    const wasMove = !tgt.materia; // destino estava vazio → foi um "mover"
    toast(wasMove ? "Atividade movida" : "Atividades trocadas", {
      action: { label: "Desfazer", onClick: () => onChange(prevSlots) },
      duration: 5000,
    });
  };

  const addHorario = () => {
    const time = newHorario.trim();
    if (!time || horarios.includes(time)) return;
    const newSlots: WeeklySlot[] = DIAS.map((_, dia) => ({
      id: `slot-${Date.now()}-${dia}`,
      dia,
      horario: time,
      materia: null,
      descricao: "",
      concluido: false,
    }));
    onChange([...slots, ...newSlots]);
    setNewHorario("");
    setShowAddRow(false);
  };

  const removeHorario = (horario: string) => {
    onChange(slots.filter((s) => s.horario !== horario));
  };

  // Stats
  const filledSlots = slots.filter((s) => s.materia);
  const completedSlots = filledSlots.filter((s) => s.concluido);
  const completionPct = filledSlots.length > 0 ? Math.round((completedSlots.length / filledSlots.length) * 100) : 0;

  // Subject distribution
  const subjectCounts: Partial<Record<Subject, number>> = {};
  for (const s of filledSlots) {
    if (s.materia) subjectCounts[s.materia] = (subjectCounts[s.materia] || 0) + 1;
  }
  const topSubjects = Object.entries(subjectCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 4);

  // Available horarios to add
  const availableHorarios = DEFAULT_HORARIOS.filter((h) => !horarios.includes(h));

  return (
    <div className="space-y-4">
      {/* Stats header — enxuto */}
      <div className="glass-card rounded-xl px-4 py-3 flex items-center gap-3">
        <BookOpen className="w-4 h-4 text-primary shrink-0" />
        <div className="flex-1 min-w-0">
          <Progress value={completionPct} className="h-1.5" />
        </div>
        <span className="text-xs font-medium text-muted-foreground tabular-nums shrink-0">
          {completedSlots.length}/{filledSlots.length}
        </span>
      </div>

      {/* Schedule table */}
      <div className="glass-card rounded-xl overflow-hidden">
        <div className="overflow-x-auto px-1 sm:px-0">
          <table className="w-full min-w-[760px] text-sm">
            <thead>
              <tr className="border-b border-border/60">
                <th className="p-2.5 font-heading font-medium text-left w-[80px] text-xs text-muted-foreground uppercase tracking-wide">
                  Hora
                </th>
                {DIAS.map((dia, i) => (
                  <th
                    key={dia}
                    className={`p-2.5 font-heading font-medium text-center text-xs uppercase tracking-wide ${
                      i === TODAY_IDX ? "text-primary" : "text-muted-foreground"
                    }`}
                  >
                    <span className="hidden sm:inline">{DIAS_SHORT[i]}</span>
                    <span className="sm:hidden">{DIAS_SHORT[i]}</span>
                  </th>
                ))}
                <th className="p-2 w-[32px]" />
              </tr>
            </thead>
            <tbody>
              {horarios.map((horario) => {
                return (
                  <tr key={horario} className="border-b border-border/30 last:border-0 group/row">
                    <td className="p-2.5 align-middle">
                      <span className="text-xs font-medium text-muted-foreground tabular-nums">{horario}</span>
                    </td>
                    {DIAS.map((_, dia) => {
                      const slot = getSlot(horario, dia);
                      if (!slot) return <td key={dia} className={`p-2 ${dia === TODAY_IDX ? "bg-muted/20" : ""}`} />;

                      const isEditing = editingSlot === slot.id;
                      const displaySlot = slot;
                      const isPreview = false;
                      const isDragSource = draggingId === slot.id;
                      const isDragTarget = dragOverId === slot.id && draggingId && draggingId !== slot.id;
                      const isFlashing = flashIds.includes(slot.id);

                      return (
                        <td key={dia} className="p-1">
                          {isEditing ? (
                            <div className="space-y-1.5 p-1">
                              <select
                                value={slot.materia || ""}
                                onChange={(e) => updateSlot(slot.id, { materia: (e.target.value || null) as Subject | null })}
                                className="w-full text-xs px-2 py-1.5 rounded-lg bg-muted border border-border focus:ring-2 focus:ring-primary/30 outline-none"
                              >
                                <option value="">— Matéria —</option>
                                {subjectOptions.map((s) => (
                                  <option key={s} value={s}>{s}</option>
                                ))}
                              </select>
                              <input
                                type="text"
                                value={slot.descricao}
                                onChange={(e) => updateSlot(slot.id, { descricao: e.target.value })}
                                placeholder="Descrição..."
                                className="w-full text-xs px-2 py-1.5 rounded-lg bg-muted border border-border focus:ring-2 focus:ring-primary/30 outline-none"
                              />
                              <div className="flex gap-1">
                                <button
                                  onClick={() => setEditingSlot(null)}
                                  className="text-xs text-primary font-semibold px-2 py-1 rounded-md hover:bg-primary/10 transition-colors"
                                >
                                  OK
                                </button>
                                <button
                                  onClick={() => { clearSlot(slot.id); setEditingSlot(null); }}
                                  className="text-xs text-muted-foreground px-2 py-1 rounded-md hover:bg-muted transition-colors"
                                >
                                  Limpar
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div
                              draggable={!!slot.materia}
                              role={slot.materia ? "button" : undefined}
                              tabIndex={0}
                              aria-label={
                                slot.materia
                                  ? `${slot.materia}${slot.descricao ? " — " + slot.descricao : ""}, ${DIAS[dia]} às ${horario}${slot.concluido ? ", concluído" : ""}. Clique para editar, arraste para trocar.`
                                  : `Slot vazio, ${DIAS[dia]} às ${horario}. Clique para adicionar matéria.`
                              }
                              onKeyDown={(e) => {
                                if (e.key === "Enter" || e.key === " ") {
                                  e.preventDefault();
                                  setEditingSlot(slot.id);
                                }
                              }}
                              onDragStart={(e) => {
                                if (!slot.materia) return;
                                setDraggingId(slot.id);
                                e.dataTransfer.effectAllowed = "move";
                                e.dataTransfer.setData("text/plain", slot.id);
                              }}
                              onDragEnd={() => { setDraggingId(null); setDragOverId(null); }}
                              onDragEnter={(e) => {
                                if (!draggingId || draggingId === slot.id) return;
                                e.preventDefault();
                                if (dragOverId !== slot.id) setDragOverId(slot.id);
                              }}
                              onDragOver={(e) => {
                                if (!draggingId || draggingId === slot.id) return;
                                e.preventDefault();
                                e.dataTransfer.dropEffect = "move";
                              }}
                              onDrop={(e) => {
                                e.preventDefault();
                                const sourceId = e.dataTransfer.getData("text/plain") || draggingId;
                                if (sourceId) swapSlots(sourceId, slot.id);
                                setDraggingId(null);
                                setDragOverId(null);
                              }}
                              onClick={() => setEditingSlot(slot.id)}
                              className={`px-2 py-1.5 rounded-md cursor-pointer min-h-[44px] flex flex-col justify-center gap-0.5 relative group outline-none focus-visible:ring-2 focus-visible:ring-primary
                                ${displaySlot.materia
                                  ? `${SUBJECT_COLORS[displaySlot.materia]} bg-opacity-90 cursor-grab active:cursor-grabbing ${displaySlot.concluido ? "opacity-60" : ""}`
                                  : "hover:bg-muted/40"
                                }
                                ${dia === TODAY_IDX && !displaySlot.materia ? "bg-muted/20" : ""}
                                ${isDragSource ? "opacity-40" : ""}
                                ${isDragTarget ? "ring-2 ring-primary" : ""}
                                ${isFlashing ? "animate-swap-pop" : ""}`}
                            >
                              {isDragTarget && (
                                <div className="absolute -top-2 -left-2 z-20 flex items-center gap-0.5 rounded-full bg-primary px-1.5 py-0.5 text-[9px] font-bold text-primary-foreground shadow-md">
                                  <ArrowLeftRight className="w-2.5 h-2.5" />
                                  trocar
                                </div>
                              )}

                              {/* Action buttons */}
                              {slot.materia && !isPreview && (
                                <div className="absolute top-0.5 right-0.5 flex gap-0.5 transition-all z-10 opacity-0 scale-75 group-hover:opacity-100 group-hover:scale-100 group-focus-within:opacity-100 group-focus-within:scale-100">
                                  <button
                                    onClick={(e) => { e.stopPropagation(); toggleConcluido(slot.id); }}
                                    className={`p-1 rounded-md transition-all ${slot.concluido ? "bg-secondary/20 text-secondary" : "hover:bg-muted text-muted-foreground"}`}
                                    title={slot.concluido ? "Desmarcar" : "Concluir"}
                                    aria-label={slot.concluido ? "Desmarcar como concluído" : "Marcar como concluído"}
                                  >
                                    <Check className="w-3 h-3" />
                                  </button>
                                  <button
                                    onClick={(e) => { e.stopPropagation(); clearSlot(slot.id); }}
                                    className="p-1 rounded-md hover:bg-muted text-muted-foreground transition-all"
                                    title="Limpar"
                                    aria-label="Limpar esta atividade"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                </div>
                              )}

                              {displaySlot.materia ? (
                                <>
                                  <span className="text-[11px] font-semibold text-primary-foreground truncate leading-tight">
                                    {displaySlot.materia}
                                    {displaySlot.concluido && <Check className="w-3 h-3 inline ml-1 -mt-0.5" />}
                                  </span>
                                  {displaySlot.descricao && (
                                    <span className="text-[10px] text-primary-foreground/75 truncate leading-tight">
                                      {displaySlot.descricao}
                                    </span>
                                  )}
                                </>
                              ) : (
                                <span className="text-xs text-muted-foreground/30 text-center opacity-0 group-hover:opacity-100 transition-opacity">+</span>
                              )}
                            </div>
                          )}
                        </td>
                      );
                    })}
                    <td className="p-1">
                      <button
                        onClick={() => removeHorario(horario)}
                        className="p-1 rounded-md text-muted-foreground/40 hover:text-destructive hover:bg-destructive/10 transition-all opacity-0 group-hover/row:opacity-100"
                        title="Remover horário"
                        aria-label={`Remover linha do horário ${horario}`}
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Add horario row */}
        <div className="border-t border-border/50 p-3">
          {showAddRow ? (
            <div className="flex items-center gap-2 flex-wrap">
              {availableHorarios.length > 0 ? (
                <select
                  value={newHorario}
                  onChange={(e) => setNewHorario(e.target.value)}
                  className="text-xs px-3 py-1.5 rounded-lg bg-muted border border-border focus:ring-2 focus:ring-primary/30 outline-none"
                >
                  <option value="">Escolher horário</option>
                  {availableHorarios.map((h) => (
                    <option key={h} value={h}>{h}</option>
                  ))}
                </select>
              ) : (
                <input
                  type="time"
                  value={newHorario}
                  onChange={(e) => setNewHorario(e.target.value)}
                  className="text-xs px-3 py-1.5 rounded-lg bg-muted border border-border"
                />
              )}
              <Button size="sm" variant="default" onClick={addHorario} disabled={!newHorario} className="text-xs h-7 gap-1">
                <Plus className="w-3 h-3" /> Adicionar
              </Button>
              <Button size="sm" variant="ghost" onClick={() => { setShowAddRow(false); setNewHorario(""); }} className="text-xs h-7">
                Cancelar
              </Button>
            </div>
          ) : (
            <button
              onClick={() => setShowAddRow(true)}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors font-medium"
            >
              <Plus className="w-3.5 h-3.5" />
              Adicionar horário
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
