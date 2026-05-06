import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock do supabase ANTES de importar o módulo
const insertMock = vi.fn();
const selectMock = vi.fn();
const eq1 = vi.fn();
const eq2 = vi.fn();

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: () => ({
      select: (...args: unknown[]) => {
        selectMock(...args);
        return { eq: (...a1: unknown[]) => {
          eq1(...a1);
          return { eq: (...a2: unknown[]) => {
            eq2(...a2);
            return Promise.resolve({ data: [], error: null });
          } };
        } };
      },
      insert: (rows: unknown) => {
        insertMock(rows);
        return Promise.resolve({ error: null });
      },
    }),
  },
}));

import { scheduleSpacedReviews } from "@/lib/spacedReviews";

beforeEach(() => {
  insertMock.mockClear();
  selectMock.mockClear();
  eq1.mockClear();
  eq2.mockClear();
});

describe("scheduleSpacedReviews", () => {
  it("retorna erro quando faltam ids", async () => {
    const r = await scheduleSpacedReviews("", "t", "M");
    expect(r.error).toBeTruthy();
    expect(r.created).toBe(0);
  });

  it("agenda 4 revisões no padrão default", async () => {
    const r = await scheduleSpacedReviews("u1", "topic1", "Português");
    expect(r.created).toBe(4);
    const rows = insertMock.mock.calls[0][0] as Array<{ interval_days: number }>;
    expect(rows).toHaveLength(4);
    // Cada linha tem user_id, topic_id, materia, scheduled_date
    rows.forEach((row: any) => {
      expect(row.user_id).toBe("u1");
      expect(row.topic_id).toBe("topic1");
      expect(row.materia).toBe("Português");
      expect(row.completed).toBe(false);
      expect(typeof row.scheduled_date).toBe("string");
    });
  });

  it("aceita intervals customizados", async () => {
    const r = await scheduleSpacedReviews("u1", "t1", "M", [1, 2]);
    expect(r.created).toBe(2);
    const rows = insertMock.mock.calls[0][0] as Array<{ interval_days: number }>;
    // Intervals 1 e 2 são <4 → não sofrem fuzz
    expect(rows.map((r: any) => r.interval_days).sort()).toEqual([1, 2]);
  });

  it("aplica fuzz em intervalos >=4 (mantém dentro de ±2 dias)", async () => {
    await scheduleSpacedReviews("u1", "t1", "M", [15]);
    const rows = insertMock.mock.calls[0][0] as Array<{ interval_days: number }>;
    expect(rows[0].interval_days).toBeGreaterThanOrEqual(13);
    expect(rows[0].interval_days).toBeLessThanOrEqual(17);
  });
});
