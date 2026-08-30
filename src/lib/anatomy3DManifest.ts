export interface Anatomy3DManifestStructure {
  id: string;
  name: string;
  system: string;
  hierarchyPath: string[];
  source: string;
}

interface Anatomy3DManifest {
  structures: Anatomy3DManifestStructure[];
}

const MANIFEST_PATH = "/medicine/models/vayu-human-manifest-v1.json";
let manifestPromise: Promise<Anatomy3DManifestStructure[]> | null = null;

export function loadAnatomy3DManifest() {
  if (!manifestPromise) {
    manifestPromise = fetch(MANIFEST_PATH)
      .then((response) => {
        if (!response.ok) throw new Error(`Falha ao carregar o índice anatômico (${response.status}).`);
        return response.json() as Promise<Anatomy3DManifest>;
      })
      .then((manifest) => manifest.structures.filter(isDisplayableAnatomyManifestStructure));
  }
  return manifestPromise;
}

export function isDisplayableAnatomyManifestStructure(item: Anatomy3DManifestStructure) {
  return Boolean(item.id && item.name && !/^\?+$/.test(item.name.trim()));
}

export function anatomyManifestLookupKeys(value: string) {
  const normalized = value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("en")
    .replace(/\s+/g, " ")
    .trim();
  return [normalized, normalized.replace(/\.(l|r)$/i, "")];
}
