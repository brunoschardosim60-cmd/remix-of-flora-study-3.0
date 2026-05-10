import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring } from "remotion";
import { COLORS, FONTS } from "../theme";
import { UICard } from "../components/UICard";

const MODES = [
  { title: "Aula Dinâmica", desc: "A Flora explica como uma professora particular, com macetes e exemplos.", icon: "🎓" },
  { title: "Tutor de Redação", desc: "Escreva e receba feedback em tempo real sobre estrutura e argumentação.", icon: "✍️" },
  { title: "Buscar Assunto", desc: "Digite um tema e a Flora reúne questões, resumos e recursos.", icon: "🔍" },
];

export const Scene5Aulao: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const titleS = spring({ frame, fps, config: { damping: 18 } });
  const out = interpolate(frame, [390, 420], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <AbsoluteFill style={{ padding: "70px 100px", flexDirection: "column", justifyContent: "center", opacity: out }}>
      <div style={{ marginBottom: 50, opacity: titleS, transform: `translateY(${interpolate(titleS, [0, 1], [20, 0])}px)` }}>
        <p style={{ fontFamily: FONTS.body, fontSize: 22, color: COLORS.accent, letterSpacing: 4, textTransform: "uppercase", fontWeight: 600, margin: 0 }}>Aulão</p>
        <h2 style={{ fontFamily: FONTS.heading, fontSize: 88, color: COLORS.text, margin: "8px 0 0", letterSpacing: -3, fontWeight: 700 }}>Três modos de aprender.</h2>
      </div>
      <div style={{ display: "flex", gap: 32 }}>
        {MODES.map((m, i) => {
          const s = spring({ frame: frame - (40 + i * 30), fps, config: { damping: 16 } });
          return (
            <UICard key={i} style={{ flex: 1, padding: 40, opacity: s, transform: `translateY(${interpolate(s, [0, 1], [60, 0])}px) scale(${interpolate(s, [0, 1], [0.92, 1])})` }}>
              <div style={{ fontSize: 80, marginBottom: 20 }}>{m.icon}</div>
              <h3 style={{ fontFamily: FONTS.heading, fontSize: 38, color: COLORS.text, margin: "0 0 14px", fontWeight: 700 }}>{m.title}</h3>
              <p style={{ fontFamily: FONTS.body, fontSize: 22, color: COLORS.muted, lineHeight: 1.45, margin: 0 }}>{m.desc}</p>
            </UICard>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
