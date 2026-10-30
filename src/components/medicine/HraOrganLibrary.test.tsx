import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useEffect } from "react";
import { HraOrganLibrary } from "./HraOrganLibrary";

vi.mock("./HraOrganViewport", () => ({
  default: ({ parts, onMeshesReady, selectedMesh }: { parts: Array<{ path: string }>; onMeshesReady: (n: string[]) => void; selectedMesh: string | null }) => {
    useEffect(() => { onMeshesReady(["VH_F_left_ventricle", "VH_F_aorta"]); }, [onMeshesReady, parts]);
    return <div data-testid="viewport" data-parts={parts.map((p) => p.path).join(",")} data-selected={selectedMesh ?? ""} />;
  },
}));

describe("HraOrganLibrary", () => {
  it("lista órgãos por sistema e mostra a fonte com licença", async () => {
    render(<HraOrganLibrary />);
    expect(screen.getByRole("heading", { name: "Órgãos 3D" })).toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: "Órgãos disponíveis" })).toBeInTheDocument();
    expect(await screen.findByTestId("viewport")).toBeInTheDocument();
    expect(screen.getByText(/CC BY 4\.0/)).toBeInTheDocument();
  });

  it("troca de órgão e de modelo (homem/mulher)", async () => {
    render(<HraOrganLibrary />);
    const viewport = await screen.findByTestId("viewport");
    const femaleParts = viewport.getAttribute("data-parts");
    fireEvent.click(screen.getByRole("button", { name: "Homem" }));
    await waitFor(() => expect(screen.getByTestId("viewport").getAttribute("data-parts")).not.toBe(femaleParts));
    fireEvent.click(screen.getByRole("button", { name: /Fígado/ }));
    await waitFor(() => expect(screen.getByRole("heading", { level: 3, name: "Fígado" })).toBeInTheDocument());
  });

  it("desabilita o sexo indisponível (útero só feminino)", async () => {
    render(<HraOrganLibrary />);
    fireEvent.click(screen.getByRole("button", { name: /Útero/ }));
    await waitFor(() => expect(screen.getByRole("button", { name: "Homem" })).toBeDisabled());
  });

  it("seleciona e filtra estruturas do modelo", async () => {
    render(<HraOrganLibrary />);
    const list = await screen.findByRole("list", { name: "Estruturas do modelo" });
    await waitFor(() => expect(list.querySelectorAll("li").length).toBe(2));
    fireEvent.change(screen.getByLabelText("Buscar estrutura do modelo"), { target: { value: "aorta" } });
    expect(list.querySelectorAll("li").length).toBe(1);
    fireEvent.click(screen.getByRole("button", { name: /aorta/i }));
    expect(screen.getByTestId("viewport").getAttribute("data-selected")).toBe("VH_F_aorta");
    expect(screen.getByRole("button", { name: "Isolar selecionada" })).toBeEnabled();
  });
});
