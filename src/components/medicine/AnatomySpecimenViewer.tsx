import { Component, Suspense, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { Html, OrbitControls, useGLTF } from "@react-three/drei";
import { Box3, Group, PerspectiveCamera, Vector3 } from "three";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import type { AnatomySpecimen } from "@/lib/anatomySpecimens";
import { ArrowLeft, ExternalLink, Minus, Plus, RotateCcw } from "lucide-react";
import "./anatomy-specimen.css";

class SpecimenErrorBoundary extends Component<{ children: ReactNode; onRetry: () => void }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() {
    return this.state.failed ? <div className="med-specimen-error" role="alert"><h2>Não foi possível abrir a peça.</h2><p>Verifique a conexão ou tente carregar novamente. O atlas continua disponível.</p><button onClick={this.props.onRetry}>Tentar novamente</button></div> : this.props.children;
  }
}

function SpecimenMesh({ path, onBounds }: { path: string; onBounds: (size: [number, number, number]) => void }) {
  const { scene } = useGLTF(path);
  const model = useMemo(() => {
    // Preserve original geometry, UVs, maps and transforms in the cached GLTF.
    const instance = scene.clone(true);
    instance.updateMatrixWorld(true);
    const bounds = new Box3().setFromObject(instance);
    const extent = Math.max(...bounds.getSize(new Vector3()).toArray());
    if (!Number.isFinite(extent) || extent <= 0) throw new Error("Invalid specimen bounds");
    instance.position.sub(bounds.getCenter(new Vector3()));
    const group = new Group();
    group.add(instance);
    group.scale.setScalar(3.5 / extent);
    return group;
  }, [scene]);
  useEffect(() => {
    model.updateMatrixWorld(true);
    onBounds(new Box3().setFromObject(model).getSize(new Vector3()).toArray());
  }, [model, onBounds]);
  return <primitive object={model} dispose={null} />;
}

function SpecimenCamera({ turn, zoom, reset, rotating, bounds }: { turn: "front" | "back"; zoom: number; reset: number; rotating: boolean; bounds: [number, number, number] }) {
  const controls = useRef<OrbitControlsImpl>(null);
  const { camera, size, invalidate } = useThree();
  useEffect(() => {
    if (!(camera instanceof PerspectiveCamera)) return;
    const vertical = camera.fov * Math.PI / 360;
    const horizontal = Math.atan(Math.tan(vertical) * size.width / Math.max(1, size.height));
    const distance = (Math.max(bounds[1] / (2 * Math.tan(vertical)), bounds[0] / (2 * Math.tan(horizontal))) + bounds[2] / 2) * 1.15 / zoom;
    const direction = camera.position.clone().normalize();
    camera.position.copy(direction.lengthSq() ? direction.multiplyScalar(distance) : new Vector3(0, 0, distance));
    controls.current?.target.set(0, 0, 0);
    camera.updateProjectionMatrix();
    controls.current?.update();
    invalidate();
  }, [camera, size.width, size.height, zoom, bounds, invalidate]);
  useEffect(() => {
    const distance = camera.position.length() || 7;
    camera.position.set(0, 0, turn === "front" ? distance : -distance);
    controls.current?.target.set(0, 0, 0);
    camera.lookAt(0, 0, 0);
    controls.current?.update();
    invalidate();
  }, [camera, turn, reset, invalidate]);
  return <OrbitControls ref={controls} makeDefault enableDamping enablePan={false} minDistance={1.6} maxDistance={24} autoRotate={rotating} autoRotateSpeed={.65} />;
}

