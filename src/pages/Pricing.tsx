import { useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Check, Sparkles, Crown, Rocket, ArrowLeft } from "lucide-react";

const PLANS = [
  {
    id: "free",
    name: "Gr\u00e1tis",
    price: "R$ 0",
    period: "para sempre",
    icon: Sparkles,
    desc: "Para come\u00e7ar a estudar com m\u00e9todo.",
    features: [
      "Cadernos digitais ilimitados",
      "Revis\u00e3o espa\u00e7ada autom\u00e1tica",
      "Banco com 3.000+ quest\u00f5es ENEM",
      "10 mensagens com Flora por dia",
      "2 corre\u00e7\u00f5es de reda\u00e7\u00e3o por semana",
    ],
    cta: "Come\u00e7ar gr\u00e1tis",
    highlight: false,
  },
  {
    id: "pro",
    name: "Pro",
    price: "R$ 19",
    period: "/m\u00eas",
    icon: Rocket,
    desc: "Para quem est\u00e1 a s\u00e9rio no ENEM ou concurso.",
    features: [
      "Tudo do plano Gr\u00e1tis",
      "Flora ilimitada (chat, planos, aulas)",
      "Reda\u00e7\u00f5es ilimitadas com corre\u00e7\u00e3o detalhada",
      "Simulado ENEM completo com TRI",
      "Banco de concursos (CESPE, FCC, FGV...)",
      "Suporte priorit\u00e1rio",
    ],
    cta: "Assinar Pro",
    highlight: true,
  },
  {
    id: "premium",
    name: "Premium",
    price: "R$ 39",
    period: "/m\u00eas",
    icon: Crown,
    desc: "Para quem quer o m\u00e1ximo da Flora.",
    features: [
      "Tudo do plano Pro",
      "Flora com modelo top de linha (GPT-5)",
      "Aul\u00e3o personalizado por tema",
      "Mentoria em grupo semanal",
      "Acesso antecipado a novidades",
    ],
    cta: "Assinar Premium",
    highlight: false,
  },
];

export default function Pricing() {
  useEffect(() => {
    document.title = "Planos \u2014 StudyFlow";
  }, []);

  return (
    <div className="min-h-dvh bg-background text-foreground">
      <header className="border-b border-border/60 sticky top-0 bg-background/80 backdrop-blur z-10">
        <div className="w-full px-4 sm:px-6 lg:px-10 xl:px-16 py-3 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="w-4 h-4" /> Voltar
          </Link>
          <span className="font-heading font-bold">StudyFlow \u00b7 Planos</span>
          <div className="w-16" />
        </div>
      </header>

      <section className="w-full px-4 sm:px-6 lg:px-10 xl:px-16 py-12 text-center">
        <h1 className="font-heading text-4xl md:text-5xl font-bold tracking-tight">Escolha seu plano</h1>
        <p className="mt-4 text-muted-foreground max-w-xl mx-auto">
          Comece gr\u00e1tis. Suba quando quiser mais da Flora.
        </p>
      </section>

      <section className="w-full px-4 sm:px-6 lg:px-10 xl:px-16 pb-16 grid grid-cols-1 md:grid-cols-3 gap-5">
        {PLANS.map((plan) => (
          <div
            key={plan.id}
            className={`relative rounded-3xl border p-6 flex flex-col ${
              plan.highlight
                ? "border-primary bg-primary/5 shadow-lg ring-1 ring-primary/20"
                : "border-border bg-card"
            }`}
          >
            {plan.highlight && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-primary text-primary-foreground text-xs font-semibold">
                Mais escolhido
              </div>
            )}
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center">
                <plan.icon className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h2 className="font-heading font-bold text-xl">{plan.name}</h2>
                <p className="text-xs text-muted-foreground">{plan.desc}</p>
              </div>
            </div>
            <div className="mt-5 flex items-baseline gap-1">
              <span className="text-4xl font-bold font-heading">{plan.price}</span>
              <span className="text-sm text-muted-foreground">{plan.period}</span>
            </div>
            <ul className="mt-5 space-y-2 flex-1">
              {plan.features.map((f) => (
                <li key={f} className="flex items-start gap-2 text-sm">
                  <Check className="w-4 h-4 text-primary mt-0.5 shrink-0" /> <span>{f}</span>
                </li>
              ))}
            </ul>
            <Link to="/auth" className="mt-6">
              <Button
                size="lg"
                variant={plan.highlight ? "default" : "outline"}
                className="w-full font-semibold"
              >
                {plan.cta}
              </Button>
            </Link>
          </div>
        ))}
      </section>

      <footer className="border-t border-border/60">
        <div className="w-full px-4 sm:px-6 lg:px-10 xl:px-16 py-6 text-center text-xs text-muted-foreground">
          Cancele quando quiser. Sem taxa de cancelamento. Pagamento processado pelo Stripe.
        </div>
      </footer>
    </div>
  );
}