import { beforeEach, describe, expect, it, vi } from "vitest";
import { enqueuePageUpdate, flushQueue, getPendingPage, pendingCount, recoverPendingPage } from "./notebookOfflineQueue";

const { select, update, eq } = vi.hoisted(() => ({ select: vi.fn(), update: vi.fn(), eq: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { from: () => ({ update }) } }));
const page = { pageId: "p1", content: "Anotações", drawing_data: null, tags: ["HAM"], template: "clinical" };
beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
  update.mockReturnValue({ eq });
  eq.mockReturnValue({ eq, select });
  select.mockResolvedValue({ data: [{ id: "p1" }], error: null });
});

describe("preservação das anotações", () => {
  it("mantém o rascunho até confirmação da página pelo servidor", async () => {
    enqueuePageUpdate("user-a", page);
    expect(getPendingPage("user-a", "p1")?.template).toBe("clinical");
    expect(await flushQueue("user-a")).toEqual({ ok: 1, fail: 0 });
    expect(pendingCount("user-a")).toBe(0);
    expect(eq).toHaveBeenCalledWith("user_id", "user-a");
  });
  it("não confirma uma atualização sem linhas afetadas", async () => {
    select.mockResolvedValue({ data: [], error: null });
    enqueuePageUpdate("user-a", page);
    expect(await flushQueue("user-a")).toEqual({ ok: 0, fail: 1 });
    expect(pendingCount("user-a")).toBe(1);
  });
  it("não perde uma edição nem outra página recebida durante o envio", async () => {
    let resolve!: (value: unknown) => void;
    select.mockImplementationOnce(() => new Promise((done) => { resolve = done; }));
    enqueuePageUpdate("user-a", page);
    const sending = flushQueue("user-a");
    enqueuePageUpdate("user-a", { ...page, content: "Versão nova" });
    enqueuePageUpdate("user-a", { ...page, pageId: "p2" });
    resolve({ data: [{ id: "p1" }], error: null });
    await sending;
    expect(getPendingPage("user-a", "p1")?.content).toBe("Versão nova");
    expect(pendingCount("user-a")).toBe(2);
  });
  it("compartilha um envio em andamento sem enviar versões fora de ordem", async () => {
    enqueuePageUpdate("user-a", page);
    const sending = flushQueue("user-a");
    expect(flushQueue("user-a")).toBe(sending);
    await sending;
    expect(update).toHaveBeenCalledTimes(1);
  });
  it("isola rascunhos por conta", async () => {
    enqueuePageUpdate("user-a", page);
    expect(pendingCount("user-b")).toBe(0);
    await flushQueue("user-b");
    expect(update).not.toHaveBeenCalled();
  });
  it("informa armazenamento cheio em vez de fingir uma cópia segura", () => {
    const stub = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new DOMException("Full", "QuotaExceededError"); });
    expect(() => enqueuePageUpdate("user-a", page)).toThrow();
    stub.mockRestore();
  });
  it("não sobrescreve uma fila corrompida como se estivesse vazia", () => {
    localStorage.setItem("notebook_offline_queue_v2:user-a", "corrupted");
    expect(() => enqueuePageUpdate("user-a", page)).toThrow();
    expect(localStorage.getItem("notebook_offline_queue_v2:user-a")).toBe("corrupted");
  });
  it("recupera a fila antiga apenas para a página confirmada", () => {
    localStorage.setItem("notebook_offline_queue_v1", JSON.stringify({ p1: page, p2: { ...page, pageId: "p2" } }));
    expect(recoverPendingPage("user-a", "p1")?.content).toBe("Anotações");
    expect(getPendingPage("user-a", "p2")).toBeUndefined();
    expect(JSON.parse(localStorage.getItem("notebook_offline_queue_v1")!)).toHaveProperty("p2");
  });
});
