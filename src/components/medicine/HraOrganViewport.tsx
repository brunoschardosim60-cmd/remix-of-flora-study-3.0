import { Component, Suspense, useEffect, useMemo, useRef, type ReactNode } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { ContactShadows, Environment, Lightformer, OrbitControls, useGLTF } from "@react-three/drei";
import { ACESFilmicToneMapping, Box3, Color, DoubleSide, Group, Mesh, MeshPhysicalMaterial, Vector3, type Object3D } from "three";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import type { HraOrganPart } from "@/lib/hraOrganLibrary";

const DRACO_PATH = "/medicine/models/draco/";
/** Maior dimensão do órgão na cena, em unidades da câmera. */
const FIT_SIZE = 2.4;

export interface HraOrganViewportProps {
  parts: HraOrganPart[];
  color: string;
  autoRotate: boolean;
  /** Nome bruto da malha selecionada (como está no modelo). */
  selectedMesh: string | null;
  isolateSelected: boolean;
  resetKey: number;
  onMeshesReady: (names: string[]) => void;
  onSelectMesh: (rawName: string | null) => void;
}

interface Prepared {
  group: Group;
  meshes: Mesh[];
  radius: number;
}

function prepareOrgan(scenes: Object3D[], baseColor: string): Prepared {
  const group = new Group();
  const meshes: Mesh[] = [];
  // Os arquivos do HRA compartilham o mesmo referencial (ex.: rim esquerdo e direito),
  // por isso a posição original é preservada e só o conjunto é centralizado.
  for (const scene of scenes) group.add(scene.clone(true));
  group.updateMatrixWorld(true);

  const base = new Color(baseColor);
  group.traverse((object) => {
    if (!(object instanceof Mesh)) return;
    const index = meshes.length;
    const tone = base.clone().offsetHSL(0, 0, ((index % 5) - 2) * 0.03);
    object.userData.rawName = object.name || `malha-${index + 1}`;
    object.geometry = object.geometry.clone();
    if (!object.geometry.getAttribute("normal")) object.geometry.computeVertexNormals();
    object.material = new MeshPhysicalMaterial({
      color: tone,
      emissive: tone,
      emissiveIntensity: 0.03,
      roughness: 0.56,
      metalness: 0,
      clearcoat: 0.05,
      clearcoatRoughness: 0.7,
      side: DoubleSide,
    });
    object.castShadow = true;
    object.receiveShadow = true;
    meshes.push(object);
  });

  const bounds = new Box3().setFromObject(group);
  const center = bounds.getCenter(new Vector3());
  const size = bounds.getSize(new Vector3());
  const scale = FIT_SIZE / Math.max(size.x, size.y, size.z, 0.001);
  group.scale.setScalar(scale);
  group.position.copy(center).multiplyScalar(-scale);
  group.updateMatrixWorld(true);
  return { group, meshes, radius: FIT_SIZE / 2 };
}

function OrganScene({ parts, color, selectedMesh, isolateSelected, onMeshesReady, onSelectMesh }: Omit<HraOrganViewportProps, "autoRotate" | "resetKey">) {
  const paths = useMemo(() => parts.map((part) => part.path), [parts]);
  const loaded = useGLTF(paths, DRACO_PATH);
  // `loaded` vem do cache do drei e mantém a mesma identidade entre renders.
  const prepared = useMemo(
    () => prepareOrgan((Array.isArray(loaded) ? loaded : [loaded]).map((gltf) => gltf.scene), color),
    [loaded, color],
  );

  useEffect(() => {
    onMeshesReady(prepared.meshes.map((mesh) => String(mesh.userData.rawName)));
  }, [onMeshesReady, prepared]);

  useEffect(() => {
    for (const mesh of prepared.meshes) {
      const material = mesh.material as MeshPhysicalMaterial;
      const isSelected = selectedMesh !== null && mesh.userData.rawName === selectedMesh;
      const dimmed = isolateSelected && selectedMesh !== null && !isSelected;
      material.emissiveIntensity = isSelected ? 0.5 : 0.03;
      material.transparent = dimmed;
      material.opacity = dimmed ? 0.1 : 1;
      material.depthWrite = !dimmed;
      material.needsUpdate = true;
    }
  }, [prepared, selectedMesh, isolateSelected]);

  useEffect(() => () => {
    for (const mesh of prepared.meshes) {
      mesh.geometry.dispose();
      (mesh.material as MeshPhysicalMaterial).dispose();
    }
  }, [prepared]);

  return (
    <primitive
      object={prepared.group}
      onClick={(event: { stopPropagation: () => void; object: Object3D }) => {
        event.stopPropagation();
        onSelectMesh(String(event.object.userData.rawName ?? "") || null);
      }}
    />
  );
}

