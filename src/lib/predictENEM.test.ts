import { describe, it, expect } from "vitest";
import { predictENEMScore, toENEMScale } from "./predictENEM";

const TODAY = "2026-04-23";

// ── toENEMScale ──────────────────────────────────────────────
describe("toENEMScale", () => {
  it("converts 0 internal → 300 ENEM", () => {
    expect(toENEMScale(0)).toBe(300);
  });
  it("converts 1000 internal → 1000 ENEM", () => {
    expect(toENEMScale(1000)).toBe(1000);
  });
  it("converts 500 internal → 650 ENEM", () => {
    expect(toENEMScale(500)).toBe(650);
  });
  it("clamps negative to 300", () => {
    expect(toENEMScale(-50)).toBe(300);
  });
  it("clamps above 1000 to 1000", () => {
    expect(toENEMScale(1500)).toBe(1000);
  });
});

// ── Zero data scenario ──────────────────────────────────────
describe("predictENEMScore — zero data", () => {
  const result = predictENEMScore([], [], [], [], [], TODAY);

  it("final score is 0", () => {
    expect(result.score).toBe(0);
  });
  it("all factor scores are 0", () => {
    expect(result.factors.quizScore).toBe(0);
    expect(result.factors.essayScore).toBe(0);
    expect(result.factors.reviewScore).toBe(0);
    expect(result.factors.volumeScore).toBe(0);
    expect(result.factors.scheduleScore).toBe(0);
  });
  it("all breakdown area scores are 0", () => {
    result.breakdown.forEach(b => expect(b.score).toBe(0));
  });
  it("displays as 300 on ENEM scale", () => {
    expect(toENEMScale(result.score)).toBe(300);
  });
});

// ── Max data scenario ───────────────────────────────────────
describe("predictENEMScore — max data", () => {
  const perfs = [
    { materia: "Matemática", accuracy: 100, erro_recorrente: false },
    { materia: "Português", accuracy: 100, erro_recorrente: false },
    { materia: "História", accuracy: 100, erro_recorrente: false },
    { materia: "Biologia", accuracy: 100, erro_recorrente: false },
  ];
  const sessions = [{ duration_ms: 700 * 60000 }]; // >600min
  const essays = [{ status: "corrigida", nota_total: 1000 }];
  const reviews = [{ completed: true, scheduled_date: "2026-04-20" }];
  const slots = [{ concluido: true }];
  const result = predictENEMScore(perfs, sessions, essays, reviews, slots, TODAY);

  it("final score is 1000", () => {
    expect(result.score).toBe(1000);
  });
  it("all factor scores are 1000", () => {
    expect(result.factors.quizScore).toBe(1000);
    expect(result.factors.essayScore).toBe(1000);
    expect(result.factors.reviewScore).toBe(1000);
    expect(result.factors.volumeScore).toBe(1000);
    expect(result.factors.scheduleScore).toBe(1000);
  });
  it("displays as 1000 on ENEM scale", () => {
    expect(toENEMScale(result.score)).toBe(1000);
  });
});

// ── Individual factor tests ─────────────────────────────────
describe("predictENEMScore — individual factors", () => {
  it("quizScore scales linearly 0-1000", () => {
    const p0 = [{ materia: "Matemática", accuracy: 0, erro_recorrente: false }];
    expect(predictENEMScore(p0, [], [], [], [], TODAY).factors.quizScore).toBe(0);

    const p50 = [{ materia: "Matemática", accuracy: 50, erro_recorrente: false }];
    expect(predictENEMScore(p50, [], [], [], [], TODAY).factors.quizScore).toBe(500);

    const p100 = [{ materia: "Matemática", accuracy: 100, erro_recorrente: false }];
    expect(predictENEMScore(p100, [], [], [], [], TODAY).factors.quizScore).toBe(1000);
  });

  it("essayScore is 0 when no essays (never inherits from quiz)", () => {
    const perfs = [{ materia: "Matemática", accuracy: 80, erro_recorrente: false }];
    expect(predictENEMScore(perfs, [], [], [], [], TODAY).factors.essayScore).toBe(0);
  });

  it("essayScore reflects nota_total directly", () => {
    const essays = [
      { status: "corrigida", nota_total: 600 },
      { status: "corrigida", nota_total: 800 },
    ];
    expect(predictENEMScore([], [], essays, [], [], TODAY).factors.essayScore).toBe(700);
  });

  it("reviewScore reflects completion rate", () => {
    const reviews = [
      { completed: true, scheduled_date: "2026-04-20" },
      { completed: true, scheduled_date: "2026-04-21" },
      { completed: false, scheduled_date: "2026-04-25" },
    ];
    const r = predictENEMScore([], [], [], reviews, [], TODAY);
    expect(r.factors.reviewRate).toBe(67);
    expect(r.factors.reviewScore).toBe(670);
  });

  it("volumeScore scales 0 to 1000 at 600min, clamped", () => {
    expect(predictENEMScore([], [], [], [], [], TODAY).factors.volumeScore).toBe(0);
    expect(predictENEMScore([], [{ duration_ms: 300 * 60000 }], [], [], [], TODAY).factors.volumeScore).toBe(500);
    expect(predictENEMScore([], [{ duration_ms: 600 * 60000 }], [], [], [], TODAY).factors.volumeScore).toBe(1000);
    expect(predictENEMScore([], [{ duration_ms: 900 * 60000 }], [], [], [], TODAY).factors.volumeScore).toBe(1000);
  });

  it("scheduleScore scales 0-1000", () => {
    expect(predictENEMScore([], [], [], [], [], TODAY).factors.scheduleScore).toBe(0);
    expect(predictENEMScore([], [], [], [], [{ concluido: true }, { concluido: false }], TODAY).factors.scheduleScore).toBe(500);
    expect(predictENEMScore([], [], [], [], [{ concluido: true }], TODAY).factors.scheduleScore).toBe(1000);
  });
});

// ── Clamping ────────────────────────────────────────────────
describe("predictENEMScore — clamping", () => {
  it("final score always 0-1000", () => {
    const r = predictENEMScore([], [], [], [], [], TODAY);
    expect(r.score).toBeGreaterThanOrEqual(0);
    expect(r.score).toBeLessThanOrEqual(1000);
  });

  it("breakdown scores always 0-1000", () => {
    const perfs = [
      { materia: "Matemática", accuracy: 30, erro_recorrente: false },
      { materia: "História", accuracy: 90, erro_recorrente: false },
    ];
    const result = predictENEMScore(perfs, [], [], [], [], TODAY);
    result.breakdown.forEach(b => {
      expect(b.score).toBeGreaterThanOrEqual(0);
      expect(b.score).toBeLessThanOrEqual(1000);
    });
  });
});
