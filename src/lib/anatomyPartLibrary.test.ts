import { readFileSync, statSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import type { Anatomy3DStructure } from "./anatomy3DModel";
import { anatomyPartById, anatomyPartGroups, anatomyPartLibrary, resolvePartCatalog, searchAnatomyParts, type AnatomyPartLayer } from "./anatomyPartLibrary";

function structure(name: string, layer: AnatomyPartLayer, id = name): Anatomy3DStructure {
  return { id, name, sourceName: name, layer, regionId: "whole", region: "", system: "", summary: "", function: "", sourceId: "zAnatomy3D", focus: [0, 0, 0], focusDistance: 3, color: "#ffffff", parts: [] };
}

function glbCatalog(path: string, layer: AnatomyPartLayer) {
  const data = readFileSync(resolve(process.cwd(), "public", path.slice(1)));
  const document = JSON.parse(data.toString("utf8", 20, 20 + data.readUInt32LE(12))) as {
    nodes: Array<{ name?: string; mesh?: number; extras?: { anatomyName?: string; anatomyType?: string; structureId?: string } }>;
  };
  return document.nodes.filter((node) => node.mesh !== undefined && (!node.extras?.anatomyType || node.extras.anatomyType === (layer === "skeletal" ? "bone" : "muscle")))
    .map((node, index) => structure(node.extras?.anatomyName ?? node.extras?.structureId ?? node.name ?? "", layer, `model:${layer}:${index}`));
}

describe("separate anatomical part library", () => {
  it("offers unique, sourced parts without representing atlas subsets as new models", () => {
    expect(anatomyPartLibrary.length).toBeGreaterThanOrEqual(30);
    expect(new Set(anatomyPartLibrary.map((part) => part.id)).size).toBe(anatomyPartLibrary.length);
    for (const part of anatomyPartLibrary) {
      expect(anatomyPartGroups).toContain(part.group);
      expect(part.studyTargets.length).toBeGreaterThanOrEqual(3);
      expect(part.focus.every(Number.isFinite)).toBe(true);
      expect(part.focusDistance).toBeGreaterThan(0);
      expect(part.sourceLabel).toBe(part.representation === "dedicated-organ" ? "Peça dedicada" : "Recorte do atlas");
      for (const path of part.assetPaths) expect(statSync(resolve(process.cwd(), "public", path.slice(1))).size, `${part.id}: ${path}`).toBeGreaterThan(1_000);
    }
  });

  it("resolves every musculoskeletal entry against both real HD and lightweight GLB catalogs", () => {
    const catalogs = new Map<string, Anatomy3DStructure[]>();
    for (const part of anatomyPartLibrary.filter((part) => part.layer !== "organs")) {
      for (const path of part.assetPaths) {
        const key = `${part.layer}:${path}`;
        if (!catalogs.has(key)) catalogs.set(key, glbCatalog(path, part.layer));
        expect(resolvePartCatalog(part, catalogs.get(key)!), `${part.id} in ${path}`).not.toHaveLength(0);
      }
    }
  });

  it("selects all bilateral bones in a grouped part, not the first matching bone", () => {
    const bones = ["Radius.l", "Radius.r", "Ulna.l", "Ulna.r", "Humerus.l"].map((name) => structure(name, "skeletal"));
    expect(resolvePartCatalog("forearm", bones).map((item) => item.name)).toEqual(["Radius.l", "Radius.r", "Ulna.l", "Ulna.r"]);
    expect(resolvePartCatalog("unknown", bones)).toEqual([]);
  });

  it("does not confuse phalanges of the hand and foot or match attachments from another layer", () => {
    const hand = structure("Proximal phalanx of first finger of hand.l", "skeletal");
    const foot = structure("Proximal phalanx of first toe of foot.l", "skeletal");
    const zAnatomyToe = structure("Distal phalanx of fifth finger of foot.r", "skeletal");
    const overlay = structure("Clavicular part of deltoid muscle.ol", "skeletal");
    const artery = structure("Circumflex scapular artery.l", "skeletal");
    expect(resolvePartCatalog("hand", [hand, foot, zAnatomyToe])).toEqual([hand]);
    expect(resolvePartCatalog("foot", [hand, foot, zAnatomyToe])).toEqual([foot, zAnatomyToe]);
    expect(resolvePartCatalog("shoulder", [overlay, artery])).toEqual([]);
    expect(resolvePartCatalog("deltoid", [overlay])).toEqual([]);
  });

  it("keeps all muscle heads while excluding fascia and unrelated muscles", () => {
    const muscles = ["Acromial part of deltoid muscle.l", "Acromial part of deltoid muscle.r", "Clavicular part of deltoid muscle.r", "Deltoid fascia.l", "Biceps brachii muscle.l"].map((name) => structure(name, "muscular"));
    expect(resolvePartCatalog("deltoid", muscles)).toHaveLength(3);
    const quadriceps = ["Rectus femoris muscle.r", "Vastus medialis muscle.r", "Vastus lateralis muscle.r", "Vastus intermedius muscle.r", "Biceps femoris muscle.r"].map((name) => structure(name, "muscular"));
    expect(resolvePartCatalog("quadriceps", quadriceps)).toHaveLength(4);
    expect(resolvePartCatalog("biceps", quadriceps)).toHaveLength(0);
  });

  it("accepts stable organ IDs and preserves segmented cardiac structures", () => {
    const heart = structure("Valva mitral", "organs", "model:heart:mitral-valve");
    const kidney = structure("Córtex", "organs", "model:hra:kidney-left:0");
    expect(resolvePartCatalog("heart", [heart, kidney])).toEqual([heart]);
    expect(resolvePartCatalog("kidneys", [heart, kidney])).toEqual([kidney]);
    expect(anatomyPartById("spleen")?.structureId).toBe("model:organs:supplement:spleen");
  });

  it("keeps the new dedicated large intestine separate from the small intestine", () => {
    const colon = structure("Ascending colon", "organs", "model:hra:large-intestine:0");
    const jejunum = structure("Jejunum", "organs");
    const ileum = structure("Ileum", "organs");
    expect(resolvePartCatalog("large-intestine", [colon, jejunum, ileum])).toEqual([colon]);
    expect(resolvePartCatalog("intestines", [colon, jejunum, ileum])).toHaveLength(3);
    expect(anatomyPartById("large-intestine")?.structureId).toBe("organ-large-intestine");
    expect(anatomyPartById("pancreas")?.representation).toBe("dedicated-organ");
  });

  it("searches in Portuguese without requiring accents or the models to load", () => {
    expect(searchAnatomyParts("cranio").map((part) => part.id)).toContain("skull");
    expect(searchAnatomyParts("biceps", "Músculos").map((part) => part.id)).toEqual(["biceps"]);
    expect(searchAnatomyParts("biceps", "Órgãos")).toEqual([]);
    expect(anatomyPartById(null)).toBeUndefined();
  });
});
