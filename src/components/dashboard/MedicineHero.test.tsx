import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { ALL_SUBJECTS, MEDICINA_SUBJECTS, SUBJECT_COLORS } from "@/lib/studyData";
import { MedicineHero } from "./MedicineHero";

function Where() {
  return <output data-testid="where">{useLocation().pathname}</output>;
}

describe("foco em Medicina", () => {
  it("toda matéria de Medicina tem cor e está disponível nos seletores do app", () => {
    for (const subject of MEDICINA_SUBJECTS) {
      expect(SUBJECT_COLORS[subject], subject).toBeTruthy();
      expect(ALL_SUBJECTS, subject).toContain(subject);
    }
    expect(new Set(MEDICINA_SUBJECTS).size).toBe(MEDICINA_SUBJECTS.length);
  });

  it("o cartão do dashboard leva às seções de Medicina", () => {
    render(
      <MemoryRouter initialEntries={["/"]}>
        <MedicineHero />
        <Routes><Route path="*" element={<Where />} /></Routes>
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole("button", { name: /Corpo 3D/ }));
    expect(screen.getByTestId("where")).toHaveTextContent("/medicina/anatomia/3d");

    fireEvent.click(screen.getByRole("button", { name: /Abrir Medicina/ }));
    expect(screen.getByTestId("where")).toHaveTextContent(/^\/medicina$/);
  });
});
