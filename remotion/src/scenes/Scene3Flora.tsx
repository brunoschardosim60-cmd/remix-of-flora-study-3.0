import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring } from "remotion";
import { COLORS, FONTS } from "../theme";

export const Scene3Flora: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const orbScale = spring({ frame, fps, config: { damping: 14, stiffness: 80 } });
  const ring1 = interpolate(frame, [0, 380], [0, 1.2], { extrapolateRight: "extend" });
  const ring2 = interpolate(frame, [20, 380], [0, 1.4], { extrapolateRight: "extend" });
  const titleS = spring({ frame: frame - 25, fps, config: { damping: 18 } });
  const out = interpolate(frame, [340, 380], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const tags = [
    { t: "Analisa seu desempenho", d: 60 },
    { t: "Identifica fragilidades", d: 90 },
    { t: "Adapta seu plano todo dia", d: 120 },
  ];
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", opacity: out }}>
      <div style={{ display: "flex", alignItems: "center", gap: 90 }}>
        <div style={{ position: "relative", width: 360, height: 360 }}>
          <div style={{ position: "absolute", inset: 0, borderRadius: "50%", border: `2px solid ${COLORS.primary}55`, transform: `scale(${ring1})`, opacity: 1 - (ring1 - 1) }} />
          <div style={{ position: "absolute", inset: 0, borderRadius: "50%", border: `2px solid ${COLORS.accent}44`, transform: `scale(${ring2})`, opacity: 1 - (ring2 - 1) }} />
          <div style={{ width: 360, height: 360, borderRadius: "50%", background: `radial-gradient(circle at 30% 30%, ${COLORS.primaryGlow} 0%, ${COLORS.primary} 55%, ${COLORS.bg} 100%)`, boxShadow: `0 0 120px ${COLORS.primary}77, inset 0 0 80px ${COLORS.primaryGlow}66`, transform: `scale(${orbScale})` }} />
          <div style={{ position: "absolute", left: "50%", top: "50%", transform: "translate(-50%, -50%)", fontFamily: FONTS.heading, fontWeight: 700, fontSize: 72, color: "white", opacity: orbScale }}>F</div>
        </div>
        <div style={{ maxWidth: 720 }}>
          <p style={{ fontFamily: FONTS.body, fontSize: 22, color: COLORS.accent, margin: 0, letterSpacing: 4, textTransform: "uppercase", fontWeight: 600, opacity: interpolate(titleS, [0, 1], [0, 1]) }}>Conheça a Flora</p>
          <h2 style={{ fontFamily: FONTS.heading, fontWeight: 700, fontSize: 78, color: COLORS.text, margin: "12px 0 28px", letterSpacing: -2, lineHeight: 1.05, opacity: titleS, transform: `translateY(${interpolate(titleS, [0, 1], [20, 0])}px)` }}>
            A IA que estuda <span style={{ color: COLORS.primaryGlow }}>com você.</span>
          </h2>
          {tags.map((tag, i) => {
            const s = spring({ frame: frame - tag.d, fps, config: { damping: 18 } });
            return (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 18, opacity: s, transform: `translateX(${interpolate(s, [0, 1], [-30, 0])}px)` }}>
                <div style={{ width: 10, height: 10, borderRadius: "50%", background: COLORS.primaryGlow }} />
                <span style={{ fontFamily: FONTS.body, fontSize: 30, color: COLORS.text, fontWeight: 500 }}>{tag.t}</span>
              </div>
            );
          })}
        </div>
      </div>
    </AbsoluteFill>
  );
};
