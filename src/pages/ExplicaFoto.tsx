/**
 * /explica-foto — usuário fotografa um exercício do caderno físico, Flora
 * extrai o texto (OCR existente) e resolve passo a passo.
 */
import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Camera, Loader2, Sparkles, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { BottomNav } from "@/components/BottomNav";
import { toast } from "sonner";

async function fileToBase64(file: File): Promise<string> {
  const buf = new Uint8Array(await file.arrayBuffer());
  let bin = "";
  for (let i = 0; i < buf.length; i++) bin += String.fromCharCode(buf[i]);
  return btoa(bin);
}

export default function ExplicaFoto() {
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [extracted, setExtracted] = useState<string>("");
  const [explanation, setExplanation] = useState<string>("");
  const [loading, setLoading] = useState<null | "ocr" | "explain">(null);

  const reset = () => {
    setImageUrl(null);
    setExtracted("");
    setExplanation("");
    if (fileRef.current) fileRef.current.value = "";
  };

  const handleFile = async (file: File) => {
    if (!file) return;
    setImageUrl(URL.createObjectURL(file));
    setExtracted("");
    setExplanation("");
    setLoading("ocr");
    try {
      const base64 = await fileToBase64(file);
      const { data, error } = await supabase.functions.invoke("ocr-notebook", { body: { image: base64 } });
      if (error) throw error;
      const text = String(data?.text || "").trim();
      if (!text) throw new Error("Não consegui ler o texto da imagem.");
      setExtracted(text);
      await explain(text);
    } catch (e: any) {
      toast.error(e?.message || "Erro ao processar imagem");
      setLoading(null);
    }
  };

  const explain = async (text: string) => {
    setLoading("explain");
    try {
      const { data, error } = await supabase.functions.invoke("solve-math", {
        body: { problema: text, mode: "step-by-step" },
      }).catch(async () => {
        // Fallback: explain-question
        return await supabase.functions.invoke("explain-question", { body: { enunciado: text } });
      });
      if (error) throw error;
      const resp =
        (data?.solucao as string) ||
        (data?.explicacao as string) ||
        (data?.text as string) ||
        (typeof data === "string" ? data : "");
      if (!resp) throw new Error("Flora não retornou resposta.");
      setExplanation(resp);
    } catch (e: any) {
      toast.error(e?.message || "Erro ao gerar explicação");
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="min-h-dvh bg-background pb-20 md:pb-6">
      <header className="border-b border-border bg-card sticky top-0 z-10">
        <div className="container max-w-3xl mx-auto px-3 sm:px-4 py-3 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} aria-label="Voltar">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1 min-w-0">
            <h1 className="text-base font-bold truncate flex items-center gap-2">
              <Camera className="w-4 h-4 text-primary" /> Explica essa foto
            </h1>
            <p className="text-xs text-muted-foreground truncate">Fotografe o exercício e a Flora resolve</p>
          </div>
          {imageUrl && (
            <Button variant="ghost" size="icon" onClick={reset} aria-label="Nova foto">
              <RefreshCw className="w-5 h-5" />
            </Button>
          )}
        </div>
      </header>

      <main className="container max-w-3xl mx-auto px-3 sm:px-4 py-6 space-y-4">
        {!imageUrl && (
          <button
            onClick={() => fileRef.current?.click()}
            className="w-full rounded-2xl border-2 border-dashed border-border bg-card hover:bg-muted/40 transition-colors p-10 text-center space-y-3"
          >
            <Camera className="w-10 h-10 text-muted-foreground mx-auto" />
            <p className="font-semibold">Tirar foto ou escolher imagem</p>
            <p className="text-xs text-muted-foreground">JPG ou PNG · máx 10 MB</p>
          </button>
        )}
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) void handleFile(f); }}
        />

        {imageUrl && (
          <div className="rounded-2xl border border-border bg-card p-3">
            <img src={imageUrl} alt="Exercício" className="w-full rounded-xl max-h-80 object-contain bg-muted" />
          </div>
        )}

        {loading === "ocr" && (
          <div className="rounded-2xl border border-border bg-card p-5 text-center space-y-2">
            <Loader2 className="w-6 h-6 animate-spin text-primary mx-auto" />
            <p className="text-sm text-muted-foreground">Lendo a imagem...</p>
          </div>
        )}

        {extracted && (
          <div className="rounded-2xl border border-border bg-card p-4 space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Texto lido</p>
            <p className="text-sm leading-relaxed whitespace-pre-wrap">{extracted}</p>
          </div>
        )}

        {loading === "explain" && (
          <div className="rounded-2xl border border-border bg-card p-5 text-center space-y-2">
            <Sparkles className="w-6 h-6 text-primary mx-auto animate-pulse" />
            <p className="text-sm text-muted-foreground">Flora está resolvendo...</p>
          </div>
        )}

        {explanation && (
          <div className="rounded-2xl border border-primary/30 bg-primary/5 p-4 space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-primary flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" /> Flora explica
            </p>
            <p className="text-sm leading-relaxed whitespace-pre-wrap">{explanation}</p>
          </div>
        )}
      </main>
      <BottomNav />
    </div>
  );
}