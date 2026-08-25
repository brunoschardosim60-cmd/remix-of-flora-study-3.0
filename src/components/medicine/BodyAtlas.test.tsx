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
});
