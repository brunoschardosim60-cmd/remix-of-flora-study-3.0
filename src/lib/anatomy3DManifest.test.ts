import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { anatomyManifestLookupKeys, isDisplayableAnatomyManifestStructure, type Anatomy3DManifestStructure } from "./anatomy3DManifest";

interface StoredManifest {
  sources: Array<{ id: string; license: string; url: string }>;
  structures: Anatomy3DManifestStructure[];
}

describe("anatomy3DManifest", () => {
  it("preserva o catálogo e as licenças das fontes anatômicas", () => {
    const path = resolve(process.cwd(), "public", "medicine", "models", "vayu-human-manifest-v1.json");
    const manifest = JSON.parse(readFileSync(path, "utf8")) as StoredManifest;

    expect(manifest.structures).toHaveLength(3_753);
    expect(new Set(manifest.structures.map((item) => item.system)).size).toBeGreaterThanOrEqual(13);
    expect(manifest.structures.every((item) => item.id && item.name && item.hierarchyPath.length > 0)).toBe(true);
    expect(manifest.structures.filter((item) => item.name === "????????")).toHaveLength(1);
    expect(manifest.structures.filter(isDisplayableAnatomyManifestStructure)).toHaveLength(3_752);
    expect(manifest.sources.map((item) => item.id)).toEqual(expect.arrayContaining(["zanatomy", "spl-abdomen", "bodyparts3d"]));
    expect(manifest.sources.every((item) => item.license && item.url.startsWith("https://"))).toBe(true);
  });

  it("normaliza lateralidade sem perder a chave original", () => {
    expect(anatomyManifestLookupKeys("  Costéla primeira.R  ")).toEqual(["costela primeira.r", "costela primeira"]);
  });
});
