import { useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Sparkles, BookOpen, PenTool, Brain, TrendingUp, Users, ArrowRight, Check } from "lucide-react";

/**
 * Landing page p\u00fablica (n\u00e3o autenticada) do StudyFlow.
 * - SEO-friendly: H1 \u00fanico, meta description, JSON-LD via useEffect.
 * - Sem altera\u00e7\u00e3o do design system (usa tokens sem\u00e2nticos).
 */
export default function Landing() {
  useEffect(() => {
    document.title = "StudyFlow \u2014 Estudo inteligente com IA Flora";
    const setMeta = (name: string, content: string, property = false) => {
      const attr = property ? "property" : "name";
      let el = document.querySelector(`meta[${attr}="${name}"]`) as HTMLMetaElement | null;
      if (!el) { el = document.createElement("meta"); el.setAttribute(attr, name); document.head.appendChild(el); }
      el.setAttribute("content", content);
    };
    setMeta("description", "Plataforma de estudos com IA Flora: revis\u00e3o espa\u00e7ada, cadernos digitais, reda\u00e7\u00e3o ENEM corrigida por IA e banco com 3 mil quest\u00f5es oficiais.");
    setMeta("og:title", "StudyFlow \u2014 Estudo inteligente com IA Flora", true);
    setMeta("og:description", "Revis\u00e3o espa\u00e7ada, cadernos, reda\u00e7\u00e3o e banco ENEM \u2014 tudo guiado pela IA Flora.", true);

    // canonical
    let link = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (!link) { link = document.createElement("link"); link.rel = "canonical"; document.head.appendChild(link); }
    link.href = window.location.origin + "/";

    // JSON-LD
    const existing = document.getElementById("ld-software");
    if (existing) existing.remove();
    const ld = document.createElement("script");
    ld.type = "application/ld+json";
    ld.id = "ld-software";
    ld.textContent = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      name: "StudyFlow",
      applicationCategory: "EducationalApplication",
      operatingSystem: "Web",
      description: "Plataforma de estudos com IA Flora para ENEM, vestibular e concursos.",
      offers: { "@type": "Offer", price: "0", priceCurrency: "BRL" },
    });
    document.head.appendChild(ld);
  }, []);

  const features = [
    { icon: Sparkles, title: "IA Flora", desc: "Sua professora pessoal: monta plano, tira d\u00favida, cobra revis\u00e3o." },
    { icon: Brain, title: "Revis\u00e3o espa\u00e7ada", desc: "Algoritmo cient\u00edfico que decide o que voc\u00ea precisa revisar hoje." },
    { icon: BookOpen, title: "Cadernos digitais", desc: "Escreva, desenhe, gere flashcards e resumo com a Flora." },
    { icon: PenTool, title: "Reda\u00e7\u00e3o ENEM", desc: "Corre\u00e7\u00e3o por compet\u00eancia em segundos com nota 0\u20131000." },
    { icon: TrendingUp, title: "Banco com 3 mil quest\u00f5es", desc: "ENEM oficial + concursos. Anal\u00edse de erros e simulado completo." },
    { icon: Users, title: "Comunidades", desc: "Estude com gente que tem o mesmo objetivo que voc\u00ea." },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="border-b border-border/60 sticky top-0 z-30 bg-background/80 backdrop-blur">
        <div className="container max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-primary/15 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-primary" />
            </div>
            <span className="font-heading font-bold text-lg">StudyFlow</span>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/auth"><Button variant="ghost" size="sm">Entrar</Button></Link>
            <Link to="/auth"><Button size="sm">Come\u00e7ar gr\u00e1tis</Button></Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="container max-w-6xl mx-auto px-4 pt-16 pb-12 text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs text-muted-foreground mb-6">
          <Sparkles className="w-3 h-3 text-primary" /> IA Flora \u2014 sua professora 24/7
        </div>
        <h1 className="font-heading text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight max-w-3xl mx-auto">
          Estude o que importa.<br />
          <span className="text-primary">A Flora cuida do resto.</span>
        </h1>
        <p className="mt-6 text-lg text-muted-foreground max-w-2xl mx-auto">
          Plataforma de estudo com IA que monta seu plano, te cobra revis\u00e3o, corrige reda\u00e7\u00e3o e ainda explica quest\u00e3o como uma professora paciente.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link to="/auth">
            <Button size="lg" className="gap-2 h-12 px-6 text-base font-semibold">
              Come\u00e7ar agora \u2014 \u00e9 gr\u00e1tis <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
          <a href="#features">
            <Button size="lg" variant="outline" className="h-12 px-6">Ver recursos</Button>
          </a>
        </div>
        <ul className="mt-6 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-sm text-muted-foreground">
          <li className="flex items-center gap-1.5"><Check className="w-4 h-4 text-primary" /> Sem cart\u00e3o</li>
          <li className="flex items-center gap-1.5"><Check className="w-4 h-4 text-primary" /> Plano gr\u00e1tis pra sempre</li>
          <li className="flex items-center gap-1.5"><Check className="w-4 h-4 text-primary" /> ENEM + Concurso</li>
        </ul>
      </section>

      {/* Features */}
      <section id="features" className="container max-w-6xl mx-auto px-4 py-16">
        <h2 className="font-heading text-3xl font-bold text-center mb-2">Tudo o que voc\u00ea precisa em um lugar</h2>
        <p className="text-center text-muted-foreground mb-10">Pensado pra quem estuda de verdade.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {features.map((f) => (
            <div key={f.title} className="rounded-2xl border border-border bg-card p-5 hover:border-primary/40 transition-colors">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mb-3">
                <f.icon className="w-5 h-5 text-primary" />
              </div>
              <h3 className="font-heading font-semibold text-lg">{f.title}</h3>
              <p className="text-sm text-muted-foreground mt-1">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="container max-w-3xl mx-auto px-4 py-16 text-center">
        <div className="rounded-3xl border border-border bg-gradient-to-br from-primary/10 to-card p-10">
          <h2 className="font-heading text-3xl font-bold">Pronto pra estudar com m\u00e9todo?</h2>
          <p className="text-muted-foreground mt-2">Crie sua conta em menos de um minuto.</p>
          <Link to="/auth" className="inline-block mt-6">
            <Button size="lg" className="h-12 px-8 font-semibold">Criar conta gr\u00e1tis</Button>
          </Link>
        </div>
      </section>

      <footer className="border-t border-border/60 mt-8">
        <div className="container max-w-6xl mx-auto px-4 py-6 text-center text-xs text-muted-foreground">
          \u00a9 {new Date().getFullYear()} StudyFlow \u2014 Feito para estudantes brasileiros.
        </div>
      </footer>
    </div>
  );
}