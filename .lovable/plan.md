## O que muda

### 1. Check-in da semana sai do dashboard

- Remover `FloraCheckpointCard` do topo da tela inicial (`src/pages/Index.tsx`).
- Disparar o check-in **apenas** quando o aluno fecha o cronômetro de foco e volta pra Home:
  - `StudyTimer` / `FocusModeOverlay` já emite evento ao encerrar sessão. No `Index`, ouvir esse evento e, se faz ≥ 3 dias que não fez check-in (`localStorage`), abrir o card como **modal leve** (Dialog) em vez de card fixo.
  - Se o aluno fechar sem responder, adiar por 24 h.
- Card continua salvando em `flora_checkpoints` — só muda o gatilho.

### 2. Minhas metas migra para Configurações

- Tirar `StudentGoalsCard` do dashboard.
- Em `/settings`, criar seção "Minhas metas" (accordion) reusando o card melhorado.
- Melhorias no card:
  - Ordenar por prioridade + prazo mais próximo.
  - Barra de progresso mais fina, sem números redundantes.
  - Filtro rápido: "ativas | pausadas | concluídas".
  - Botão "Sugerir com Flora" chama `flora-engine action: suggest_goals` e mostra sugestões inline pra aceitar/rejeitar em batch.
- Rota `/metas` continua acessível (deep-link do banner Flora), mas some do menu.

### 3. Flora entende metas

- Em `supabase/functions/flora-engine/index.ts`:
  - No `analyze_and_suggest`, carregar `student_goals_v2` ativas e incluir no contexto do prompt (título, prazo, progresso).
  - Sistema-prompt do chat (`flora-chat`) recebe bloco `METAS_ATUAIS` para citá-las naturalmente quando o aluno perguntar "o que estudar".
  - Ao detectar objetivo novo no chat (ex.: "quero passar em X"), Flora propõe `create_goals` via decisão (já existe o handler no banner).

### 4. Cronograma semanal — reverter mobile

- Em `WeeklySchedule.tsx`:
  - Voltar o painel inteiro arrastável (horizontal scroll com gesto, como estava antes), remover a versão com abas/dias colapsados.
  - Ícone de check concluído: trocar `CheckCircle2 w-6 h-6` cheio por um traço fino (`Check w-3.5 h-3.5` dentro de um dot 16×16), estilo minimalista.
  - Manter drag entre slots no desktop.

### 5. Limpeza geral do projeto

Candidatos a remover / consolidar:

- **`QuickStartChecklist`** — só aparece em onboarding, hoje duplicado com `FloraFirstAction`. Manter só um.
- **`MotivationalQuote`** — ruído visual, não gera ação. Remover do dashboard.
- **`SyncStatusCard`** — status técnico de dev, esconder atrás de config avançada.
- **`RewardsPanel`** vs **`GamificationCard`** — sobreposição. Fundir num só card.
- **`DashboardCustomizer`** — poucos usam; mover pra `/settings` como "Layout da tela inicial".
- **`AdminCachePanel`**, **`OfflineManager`** no dashboard normal — só para admin/PWA settings.
- Rotas duplicadas em `App.tsx`: `/metas` (some do menu mas fica), `/flora` fica.
- Consolidar `StudentGoalsCard` (novo) e `StudyGoalsCard` (antigo, horas semanais) — o antigo vira uma stat em Análise.
- `WeeklySummaryCard` + `WeeklyRevisionSummary` + `DetailedProgressReport` → só um "Resumo da semana" no dashboard.

## Detalhes técnicos

- Evento do timer: usar `window.dispatchEvent(new CustomEvent("focus-session-ended"))` já emitido; no `Index`, `useEffect` escuta e abre `<Dialog>` com o `FloraCheckpointCard`.
- Cooldown check-in: chave `flora:checkin:lastPrompt` (localStorage), 24 h após dismiss, 7 dias após submit.
- `suggest_goals` já existe na edge function — só ligar o botão do card.
- Realtime + debounce das metas já estão prontos — nenhuma nova migração.

## Fora de escopo

- Push notifications de milestone (só toast por ora).
- Nova página `/flora` — mantida como está.
- Alteração de cores, fontes ou identidade visual.

## Ordem de execução

1. Cronograma mobile (revert + ícone) — visual, isolado.
2. Remover check-in do dashboard + gatilho no fim do timer.
3. Mover metas pra Settings + melhorias no card.
4. Flora ler metas no chat + analyze_and_suggest.
5. Enxugue: remover/mover MotivationalQuote, SyncStatusCard, DashboardCustomizer, fundir Rewards/Gamification.

Confirma pra eu tocar? Se quiser tirar ou trocar qualquer item da lista de limpeza (item 5), me diz antes.