export interface AtlasSnapPoint {
  id: string;
  x: number;
  y: number;
}

interface FindAtlasSnapTargetOptions<T extends AtlasSnapPoint> {
  points: T[];
  focusedPoint: AtlasSnapPoint;
  pan: { x: number; y: number };
  imageSize: { width: number; height: number };
  threshold?: number;
}

/**
 * Finds the anatomical marker closest to the viewport reticle.
 * Positions are percentages of the full atlas image; pan is measured in pixels.
 */
export function findAtlasSnapTarget<T extends AtlasSnapPoint>({
  points,
  focusedPoint,
  pan,
  imageSize,
  threshold = 64,
}: FindAtlasSnapTargetOptions<T>): T | null {
  if (!points.length || imageSize.width <= 0 || imageSize.height <= 0) return null;

  let closest: { point: T; distance: number } | null = null;
  for (const point of points) {
    const offsetX = pan.x + imageSize.width * ((point.x - focusedPoint.x) / 100);
    const offsetY = pan.y + imageSize.height * ((point.y - focusedPoint.y) / 100);
    const distance = Math.hypot(offsetX, offsetY);
    if (!closest || distance < closest.distance) closest = { point, distance };
  }

  return closest && closest.distance <= threshold ? closest.point : null;
}
