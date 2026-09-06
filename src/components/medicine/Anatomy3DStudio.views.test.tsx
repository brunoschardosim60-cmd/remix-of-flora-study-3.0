import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Anatomy3DStudio } from "./Anatomy3DStudio";

// Exercise real navigation state without a WebGL context or downloading models.
vi.mock("@react-three/fiber", () => ({ Canvas: () => null, useFrame: vi.fn(), useThree: vi.fn() }));
vi.mock("@react-three/drei", () => ({
  Environment: () => null, Grid: () => null, Lightformer: () => null, OrbitControls: () => null,
  useGLTF: Object.assign(vi.fn(), { preload: vi.fn() }),
}));
vi.mock("@/lib/anatomy3DManifest", async (importOriginal) => ({
  ...await importOriginal<typeof import("@/lib/anatomy3DManifest")>(),
  loadAnatomy3DManifest: () => new Promise(() => {}),
}));
afterEach(cleanup);

function choose(id: string) {
  fireEvent.change(screen.getByLabelText("Escolher vista anatômica"), { target: { value: id } });
}
function openLayers() {
  fireEvent.click(screen.getByRole("button", { name: "Camadas" }));
  return within(screen.getByLabelText("Controle de camadas anatômicas"));
}

describe("atlas study navigation", () => {
  it("composes muscles and bones, excludes hidden skin from the index and resets stale cuts", () => {
    render(<Anatomy3DStudio level="Residência" />);
    const panel = openLayers();
    fireEvent.click(panel.getByRole("button", { name: "Metade" }));
    choose("locomotor");
    expect(screen.getByRole("heading", { name: "Músculos + esqueleto" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Cabeça Cabeça e pescoço" })).not.toBeInTheDocument();
    const composed = openLayers();
    expect(composed.getByLabelText("Ocultar Músculos")).toHaveAttribute("aria-pressed", "true");
    expect(composed.getByLabelText("Ocultar Esqueleto")).toHaveAttribute("aria-pressed", "true");
    expect(composed.getByRole("button", { name: "Metade" })).toHaveAttribute("aria-pressed", "false");
    expect(composed.getByRole("button", { name: "Separar" })).toHaveAttribute("aria-pressed", "false");
  });

  it("opens the requested organ and returns to an uncut whole muscular system", () => {
    render(<Anatomy3DStudio level="Residência" />);
    choose("kidneys");
    expect(screen.getByRole("heading", { name: "Rins" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Inteiro" })).toHaveClass("active");
    fireEvent.click(screen.getByRole("button", { name: "Metade" }));
    choose("muscles");
    expect(screen.getByRole("heading", { name: "Sistema muscular" })).toBeInTheDocument();
    expect(screen.queryByLabelText("Posição do corte anatômico")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Inteiro" })).not.toBeInTheDocument();
  });

  it("does not conflate canvas background with tissue appearance", () => {
    render(<Anatomy3DStudio level="Residência" />);
    fireEvent.change(screen.getByLabelText("Fundo do atlas"), { target: { value: "light" } });
    expect(screen.getByLabelText("Acabamento dos tecidos")).toHaveValue("realistic");
    expect(screen.getByLabelText("Fundo do atlas")).toHaveValue("light");
  });
});
