import { useState } from "react";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { anatomyStructures, type AnatomyStructure } from "@/lib/medicineData";
import { atlasCanvasStructures, atlasPinLimitForZoom, BodyAtlas } from "./BodyAtlas";

function AtlasHarness() {
  const initial = anatomyStructures.find((structure) => structure.id === "heart") as AnatomyStructure;
  const [selected, setSelected] = useState<AnatomyStructure | null>(initial);

  return <BodyAtlas
    level="Iniciante"
    activeLayer="organs"
    onLayerChange={() => undefined}
    selected={selected}
    onSelect={setSelected}
  />;
}

function SurfaceAtlasHarness() {
  const initial = anatomyStructures.find((structure) => structure.id === "skin") as AnatomyStructure;
  const [selected, setSelected] = useState<AnatomyStructure | null>(initial);

  return <BodyAtlas
    level="Iniciante"
    activeLayer="surface"
    onLayerChange={() => undefined}
    selected={selected}
    onSelect={setSelected}
  />;
}

function LevelAtlasHarness() {
  const initial = (anatomyStructures.find((structure) => structure.id === "aorta")
    ?? anatomyStructures.find((structure) => structure.layer === "vascular")) as AnatomyStructure;
  const [selected, setSelected] = useState<AnatomyStructure | null>(initial);
  const [level, setLevel] = useState<"Iniciante" | "Residência">("Iniciante");

  return <>
    <button onClick={() => setLevel("Iniciante")}>Nível Iniciante</button>
    <button onClick={() => setLevel("Residência")}>Nível Residência</button>
    <BodyAtlas
      level={level}
      activeLayer="vascular"
      onLayerChange={() => undefined}
      selected={selected}
      onSelect={setSelected}
    />
  </>;
}

function dispatchPointer(target: Element, type: string, values: { pointerId: number; button?: number; clientX?: number; clientY?: number }) {
  const event = new Event(type, { bubbles: true, cancelable: true });
  Object.defineProperties(event, {
    pointerId: { value: values.pointerId },
    button: { value: values.button ?? 0 },
    clientX: { value: values.clientX ?? 0 },
    clientY: { value: values.clientY ?? 0 },
  });
  fireEvent(target, event);
}

