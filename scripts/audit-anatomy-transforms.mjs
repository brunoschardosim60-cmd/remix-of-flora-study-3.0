import { readFileSync } from 'node:fs';
import { Matrix4, Quaternion, Vector3 } from 'three';

for (const path of process.argv.slice(2)) {
  const bytes = readFileSync(path);
  const json = JSON.parse(bytes.subarray(20, 20 + bytes.readUInt32LE(12)).toString());
  const nodes = json.nodes ?? [];
  const roots = json.scenes?.[json.scene ?? 0]?.nodes ?? [];
  let meshNodes = 0;
  const mirrored = [];
  function visit(index, parent) {
    const node = nodes[index];
    const local = node.matrix ? new Matrix4().fromArray(node.matrix) : new Matrix4().compose(
      new Vector3(...(node.translation ?? [0,0,0])), new Quaternion(...(node.rotation ?? [0,0,0,1])), new Vector3(...(node.scale ?? [1,1,1])));
    const world = parent.clone().multiply(local);
    if (node.mesh !== undefined) {
      meshNodes++;
      if (world.determinant() < 0) mirrored.push(node.name ?? String(index));
    }
    for (const child of node.children ?? []) visit(child, world);
  }
  for (const root of roots) visit(root, new Matrix4());
  console.log(JSON.stringify({ path, meshNodes, mirroredCount: mirrored.length, examples: mirrored.slice(0,6), embeddedTextures: json.textures?.length ?? 0 }));
}
