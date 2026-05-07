import { lazy, memo, Suspense } from "react";

// MathRenderer (katex ~280kb) é carregado apenas quando o texto contém LaTeX.
// Isso isola katex num chunk separado e evita que ele entre no bundle inicial.
const MathRenderer = lazy(() =>
  import("./MathRenderer").then((m) => ({ default: m.MathRenderer }))
);

interface MathTextProps {
  children: string;
  className?: string;
  /** Quando true, o componente envolve em <span> em vez de <div> (útil para flow inline) */
  inline?: boolean;
}

const MATH_REGEX = /\$\$([\s\S]+?)\$\$|\\\[([\s\S]+?)\\\]|\$([^\n$]+?)\$|\\\(([\s\S]+?)\\\)/g;

function parseParts(text: string) {
  const parts: Array<{ type: "text" | "inline" | "block"; value: string }> = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  const regex = new RegExp(MATH_REGEX.source, "g");

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ type: "text", value: text.slice(lastIndex, match.index) });
    }
    const blockMatch = match[1] ?? match[2];
    const inlineMatch = match[3] ?? match[4];
    if (blockMatch != null) {
      parts.push({ type: "block", value: blockMatch.trim() });
    } else if (inlineMatch != null) {
      parts.push({ type: "inline", value: inlineMatch.trim() });
    }
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < text.length) {
    parts.push({ type: "text", value: text.slice(lastIndex) });
  }
  return parts;
}

const sharedStyle = {
  whiteSpace: "pre-wrap" as const,
  overflowWrap: "anywhere" as const,
  wordBreak: "break-word" as const,
  maxWidth: "100%",
};

function MathTextImpl({ children, className, inline = false }: MathTextProps) {
  if (!children) return null;

  const parts = parseParts(children);
  const hasMath = parts.some((p) => p.type !== "text");

  // Sem LaTeX: renderiza texto puro sem carregar katex
  if (!hasMath) {
    const Tag = inline ? "span" : "div";
    return <Tag className={className} style={sharedStyle}>{children}</Tag>;
  }

  // Com LaTeX: carrega MathRenderer (katex) dinamicamente
  return (
    <Suspense
      fallback={
        <span className={className} style={sharedStyle}>
          {children}
        </span>
      }
    >
      <MathRenderer parts={parts} className={className} inline={inline} />
    </Suspense>
  );
}

export const MathText = memo(MathTextImpl);
