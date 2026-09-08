// Conservative envelope for the registered figure (about 8.55 units tall),
// not a measured bounding box of a loaded asset. This frames the frontal
// illustrated composition without loading or modifying model geometry.
export const ILLUSTRATION_BODY_BOUNDS = [4.2, 8.7, 2.1] as const;
export const ILLUSTRATION_BODY_FOCUS = [0, -.15, 0] as const;
const ILLUSTRATION_FRAME_MARGIN = 1.12;

/** Distance from the central target that fits both canvas dimensions. */
export function illustrationFitDistance(width: number, height: number, fov = 36): number {
  // Hidden/unmeasured canvases use a stable square fallback. Extreme ratios
  // are bounded to avoid an unbounded camera move during resize transitions.
  const validViewport = Number.isFinite(width) && width > 0 && Number.isFinite(height) && height > 0;
  const aspect = validViewport ? Math.max(.1, Math.min(10, width / height)) : 1;
  const verticalFov = Number.isFinite(fov) && fov >= 1 && fov < 179 ? fov : 36;
  const tangent = Math.tan(verticalFov * Math.PI / 360);
  const [bodyWidth, bodyHeight, bodyDepth] = ILLUSTRATION_BODY_BOUNDS;
  const verticalDistance = bodyHeight / (2 * tangent);
  const horizontalDistance = bodyWidth / (2 * tangent * aspect);
  // Account for the nearest side of the figure before adding visual margin.
  return (Math.max(verticalDistance, horizontalDistance) + bodyDepth / 2) * ILLUSTRATION_FRAME_MARGIN;
}