describe("BodyAtlas selection flow", () => {
  it("prioritizes the main visible structures in every atlas layer", () => {
    const expectedByLayer = {
      surface: ["skin", "sternal-region", "abdominal-region"],
      muscular: ["deltoid", "pectoralis-major", "rectus-abdominis"],
      skeletal: ["rib-1", "humerus", "femur", "tibia"],
      vascular: ["aorta", "superior-vena-cava", "femoral-artery"],
      nervous: ["cerebrum", "vagus-nerve", "median-nerve"],
      organs: ["heart", "lungs", "liver", "kidneys"],
    } as const;

    for (const [layer, expectedIds] of Object.entries(expectedByLayer)) {
      const visible = anatomyStructures.filter((structure) => structure.layer === layer && structure.positions?.anterior);
      const prioritized = atlasCanvasStructures(visible, 18, false).map((structure) => structure.id);
      for (const id of expectedIds) expect(prioritized, `${layer}: ${id}`).toContain(id);
    }

    const anteriorSkeleton = anatomyStructures.filter((structure) => structure.layer === "skeletal" && structure.positions?.anterior);
    expect(atlasCanvasStructures(anteriorSkeleton, 18, false).map((structure) => structure.id)).not.toContain("stapes");
  });

  it("reveals fine structures progressively across the zoom range", () => {
    const base = atlasPinLimitForZoom(18, 80, 1);
    const intermediate = atlasPinLimitForZoom(18, 80, 1.3);
    const maximum = atlasPinLimitForZoom(18, 80, 1.5);

    expect(base).toBe(18);
    expect(intermediate).toBeGreaterThan(base);
    expect(intermediate).toBeLessThan(maximum);
    expect(maximum).toBe(80);
  });

  it("selects a structure without opening the detail dialog", () => {
    render(<AtlasHarness />);

    fireEvent.click(screen.getByRole("button", { name: /^Pulmões/ }));

    expect(screen.getByRole("heading", { level: 3, name: "Pulmões" })).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("keeps the visible marker set stable when a body marker is selected", () => {
    render(<AtlasHarness />);
    const markersBefore = screen.getAllByRole("button", { name: /^Selecionar / });
    const labelsBefore = markersBefore.map((marker) => marker.getAttribute("aria-label"));

    fireEvent.click(markersBefore[1]);

    const labelsAfter = screen.getAllByRole("button", { name: /^Selecionar / })
      .map((marker) => marker.getAttribute("aria-label"));
    expect(labelsAfter).toEqual(labelsBefore);
  });

  it("controls atlas zoom with the mouse wheel", () => {
    render(<AtlasHarness />);
    const stage = screen.getByLabelText(/use a roda do mouse para controlar o zoom/i);
    const initialMarkerCount = screen.getAllByRole("button", { name: /^Selecionar / }).length;

    expect(fireEvent.wheel(stage, { deltaY: -100 })).toBe(false);
    expect(screen.getByText("110%")).toBeInTheDocument();

    fireEvent.wheel(stage, { deltaY: 100 });
    expect(screen.getByText("100%")).toBeInTheDocument();

    fireEvent.wheel(stage, { deltaY: -100 });
    fireEvent.wheel(stage, { deltaY: -100 });
    fireEvent.wheel(stage, { deltaY: -100 });
    expect(screen.getByText("130%")).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /^Selecionar / }).length).toBeGreaterThan(initialMarkerCount);
  });

  it("counter-scales markers and reduces their visible size while zooming", () => {
    render(<AtlasHarness />);
    const stage = screen.getByLabelText(/use a roda do mouse para controlar o zoom/i);
    const marker = screen.getAllByRole("button", { name: /^Selecionar / })[0] as HTMLElement;

    expect(marker.style.getPropertyValue("--atlas-pin-counter-scale")).toBe("1");
    expect(marker.style.getPropertyValue("--atlas-pin-visual-scale")).toBe("1");

    fireEvent.wheel(stage, { deltaY: -100 });
    fireEvent.wheel(stage, { deltaY: -100 });
    fireEvent.wheel(stage, { deltaY: -100 });

    const zoomedMarker = screen.getAllByRole("button", { name: /^Selecionar / })[0] as HTMLElement;
    expect(Number(zoomedMarker.style.getPropertyValue("--atlas-pin-counter-scale"))).toBeCloseTo(1 / 1.3);
    expect(Number(zoomedMarker.style.getPropertyValue("--atlas-pin-visual-scale"))).toBeLessThan(1);
  });

  it("keeps the layer count synchronized with markers shown for each level", () => {
    render(<LevelAtlasHarness />);
    const vesselsButton = screen.getByRole("button", { name: /^Vasos/ });
    const beginnerMarkers = screen.getAllByRole("button", { name: /^Selecionar / }).length;

    expect(within(vesselsButton).getByLabelText(`${beginnerMarkers} estruturas visíveis na imagem`)).toBeInTheDocument();
    expect(screen.getByText(`${beginnerMarkers} na imagem · 59 nesta vista`)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Nível Residência" }));
    const residencyMarkers = screen.getAllByRole("button", { name: /^Selecionar / }).length;

    expect(residencyMarkers).toBeGreaterThan(beginnerMarkers);
    expect(within(vesselsButton).getByLabelText(`${residencyMarkers} estruturas visíveis na imagem`)).toBeInTheDocument();
    expect(screen.getByText(`${residencyMarkers} na imagem · 59 nesta vista`)).toBeInTheDocument();
  });

  it("pans the zoomed atlas while keeping the body inside its limits", () => {
    render(<AtlasHarness />);
    const stage = screen.getByLabelText(/arraste para navegar/i);
    const viewport = stage.querySelector(".med-body-viewport") as HTMLElement;

    fireEvent.wheel(stage, { deltaY: -100 });
    fireEvent.wheel(stage, { deltaY: -100 });
    fireEvent.wheel(stage, { deltaY: -100 });
    dispatchPointer(stage, "pointerdown", { pointerId: 7, button: 0, clientX: 100, clientY: 100 });
    dispatchPointer(stage, "pointermove", { pointerId: 7, clientX: 1_000, clientY: 1_000 });

    expect(viewport.style.transform).toContain("translate3d(60px, 210px, 0) scale(1.3)");

    dispatchPointer(stage, "pointerup", { pointerId: 7 });
    dispatchPointer(stage, "pointerdown", { pointerId: 8, button: 0, clientX: 100, clientY: 100 });
    dispatchPointer(stage, "pointermove", { pointerId: 8, clientX: -1_000, clientY: -1_000 });
    expect(viewport.style.transform).toContain("translate3d(-60px, 0px, 0) scale(1.3)");
  });

  it("opens the detail dialog only from the explicit button", () => {
    render(<AtlasHarness />);

    fireEvent.click(screen.getByRole("button", { name: /^Pulmões/ }));
    fireEvent.click(screen.getByRole("button", { name: "Abrir em detalhe" }));

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: "Pulmões" })).toBeInTheDocument();
  });

  it("keeps the detail dialog open when the focused structure changes", () => {
    render(<AtlasHarness />);

    fireEvent.click(screen.getByRole("button", { name: /^Pulmões/ }));
    fireEvent.click(screen.getByRole("button", { name: "Abrir em detalhe" }));
    fireEvent.click(screen.getByRole("button", { name: /Próxima estrutura/ }));

    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("separates female and male reproductive anatomy", () => {
    render(<AtlasHarness />);

    expect(screen.getAllByRole("button", { name: /^(Homem|Mulher)$/ }).map((button) => button.getAttribute("aria-label"))).toEqual(["Homem", "Mulher"]);
    expect(screen.queryByRole("button", { name: /^Útero/ })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^Próstata/ })).toBeInTheDocument();
    expect(screen.getByAltText(/corpo humano masculino/)).toHaveAttribute("src", "/medicine/atlas/organs-anterior-v2.png");

    fireEvent.click(screen.getByRole("button", { name: "Mulher" }));

    expect(screen.getByRole("button", { name: /^Útero/ })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^Próstata/ })).not.toBeInTheDocument();
    expect(screen.getByAltText(/corpo humano feminino/)).toHaveAttribute("src", "/medicine/atlas/organs-female-anterior-v3.png");
  });

  it("shows reproductive profile controls only where they change the artwork", () => {
    render(<SurfaceAtlasHarness />);

    expect(screen.queryByRole("button", { name: "Homem" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Mulher" })).not.toBeInTheDocument();
    expect(screen.getByText("18 na imagem · 41 nesta vista")).toBeInTheDocument();
    expect(screen.getByAltText(/referência adulta/)).toHaveAttribute("src", "/medicine/atlas/surface-anterior-v3.png");
  });

  it("presents a loading state without replacing the high-resolution image", () => {
    render(<AtlasHarness />);
    const image = screen.getByAltText(/corpo humano masculino/);

    expect(screen.getByText("Carregando ilustração em alta definição")).toBeInTheDocument();
    fireEvent.load(image);
    expect(screen.queryByText("Carregando ilustração em alta definição")).not.toBeInTheDocument();
    expect(image).toHaveAttribute("src", "/medicine/atlas/organs-anterior-v2.png");
  });
});
