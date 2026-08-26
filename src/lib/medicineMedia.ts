const loadedMedicalImages = new Set<string>();
const pendingMedicalImages = new Map<string, Promise<void>>();

export type MedicalImagePriority = "high" | "low" | "auto";

export function isMedicalImageReady(source: string) {
  return loadedMedicalImages.has(source);
}

export function preloadMedicalImage(source: string, priority: MedicalImagePriority = "auto") {
  if (!source || typeof Image === "undefined") return Promise.resolve();
  if (loadedMedicalImages.has(source)) return Promise.resolve();
  const pending = pendingMedicalImages.get(source);
  if (pending) return pending;

  const request = new Promise<void>((resolve, reject) => {
    const image = new Image();
    image.decoding = "async";
    image.fetchPriority = priority;
    image.onload = () => {
      const finish = () => {
        loadedMedicalImages.add(source);
        pendingMedicalImages.delete(source);
        resolve();
      };
      if (typeof image.decode === "function") image.decode().then(finish, finish);
      else finish();
    };
    image.onerror = () => {
      pendingMedicalImages.delete(source);
      reject(new Error(`Não foi possível pré-carregar ${source}`));
    };
    image.src = source;
  });

  pendingMedicalImages.set(source, request);
  return request;
}

export async function preloadMedicalImages(sources: Array<string | null | undefined>, priority: MedicalImagePriority = "auto") {
  const uniqueSources = Array.from(new Set(sources.filter((source): source is string => Boolean(source))));
  await Promise.allSettled(uniqueSources.map((source) => preloadMedicalImage(source, priority)));
}

export function resetMedicalImageCacheForTests() {
  loadedMedicalImages.clear();
  pendingMedicalImages.clear();
}
