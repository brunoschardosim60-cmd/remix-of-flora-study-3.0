import { useNavigate } from "react-router-dom";
import { Stethoscope, Rotate3D, ClipboardCheck, FileHeart, Baby, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

const SHORTCUTS = [
  { label: "Corpo 3D", hint: "Camadas, órgãos e tour guiado", path: "/medicina/anatomia/3d", Icon: Rotate3D },
  { label: "Questões", hint: "Por sistema e por nível", path: "/medicina/praticar/questoes", Icon: ClipboardCheck },
  { label: "Anamnese", hint: "Paciente com voz e crise", path: "/medicina/clinica/anamnese", Icon: FileHeart },
  { label: "Desenvolvimento", hint: "Da fecundação ao recém-nascido", path: "/medicina/anatomia/desenvolvimento", Icon: Baby },
] as const;

/** Destaque de Medicina no dashboard para quem escolheu esse objetivo no onboarding. */
export function MedicineHero() {
  const navigate = useNavigate();
  return (
    <section
      aria-label="Atalhos de Medicina"
      className="rounded-2xl border border-emerald-200/70 bg-emerald-50/60 p-4 sm:p-5 dark:border-emerald-800 dark:bg-emerald-950/30"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600 text-white">
            <Stethoscope className="h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <h2 className="font-heading text-base font-bold sm:text-lg">Medicina</h2>
            <p className="text-sm text-muted-foreground">Continue de onde parou ou explore um tema.</p>
          </div>
        </div>
        <Button size="sm" className="gap-1.5" onClick={() => navigate("/medicina")}>
          Abrir Medicina <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Button>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2 lg:grid-cols-4">
        {SHORTCUTS.map(({ label, hint, path, Icon }) => (
          <button
            key={path}
            type="button"
            onClick={() => navigate(path)}
            className="flex min-h-[64px] items-start gap-3 rounded-xl border border-emerald-200/70 bg-background/80 p-3 text-left transition-colors hover:bg-background dark:border-emerald-800"
          >
            <Icon className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700 dark:text-emerald-300" aria-hidden="true" />
            <span className="min-w-0">
              <span className="block text-sm font-semibold">{label}</span>
              <span className="block text-xs text-muted-foreground">{hint}</span>
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}
