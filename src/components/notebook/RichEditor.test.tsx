import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { RichEditor } from "./RichEditor";
import { getTemplatesForSubject } from "@/lib/notebookTemplates";
vi.mock("@/integrations/supabase/client", () => ({ supabase: {} }));
vi.mock("./GhostTextExtension", () => ({ GhostText: { name: "testGhost" } }));
afterEach(cleanup);
const props = { content: "<p>Anotações de aula</p>", onChange: vi.fn(), userId: "test", notebookId: "test", darkMode: false, onToggleDarkMode: vi.fn() };
describe("notebook editor", () => {
  it("preserves a medical template table when opening the page", async () => {
    const template = getTemplatesForSubject("HAM").find((item) => item.html.includes("<table"));
    expect(template).toBeDefined();
    const { container } = render(<RichEditor {...props} content={template!.html} />);
    await waitFor(() => expect(container.querySelector(".tiptap table")).not.toBeNull());
    expect(container.querySelectorAll("td, th").length).toBeGreaterThan(2);
  });
  it("puts text commands in the shared toolbar, not above the paper", async () => {
    const host = document.createElement("div");
    document.body.appendChild(host);
    const { container, unmount } = render(<RichEditor {...props} toolbarHost={host} />);
    await waitFor(() => expect(host.querySelector("button")).not.toBeNull());
    expect(container.querySelector(".nb-editor-formatbar")).toBeNull();
    unmount();
    host.remove();
  });
  it("switches text editing off while drawing and restores it afterward", async () => {
    const { container, rerender } = render(<RichEditor {...props} drawing />);
    await waitFor(() => expect(container.querySelector(".tiptap")?.getAttribute("contenteditable")).toBe("false"));
    rerender(<RichEditor {...props} drawing={false} />);
    await waitFor(() => expect(container.querySelector(".tiptap")?.getAttribute("contenteditable")).toBe("true"));
    expect(screen.getByText("Anotações de aula")).toBeInTheDocument();
  });
});
