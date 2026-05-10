import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring } from "remotion";
import { COLORS, FONTS } from "../theme";
import { UICard } from "../components/UICard";
const COMPS = [{ n: 1, t: "Norma culta", v: 180 },{ n: 2, t: "Compreensão do tema", v: 200 },{ n: 3, t: "Argumentação", v: 160 },{ n: 4, t: "Coesão", v: 180 },{ n: 5, t: "Proposta de intervenção", v: 200 }];
export const Scene7Redacao: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const titleS = spring({ frame, fps });
  const out = interpolate(frame, [270, 300], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const totalAnim = interpolate(frame - 90, [0, 60], [0, 920], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <AbsoluteFill style={{ padding: "70px 100px", justifyContent: "center", flexDirection: "column", opacity: out }}>
      <div style={{ marginBottom: 40, opacity: titleS, transform: `translateY(${interpolate(titleS, [0, 1], [20, 0])}px)` }}>
        <p style={{ fontFamily: FONTS.body, fontSize: 22, color: COLORS.accent, letterSpacing: 4, textTransform: "uppercase", fontWeight: 600, margin: 0 }}>Redação ENEM</p>
        <h2 style={{ fontFamily: FONTS.heading, fontSize: 80, color: COLORS.text, margin: "8px 0 0", letterSpacing: -2.5, fontWeight: 700 }}>Correção por competência.</h2>
      </div>
      <div style={{ display: "flex", gap: 32, alignItems: "stretch" }}>
        <UICard style={{ flex: 1.2, opacity: spring({ frame: frame - 25, fps }) }}>
          <p style={{ fontFamily: FONTS.body, fontSize: 16, color: COLORS.muted, margin: 0, letterSpacing: 2, textTransform: "uppercase" }}>Sua redação</p>
          {Array.from({ length: 8 }).map((_, i) => (<div key={i} style={{ height: 10, background: i % 3 === 1 ? `${COLORS.primaryGlow}55` : COLORS.bgSoft, marginTop: 10, borderRadius: 4, width: `${85 + (i * 13) % 15}%` }} />))}
          <div style={{ marginTop: 24, padding: 14, borderLeft: `3px solid ${COLORS.primaryGlow}`, background: `${COLORS.primary}11`, fontFamily: FONTS.body, color: COLORS.text, fontSize: 18, lineHeight: 1.5 }}>
            <span style={{ color: COLORS.primaryGlow, fontWeight: 600 }}>Flora:</span> bom uso de repertório no §2, mas a tese poderia ser mais explícita.
          </div>
        </UICard>
        <UICard style={{ flex: 1, opacity: spring({ frame: frame - 50, fps }) }}>
          <p style={{ fontFamily: FONTS.body, fontSize: 16, color: COLORS.muted, margin: 0, letterSpacing: 2, textTransform: "uppercase" }}>Nota final</p>
          <p style={{ fontFamily: FONTS.heading, fontSize: 86, color: COLORS.primaryGlow, margin: "6px 0 16px", fontWeight: 700, letterSpacing: -3 }}>{Math.round(totalAnim)}<span style={{ color: COLORS.muted, fontSize: 32 }}> / 1000</span></p>
          {COMPS.map((c, i) => {
            const w = interpolate(frame - (110 + i * 14), [0, 26], [0, c.v / 200], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
            return (
              <div key={c.n} style={{ marginTop: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                  <span style={{ fontFamily: FONTS.body, fontSize: 18, color: COLORS.text }}>C{c.n} · {c.t}</span>
                  <span style={{ fontFamily: FONTS.body, fontSize: 18, color: COLORS.muted }}>{Math.round(w * 200)}</span>
                </div>
                <div style={{ height: 8, background: COLORS.bgSoft, borderRadius: 4 }}>
                  <div style={{ height: "100%", width: `${w * 100}%`, background: `linear-gradient(90deg, ${COLORS.primary}, ${COLORS.accent})`, borderRadius: 4 }} />
                </div>
              </div>
            );
          })}
        </UICard>
      </div>
    </AbsoluteFill>
  );
};
