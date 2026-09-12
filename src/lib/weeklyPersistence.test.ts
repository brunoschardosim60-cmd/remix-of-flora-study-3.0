import { beforeEach, describe, expect, it } from "vitest";
import { createDefaultWeeklySlots, loadWeekly, normalizeWeeklySlots, saveWeekly, type WeeklySlot } from "./studyData";

beforeEach(() => localStorage.clear());
const philosophy: WeeklySlot = {
  // Existing user-defined subjects may extend the static preset union.
  id: "custom-philosophy", dia: 0, horario: "08:30", materia: "Filosofia" as WeeklySlot["materia"],
  descricao: "Ética e filosofia política", concluido: true,
};
describe("persistência dos horários personalizados", () => {
  it("preserva Filosofia às 08:30 ao salvar, sair e carregar", () => {
    saveWeekly([...createDefaultWeeklySlots(), philosophy]);
    const remoteReload = normalizeWeeklySlots(JSON.parse(JSON.stringify(loadWeekly())));
    saveWeekly(remoteReload);
    expect(loadWeekly().find((slot) => slot.id === philosophy.id)).toEqual(philosophy);
    expect(remoteReload.filter((slot) => slot.horario === "08:30")).toHaveLength(7);
  });
  it("não apaga uma grade que não contém 07:00 ou 23:00", () => {
    saveWeekly([philosophy]);
    expect(loadWeekly()).toEqual([philosophy]);
    expect(loadWeekly()).toEqual([philosophy]);
  });
  it("preserva horários fora da grade padrão e não duplica células ao reabrir", () => {
    const early = { ...philosophy, id: "early", horario: "06:45", dia: 2 };
    const late = { ...philosophy, id: "late", horario: "23:30", dia: 6 };
    const once = normalizeWeeklySlots([philosophy, early, late]);
    const twice = normalizeWeeklySlots(once);
    expect(twice).toEqual(once);
    for (const slot of [philosophy, early, late]) expect(twice.find((item) => item.id === slot.id)).toEqual(slot);
  });
});
