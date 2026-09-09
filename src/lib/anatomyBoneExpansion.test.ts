import { describe, expect, it } from "vitest";
import { BufferGeometry, Float32BufferAttribute } from "three";
import { boneAssemblyKey, expandBoneGeometry } from "./anatomyBoneExpansion";
import { translatedBoneName } from "./anatomyBoneNames";
import { readFileSync } from "node:fs";

describe("desmontagem óssea", () => {
  it("preserva a fonte e o formato de cada peça; zero remonta exatamente", () => {
    const source = new BufferGeometry();
    source.setAttribute("position", new Float32BufferAttribute([-1,0,0,-1,1,0,-1,0,1,1,0,0,1,1,0,1,0,1],3));
    source.setAttribute("anatomyStructureId", new Float32BufferAttribute([0,0,0,1,1,1],1));
    const expanded = expandBoneGeometry(source,["Parietal bone.l","Parietal bone.r"],1);
    expect(expanded.getAttribute("position").getX(0)).toBeLessThan(-1);
    expect(expanded.getAttribute("position").getX(3)).toBeGreaterThan(1);
    expect(expanded.getAttribute("position").getY(1)-expanded.getAttribute("position").getY(0)).toBeCloseTo(1);
    expect(source.getAttribute("position").getX(0)).toBe(-1);
    expect(Array.from(expandBoneGeometry(source,[],0).getAttribute("position").array)).toEqual(Array.from(source.getAttribute("position").array));
  });
  it("mantém cavidades junto do osso correspondente", () => {
    expect(boneAssemblyKey("Sinus of frontal bone")).toBe(boneAssemblyKey("Frontal bone"));
    expect(boneAssemblyKey("Anterior cells of ethmoid bone.l")).toBe(boneAssemblyKey("Ethmoid bone"));
  });
  it("possui nomenclatura explícita para cada entrada do arquivo esquelético", () => {
    const bytes = readFileSync("public/medicine/models/zanatomy-musculoskeletal-hd-v2.glb");
    const json = JSON.parse(bytes.subarray(20,20+bytes.readUInt32LE(12)).toString());
    const names: string[] = json.nodes.filter((node: {extras?:{anatomyType:string}}) => node.extras?.anatomyType === "bone").map((node: {extras:{anatomyName:string}}) => node.extras.anatomyName);
    expect(names.length).toBeGreaterThan(200);
    expect(names.filter((name) => !translatedBoneName(name))).toEqual([]);
    expect(translatedBoneName("Parietal bone.r")).toBe("Osso parietal — lado direito");
    expect(translatedBoneName("First rib.l")).toBe("1ª costela — lado esquerdo");
  });
});
