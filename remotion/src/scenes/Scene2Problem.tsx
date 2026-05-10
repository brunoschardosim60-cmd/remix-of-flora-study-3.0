import { AbsoluteFill, useCurrentFrame, interpolate } from "remotion";
import { COLORS, FONTS } from "../theme";

const WORDS = [
  { t: "Matemática", x: 8, y: 18, r: -8, s: 36 },
  { t: "Redação?", x: 70, y: 12, r: 6, s: 44 },
  { t: "Revisar quando?", x: 12, y: 65, r: 4, s: 38 },
  { t: "Cadernos perdidos", x: 60, y: 70, r: -5, s: 34 },
  { t: "Simulado", x: 78, y: 45, r: 8, s: 40 },
  { t: "Flashcards", x: 6, y: 42, r: -3, s: 32 },
  { t: "Resumos…", x: 40, y: 80, r: 2, s: 36 },
  { t: "Tempo curto", x: 45, y: 8, r: -2, s: 30 },
];

export const Scene2Problem: React.FC = () => {
  const frame = useCurrentFrame();
  const headlineOp = interpolate(frame, [120, 150], [0, 1], { extrapolateRight: "clamp", extrapolateLeft: "clamp" });
  const collapse = interpolate(frame, [120, 160], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const out = interpolate(frame, [210, 240], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <AbsoluteFill style={{ opacity: out }}>
      {WORDS.map((w, i) => {
        const appear = interpolate(frame, [i * 6, i * 6 + 18], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
        const drift = Math.sin((frame + i * 30) / 60) * 6;
        return (
          <span key={i} style={{ position: "absolute", left: `${w.x}%`, top: `${w.y}%`, transform: `rotate(${w.r}deg) translateY(${drift}px)`, fontFamily: FONTS.heading, fontWeight: 500, fontSize: w.s, color: COLORS.muted, opacity: appear * collapse, whiteSpace: "nowrap" }}>{w.t}</span>
        );
      })}
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", opacity: headlineOp }}>
        <h2 style={{ fontFamily: FONTS.heading, fontWeight: 700, fontSize: 96, color: COLORS.text, textAlign: "center", margin: 0, letterSpacing: -3, maxWidth: 1500, lineHeight: 1.05 }}>
          Estudar não precisa <span style={{ color: COLORS.primaryGlow }}>ser caótico.</span>
        </h2>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
