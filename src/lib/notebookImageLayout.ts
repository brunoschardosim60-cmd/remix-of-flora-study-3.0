interface ImageLayoutOptions {
  naturalRatio: number;
  rotation: number;
  cropEnabled: boolean;
  cropAspect: string;
  cropX: number;
  cropY: number;
  cropZoom: number;
}

/** Size and position the rotated image in viewport coordinates, including zoom.
 * No pixels are rewritten: cropping remains reversible and is stored as attributes.
 */
export function notebookImageLayout(options: ImageLayoutOptions) {
  const ratio = Number.isFinite(options.naturalRatio) && options.naturalRatio > 0 ? options.naturalRatio : 1;
  const rotation = Number.isFinite(options.rotation) ? Math.round(options.rotation / 90) * 90 : 0;
  const turned = Math.abs(rotation / 90) % 2 === 1;
  const aspectRatio = options.cropEnabled
    ? options.cropAspect === "1:1" ? 1 : options.cropAspect === "16:9" ? 16 / 9 : 4 / 3
    : turned ? 1 / ratio : ratio;
  const height = 1 / aspectRatio;
  const rotatedWidth = turned ? 1 : ratio;
  const rotatedHeight = turned ? ratio : 1;
  const zoom = options.cropEnabled ? clamp(options.cropZoom, 1, 3, 1) : 1;
  const scale = Math.max(1 / rotatedWidth, height / rotatedHeight) * zoom;
  const overflowX = Math.max(0, rotatedWidth * scale - 1);
  const overflowY = Math.max(0, rotatedHeight * scale / height - 1);
  const x = options.cropEnabled ? clamp(options.cropX, 0, 100, 50) / 100 : .5;
  const y = options.cropEnabled ? clamp(options.cropY, 0, 100, 50) / 100 : .5;
  return {
    aspectRatio,
    imageStyle: {
      width: `${ratio * scale * 100}%`,
      height: `${scale / height * 100}%`,
      left: `${(0.5 + (0.5 - x) * overflowX) * 100}%`,
      top: `${(0.5 + (0.5 - y) * overflowY) * 100}%`,
      transform: `translate(-50%, -50%) rotate(${rotation}deg)`,
    },
  };
}

function clamp(value: number, min: number, max: number, fallback: number) {
  return Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : fallback;
}
