// Run with Node >=22: node --experimental-strip-types scripts/qa/anatomy-picking-benchmark.ts
// CPU-only synthetic benchmark; this does NOT claim the same gain in rendered FPS.
import { performance } from "node:perf_hooks";
import { BufferAttribute, DoubleSide, Mesh, MeshBasicMaterial, Raycaster, SphereGeometry, Vector3 } from "three";
import { anatomyStructureIndexFromHit, enableAnatomyPicking, intersectAnatomyMeshes } from "../../src/lib/anatomyPicking.ts";

const geometry = new SphereGeometry(1, 512, 256);
geometry.setAttribute("anatomyStructureId", new BufferAttribute(new Float32Array(geometry.getAttribute("position").count).fill(27), 1));
const mesh = new Mesh(geometry, new MeshBasicMaterial({ side: DoubleSide }));
const rays = Array.from({ length: 180 }, (_, index) => {
  const angle = index * Math.PI * 2 / 180;
  const origin = new Vector3(Math.cos(angle) * 3, Math.sin(angle * 3) * .8, Math.sin(angle) * 3);
  return new Raycaster(origin, origin.clone().negate().normalize());
});
const run = () => {
  let count = 0;
  let distanceSum = 0;
  const started = performance.now();
  for (const ray of rays) {
    const hit = intersectAnatomyMeshes(ray, [mesh]);
    if (anatomyStructureIndexFromHit(hit) !== 27) throw new Error("The picked structure ID changed.");
    count += 1;
    distanceSum += hit!.distance;
  }
  return { ms: performance.now() - started, count, distanceSum };
};
run();
const native = run();
const buildStarted = performance.now();
const release = enableAnatomyPicking(mesh);
const buildMs = performance.now() - buildStarted;
run();
const accelerated = run();
if (Math.abs(native.distanceSum - accelerated.distanceSum) > 1e-5) throw new Error("Intersection distances changed.");
console.log(JSON.stringify({
  triangles: geometry.index!.count / 3,
  rays: rays.length,
  bvhBuildMs: Number(buildMs.toFixed(2)),
  nativeMs: Number(native.ms.toFixed(2)),
  acceleratedMs: Number(accelerated.ms.toFixed(2)),
  speedup: Number((native.ms / accelerated.ms).toFixed(1)),
  matchingHits: native.count === accelerated.count,
  matchingStructureIds: true,
  scope: "Synthetic CPU picking only; not a browser FPS benchmark.",
}, null, 2));
release();
geometry.dispose();
mesh.material.dispose();
