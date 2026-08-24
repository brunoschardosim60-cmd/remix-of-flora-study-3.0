import { useNavigate } from "react-router-dom";
import { ArrowLeft, Gamepad2, LogIn, Swords, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { BottomNav } from "@/components/BottomNav";

export default function QuizBattle() {
  const navigate = useNavigate();

  return (
    <div className="min-h-dvh bg-background pb-20 md:pb-8">
      <header className="sticky top-0 z-10 border-b border-border bg-card">
        <div className="w-full px-4 py-3 sm:px-6 lg:px-10 xl:px-16 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/")} aria-label="Voltar ao início">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
            <Swords className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-lg font-semibold">Batalha de Quiz</h1>
            <p className="text-xs text-muted-foreground">Desafie alguém e descubra quem sabe mais</p>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6">
        <div className="mb-6 rounded-2xl border border-primary/20 bg-primary/5 p-5 text-center">
          <Trophy className="mx-auto mb-3 h-10 w-10 text-primary" />
          <h2 className="font-heading text-xl font-bold">Pronto para competir?</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Crie uma sala e envie o código, ou entre em uma batalha criada por outra pessoa.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Card className="flex flex-col items-center p-6 text-center">
            <Gamepad2 className="mb-3 h-8 w-8 text-primary" />
            <h3 className="font-semibold">Criar batalha</h3>
            <p className="mb-5 mt-1 flex-1 text-sm text-muted-foreground">
              Escolha o conteúdo, configure as perguntas e compartilhe o código da sala.
            </p>
            <Button className="w-full gap-2" onClick={() => navigate("/quiz-battle/criar")}>
              <Swords className="h-4 w-4" /> Criar batalha
            </Button>
          </Card>

          <Card className="flex flex-col items-center p-6 text-center">
            <LogIn className="mb-3 h-8 w-8 text-primary" />
            <h3 className="font-semibold">Entrar com código</h3>
            <p className="mb-5 mt-1 flex-1 text-sm text-muted-foreground">
              Digite o código recebido para entrar em uma sala e começar a jogar.
            </p>
            <Button variant="outline" className="w-full gap-2" onClick={() => navigate("/quiz-battle/entrar")}>
              <LogIn className="h-4 w-4" /> Entrar na batalha
            </Button>
          </Card>
        </div>
      </main>

      <BottomNav />
    </div>
  );
}
