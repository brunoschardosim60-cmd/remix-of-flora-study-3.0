# Plano: auditoria de mensagens + refactors

Tudo isso em 1 turno vira monstrengo e quebra o app. Proponho 4 fases, validando cada uma antes da próxima.

## Fase 1 — Auditoria de mensagens repetidas (1 turno)

Hoje várias mensagens disparam toda vez que o aluno volta ao dashboard:
- `DashboardHero` — "Você está no ritmo / fora do ritmo"
- `StudyCoachPanel` — sugestões da Flora
- `TodayRevisions` / `OverdueRevisions` — toasts de revisão
- `FloraFirstAction` — banner inicial
- Resumo diário da Flora (já tem guarda por dia, mas outros não têm)

Vou:
1. Mapear cada disparo (toast, banner, modal).
2. Criar `src/lib/messageDedup.ts` com chave por dia/usuário/tipo em `localStorage`.
3. Aplicar guarda "mostrar 1x por dia" nos pontos que fazem sentido (ritmo, sugestões repetidas).
4. Manter como "sempre" só os que são state real (ex.: revisões pendentes que mudam).

## Fase 2 — Lazy-load por rota (1 turno)

`src/App.tsx` carrega tudo eager. Vou converter rotas pesadas para `React.lazy` + `Suspense`:
- `NotebookEditor`, `Aulao`, `CursoPlayer`, `Redacao`, `SimuladoEnem`, `BancoQuestoes`, `Admin`, `Analise`.
Mantém eager: `Index`, `Auth`, `Onboarding` (críticos).

## Fase 3 — Refactor `flora-engine` (2 turnos)

`supabase/functions/flora-engine/index.ts` está gigante. Vou splitar em handlers sem mudar contrato externo:

```text
supabase/functions/flora-engine/
  index.ts                 (router por action)
  handlers/
    chat.ts                (recommend, save_chat, load_chat)
    quiz.ts                (generate_quiz)
    flashcards.ts          (generate_flashcards)
    lesson.ts              (skeleton + block + study_now*)
    decisions.ts           (decide_next_topic, log_action)
  _shared/auth.ts          (extrair user_id do JWT)
```

Cada handler recebe `{ user, supabase, data }` e retorna `Response`. Zero mudança no cliente.

## Fase 4 — Workbox PWA offline-first + testes de [AÇÃO:] (1-2 turnos)

- Trocar `public/sw.js` artesanal por `vite-plugin-pwa` com `generateSW`, guarda anti-preview, kill-switch `?sw=off`. NetworkFirst pra HTML, CacheFirst pra assets hashed, runtime cache pro caderno.
- Testes Vitest pra `parseFloraActions` + dispatch de `[AÇÃO:quiz]`, `[AÇÃO:flashcards]`, `[AÇÃO:cronograma]`, `[AÇÃO:pomodoro]`.

## Pergunta

Aprova começarmos pela **Fase 1 (auditoria de mensagens)**? É a que o aluno sente na hora e a mais rápida. Depois eu sigo na ordem, validando cada fase com você.
