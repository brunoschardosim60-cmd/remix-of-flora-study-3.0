import { FileUp } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AdminPdfReprocessPanel } from "@/components/admin/AdminPdfReprocessPanel";
import { AdminPdfBatchPanel } from "@/components/admin/AdminPdfBatchPanel";

export function PdfPanel() {
  return (
    <section>
      <div className="mb-3 flex items-center gap-2">
        <FileUp className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-semibold">Reprocessar questão a partir do PDF</h2>
      </div>
      <p className="text-xs text-muted-foreground mb-3">
        Faça upload do PDF da prova oficial e extraia uma questão por vez ou várias em lote. Revise e aplique ao banco.
      </p>
      <Tabs defaultValue="single">
        <TabsList>
          <TabsTrigger value="single">Uma questão</TabsTrigger>
          <TabsTrigger value="batch">Em lote</TabsTrigger>
        </TabsList>
        <TabsContent value="single" className="mt-3">
          <AdminPdfReprocessPanel />
        </TabsContent>
        <TabsContent value="batch" className="mt-3">
          <AdminPdfBatchPanel />
        </TabsContent>
      </Tabs>
    </section>
  );
}