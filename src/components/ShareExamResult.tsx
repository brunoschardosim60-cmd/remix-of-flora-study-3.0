import { useRef, useState } from "react";
import { Share2, Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface ShareExamResultProps {
  score: number;
  total: number;
  elapsedSeconds: number;
  disciplina?: string;
  ano?: number;
  /** Banca do simulado (ex: "CESPE", "FCC"). Quando fornecida, exibida no lugar de "ENEM <ano>". */
  banca?: string;
}

export function ShareExamResult({ score, total, elapsedSeconds, disciplina, ano, banca }: ShareExamResultProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState(false);

  const pct = Math.round((score / Math.max(total, 1)) * 100);
  const minutes = Math.floor(elapsedSeconds / 60);
  const seconds = elapsedSeconds % 60;
  const timeLabel = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  // Se vier banca (concurso), usa banca + ano; senão usa "ENEM <ano>" para vestibular/ENEM.
  const anoLabel = ano ? (banca ? `${banca.toUpperCase()} ${ano}` : `ENEM ${ano}`) : null;
  const subtitle = [disciplina, anoLabel].filter(Boolean).join(" · ") || "Simulado StudyFlow";

  async function renderCardToBlob(): Promise<Blob | null> {
    // Renderiza o card via SVG → canvas → blob (sem libs externas)
    const w = 1080;
    const h = 1080;
    const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#0f172a"/>
      <stop offset="100%" stop-color="#1e293b"/>
    </linearGradient>
    <linearGradient id="accent" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#6366f1"/>
      <stop offset="100%" stop-color="#8b5cf6"/>
    </linearGradient>
  </defs>
  <rect width="${w}" height="${h}" fill="url(#bg)"/>
  <circle cx="${w - 120}" cy="120" r="240" fill="url(#accent)" opacity="0.18"/>
  <circle cx="120" cy="${h - 120}" r="280" fill="url(#accent)" opacity="0.12"/>

  <text x="80" y="160" font-family="system-ui, -apple-system, Segoe UI" font-size="34" fill="#94a3b8" font-weight="500">StudyFlow · Simulado</text>
  <text x="80" y="220" font-family="system-ui" font-size="42" fill="#e2e8f0" font-weight="600">${escapeXml(subtitle)}</text>

  <text x="80" y="540" font-family="system-ui" font-size="280" fill="#ffffff" font-weight="900">${score}<tspan fill="#94a3b8" font-size="120">/${total}</tspan></text>
  <text x="80" y="620" font-family="system-ui" font-size="56" fill="url(#accent)" font-weight="700">${pct}% de acerto</text>

  <rect x="80" y="700" width="${w - 160}" height="2" fill="#334155"/>

  <text x="80" y="800" font-family="system-ui" font-size="32" fill="#94a3b8">Tempo</text>
  <text x="80" y="860" font-family="system-ui" font-size="64" fill="#e2e8f0" font-weight="700">${timeLabel}</text>

  <text x="${w - 80}" y="800" text-anchor="end" font-family="system-ui" font-size="32" fill="#94a3b8">Acertos</text>
  <text x="${w - 80}" y="860" text-anchor="end" font-family="system-ui" font-size="64" fill="#10b981" font-weight="700">${score} ✓</text>

  <text x="80" y="${h - 80}" font-family="system-ui" font-size="28" fill="#64748b">Estude com IA — studyflow</text>
</svg>`.trim();

    return new Promise((resolve) => {
      const img = new Image();
      const url = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (!ctx) return resolve(null);
        ctx.drawImage(img, 0, 0);
        canvas.toBlob((blob) => resolve(blob), "image/png");
      };
      img.onerror = () => resolve(null);
      img.src = url;
    });
  }

  async function handleShare() {
    setBusy(true);
    try {
      const blob = await renderCardToBlob();
      if (!blob) {
        toast.error("Não foi possível gerar a imagem.");
        return;
      }
      const file = new File([blob], "simulado-studyflow.png", { type: "image/png" });
      const shareData: ShareData = {
        title: "Meu resultado no simulado",
        text: `Acertei ${score}/${total} (${pct}%) no simulado ${subtitle} do StudyFlow!`,
        files: [file],
      };
      if (navigator.canShare?.({ files: [file] }) && navigator.share) {
        await navigator.share(shareData);
      } else {
        // Fallback: download
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "simulado-studyflow.png";
        a.click();
        URL.revokeObjectURL(url);
        toast.success("Imagem baixada — pronta para compartilhar.");
      }
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        toast.error("Não foi possível compartilhar.");
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div ref={cardRef} className="flex flex-col items-center gap-3">
      <Button onClick={handleShare} disabled={busy} variant="outline" size="sm" className="gap-2">
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Share2 className="h-4 w-4" />}
        Compartilhar resultado
      </Button>
      <p className="text-[11px] text-muted-foreground flex items-center gap-1">
        <Download className="h-3 w-3" /> imagem 1080×1080 pronta para stories
      </p>
    </div>
  );
}

function escapeXml(s: string): string {
  return s.replace(/[<>&'"]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" }[c]!));
}
