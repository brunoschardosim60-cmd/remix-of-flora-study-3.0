import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

function sanitize(text: string): string {
  return (text || "")
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/\u2014/g, "--")
    .replace(/\u2013/g, "-")
    .replace(/\u2026/g, "...")
    .replace(/\u00A0/g, " ");
}

export interface ExamPdfRow {
  numero: number | null;
  ano: number | null;
  disciplina: string;
  marcada: string | null;
  correta: string;
  acertou: boolean;
}

export interface ExamPdfData {
  titulo: string; // ex.: "Prova ENEM - Dia 1"
  geradoEm: Date;
  duracaoSegundos: number;
  total: number;
  acertos: number;
  porArea: { area: string; acertos: number; total: number }[];
  linhas: ExamPdfRow[];
}

export async function exportExamGabaritoPdf(data: ExamPdfData): Promise<void> {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);

  const A4 = { w: 595.28, h: 841.89 };
  const margin = 50;
  const maxWidth = A4.w - margin * 2;
  let page = pdf.addPage([A4.w, A4.h]);
  let y = A4.h - margin;

  const ensure = (need: number) => {
    if (y - need < margin) {
      page = pdf.addPage([A4.w, A4.h]);
      y = A4.h - margin;
    }
  };
  const draw = (text: string, opts: { size?: number; f?: any; color?: any; gap?: number } = {}) => {
    const size = opts.size ?? 11;
    const f = opts.f ?? font;
    const color = opts.color ?? rgb(0.1, 0.1, 0.1);
    const gap = opts.gap ?? 4;
    ensure(size + gap);
    page.drawText(sanitize(text), { x: margin, y: y - size, size, font: f, color });
    y -= size + gap;
  };
  const hr = () => {
    ensure(12);
    page.drawLine({
      start: { x: margin, y: y - 6 },
      end: { x: A4.w - margin, y: y - 6 },
      thickness: 0.5,
      color: rgb(0.7, 0.7, 0.7),
    });
    y -= 14;
  };

  // Cabeçalho
  draw(data.titulo, { size: 20, f: bold, color: rgb(0.13, 0.4, 0.83), gap: 6 });
  draw(`Gerado em ${data.geradoEm.toLocaleDateString("pt-BR")} ${data.geradoEm.toLocaleTimeString("pt-BR")}`, { size: 9, color: rgb(0.4, 0.4, 0.4) });
  const h = Math.floor(data.duracaoSegundos / 3600);
  const m = Math.floor((data.duracaoSegundos % 3600) / 60);
  const s = data.duracaoSegundos % 60;
  draw(`Tempo utilizado: ${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`, { size: 9, color: rgb(0.4, 0.4, 0.4) });
  y -= 4;

  // Resumo
  const pct = data.total > 0 ? Math.round((data.acertos / data.total) * 100) : 0;
  draw(`Resultado: ${data.acertos} / ${data.total} acertos (${pct}%)`, { size: 14, f: bold, gap: 6 });
  hr();

  // Desempenho por área
  if (data.porArea.length > 0) {
    draw("Desempenho por área", { size: 12, f: bold, gap: 4 });
    for (const a of data.porArea) {
      const p = a.total > 0 ? Math.round((a.acertos / a.total) * 100) : 0;
      draw(`• ${a.area}: ${a.acertos}/${a.total} (${p}%)`, { size: 10, gap: 3 });
    }
    y -= 4;
    hr();
  }

  // Tabela gabarito
  draw("Gabarito detalhado", { size: 12, f: bold, gap: 6 });

  const colX = {
    num: margin,
    disc: margin + 50,
    sua: margin + 230,
    gab: margin + 300,
    res: margin + 370,
  };
  const drawRow = (n: string, disc: string, sua: string, gab: string, res: string, isHeader = false, color?: any) => {
    const size = 9;
    ensure(size + 4);
    const f = isHeader ? bold : font;
    const c = color ?? rgb(0.1, 0.1, 0.1);
    page.drawText(sanitize(n), { x: colX.num, y: y - size, size, font: f, color: c });
    page.drawText(sanitize(disc.slice(0, 28)), { x: colX.disc, y: y - size, size, font: f, color: c });
    page.drawText(sanitize(sua), { x: colX.sua, y: y - size, size, font: f, color: c });
    page.drawText(sanitize(gab), { x: colX.gab, y: y - size, size, font: f, color: c });
    page.drawText(sanitize(res), { x: colX.res, y: y - size, size, font: f, color: c });
    y -= size + 3;
  };
  drawRow("Q", "Disciplina", "Sua", "Gabarito", "Resultado", true);
  ensure(4);
  page.drawLine({ start: { x: margin, y: y - 2 }, end: { x: A4.w - margin, y: y - 2 }, thickness: 0.3, color: rgb(0.6, 0.6, 0.6) });
  y -= 6;

  data.linhas.forEach((row, i) => {
    const color = row.acertou ? rgb(0.05, 0.5, 0.25) : (row.marcada ? rgb(0.75, 0.1, 0.1) : rgb(0.5, 0.5, 0.5));
    drawRow(
      String(row.numero ?? i + 1),
      row.disciplina || "—",
      row.marcada || "—",
      row.correta || "—",
      row.acertou ? "Acertou" : row.marcada ? "Errou" : "Em branco",
      false,
      color,
    );
  });

  // Footer
  const totalPages = pdf.getPageCount();
  pdf.getPages().forEach((p, i) => {
    p.drawText(`StudyFlow - Simulado ENEM - ${i + 1}/${totalPages}`, {
      x: margin, y: 20, size: 8, font, color: rgb(0.6, 0.6, 0.6),
    });
  });

  const bytes = await pdf.save();
  const blob = new Blob([bytes as BlobPart], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const safeTitle = sanitize(data.titulo).replace(/[^a-zA-Z0-9-_ ]/g, "").trim() || "simulado";
  a.href = url;
  a.download = `${safeTitle}.pdf`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}