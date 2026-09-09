import { useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";

/** Local QA only. Counts GPU resources, not bytes or device-wide memory. */
export function AnatomyRenderDiagnostics({ active }: { active: boolean }) {
  const sample = useRef({ seconds: 0, frames: 0 });
  const [report, setReport] = useState("Aguardando movimento e modelos…");
  useFrame(({ gl }, delta) => {
    // Demand rendering sleeps while idle. Never report those gaps as low FPS.
    if (!active || gl.info.render.triangles === 0) {
      sample.current = { seconds: 0, frames: 0 };
      return;
    }
    sample.current.seconds += delta;
    sample.current.frames++;
    if (sample.current.seconds < 2) return;
    const fps = sample.current.frames / sample.current.seconds;
    setReport(`${fps.toFixed(1)} FPS em movimento · ${gl.info.render.calls} chamadas · ${gl.info.render.triangles.toLocaleString("pt-BR")} triângulos · ${gl.info.memory.geometries} geometrias · ${gl.info.memory.textures} texturas`);
    sample.current = { seconds: 0, frames: 0 };
  });
  return <Html fullscreen style={{ pointerEvents: "none" }}><output aria-label="Diagnóstico de renderização local" style={{ position: "absolute", bottom: 4, left: 8, right: 8, color: "#fff", background: "#17332ee8", fontSize: 10, padding: 4, borderRadius: 4 }}>{report}</output></Html>;
}
