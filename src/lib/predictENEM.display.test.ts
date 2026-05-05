import { describe, it, expect } from "vitest";
import { getTopContributors, predictENEMScore, toENEMScale } from "./predictENEM";

const TODAY = "2026-04-23";

describe("getTopContributors", () => {
  it("returns empty when all weights are 0", () => {
    const factors = { quizScore: 0, essayScore: 0, reviewScore: 0, volumeScore: 0, scheduleScore: 0, reviewRate: 0, studyVolumeMin: 0, scheduleAdherence: 0, hasEssays: false, hasReviews: false, hasSchedule: false, essayCount: 0, avgEssayRaw: 0 };
    const weights = { quizzes: 0, essays: 0, reviews: 0, volume: 0, schedule: 0 };
    expect(getTopContributors(factors, weights)).toEqual([]);
  });

  it("returns factors sorted by weighted contribution descending", () => {
    const r = predictENEMScore(
      [{ materia: "Matemática", accuracy: 80, erro_recorrente: false }],
      [{ duration_ms: 300 * 60000 }],
      [{ status: "corrigida", nota_total: 200 }],
      [{ completed: true, scheduled_date: "2026-04-20" }],
      [{ concluido: true }],
      TODAY,
    );
    const top = getTopContributors(r.factors, r.weights, 5);
    for (let i = 1; i < top.length; i++) {
      expect(top[i - 1].contribution).toBeGreaterThanOrEqual(top[i].contribution);
    }
  });

  it("limits to count", () => {
    const r = predictENEMScore(
      [{ materia: "Matemática", accuracy: 50, erro_recorrente: false }],
      [{ duration_ms: 100 * 60000 }],
      [],
      [],
      [],
      TODAY,
    );
    expect(getTopContributors(r.factors, r.weights, 2).length).toBeLessThanOrEqual(2);
  });

  it("contribution = score * weight / 100", () => {
    const r = predictENEMScore(
      [{ materia: "Matemática", accuracy: 100, erro_recorrente: false }],
      [],
      [],
      [],
      [],
      TODAY,
    );
    const top = getTopContributors(r.factors, r.weights);
    const quizEntry = top.find(t => t.label === "Quizzes");
    expect(quizEntry).toBeDefined();
    expect(quizEntry!.contribution).toBe(Math.round(1000 * r.weights.quizzes / 100));
  });
});

describe("display consistency — zero data", () => {
  const r = predictENEMScore([], [], [], [], [], TODAY);

  it("all factor scores are 0", () => {
    expect(r.factors.quizScore).toBe(0);
    expect(r.factors.essayScore).toBe(0);
    expect(r.factors.reviewScore).toBe(0);
    expect(r.factors.volumeScore).toBe(0);
    expect(r.factors.scheduleScore).toBe(0);
  });

  it("toENEMScale(0) = 300 for every factor", () => {
    expect(toENEMScale(r.factors.quizScore)).toBe(300);
    expect(toENEMScale(r.factors.essayScore)).toBe(300);
    expect(toENEMScale(r.factors.reviewScore)).toBe(300);
    expect(toENEMScale(r.factors.volumeScore)).toBe(300);
    expect(toENEMScale(r.factors.scheduleScore)).toBe(300);
  });

  it("no factor displays old 300 default internally", () => {
    // Internal scores must be 0, not 300
    const allInternal = [r.factors.quizScore, r.factors.essayScore, r.factors.reviewScore, r.factors.volumeScore, r.factors.scheduleScore];
    allInternal.forEach(s => expect(s).toBe(0));
  });

  it("top contributors list is empty when score is 0", () => {
    const top = getTopContributors(r.factors, r.weights);
    top.forEach(c => expect(c.contribution).toBe(0));
  });
});
