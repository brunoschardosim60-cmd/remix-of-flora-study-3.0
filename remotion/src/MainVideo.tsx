import { AbsoluteFill, Audio, staticFile, useCurrentFrame, interpolate, Series } from "remotion";
import { loadFont as loadHeading } from "@remotion/google-fonts/SpaceGrotesk";
import { loadFont as loadBody } from "@remotion/google-fonts/Inter";
import { COLORS } from "./theme";
import { Scene1Intro } from "./scenes/Scene1Intro";
import { Scene2Problem } from "./scenes/Scene2Problem";
import { Scene3Flora } from "./scenes/Scene3Flora";
import { Scene4Dashboard } from "./scenes/Scene4Dashboard";
import { Scene5Aulao } from "./scenes/Scene5Aulao";
import { Scene6Notebooks } from "./scenes/Scene6Notebooks";
import { Scene7Redacao } from "./scenes/Scene7Redacao";
import { Scene8BancoAnalise } from "./scenes/Scene8BancoAnalise";
import { Scene9Comunidades } from "./scenes/Scene9Comunidades";
import { Scene10Outro } from "./scenes/Scene10Outro";

loadHeading("normal", { weights: ["500", "700"], subsets: ["latin"] });
loadBody("normal", { weights: ["400", "500", "600"], subsets: ["latin"] });

// Camada persistente: gradiente sutil + grid + orbs azuis derivando.
const PersistentBackground: React.FC = () => {
  const frame = useCurrentFrame();
  const orb1X = interpolate(frame, [0, 2920], [-200, 200]);
  const orb2Y = interpolate(frame, [0, 2920], [200, -200]);
  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.bg, overflow: "hidden" }}>
      <AbsoluteFill
        style={{
          background: `radial-gradient(60% 50% at 50% 0%, ${COLORS.primary}22 0%, transparent 60%), radial-gradient(50% 60% at 100% 100%, ${COLORS.accent}14 0%, transparent 70%)`,
        }}
      />
      <AbsoluteFill
        style={{
          backgroundImage: `linear-gradient(${COLORS.border}33 1px, transparent 1px), linear-gradient(90deg, ${COLORS.border}33 1px, transparent 1px)`,
          backgroundSize: "80px 80px",
          opacity: 0.35,
        }}
      />
      <div
        style={{
          position: "absolute",
          width: 700,
          height: 700,
          borderRadius: "50%",
          left: 200 + orb1X,
          top: -200,
          background: `radial-gradient(circle, ${COLORS.primary}55 0%, transparent 65%)`,
          filter: "blur(40px)",
        }}
      />
      <div
        style={{
          position: "absolute",
          width: 600,
          height: 600,
          borderRadius: "50%",
          right: -100,
          bottom: -150 + orb2Y,
          background: `radial-gradient(circle, ${COLORS.accent}33 0%, transparent 65%)`,
          filter: "blur(50px)",
        }}
      />
    </AbsoluteFill>
  );
};

export const MainVideo: React.FC = () => {
  return (
    <AbsoluteFill>
      <PersistentBackground />
      <Series>
        <Series.Sequence durationInFrames={200}>
          <Scene1Intro />
        </Series.Sequence>
        <Series.Sequence durationInFrames={240}>
          <Scene2Problem />
        </Series.Sequence>
        <Series.Sequence durationInFrames={380}>
          <Scene3Flora />
        </Series.Sequence>
        <Series.Sequence durationInFrames={520}>
          <Scene4Dashboard />
        </Series.Sequence>
        <Series.Sequence durationInFrames={420}>
          <Scene5Aulao />
        </Series.Sequence>
        <Series.Sequence durationInFrames={240}>
          <Scene6Notebooks />
        </Series.Sequence>
        <Series.Sequence durationInFrames={300}>
          <Scene7Redacao />
        </Series.Sequence>
        <Series.Sequence durationInFrames={330}>
          <Scene8BancoAnalise />
        </Series.Sequence>
        <Series.Sequence durationInFrames={170}>
          <Scene9Comunidades />
        </Series.Sequence>
        <Series.Sequence durationInFrames={120}>
          <Scene10Outro />
        </Series.Sequence>
      </Series>
      <Audio src={staticFile("audio/narration.mp3")} volume={1} />
    </AbsoluteFill>
  );
};