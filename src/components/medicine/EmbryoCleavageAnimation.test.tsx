import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleavageCellLayout, EmbryoCleavageAnimation } from "./EmbryoCleavageAnimation";
import { cleavageSteps } from "@/lib/embryoCleavage";

afterEach(() => vi.useRealTimers());

describe("EmbryoCleavageAnimation", () => {
  it("layout tem uma célula por blastômero, dentro da zona pelúcida", () => {
    for (const n of [1, 2, 4, 8, 16]) {
      const cells = cleavageCellLayout(n);
      expect(cells).toHaveLength(n);
      for (const c of cells) expect(Math.hypot(c.x - 150, c.y - 150) + c.r).toBeLessThanOrEqual(118);
    }
  });

  it("navega pela linha do tempo", () => {
    render(<EmbryoCleavageAnimation />);
    expect(screen.getByRole("heading", { level: 4, name: cleavageSteps[0].title })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Próxima etapa" }));
    expect(screen.getByRole("heading", { level: 4, name: cleavageSteps[1].title })).toBeInTheDocument();
    fireEvent.change(screen.getByRole("slider", { name: "Linha do tempo da clivagem" }), { target: { value: String(cleavageSteps.length - 1) } });
    expect(screen.getByRole("heading", { level: 4, name: cleavageSteps[cleavageSteps.length - 1].title })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Próxima etapa" })).toBeDisabled();
  });

  it("reproduz automaticamente e para no fim", () => {
    vi.useFakeTimers();
    render(<EmbryoCleavageAnimation />);
    fireEvent.click(screen.getByRole("button", { name: "Reproduzir animação" }));
    act(() => { vi.advanceTimersByTime(5300); });
    expect(screen.getByRole("heading", { level: 4, name: cleavageSteps[1].title })).toBeInTheDocument();
    for (let i = 0; i < cleavageSteps.length; i += 1) act(() => { vi.advanceTimersByTime(5300); });
    expect(screen.getByRole("heading", { level: 4, name: cleavageSteps[cleavageSteps.length - 1].title })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Reproduzir animação" })).toHaveTextContent("Rever");
  });
});
