import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Medicine from "./Medicine";

const fake = vi.hoisted(() => ({
  user: { id: "review-user" } as { id: string } | null,
  read: vi.fn(), write: vi.fn(), acknowledge: vi.fn(),
}));
vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ user: fake.user }) }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { from: () => ({
  select: () => ({ eq: () => ({ maybeSingle: fake.read }) }),
  upsert: (...args: unknown[]) => { fake.write(...args); return { select: () => ({ single: fake.acknowledge }) }; },
}) } }));
vi.mock("@/lib/medicineMedia", () => ({ isMedicalImageReady: () => true, preloadMedicalImages: async () => {} }));

beforeEach(() => {
  vi.useFakeTimers(); localStorage.clear(); vi.clearAllMocks();
  fake.user = { id: "review-user" };
  fake.acknowledge.mockResolvedValue({ data: { user_id: "review-user" }, error: null });
});
afterEach(() => { cleanup(); vi.useRealTimers(); });
const settle = async () => {
  await act(async () => { await Promise.resolve(); });
  await act(async () => { await vi.advanceTimersByTimeAsync(1000); });
};
const app = () => <MemoryRouter initialEntries={["/medicine"]}><Medicine/></MemoryRouter>;

describe("medicine cloud safety", () => {
  it("blocks writes after a denied read and lets the user retry", async () => {
    fake.read.mockResolvedValueOnce({ data: null, error: { message: "denied" } })
      .mockResolvedValueOnce({ data: null, error: null });
    render(app()); await settle();
    expect(fake.write).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Tentar sincronizar" }));
    await settle();
    expect(fake.write).toHaveBeenCalledOnce();
    expect(screen.getByRole("button", { name: "Progresso protegido" })).toBeInTheDocument();
  });
  it("does not show protected progress when the write returns no row", async () => {
    fake.read.mockResolvedValue({ data: null, error: null });
    fake.acknowledge.mockResolvedValue({ data: null, error: null });
    render(app()); await settle();
    expect(screen.getByRole("button", { name: "Tentar sincronizar" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Progresso protegido" })).not.toBeInTheDocument();
  });
  it("ignores a late read after leaving the account", async () => {
    let finish!: (result: { data: null; error: null }) => void;
    fake.read.mockReturnValue(new Promise((resolve) => { finish = resolve; }));
    const view = render(app());
    fake.user = null; view.rerender(app());
    await act(async () => { finish({ data: null, error: null }); });
    await settle();
    expect(fake.write).not.toHaveBeenCalled();
  });
});
