import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring } from "remotion";
import { COLORS, FONTS } from "../theme";
import { UICard } from "../components/UICard";
const SUBJECTS = [{ t: "Matemática", v: 78 },{ t: "Linguagens", v: 84 },{ t: "Ciências", v: 62 },{ t: "Humanas", v: 71 },{ t: "Redação", v: 68 }];
export const Scene8BancoAnalise: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const titleS = spring({ frame, fps });
  const out = interpolate(frame, [300, 330], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <AbsoluteFill style={{ padding: "70px 100px", flexDirection: "column", justifyContent: "center", opacity: out }}>
      <div style={{ marginBottom: 36, opacity: titleS, transform: `translateY(${interpolate(titleS, [0, 1], [20, 0])}px)` }}>
        <p style={{ fontFamily: FONTS.body, fontSize: 22, color: COLORS.accent, letterSpacing: 4, textTransform: "uppercase", fontWeight: 600, margin: 0 }}>Banco · Análise</p>
        <h2 style={{ fontFamily: FONTS.heading, fontSize: 76, color: COLORS.text, margin: "8px 0 0", letterSpacing: -2.5, fontWeight: 700 }}>Treine. Meça. Evolua.</h2>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1.2fr", gap: 28 }}>
        <UICard style={{ opacity: spring({ frame: frame - 30, fps }) }}>
          <p style={{ fontFamily: FONTS.heading, fontSize: 26, color: COLORS.text, margin: "0 0 6px", fontWeight: 600 }}>Banco de Questões</p>
          <p style={{ fontFamily: FONTS.body, fontSize: 18, color: COLORS.muted, margin: "0 0 22px" }}>Provas reais ENEM · simulado cronometrado</p>
          <div style={{ display: "flex", gap: 14 }}>
            <div style={{ flex: 1, padding: 18, background: `${COLORS.primary}1a`, borderRadius: 14, border: `1px solid ${COLORS.primary}55` }}>
              <p style={{ fontFamily: FONTS.heading, fontSize: 42, color: COLORS.primaryGlow, margin: 0, fontWeight: 700 }}>4.812</p>
              <p style={{ fontFamily: FONTS.body, fontSize: 16, color: COLORS.muted, margin: 0 }}>questões</p>
            </div>
            <div style={{ flex: 1, padding: 18, background: `${COLORS.good}1a`, borderRadius: 14, border: `1px solid ${COLORS.good}55` }}>
              <p style={{ fontFamily: FONTS.heading, fontSize: 42, color: COLORS.good, margin: 0, fontWeight: 700 }}>72%</p>
              <p style={{ fontFamily: FONTS.body, fontSize: 16, color: COLORS.muted, margin: 0 }}>taxa de acerto</p>
            </div>
          </div>
          <div style={{ marginTop: 20, padding: 16, background: COLORS.bgSoft, borderRadius: 12, fontFamily: FONTS.body, color: COLORS.text, fontSize: 18 }}>
            <span style={{ color: COLORS.warm }}>⏱</span>  Simulado · 90 questões em 4h30
          </div>
        </UICard>
        <UICard style={{ opacity: spring({ frame: frame - 50, fps }) }}>
          <p style={{ fontFamily: FONTS.heading, fontSize: 26, color: COLORS.text, margin: "0 0 22px", fontWeight: 600 }}>Acerto por matéria</p>
          {SUBJECTS.map((s, i) => {
            const w = interpolate(frame - (90 + i * 14), [0, 30], [0, s.v], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
            return (
              <div key={s.t} style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 16 }}>
                <span style={{ width: 150, fontFamily: FONTS.body, color: COLORS.text, fontSize: 20 }}>{s.t}</span>
                <div style={{ flex: 1, height: 18, background: COLORS.bgSoft, borderRadius: 9, overflow: "hidden" }}>
                  <div style={{ width: `${w}%`, height: "100%", background: `linear-gradient(90deg, ${COLORS.primary}, ${COLORS.accent})`, borderRadius: 9 }} />
                </div>
                <span style={{ width: 60, textAlign: "right", fontFamily: FONTS.body, color: COLORS.muted, fontSize: 18 }}>{Math.round(w)}%</span>
              </div>
            );
          })}
        </UICard>
      </div>
    </AbsoluteFill>
  );
};
