import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import type { Essay, CompetenciaFeedback } from "@/lib/essays";
import { COMPETENCIAS } from "@/lib/essays";

// Sanitiza para WinAnsi (pdf-lib não suporta UTF-8 fora de WinAnsi com fontes padrão)
function sanitize(text: string): string {
  return (text || "")
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/\u2014/g, "--")
    .replace(/\u2013/g, "-")
    .replace(/\u2026/g, "...")
    .replace(/\u00A0/g, " ");
}

function wrap(text: string, font: any, size: number, maxWidth: number): string[] {
  const words = sanitize(text).split(/\s+/);
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    const test = cur ? cur + " " + w : w;
    if (font.widthOfTextAtSize(test, size) > maxWidth && cur) {
      lines.push(cur);
      cur = w;
    } else {
      cur = test;
    }
  }
  if (cur) lines.push(cur);
  return lines;
}

export async function exportEssayToPdf(essay: Essay, isENEM: boolean): Promise<void> {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);

  const A4 = { w: 595.28, h: 841.89 };
  const margin = 50;
  const maxWidth = A4.w - margin * 2;
  let page = pdf.addPage([A4.w, A4.h]);
  let y = A4.h - margin;

  const ensureSpace = (need: number) => {
    if (y - need < margin) {
      page = pdf.addPage([A4.w, A4.h]);
      y = A4.h - margin;
    }
  };

  const draw = (
    text: string,
    opts: { size?: number; font?: any; color?: any; gap?: number } = {}
  ) => {
    const size = opts.size ?? 11;
    const f = opts.font ?? font;
    const color = opts.color ?? rgb(0.1, 0.1, 0.1);
    const gap = opts.gap ?? 4;
    const lines = wrap(text, f, size, maxWidth);
    for (const line of lines) {
      ensureSpace(size + gap);
      page.drawText(line, { x: margin, y: y - size, size, font: f, color });
      y -= size + gap;
    }
  };

  const hr = () => {
    ensureSpace(12);
    page.drawLine({
      start: { x: margin, y: y - 6 },
      end: { x: A4.w - margin, y: y - 6 },
      thickness: 0.5,
      color: rgb(0.7, 0.7, 0.7),
    });
    y -= 14;
  };

  // Cabeçalho
  draw("Redação corrigida", { size: 20, font: bold, color: rgb(0.13, 0.4, 0.83), gap: 6 });
  draw(`Tipo: ${(essay.tipo_prova || "").toUpperCase()}`, { size: 10, color: rgb(0.4, 0.4, 0.4) });
  if (essay.corrected_at) {
    draw(`Corrigida em ${new Date(essay.corrected_at).toLocaleDateString("pt-BR")}`, {
      size: 10, color: rgb(0.4, 0.4, 0.4),
    });
  }
  y -= 6;

  // Nota
  if (essay.nota_total != null) {
    const nota = isENEM ? `${essay.nota_total} pts` : `${(essay.nota_total / 100).toFixed(1)} / 10`;
    draw(`Nota: ${nota}`, { size: 16, font: bold, gap: 6 });
  }
  hr();

  // Tema
  draw("Tema", { size: 12, font: bold, gap: 4 });
  draw(essay.tema || "(sem tema)", { size: 11, gap: 4 });
  y -= 4;

  // Texto
  draw("Texto", { size: 12, font: bold, gap: 4 });
  for (const para of (essay.texto || "").split(/\n\s*\n/)) {
    draw(para.trim(), { size: 11, gap: 3 });
    y -= 4;
  }
  hr();

  // Feedback geral
  if (essay.feedback_geral) {
    draw("Análise geral", { size: 12, font: bold, gap: 4 });
    draw(essay.feedback_geral, { size: 11, gap: 4 });
    y -= 6;
  }

  // Competências (ENEM)
  const fb = (essay.feedback_competencias as CompetenciaFeedback | null) ?? null;
  if (isENEM) {
    draw("Competências ENEM", { size: 12, font: bold, gap: 6 });
    for (const comp of COMPETENCIAS) {
      const score = (essay[comp.key as keyof Essay] as number | null) ?? 0;
      draw(`Competência ${comp.num} — ${comp.title}: ${score}/200`, { size: 11, font: bold, gap: 2 });
      const raw = fb?.[comp.key as keyof CompetenciaFeedback];
      if (typeof raw === "string" && raw) draw(raw, { size: 10, gap: 3 });
      y -= 4;
    }
  } else if (fb) {
    draw("Critérios avaliados", { size: 12, font: bold, gap: 6 });
    for (const [k, v] of Object.entries(fb)) {
      if (typeof v !== "string" || !v) continue;
      draw(k, { size: 11, font: bold, gap: 2 });
      draw(v, { size: 10, gap: 3 });
      y -= 4;
    }
  }

  // Footer simples
  const totalPages = pdf.getPageCount();
  pdf.getPages().forEach((p, i) => {
    p.drawText(`StudyFlow · Flora · ${i + 1}/${totalPages}`, {
      x: margin, y: 20, size: 8, font, color: rgb(0.6, 0.6, 0.6),
    });
  });

  const bytes = await pdf.save();
  const blob = new Blob([bytes as BlobPart], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const safeTema = sanitize(essay.tema || "redacao").slice(0, 40).replace(/[^a-zA-Z0-9-_ ]/g, "").trim() || "redacao";
  a.href = url;
  a.download = `${safeTema}.pdf`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
