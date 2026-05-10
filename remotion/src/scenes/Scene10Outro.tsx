import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring } from "remotion";
import { COLORS, FONTS } from "../theme";
export const Scene10Outro: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const logoS = spring({ frame, fps, config: { damping: 14 } });
  const tagS = spring({ frame: frame - 25, fps, config: { damping: 18 } });
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
      <div style={{ width: 110, height: 110, borderRadius: 28, background: `linear-gradient(135deg, ${COLORS.primary} 0%, ${COLORS.accent} 100%)`, boxShadow: `0 30px 80px ${COLORS.primary}66`, display: "flex", alignItems: "center", justifyContent: "center", transform: `scale(${logoS})`, marginBottom: 30 }}>
        <span style={{ color: "white", fontFamily: FONTS.heading, fontWeight: 700, fontSize: 64 }}>S</span>
      </div>
      <h1 style={{ fontFamily: FONTS.heading, fontSize: 130, color: COLORS.text, margin: 0, letterSpacing: -4, fontWeight: 700, opacity: logoS }}>StudyFlow</h1>
      <p style={{ fontFamily: FONTS.body, fontSize: 30, color: COLORS.muted, margin: "16px 0 0", letterSpacing: 1, opacity: tagS, transform: `translateY(${interpolate(tagS, [0, 1], [10, 0])}px)` }}>
        Foque no que importa. <span style={{ color: COLORS.primaryGlow }}>Aprender.</span>
      </p>
    </AbsoluteFill>
  );
};
