import { lazy, Suspense, useEffect } from "react";
import { QueryClient, QueryClientProvider, QueryCache, MutationCache } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { toast } from "sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { initNotifications } from "@/lib/notifications";
import { GlobalFocusMiniPlayer } from "@/components/GlobalFocusMiniPlayer";
import ErrorBoundary from "@/components/ErrorBoundary";
import { QuotaLimitModal } from "@/components/QuotaLimitModal";
import Index from "./pages/Index";
// Notebooks e NotebookEditor são pesados (canvas, drawing, rich editor) — lazy
const Notebooks = lazy(() => import("./pages/Notebooks"));
const NotebookEditor = lazy(() => import("./pages/NotebookEditor"));

const Auth = lazy(() => import("./pages/Auth"));
const AuthCallback = lazy(() => import("./pages/AuthCallback"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const Admin = lazy(() => import("./pages/Admin"));
const Onboarding = lazy(() => import("./pages/Onboarding"));
const Redacao = lazy(() => import("./pages/Redacao"));
const Analise = lazy(() => import("./pages/Analise"));
const Settings = lazy(() => import("./pages/Settings"));
const NotFound = lazy(() => import("./pages/NotFound"));
const SharedNotebook = lazy(() => import("./pages/SharedNotebook"));
const BancoQuestoes = lazy(() => import("./pages/BancoQuestoes"));
const BancoConcurso = lazy(() => import("./pages/BancoConcurso"));
const RedacaoTemas = lazy(() => import("./pages/RedacaoTemas"));
const Aulao = lazy(() => import("./pages/Aulao"));
const Pricing = lazy(() => import("./pages/Pricing"));
const PublicProfile = lazy(() => import("./pages/PublicProfile"));
const Cursos = lazy(() => import("./pages/Cursos"));
const CursoPlayer = lazy(() => import("./pages/CursoPlayer"));
const RedacaoTemplates = lazy(() => import("./pages/RedacaoTemplates"));
const SimuladoSemanal = lazy(() => import("./pages/SimuladoSemanal"));
const SimuladoEnem = lazy(() => import("./pages/SimuladoEnem"));
const ExplicaFoto = lazy(() => import("./pages/ExplicaFoto"));
const Aulas = lazy(() => import("./pages/Aulas"));
const Comunidade = lazy(() => import("./pages/Comunidade"));
const Mensagens = lazy(() => import("./pages/Mensagens"));
const Grupos = lazy(() => import("./pages/Grupos"));



// Toast global para falhas de rede / servidor (ignora quota — tratado em outro lugar)
function notifyNetworkError(error: unknown) {
  const err = error as { status?: number; message?: string; error?: string };
  const status = err?.status;
  // Erros de quota já têm modal próprio; auth/RLS não fazem sentido como toast genérico
  if (status === 401 || status === 402 || status === 403 || status === 429) return;
  if (err?.error === "quota_exceeded") return;
  const msg = err?.message || "";
  if (/failed to fetch|networkerror|load failed|network request failed/i.test(msg)) {
    toast.error("Sem conexão", {
      description: "Verifique sua internet e tente novamente.",
      duration: 4000,
    });
    return;
  }
  if (status && status >= 500) {
    toast.error("Erro no servidor", {
      description: "Algo deu errado do nosso lado. Já fomos notificados.",
      duration: 4000,
    });
  }
}

const queryClient = new QueryClient({
  queryCache: new QueryCache({ onError: notifyNetworkError }),
  mutationCache: new MutationCache({ onError: notifyNetworkError }),
  defaultOptions: {
    queries: {
      // Não faz retry em erros 4xx (RLS, auth, not found) — só em erros de servidor/rede
      retry: (failureCount, error: any) => {
        const status = error?.status ?? error?.code;
        if (status >= 400 && status < 500) return false;
        return failureCount < 2;
      },
      staleTime: 1000 * 60, // 1 minuto
    },
    mutations: {
      retry: false,
    },
  },
});

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-dvh bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }
  if (!user) return <Navigate to="/auth" replace />;
  return <>{children}</>;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-dvh bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (user) return <Navigate to="/" replace />;
  return <>{children}</>;
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { user, profile, isAdmin, loading } = useAuth();

  // Espera tanto a sessão quanto o profile carregarem.
  // Sem isso, `isAdmin` arranca como `false` enquanto o profile ainda está
  // sendo buscado e o guard redireciona pra "/" (parece que "fecha o admin").
  if (loading || (user && !profile)) {
    return (
      <div className="min-h-dvh bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return <Navigate to="/auth" replace />;
  if (!isAdmin) return <Navigate to="/" replace />;
  return <>{children}</>;
}

// Inicializa notificações push após login
function NotificationInit() {
  const { user } = useAuth();
  useEffect(() => {
    if (!user) return;
    supabase.from("spaced_reviews")
      .select("id, materia, scheduled_date, completed, interval_days")
      .eq("user_id", user.id)
      .eq("completed", false)
      .limit(50)
      .then(({ data }) => {
        if (data && data.length > 0) initNotifications(data as any);
      });
  }, [user]);
  return null;
}

// Não logado vai direto para /auth — sem tela de apresentação intermediária
function LandingOrDashboard() {
  const { user, loading } = useAuth();
  if (loading) return <RouteFallback />;
  if (!user) return <Navigate to="/auth" replace />;
  return (
    <ProtectedRoute>
      <Suspense fallback={<RouteFallback />}><Index /></Suspense>
    </ProtectedRoute>
  );
}

function RouteFallback() {
  return (
    <div className="min-h-dvh bg-background">
      <div className="border-b border-border bg-card sticky top-0 z-10">
        <div className="container max-w-7xl mx-auto px-3 sm:px-4 py-3 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-muted animate-pulse" />
          <div className="space-y-1.5 flex-1">
            <div className="h-5 w-28 rounded bg-muted animate-pulse" />
            <div className="h-3 w-44 rounded bg-muted/70 animate-pulse" />
          </div>
        </div>
      </div>
      <div className="container max-w-7xl mx-auto px-3 sm:px-4 py-6 space-y-4">
        <div className="h-32 rounded-2xl bg-muted/40 animate-pulse" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="h-24 rounded-2xl bg-muted/30 animate-pulse" />
          <div className="h-24 rounded-2xl bg-muted/30 animate-pulse" />
        </div>
      </div>
    </div>
  );
}

const App = () => (
  <ErrorBoundary>
  <ThemeProvider
    attribute="class"
    themes={["light", "dark", "black"]}
    defaultTheme="light"
    enableSystem={false}
    storageKey="studyflow.theme"
  >
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Sonner />
        <AuthProvider>
          <NotificationInit />
          <BrowserRouter
            future={{
              v7_startTransition: true,
              v7_relativeSplatPath: true,
            }}
          >
            <GlobalFocusMiniPlayer />
            <QuotaLimitModal />
            <Suspense fallback={<RouteFallback />}>
              <Routes>
                <Route path="/auth" element={<PublicRoute><Auth /></PublicRoute>} />
                {/* /auth/callback deve ser rota neutra — não usa PublicRoute para não
                    redirecionar usuários logados antes de processar o token OAuth/magic link */}
                <Route path="/auth/callback" element={<Suspense fallback={<RouteFallback />}><AuthCallback /></Suspense>} />
                <Route path="/forgot-password" element={<PublicRoute><ForgotPassword /></PublicRoute>} />
                <Route path="/reset-password" element={<ResetPassword />} />
                <Route path="/" element={<LandingOrDashboard />} />
                <Route path="/onboarding" element={<ProtectedRoute><Onboarding /></ProtectedRoute>} />
                <Route path="/admin" element={<AdminRoute><Admin /></AdminRoute>} />
                <Route path="/notebooks" element={<ProtectedRoute><Notebooks /></ProtectedRoute>} />
                <Route path="/notebooks/:id" element={<ProtectedRoute><NotebookEditor /></ProtectedRoute>} />
                <Route path="/redacao" element={<ProtectedRoute><Redacao /></ProtectedRoute>} />
                <Route path="/redacao/temas" element={<ProtectedRoute><RedacaoTemas /></ProtectedRoute>} />
                <Route path="/redacao/templates" element={<ProtectedRoute><RedacaoTemplates /></ProtectedRoute>} />

                <Route path="/banco" element={<ProtectedRoute><BancoQuestoes /></ProtectedRoute>} />
                <Route path="/banco-concurso" element={<ProtectedRoute><BancoConcurso /></ProtectedRoute>} />
                <Route path="/analise" element={<ProtectedRoute><Analise /></ProtectedRoute>} />
                <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
                <Route path="/shared/notebook/:token" element={<Suspense fallback={<RouteFallback />}><SharedNotebook /></Suspense>} />
                <Route path="/aulao" element={<ProtectedRoute><Aulao /></ProtectedRoute>} />
                <Route path="/cursos" element={<ProtectedRoute><Cursos /></ProtectedRoute>} />
                <Route path="/cursos/:id" element={<ProtectedRoute><CursoPlayer /></ProtectedRoute>} />
                <Route path="/simulado-semanal" element={<ProtectedRoute><SimuladoSemanal /></ProtectedRoute>} />
                <Route path="/simulado-enem" element={<ProtectedRoute><SimuladoEnem /></ProtectedRoute>} />
                <Route path="/explica-foto" element={<ProtectedRoute><ExplicaFoto /></ProtectedRoute>} />
                <Route path="/aulas" element={<ProtectedRoute><Aulas /></ProtectedRoute>} />
                <Route path="/comunidade" element={<ProtectedRoute><Comunidade /></ProtectedRoute>} />
                <Route path="/mensagens" element={<ProtectedRoute><Mensagens /></ProtectedRoute>} />
                <Route path="/grupos" element={<ProtectedRoute><Grupos /></ProtectedRoute>} />
                {/* Aliases: cronograma vive na Home (Index), evita 404 em links externos/legados */}
                <Route path="/cronograma" element={<Navigate to="/" replace />} />
                <Route path="/cronograma/semanal" element={<Navigate to="/" replace />} />
                <Route path="/pricing" element={<Suspense fallback={<RouteFallback />}><Pricing /></Suspense>} />
                <Route path="/u/:username" element={<Suspense fallback={<RouteFallback />}><PublicProfile /></Suspense>} />
                
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </BrowserRouter>
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  </ThemeProvider>
  </ErrorBoundary>
);

export default App;
