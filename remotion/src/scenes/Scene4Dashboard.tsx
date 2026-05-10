import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring } from "remotion";
import { COLORS, FONTS } from "../theme";
import { UICard } from "../components/UICard";

const Stat: React.FC<{ label: string; value: string; sub?: string; color?: string; delay: number }> = ({ label, value, sub, color = COLORS.primaryGlow, delay }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame: frame - delay, fps, config: { damping: 18 } });
  return (
    <UICard style={{ flex: 1, opacity: s, transform: `translateY(${interpolate(s, [0, 1], [40, 0])}px)` }}>
      <p style={{ fontFamily: FONTS.body, fontSize: 18, color: COLORS.muted, margin: 0, fontWeight: 500 }}>{label}</p>
      <p style={{ fontFamily: FONTS.heading, fontSize: 64, color, margin: "10px 0 6px", fontWeight: 700, letterSpacing: -2 }}>{value}</p>
      {sub && <p style={{ fontFamily: FONTS.body, fontSize: 18, color: COLORS.muted, margin: 0 }}>{sub}</p>}
    </UICard>
  );
};

const ProgressRow: React.FC<{ label: string; pct: number; delay: number; tone?: string }> = ({ label, pct, delay, tone = COLORS.primaryGlow }) => {
  const frame = useCurrentFrame();
  const fillW = interpolate(frame - delay, [0, 30], [0, pct], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
        <span style={{ fontFamily: FONTS.body, color: COLORS.text, fontSize: 22, fontWeight: 500 }}>{label}</span>
        <span style={{ fontFamily: FONTS.body, color: COLORS.muted, fontSize: 20 }}>{Math.round(fillW)}%</span>
      </div>
      <div style={{ height: 12, background: COLORS.bgSoft, borderRadius: 8, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${fillW}%`, background: `linear-gradient(90deg, ${tone}, ${COLORS.accent})`, borderRadius: 8 }} />
      </div>
    </div>
  );
};

export const Scene4Dashboard: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const titleS = spring({ frame, fps, config: { damping: 18 } });
  const out = interpolate(frame, [490, 520], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const card1S = spring({ frame: frame - 100, fps });
  const card2S = spring({ frame: frame - 130, fps });
  return (
    <AbsoluteFill style={{ padding: "70px 100px", flexDirection: "column", justifyContent: "center", opacity: out }}>
      <div style={{ marginBottom: 36, opacity: titleS, transform: `translateY(${interpolate(titleS, [0, 1], [20, 0])}px)` }}>
        <p style={{ fontFamily: FONTS.body, fontSize: 22, color: COLORS.accent, letterSpacing: 4, textTransform: "uppercase", fontWeight: 600, margin: 0 }}>Painel</p>
        <h2 style={{ fontFamily: FONTS.heading, fontSize: 76, color: COLORS.text, margin: "8px 0 0", letterSpacing: -2, fontWeight: 700 }}>Tudo num só lugar.</h2>
      </div>
      <div style={{ display: "flex", gap: 24, marginBottom: 24 }}>
        <Stat label="Tempo estudado hoje" value="2h 14min" sub="meta: 3h" delay={20} />
        <Stat label="Sequência" value="🔥 12" sub="dias seguidos" color={COLORS.warm} delay={40} />
        <Stat label="Revisões" value="8 / 10" sub="programadas hoje" color={COLORS.good} delay={60} />
        <Stat label="XP" value="+340" sub="esta semana" color={COLORS.primaryGlow} delay={80} />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 24 }}>
        <UICard style={{ opacity: card1S, transform: `translateY(${interpolate(card1S, [0, 1], [40, 0])}px)` }}>
          <p style={{ fontFamily: FONTS.heading, fontSize: 28, color: COLORS.text, margin: "0 0 24px", fontWeight: 600 }}>Metas diárias</p>
          <ProgressRow label="Tempo estudado" pct={74} delay={130} />
          <ProgressRow label="Revisões concluídas" pct={80} delay={150} tone={COLORS.good} />
          <ProgressRow label="Quizzes" pct={50} delay={170} tone={COLORS.warm} />
        </UICard>
        <UICard style={{ opacity: card2S, transform: `translateY(${interpolate(card2S, [0, 1], [40, 0])}px)` }}>
          <p style={{ fontFamily: FONTS.heading, fontSize: 24, color: COLORS.text, margin: "0 0 18px", fontWeight: 600 }}>Próximas revisões</p>
          {[
            { t: "Funções quadráticas", d: "Hoje" },
            { t: "Revolução Industrial", d: "Amanhã" },
            { t: "Cinemática — MUV", d: "em 3 dias" },
            { t: "Sintaxe — orações", d: "em 5 dias" },
          ].map((r, i) => {
            const rs = spring({ frame: frame - (160 + i * 18), fps });
            return (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 0", borderBottom: `1px solid ${COLORS.border}`, opacity: rs, transform: `translateX(${interpolate(rs, [0, 1], [20, 0])}px)` }}>
                <span style={{ fontFamily: FONTS.body, color: COLORS.text, fontSize: 20 }}>{r.t}</span>
                <span style={{ fontFamily: FONTS.body, color: COLORS.muted, fontSize: 18 }}>{r.d}</span>
              </div>
            );
          })}
          <div style={{ marginTop: 18, padding: "10px 14px", borderRadius: 12, background: `${COLORS.primary}22`, border: `1px solid ${COLORS.primary}55`, fontFamily: FONTS.body, color: COLORS.primaryGlow, fontSize: 18, fontWeight: 500, opacity: interpolate(frame, [240, 280], [0, 1], { extrapolateRight: "clamp", extrapolateLeft: "clamp" }) }}>
            Repetição espaçada · Flora calcula o melhor momento
          </div>
        </UICard>
      </div>
    </AbsoluteFill>
  );
};