function CameraRig({ resetKey, autoRotate }: { resetKey: number; autoRotate: boolean }) {
  const camera = useThree((state) => state.camera);
  const gl = useThree((state) => state.gl);
  const controls = useRef<OrbitControlsImpl>(null);

  useEffect(() => {
    gl.toneMapping = ACESFilmicToneMapping;
    gl.toneMappingExposure = 0.95;
  }, [gl]);

  useEffect(() => {
    camera.position.set(0, FIT_SIZE * 0.12, FIT_SIZE * 1.75);
    camera.lookAt(0, 0, 0);
    controls.current?.target.set(0, 0, 0);
    controls.current?.update();
  }, [camera, resetKey]);

  return (
    <OrbitControls
      ref={controls}
      makeDefault
      enableDamping
      dampingFactor={0.08}
      autoRotate={autoRotate}
      autoRotateSpeed={1.1}
      minDistance={FIT_SIZE * 0.45}
      maxDistance={FIT_SIZE * 4}
    />
  );
}

class ViewportBoundary extends Component<{ children: ReactNode; resetKey: string }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidUpdate(previous: { resetKey: string }) {
    if (previous.resetKey !== this.props.resetKey && this.state.failed) this.setState({ failed: false });
  }
  render() {
    if (this.state.failed) {
      return (
        <div className="hra-viewport-state" role="alert">
          <strong>Não foi possível carregar este modelo 3D.</strong>
          <span>Verifique a conexão e escolha o órgão novamente.</span>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function HraOrganViewport(props: HraOrganViewportProps) {
  const { parts, color, autoRotate, selectedMesh, isolateSelected, resetKey, onMeshesReady, onSelectMesh } = props;
  const modelKey = parts.map((part) => part.path).join("|");
  return (
    <ViewportBoundary resetKey={modelKey}>
      <Canvas
        key={modelKey}
        className="hra-canvas"
        camera={{ fov: 38, near: 0.05, far: 60, position: [0, FIT_SIZE * 0.12, FIT_SIZE * 1.75] }}
        dpr={[0.75, 1.75]}
        shadows
        gl={{ antialias: true, alpha: false, powerPreference: "high-performance" }}
        onPointerMissed={() => onSelectMesh(null)}
      >
        <color attach="background" args={["#eef3f0"]} />
        <ambientLight intensity={0.55} />
        <directionalLight position={[3, 5, 4]} intensity={1.35} castShadow />
        <directionalLight position={[-4, 2, -3]} intensity={0.45} />
        <Suspense fallback={null}>
          <Environment resolution={128}>
            <Lightformer form="rect" intensity={1.3} color="#fff8f2" position={[0, 6, 5]} rotation={[-Math.PI / 2, 0, 0]} scale={[9, 7, 1]} />
            <Lightformer form="rect" intensity={0.6} color="#d5ddd8" position={[-5, 1, 3]} rotation={[0, Math.PI / 2, 0]} scale={[5, 7, 1]} />
          </Environment>
          <OrganScene
            parts={parts}
            color={color}
            selectedMesh={selectedMesh}
            isolateSelected={isolateSelected}
            onMeshesReady={onMeshesReady}
            onSelectMesh={onSelectMesh}
          />
        </Suspense>
        <ContactShadows position={[0, -FIT_SIZE / 2 - 0.12, 0]} opacity={0.35} scale={6} blur={2.4} far={3} />
        <CameraRig resetKey={resetKey} autoRotate={autoRotate} />
      </Canvas>
    </ViewportBoundary>
  );
}
