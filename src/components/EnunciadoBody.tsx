import { memo } from "react";
import { MathText } from "@/components/MathText";

/**
 * Renderiza o enunciado de uma questão segmentando em blocos.
 * Detecta trechos literários (poemas, letras de música, citações longas)
 * e os destaca visualmente — centralizados, com tipografia serifada e leve recuo —
 * em vez de deixar tudo grudado em um único parágrafo.
 */

type Block = {
  type: "prose" | "verse" | "attribution";
  text: string;
};

function splitBlocks(raw: string): Block[] {
  if (!raw) return [];
  // Normaliza: colapsa 3+ quebras em 2
  const normalized = raw.replace(/\n{3,}/g, "\n\n");
  // Divide em blocos por linha em branco
  const rawBlocks = normalized.split(/\n\s*\n/).map((b) => b.replace(/^\n+|\n+$/g, "")).filter(Boolean);

  const out: Block[] = [];
  for (const block of rawBlocks) {
    const lines = block.split("\n").map((l) => l.trim()).filter(Boolean);
    if (lines.length === 0) continue;

    // Linha única
    if (lines.length === 1) {
      const single = lines[0];
      // Atribuição isolada: "— Autor", "(Autor, Obra)"
      if (/^[—–-]\s*\S/.test(single) && single.length < 140) {
        out.push({ type: "attribution", text: single });
      } else {
        out.push({ type: "prose", text: single });
      }
      continue;
    }

    // Múltiplas linhas — verificar se é verso/citação
    const maxLen = Math.max(...lines.map((l) => l.length));
    const avgLen = lines.reduce((a, l) => a + l.length, 0) / lines.length;
    // Verso típico: linhas curtas, sem pontuação final de prosa contínua
    const looksLikeVerse = lines.length >= 2 && maxLen <= 90 && avgLen <= 65;

    if (looksLikeVerse) {
      // Separa última linha se for atribuição
      const last = lines[lines.length - 1];
      if (/^[—–-]\s*\S/.test(last) || /^\(.+\)$/.test(last)) {
        const body = lines.slice(0, -1).join("\n");
        if (body) out.push({ type: "verse", text: body });
        out.push({ type: "attribution", text: last });
      } else {
        out.push({ type: "verse", text: lines.join("\n") });
      }
    } else {
      out.push({ type: "prose", text: lines.join("\n") });
    }
  }
  return out;
}

function EnunciadoBodyImpl({ text, className }: { text: string; className?: string }) {
  const blocks = splitBlocks(text);
  if (blocks.length === 0) return null;

  // Se só houver prosa (sem versos), evita overhead — renderiza como antes
  const hasSpecial = blocks.some((b) => b.type !== "prose");
  if (!hasSpecial) {
    return (
      <MathText className={className}>
        {text}
      </MathText>
    );
  }

  return (
    <div className={`space-y-4 ${className ?? ""}`}>
      {blocks.map((b, i) => {
        if (b.type === "verse") {
          return (
            <blockquote
              key={i}
              className="mx-auto max-w-[34rem] border-l-2 border-primary/40 bg-muted/40 px-5 py-4 rounded-r-md italic font-serif text-foreground/90 text-[15px] leading-[1.7] text-center whitespace-pre-line"
            >
              <MathText className="whitespace-pre-line">{b.text}</MathText>
            </blockquote>
          );
        }
        if (b.type === "attribution") {
          return (
            <div
              key={i}
              className="mx-auto max-w-[34rem] text-right text-xs text-muted-foreground italic -mt-2"
            >
              {b.text}
            </div>
          );
        }
        return (
          <MathText key={i} className="text-foreground">
            {b.text}
          </MathText>
        );
      })}
    </div>
  );
}

export const EnunciadoBody = memo(EnunciadoBodyImpl);