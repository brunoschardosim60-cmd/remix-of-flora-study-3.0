import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { componentTagger } from "lovable-tagger";
// Descomente para gerar mapa visual do bundle após `vite build`:
// import { visualizer } from "rollup-plugin-visualizer";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  build: {
    // manualChunks removido: estava causando TDZ ("Cannot access 'A' before initialization")
    // por dependência circular entre o chunk de recharts/d3 e seus consumidores.
    // Deixar o Rollup fazer code-splitting automático evita o problema.
    //
    // Estado atual dos chunks pesados:
    //   recharts (~300kb)   → isolado: só importado em páginas lazy ✅
    //   katex   (~280kb)    → isolado: MathText usa lazy() → MathRenderer ✅
    //   framer-motion (~170kb) → isolado: só importado em páginas lazy
    //                            (Index, Settings, Comunidades, Onboarding) ✅
    //
    // Para medir os chunks reais: descomente o plugin visualizer abaixo e rode
    // `vite build`. Um arquivo stats.html será gerado na raiz do projeto.
    chunkSizeWarningLimit: 600, // avisa se algum chunk ultrapassar 600kb
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
    // mode === "production" && visualizer({ open: true, filename: "stats.html" }),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
    },
    dedupe: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime", "@tanstack/react-query", "@tanstack/query-core"],
  },
}));
