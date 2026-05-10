import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring } from "remotion";
import { COLORS, FONTS } from "../theme";

export const Scene1Intro: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const logoScale = spring({ frame, fps, config: { damping: 12, stiffness: 100 } });
  const titleScale = spring({ frame: frame - 18, fps, config: { damping: 18, stiffness: 120 } });
  const subOpacity = interpolate(frame, [45, 70], [0, 1], { extrapolateRight: "clamp", extrapolateLeft: "clamp" });
  const out = interpolate(frame, [170, 200], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", opacity: out }}>
      <div
        style={{
          width: 140, height: 140, borderRadius: 36,
          background: `linear-gradient(135deg, ${COLORS.primary} 0%, ${COLORS.accent} 100%)`,
          boxShadow: `0 30px 80px ${COLORS.primary}66`,
          display: "flex", alignItems: "center", justifyContent: "center",
          transform: `scale(${logoScale})`, marginBottom: 40,
        }}
      >
        <span style={{ color: "white", fontFamily: FONTS.heading, fontWeight: 700, fontSize: 84, letterSpacing: -3 }}>S</span>
      </div>
      <h1 style={{ fontFamily: FONTS.heading, fontWeight: 700, fontSize: 140, color: COLORS.text, margin: 0, letterSpacing: -5, transform: `scale(${interpolate(titleScale, [0, 1], [0.85, 1])})`, opacity: titleScale }}>StudyFlow</h1>
      <p style={{ fontFamily: FONTS.body, fontWeight: 400, fontSize: 32, color: COLORS.muted, marginTop: 18, opacity: subOpacity, letterSpacing: 1 }}>Sua rotina de estudos, repensada com IA</p>
    </AbsoluteFill>
  );
};