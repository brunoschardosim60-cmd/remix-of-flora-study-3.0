import { InlineMath, BlockMath } from "react-katex";
import "katex/dist/katex.min.css";

interface Part {
  type: "text" | "inline" | "block";
  value: string;
}

interface MathRendererProps {
  parts: Part[];
  className?: string;
  inline?: boolean;
}

const sharedStyle = {
  whiteSpace: "pre-wrap" as const,
  overflowWrap: "anywhere" as const,
  wordBreak: "break-word" as const,
  maxWidth: "100%",
};

export function MathRenderer({ parts, className, inline = false }: MathRendererProps) {
  const Wrapper = inline ? "span" : "div";
  return (
    <Wrapper className={className} style={sharedStyle}>
      {parts.map((p, i) => {
        if (p.type === "text") return <span key={i} style={sharedStyle}>{p.value}</span>;
        try {
          if (p.type === "block") {
            return (
              <span key={i} className="block my-1 max-w-full overflow-x-auto">
                <BlockMath math={p.value} />
              </span>
            );
          }
          return <InlineMath key={i} math={p.value} />;
        } catch {
          return <span key={i} className="font-mono text-xs" style={sharedStyle}>{p.value}</span>;
        }
      })}
    </Wrapper>
  );
}
