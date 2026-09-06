// Development-only shell. No AuthProvider: no account is supplied to Medicine.
// Open on localhost rather than 127.0.0.1 to isolate local practice preferences.
import { createRoot } from "react-dom/client";
import { MemoryRouter } from "react-router-dom";
import { TooltipProvider } from "../../src/components/ui/tooltip";
import { Toaster } from "sonner";
import Medicine from "../../src/pages/Medicine";
import "../../src/index.css";

if (import.meta.env.DEV) createRoot(document.getElementById("root")!).render(
  <MemoryRouter initialEntries={["/medicine"]}><TooltipProvider><Medicine/><Toaster/></TooltipProvider></MemoryRouter>,
);
