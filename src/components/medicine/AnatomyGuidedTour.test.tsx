import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AnatomyGuidedTour } from "./AnatomyGuidedTour";
import { anatomyGuidedTours } from "@/lib/anatomyGuidedTours";

const speak = vi.fn(async () => {});
const stop = vi.fn();
vi.mock("@/hooks/useFloraVoice", () => ({
  useFloraVoice: () => ({ speak, stop, toggle: vi.fn(), playing: false, loading: false, error: null, mode: null }),
}));

describe("AnatomyGuidedTour", () => {
  it("inicia a visita, foca a primeira estrutura e narra", () => {
    const onFocus = vi.fn();
    render(<AnatomyGuidedTour onFocusStructure={onFocus} />);
    fireEvent.click(screen.getByRole("button", { name: /Visita guiada narrada/ }));
    fireEvent.click(screen.getByRole("button", { name: new RegExp(anatomyGuidedTours[0].title) }));
    expect(onFocus).toHaveBeenCalledWith(anatomyGuidedTours[0].stops[0].structureId);
    expect(speak).toHaveBeenCalledWith(anatomyGuidedTours[0].stops[0].narration, "tecnica");
    expect(screen.getByText(`Parada 1 de ${anatomyGuidedTours[0].stops.length}`)).toBeInTheDocument();
  });

  it("avança e volta entre paradas e encerra", () => {
    const onFocus = vi.fn();
    render(<AnatomyGuidedTour onFocusStructure={onFocus} />);
    fireEvent.click(screen.getByRole("button", { name: /Visita guiada narrada/ }));
    fireEvent.click(screen.getByRole("button", { name: new RegExp(anatomyGuidedTours[0].title) }));
    fireEvent.click(screen.getByRole("button", { name: "Próxima parada" }));
    expect(onFocus).toHaveBeenLastCalledWith(anatomyGuidedTours[0].stops[1].structureId);
    expect(screen.getByRole("button", { name: "Parada anterior" })).toBeEnabled();
    fireEvent.click(screen.getByRole("button", { name: "Encerrar visita guiada" }));
    expect(screen.getByRole("button", { name: /Visita guiada narrada/ })).toBeInTheDocument();
  });
});
