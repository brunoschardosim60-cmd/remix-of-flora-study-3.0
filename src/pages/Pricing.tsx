import { useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Check, Sparkles, Crown, Rocket, ArrowLeft } from "lucide-react";

const PLANS = [
  {
    id: "free",
    name: "Grátis",
    price: "R$ 0",
    period: "para sempre",
    icon: Sparkles,
    desc: "Para começar a estudar com método.",
    features: [
      "Cadernos digitais ilimitados",
      "Revisão espaçada automática",
      "Banco com 3.000+ questões ENEM",
      "10 mensagens com Flora por dia",
      "2 correções de redação por semana",
    ],
    cta: "Começar grátis",
    highlight: false,
  },
  {
    id: "pro",
    name: "Pro",
    price: "R$ 19",
    period: "/mês",
    icon: Rocket,
    desc: "Para quem está a sério no ENEM ou concurso.",
    features: [
      "Tudo do plano Grátis",
      "Flora ilimitada (chat, planos, aulas)",
      "Redações ilimitadas com correção detalhada",
      "Simulado ENEM completo com TRI",
      "Banco de concursos (CESPE, FCC, FGV...)",
      "Suporte prioritário",
    ],
    cta: "Assinar Pro",
    highlight: true,
  },
  {
    id: "premium",
    name: "Premium",
    price: "R$ 39",
    period: "/mês",
    icon: Crown,
    desc: "Para quem quer o máximo da Flora.",
    features: [
      "Tudo do plano Pro",
      "Modelos de IA Ultra-rápidos",
      "Aulão personalizado por tema",
      "Mentoria em grupo semanal",
      "Acesso antecipado a novidades",
    ],
    cta: "Assinar Premium",
    highlight: false,
  },
];

export default function Pricing() {
  useEffect(() => {
    document.title = "Planos — StudyFlow";
  }, []);

  return (
    <div className="min-h-dvh bg-background text-foreground">
      <header className="border-b border-border/60 sticky top-0 bg-background/80 backdrop-blur z-50">
        <div className="container max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="w-4 h-4" /> Voltar
          </Link>
          <span className="font-heading font-bold">StudyFlow · Planos</span>
          <div className="w-16" />
        </div>
      </header>

      <section className="container max-w-6xl mx-auto px-4 py-12 text-center">
        <h2 className="text-3xl font-bold sm:text-4xl">Planos que cabem no seu bolso</h2>
        <p className="mt-4 text-muted-foreground max-w-2xl mx-auto">
          Escolha o plano ideal para sua jornada de estudos. Transparência total, sem letras miúdas.
        </p>
      </section>

      <section className="container max-w-6xl mx-auto px-4 pb-16 grid grid-cols-1 md:grid-cols-3 gap-5">
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
                O mais popular
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
        <div className="container max-w-6xl mx-auto px-4 py-6 text-center text-xs text-muted-foreground">
          Cancele quando quiser. Sem taxa de cancelamento. Pagamento processado pelo Stripe.
        </div>
      </footer>
    </div>
  );
}
