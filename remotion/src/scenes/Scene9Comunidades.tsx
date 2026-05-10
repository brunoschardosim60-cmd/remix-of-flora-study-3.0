import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring } from "remotion";
import { COLORS, FONTS } from "../theme";
const AVATARS = [{ c: "#F59E0B", x: 35, y: 30 },{ c: "#22D3EE", x: 65, y: 30 },{ c: "#10B981", x: 30, y: 65 },{ c: "#3B82F6", x: 70, y: 65 },{ c: "#EC4899", x: 50, y: 20 },{ c: "#A78BFA", x: 50, y: 75 }];
export const Scene9Comunidades: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const titleS = spring({ frame, fps });
  const out = interpolate(frame, [140, 170], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", opacity: out }}>
      <div style={{ position: "relative", width: 900, height: 600 }}>
        {AVATARS.map((a, i) => {
          const s = spring({ frame: frame - (20 + i * 8), fps, config: { damping: 14 } });
          const float = Math.sin((frame + i * 40) / 30) * 6;
          return (<div key={i} style={{ position: "absolute", left: `${a.x}%`, top: `${a.y}%`, width: 90, height: 90, borderRadius: "50%", background: a.c, boxShadow: `0 0 60px ${a.c}88`, transform: `translate(-50%, -50%) scale(${s}) translateY(${float}px)`, border: `4px solid ${COLORS.bg}` }} />);
        })}
        <div style={{ position: "absolute", left: "50%", top: "50%", transform: "translate(-50%, -50%)", textAlign: "center", opacity: titleS, width: 900 }}>
          <p style={{ fontFamily: FONTS.body, fontSize: 22, color: COLORS.accent, letterSpacing: 4, textTransform: "uppercase", fontWeight: 600, margin: 0 }}>Comunidades</p>
          <h2 style={{ fontFamily: FONTS.heading, fontSize: 56, color: COLORS.text, margin: "10px 0 0", fontWeight: 700, letterSpacing: -2, lineHeight: 1.1 }}>Estude com gente que <br/>sabe o que você sente.</h2>
        </div>
      </div>
    </AbsoluteFill>
  );
};
