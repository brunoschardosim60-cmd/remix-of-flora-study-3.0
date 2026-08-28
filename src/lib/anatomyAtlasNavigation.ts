export interface AtlasSnapPoint {
  id: string;
  x: number;
  y: number;
}

interface PreserveAtlasSnapPanOptions {
  pan: { x: number; y: number };
  fromPoint: AtlasSnapPoint;
  toPoint: AtlasSnapPoint;
  imageSize: { width: number; height: number };
}

/** Keeps the image visually still while ownership of the reticle changes to a new structure. */
export function preserveAtlasSnapPan({ pan, fromPoint, toPoint, imageSize }: PreserveAtlasSnapPanOptions) {
  return {
    x: pan.x + imageSize.width * ((toPoint.x - fromPoint.x) / 100),
    y: pan.y + imageSize.height * ((toPoint.y - fromPoint.y) / 100),
  };
}

interface FindAtlasSnapTargetOptions<T extends AtlasSnapPoint> {
  points: T[];
  focusedPoint: AtlasSnapPoint;
  pan: { x: number; y: number };
  imageSize: { width: number; height: number };
  threshold?: number;
}

interface AtlasCoordinateAtReticleOptions {
  focusedPoint: AtlasSnapPoint;
  pan: { x: number; y: number };
  imageSize: { width: number; height: number };
}

/** Converts the centered viewport reticle into a percentage coordinate on the atlas image. */
export function atlasCoordinateAtReticle({ focusedPoint, pan, imageSize }: AtlasCoordinateAtReticleOptions) {
  if (imageSize.width <= 0 || imageSize.height <= 0) return null;
  return {
    x: focusedPoint.x - (pan.x / imageSize.width) * 100,
    y: focusedPoint.y - (pan.y / imageSize.height) * 100,
  };
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
