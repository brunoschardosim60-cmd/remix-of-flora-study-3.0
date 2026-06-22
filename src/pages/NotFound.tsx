import { useLocation, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { Compass, ArrowLeft, Home } from "lucide-react";
import { Button } from "@/components/ui/button";

const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    console.warn("[StudyFlow] Rota não encontrada:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-dvh items-center justify-center bg-background px-4">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 sm:p-8 text-center space-y-5 shadow-sm">
        <div className="mx-auto w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
          <Compass className="w-7 h-7 text-primary" />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-bold">Página não encontrada</h1>
          <p className="text-sm text-muted-foreground">
            O endereço <code className="px-1.5 py-0.5 rounded bg-muted text-xs">{location.pathname}</code> não existe ou foi movido.
          </p>
          <p className="text-xs text-muted-foreground">
            Isso pode acontecer se você digitou o link errado, seguiu um atalho antigo ou a página foi renomeada. Nada quebrou — é só uma rota inexistente.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 pt-2">
          <Button variant="outline" className="flex-1 gap-2" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-4 h-4" /> Voltar
          </Button>
          <Button className="flex-1 gap-2" onClick={() => navigate("/")}>
            <Home className="w-4 h-4" /> Ir para o início
          </Button>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
