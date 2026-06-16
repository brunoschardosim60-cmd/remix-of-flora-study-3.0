Vou implementar as melhorias em etapas priorizadas por impacto/risco. Cada etapa é independente e entregável; ao final de cada uma envio um mini-relatório.

## Etapa 1 — Fundação técnica (baixo risco, alto valor)
1. **Logger util** (`src/lib/logger.ts`) — silencia `log/info/debug` em `import.meta.env.PROD`, mantém `warn/error`. Substituir os ~55 `console.*` por `logger.*` (script `sed` + revisão manual nos críticos).
2. **CSS de foco** → mover `focus-aurora`, `focus-particles`, `study-night` para `src/styles/focus.css` e importar no `main.tsx`. Enxuga `index.css`.
3. **Lazy loading** — devolver `lazy()` para `KonvaDrawingCanvas`, `Aulao`, `CursoPlayer` (os 3 mais pesados) com `<Suspense fallback={<Loader/>}>`. Manter `NotebookEditor`, `QuizDialog`, `FlashcardSessionDialog` estáticos (foram corrigidos no mobile, regressão alta).
4. **Service Worker prod flag** — `VITE_ENABLE_SW=true` em `.env.production`, condicional no `main.tsx`.
5. **Tipagem** — tipar `floraClient`, `aiActivityStore`, `useFloraChatStream` removendo `any`.

## Etapa 2 — UX Mobile + Notificações
6. **BottomNav mobile** — novo `src/components/layout/BottomNav.tsx` com 5 ícones (Hoje, Cadernos, Banco, Flora, Eu). Visível só em `md:hidden`. Esconde scroll horizontal da navbar atual no mobile.
7. **Resumo único de revisões 19h** — em `src/lib/notifications.ts`:
   - Remover push imediato por item.
   - Agendar 1 notificação diária às 19h: "Você tem N revisões pendentes hoje" → clica → abre `/revisoes` (sessão rápida).
   - Persistir `last_review_digest_date` no localStorage para idempotência.

## Etapa 3 — Onboarding "Tour Flora 30s"
8. **`src/components/onboarding/FloraTour.tsx`** — overlay 4 steps com Flora resolvendo questão exemplo de matemática (animação de digitação + resultado). Trigger no fim do onboarding atual. Skip button. Marca `flora_tour_seen` no localStorage.

## Etapa 4 — Features de estudo
9. **Simulado adaptativo semanal** — nova rota `/simulado-semanal`:
   - Edge function `weekly-adaptive-quiz` que lê `weak_topics` do usuário (já existe análise) e gera 10 questões via Lovable AI.
   - UI com cronômetro, 1 questão por vez, relatório final.
   - Card no dashboard "Simulado da semana" (toda segunda).
10. **"Explica essa foto"** — em `src/pages/Banco.tsx` (ou nova `/explica-foto`):
    - Botão "Tirar foto do exercício".
    - Reusa OCR do notebook + envia para Flora resolver passo a passo (chat existente).
11. **Modo prova ENEM** — nova rota `/simulado-enem`:
    - 180 questões, 5h30 timer, sem Flora.
    - Relatório final usando `predictENEM` existente → TRI estimada por área.
12. **Resumo em áudio do caderno** — botão "🎧 Ouvir resumo" no `NotebookEditor`:
    - Edge function gera resumo → TTS via Lovable AI (gemini audio) → player inline.

## Etapa 5 — Conteúdo curado
13. **Biblioteca de aulões** — tabela `curated_lessons` (matéria, tópico, conteúdo MD, video_url opcional). Seed inicial com 30 aulas (script). Página `/aulas` lista por matéria. Aulão sob demanda fica como fallback.
14. **Trilha "ENEM em 90 dias"** — tabela `study_tracks` + `track_checkins`. Página `/trilhas` com progresso diário e check-in da Flora.

## Detalhes técnicos por etapa

**Etapa 1**
```text
src/lib/logger.ts          (novo)
src/styles/focus.css       (novo, recortado de index.css)
src/main.tsx               (importa focus.css, SW flag)
src/App.tsx                (lazy KonvaDrawingCanvas/Aulao/CursoPlayer)
src/lib/floraClient.ts     (tipos)
src/lib/aiActivityStore.ts (tipos)
src/hooks/useFloraChatStream.ts (tipos)
+ substituição em massa de console.*
```

**Etapa 2**
```text
src/components/layout/BottomNav.tsx (novo)
src/components/Layout.tsx ou App.tsx (montar BottomNav)
src/lib/notifications.ts  (digest 19h, remover push por item)
```

**Etapas 3-5**: detalhes nos commits — cada uma com seu mini-relatório.

## Ordem de execução
Vou rodar **Etapa 1 + Etapa 2 + Etapa 3** agora (são as de menor risco e fundação). Depois confirmo com você antes de partir pras Etapas 4 e 5 (envolvem novas tabelas + edge functions + custo de IA).

## Relatório
Ao final de cada etapa envio:
- Arquivos tocados
- O que mudou no comportamento
- O que testar manualmente
