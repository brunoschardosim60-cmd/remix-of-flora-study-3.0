import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { anatomySpecimens } from "@/lib/anatomySpecimens";
vi.mock("@react-three/fiber", () => ({ Canvas: () => <div data-testid="specimen-canvas" />, useThree: vi.fn() }));
import AnatomySpecimenViewer from "./AnatomySpecimenViewer";

describe("realistic specimen controls", () => {
  it("starts without auto-rotation and offers truthful limits and didactic navigation", () => {
    const onBack = vi.fn(); const onDidactic = vi.fn();
    render(<AnatomySpecimenViewer specimen={anatomySpecimens[0]} onBack={onBack} onDidactic={onDidactic} />);
    expect(screen.getByRole("button", { name: "Girar" })).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByText(/Uma única malha externa/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Girar" }));
    expect(screen.getByRole("button", { name: "Parar rotação" })).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(screen.getByRole("button", { name: "Costas" }));
    expect(screen.getByRole("button", { name: "Costas" })).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(screen.getByRole("button", { name: "Recentrar" }));
    expect(screen.getByRole("button", { name: "Frente" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Girar" })).toHaveAttribute("aria-pressed", "false");
    fireEvent.click(screen.getByRole("button", { name: "Ver coração didático" }));
    fireEvent.click(screen.getByRole("button", { name: "Voltar ao atlas" }));
    expect(onBack).toHaveBeenCalledOnce(); expect(onDidactic).toHaveBeenCalledOnce();
  });
});