export default function AnatomySpecimenViewer({ specimen, onBack, onDidactic }: {
  specimen: AnatomySpecimen; onBack: () => void; onDidactic: () => void;
}) {
  const [rotating, setRotating] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [turn, setTurn] = useState<"front" | "back">("front");
  const [reset, setReset] = useState(0);
  const [retry, setRetry] = useState(0);
  const [light, setLight] = useState(false);
  const [bounds, setBounds] = useState<[number, number, number]>([3.5, 3.5, 3.5]);
  const registerBounds = useCallback((value: [number, number, number]) => setBounds(value), []);
  return <section className="med-specimen" aria-label="Estudo de peça realista">
    <header className="med-specimen-header"><button onClick={onBack}><ArrowLeft size={16} /> Voltar ao atlas</button><div className="med-specimen-title"><small>FLORA / ACERVO ANATÔMICO</small><h1>{specimen.label}</h1></div><button className="med-specimen-compare" onClick={onDidactic}>Ver coração didático</button></header>
    <div className="med-specimen-context"><span>Realista · Texturas 2K</span><span>Superfície externa · modelo artístico</span></div>
    <div className="med-specimen-toolbar" role="group" aria-label="Controles da peça realista">
      <button aria-pressed={turn === "front"} onClick={() => { setTurn("front"); setReset((n) => n + 1); }}>Frente</button>
      <button aria-pressed={turn === "back"} onClick={() => { setTurn("back"); setReset((n) => n + 1); }}>Costas</button>
      <button aria-label="Afastar peça realista" disabled={zoom <= .65} onClick={() => setZoom((n) => Math.max(.65, n / 1.2))}><Minus size={16} /></button>
      <button aria-label="Aproximar peça realista" disabled={zoom >= 2.5} onClick={() => setZoom((n) => Math.min(2.5, n * 1.2))}><Plus size={16} /></button>
      <button onClick={() => { setZoom(1); setTurn("front"); setRotating(false); setReset((n) => n + 1); }}><RotateCcw size={15} /> Recentrar</button>
      <button aria-pressed={rotating} onClick={() => setRotating((v) => !v)}>{rotating ? "Parar rotação" : "Girar"}</button>
      <button aria-pressed={light} onClick={() => setLight((v) => !v)}>Fundo claro</button>
    </div>
    <div className={`med-specimen-stage ${light ? "is-light" : ""}`}>
      <SpecimenErrorBoundary key={retry} onRetry={() => { useGLTF.clear(specimen.path); setRetry((n) => n + 1); }}>
        <Canvas frameloop={rotating ? "always" : "demand"} dpr={[1, 1.5]} camera={{ position: [0, 0, 7], fov: 40, near: .05, far: 80 }} gl={{ antialias: true, powerPreference: "high-performance" }} aria-label={`Modelo realista: ${specimen.label}`}>
          <color attach="background" args={[light ? "#edf1ed" : "#172320"]} />
          <ambientLight intensity={1.2} /><hemisphereLight args={["#fff7ed", "#697e76", 1.5]} />
          <directionalLight position={[4, 5, 6]} intensity={2} /><directionalLight position={[-4, 3, 4]} intensity={1.7} /><directionalLight position={[0, 3, -5]} intensity={1.6} />
          <Suspense fallback={<Html center><span className="med-specimen-loading" role="status">Carregando coração · 7,56 MB…</span></Html>}><SpecimenMesh path={specimen.path} onBounds={registerBounds} /></Suspense>
          <SpecimenCamera turn={turn} zoom={zoom} reset={reset} rotating={rotating} bounds={bounds} />
        </Canvas>
      </SpecimenErrorBoundary>
      <span className="med-specimen-gesture">Arraste para girar · Role ou faça pinça para aproximar</span>
    </div>
    <footer><details className="med-specimen-info"><summary>Sobre a peça e limites de estudo</summary><p>{specimen.description}</p><p>{specimen.limitation} Use o coração didático para estudar a anatomia interna.</p><small>Arquivo original preservado. Enquadramento, escala e iluminação adaptados no Flora. Não equivale a validação anatômica.</small></details>
      <div className="med-specimen-credit"><span>Modelo de <a href={specimen.sourceUrl} target="_blank" rel="noopener noreferrer">{specimen.author} <ExternalLink size={12} /></a></span><a href={specimen.licenseUrl} target="_blank" rel="noopener noreferrer">{specimen.license}</a></div></footer>
  </section>;
}
