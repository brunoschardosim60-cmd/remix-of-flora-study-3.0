import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring } from "remotion";
import { COLORS, FONTS } from "../theme";
import { UICard } from "../components/UICard";

export const Scene6Notebooks: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const out = interpolate(frame, [210, 240], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const titleS = spring({ frame, fps, config: { damping: 18 } });
  const cardS = spring({ frame: frame - 30, fps, config: { damping: 18 } });
  const flashS = spring({ frame: frame - 70, fps, config: { damping: 16 } });
  const quizS = spring({ frame: frame - 110, fps, config: { damping: 16 } });
  return (
    <AbsoluteFill style={{ padding: "70px 100px", flexDirection: "row", alignItems: "center", gap: 80, opacity: out }}>
      <div style={{ flex: 1 }}>
        <p style={{ fontFamily: FONTS.body, fontSize: 22, color: COLORS.accent, letterSpacing: 4, textTransform: "uppercase", fontWeight: 600, margin: 0, opacity: titleS }}>Cadernos digitais</p>
        <h2 style={{ fontFamily: FONTS.heading, fontSize: 80, color: COLORS.text, margin: "8px 0 28px", letterSpacing: -2.5, fontWeight: 700, opacity: titleS, lineHeight: 1.05 }}>
          Anote uma vez. <br/><span style={{ color: COLORS.primaryGlow }}>Estude pra sempre.</span>
        </h2>
        <p style={{ fontFamily: FONTS.body, fontSize: 26, color: COLORS.muted, maxWidth: 600, lineHeight: 1.5, opacity: titleS }}>
          Quizzes e flashcards são gerados automaticamente das suas anotações.
        </p>
      </div>
      <div style={{ flex: 1, position: "relative", height: 500 }}>
        <UICard style={{ position: "absolute", top: 0, left: 40, width: 460, transform: `translateY(${interpolate(cardS, [0, 1], [60, 0])}px) rotate(-3deg)`, opacity: cardS }}>
          <p style={{ fontFamily: FONTS.heading, fontSize: 22, color: COLORS.text, margin: "0 0 12px", fontWeight: 600 }}>📓 Caderno · Cinemática</p>
          <div style={{ height: 8, width: "100%", background: COLORS.bgSoft, borderRadius: 4, marginBottom: 8 }} />
          <div style={{ height: 8, width: "85%", background: COLORS.bgSoft, borderRadius: 4, marginBottom: 8 }} />
          <div style={{ height: 8, width: "92%", background: COLORS.bgSoft, borderRadius: 4, marginBottom: 8 }} />
          <div style={{ height: 8, width: "70%", background: COLORS.bgSoft, borderRadius: 4 }} />
        </UICard>
        <UICard style={{ position: "absolute", top: 120, left: 240, width: 380, transform: `translateY(${interpolate(flashS, [0, 1], [60, 0])}px) rotate(2deg)`, opacity: flashS, background: `linear-gradient(135deg, ${COLORS.primary}, ${COLORS.primaryGlow})` }}>
          <p style={{ fontFamily: FONTS.body, fontSize: 16, color: "#ffffffaa", margin: 0, letterSpacing: 2, textTransform: "uppercase" }}>Flashcard</p>
          <p style={{ fontFamily: FONTS.heading, fontSize: 30, color: "white", margin: "10px 0 0", fontWeight: 600 }}>O que define MUV?</p>
        </UICard>
        <UICard style={{ position: "absolute", top: 300, left: 80, width: 420, transform: `translateY(${interpolate(quizS, [0, 1], [60, 0])}px) rotate(-1deg)`, opacity: quizS }}>
          <p style={{ fontFamily: FONTS.body, fontSize: 16, color: COLORS.muted, margin: 0, letterSpacing: 2, textTransform: "uppercase" }}>Quiz · Pergunta 3 / 5</p>
          <p style={{ fontFamily: FONTS.heading, fontSize: 22, color: COLORS.text, margin: "10px 0 14px", fontWeight: 600 }}>Aceleração constante implica…</p>
          <div style={{ padding: "10px 14px", background: `${COLORS.good}22`, border: `1px solid ${COLORS.good}`, borderRadius: 10, fontFamily: FONTS.body, color: COLORS.good, fontSize: 18 }}>✓ Velocidade variando linearmente</div>
        </UICard>
      </div>
    </AbsoluteFill>
  );
};
