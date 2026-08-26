import { useState } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { anatomyStructures, type AnatomyStructure } from "@/lib/medicineData";
import { BodyAtlas } from "./BodyAtlas";

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

describe("BodyAtlas selection flow", () => {
  it("selects a structure without opening the detail dialog", () => {
    render(<AtlasHarness />);

    fireEvent.click(screen.getByRole("button", { name: /^Pulmões/ }));

    expect(screen.getByRole("heading", { level: 3, name: "Pulmões" })).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
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
    expect(screen.getByText("54 catalogadas · 41 nesta vista")).toBeInTheDocument();
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
