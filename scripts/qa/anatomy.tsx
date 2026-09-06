import { createRoot } from "react-dom/client";
import { Anatomy3DStudio } from "../../src/components/medicine/Anatomy3DStudio";
import "../../src/index.css";
import "../../src/components/medicine/medicine.css";
import "../../src/components/medicine/anatomy-3d.css";
import "../../src/components/medicine/medicine-enhancements.css";
if (import.meta.env.DEV) createRoot(document.getElementById("root")!).render(<div className="medicine-app"><Anatomy3DStudio level="Residência"/></div>);
