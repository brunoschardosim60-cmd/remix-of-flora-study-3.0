import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AnatomyPartBrowser } from "./AnatomyPartBrowser";
import { anatomyModelSelection } from "@/lib/anatomyModelSelection";

describe("anatomical library presentation and import boundaries", () => {
  it("preserves native part opening and keeps candidates separate", () => {
    const onOpen = vi.fn();
    render(<AnatomyPartBrowser activeId="skull" onOpen={onOpen} onClose={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "Abrir peça: Crânio" }));
    expect(onOpen).toHaveBeenCalledWith("skull");
    expect(screen.queryByRole("button", { name: "Abrir peça: Crânio desmontável" })).not.toBeInTheDocument();
    expect(document.querySelector("iframe")).toBeNull();
  });

  it("opens the imported heart and keeps the unlicensed lung as an external reference", () => {
    const onOpenSpecimen = vi.fn();
    render(<AnatomyPartBrowser activeId={null} onOpen={vi.fn()} onClose={vi.fn()} onOpenSpecimen={onOpenSpecimen} />);
    fireEvent.click(screen.getByRole("button", { name: "Realistas" }));
    fireEvent.click(screen.getByRole("button", { name: "Abrir modelo realista: Coração texturizado" }));
    expect(onOpenSpecimen).toHaveBeenCalledWith("neshallads-heart");
    expect(screen.getAllByRole("link")).toHaveLength(1);
    expect(screen.getByRole("link", { name: /referência externa: Pulmão real escaneado/ })).toHaveAttribute("rel", "noopener noreferrer");
    expect(screen.queryByRole("button", { name: /Abrir peça:/ })).not.toBeInTheDocument();
  });

  it("combines system and accent-insensitive search, then clears every filter", () => {
    render(<AnatomyPartBrowser activeId={null} onOpen={vi.fn()} onClose={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "Didáticos" }));
    fireEvent.click(screen.getByRole("button", { name: "Ossos e articulações" }));
    fireEvent.change(screen.getByLabelText("Buscar peça anatômica"), { target: { value: "cranio" } });
    expect(screen.getByRole("button", { name: "Abrir peça: Crânio" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Abrir peça: Coração" })).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Buscar peça anatômica"), { target: { value: "inexistente" } });
    fireEvent.click(screen.getByRole("button", { name: "Limpar filtros" }));
    expect(screen.getByRole("button", { name: "Abrir peça: Coração" })).toBeInTheDocument();
    expect(within(screen.getByRole("group", { name: "Tipo de representação" })).getByRole("button", { name: "Todas" })).toHaveAttribute("aria-pressed", "true");
  });

  it("records exactly the seven selected candidates without restricted assets in the renderer", () => {
    expect(anatomyModelSelection).toHaveLength(7);
    expect(new Set(anatomyModelSelection.map((item) => item.id)).size).toBe(7);
    expect(anatomyModelSelection.filter((item) => item.status === "awaiting-file")).toHaveLength(2);
    expect(anatomyModelSelection.filter((item) => item.status === "integrated")).toHaveLength(1);
    for (const item of anatomyModelSelection) {
      expect(new URL(item.url).hostname).toBe("sketchfab.com");
      expect(item).not.toHaveProperty("assetPaths");
      expect(item.limitation.length).toBeGreaterThan(30);
    }
    expect(anatomyModelSelection.find((item) => item.id === "witmerlab-skull")?.status).toBe("permission-required");
  });
});
