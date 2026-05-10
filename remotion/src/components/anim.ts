import { interpolate, spring } from "remotion";

export const fadeUp = (frame: number, fps: number, delay = 0) => {
  const s = spring({ frame: frame - delay, fps, config: { damping: 18, stiffness: 120 } });
  return {
    opacity: interpolate(s, [0, 1], [0, 1]),
    transform: `translateY(${interpolate(s, [0, 1], [40, 0])}px)`,
  };
};

export const fadeIn = (frame: number, fps: number, delay = 0, duration = 20) => ({
  opacity: interpolate(frame, [delay, delay + duration], [0, 1], { extrapolateRight: "clamp", extrapolateLeft: "clamp" }),
});

export const sceneOut = (frame: number, total: number) =>
  interpolate(frame, [total - 25, total - 5], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });