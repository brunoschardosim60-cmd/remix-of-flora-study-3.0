import { FileQuestion } from "lucide-react";
import { AdminQuestionsPanel } from "@/components/admin/AdminQuestionsPanel";
import { AdminTemaClassifierPanel } from "@/components/admin/AdminTemaClassifierPanel";

export function EnemPanel() {
  return (
    <section>
      <div className="mb-3 flex items-center gap-2">
        <FileQuestion className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-semibold">Banco de Questões — Reparo manual</h2>
      </div>
      <p className="text-xs text-muted-foreground mb-3">
        Encontre questões quebradas (alternativas faltando, sem gabarito, enunciado vazio…) e corrija manualmente.
      </p>
      <AdminTemaClassifierPanel />
      <AdminQuestionsPanel />
    </section>
  );
}