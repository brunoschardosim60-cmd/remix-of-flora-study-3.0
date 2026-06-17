import { FileQuestion } from "lucide-react";
import { AdminConcursoQuestionsPanel } from "@/components/admin/AdminConcursoQuestionsPanel";

export function ConcursoPanel() {
  return (
    <section>
      <div className="mb-3 flex items-center gap-2">
        <FileQuestion className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-semibold">Banco de Concurso — CRUD</h2>
      </div>
      <p className="text-xs text-muted-foreground mb-3">
        Cadastre questões de concurso por banca (CESPE, FCC, FGV, Vunesp…), múltipla escolha ou certo/errado, com explicação e tags.
      </p>
      <AdminConcursoQuestionsPanel />
    </section>
  );
}