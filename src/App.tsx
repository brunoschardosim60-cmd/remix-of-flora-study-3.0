import { lazy, Suspense, useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { initNotifications } from "@/lib/notifications";
import { GlobalFocusMiniPlayer } from "@/components/GlobalFocusMiniPlayer";
import ErrorBoundary from "@/components/ErrorBoundary";
import { QuotaLimitModal } from "@/components/QuotaLimitModal";

const Index = lazy(() => import("./pages/Index"));
const Auth = lazy(() => import("./pages/Auth"));
const AuthCallback = lazy(() => import("./pages/AuthCallback"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const Notebooks = lazy(() => import("./pages/Notebooks"));
const NotebookEditor = lazy(() => import("./pages/NotebookEditor"));
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
const Comunidades = lazy(() => import("./pages/Comunidades"));
const Landing = lazy(() => import("./pages/Landing"));


const queryClient = new QueryClient({
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
      <div className="min-h-screen bg-background flex items-center justify-center">
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
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (user) return <Navigate to="/" replace />;
  return <>{children}</>;
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { user, isAdmin, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
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

// Se não estiver logado, envia direto para /auth para evitar redirects externos quebrando em preview
function LandingOrDashboard() {
  const { user, loading } = useAuth();
  if (loading) return <RouteFallback />;
  if (!user) return <Suspense fallback={<RouteFallback />}><Landing /></Suspense>;
  return (
    <ProtectedRoute>
      <Suspense fallback={<RouteFallback />}><Index /></Suspense>
    </ProtectedRoute>
  );
}

function RouteFallback() {
  return (
    <div className="min-h-screen bg-background">
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
                <Route path="/banco" element={<ProtectedRoute><BancoQuestoes /></ProtectedRoute>} />
                <Route path="/banco-concurso" element={<ProtectedRoute><BancoConcurso /></ProtectedRoute>} />
                <Route path="/analise" element={<ProtectedRoute><Analise /></ProtectedRoute>} />
                <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
                <Route path="/shared/notebook/:token" element={<Suspense fallback={<RouteFallback />}><SharedNotebook /></Suspense>} />
                <Route path="/aulao" element={<ProtectedRoute><Aulao /></ProtectedRoute>} />
                <Route path="/comunidades" element={<ProtectedRoute><Comunidades /></ProtectedRoute>} />
                
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
