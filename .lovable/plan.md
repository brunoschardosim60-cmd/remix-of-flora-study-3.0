# Quiz Battle — estilo Kahoot

Quiz ao vivo onde o host cria a sala, gera um **código de 6 caracteres**, e os amigos entram pelo código. Todos respondem cada pergunta ao mesmo tempo, com cronômetro, e o ranking atualiza em tempo real ao fim de cada rodada.

## Escopo desta entrega

- **Modo**: tempo real (lobby + código).
- **Origem das perguntas**: as 3 — Banco de Questões, criadas pelo host, ou geradas pela Flora (IA).
- **Pontos de entrada**: aba "Quiz Battle" em `/comunidade` **e** botão dentro de cada grupo em `/grupos/:id`.
- **Limites**: até 30 jogadores por sala, 5–20 perguntas, 20s por pergunta (default).

## Fluxos

```text
HOST                                    JOGADOR
─────                                   ────────
1. "Criar Quiz Battle"
2. Escolhe origem das perguntas
   ├─ Banco: filtra matéria/tema
   ├─ Manual: escreve N perguntas
   └─ Flora: tema → gera 10
3. Vê código (ex.: 7K3MQ2) + QR        1. "Entrar em quiz" → digita código
4. Espera lobby encher                  2. Aparece na lista do lobby
5. "Começar"                            3. Tela conta 3..2..1
6. Pergunta 1 (20s) ── todos respondem ──
7. Mostra resposta certa + ranking parcial
   ... repete ...
8. Tela final: pódio top 3 + ranking completo
```

## Modelo de dados (novas tabelas)

- **quiz_battles**: estado da sala — host, código, status (`lobby` | `running` | `finished`), origem, pergunta atual, momento da próxima virada, vínculo opcional a `study_groups.id`.
- **quiz_battle_questions**: perguntas da sala (enunciado, alternativas, índice correto, ordem).
- **quiz_battle_players**: jogadores no lobby (nome, score acumulado, joined_at).
- **quiz_battle_answers**: resposta de cada jogador em cada pergunta (escolha, tempo de resposta, pontos).

RLS:
- Qualquer um autenticado pode ler uma sala pelo código (para entrar no lobby).
- Só o host edita a sala e dispara perguntas.
- Jogador só insere/lê suas próprias respostas; ranking é uma view agregada.

Realtime habilitado em `quiz_battles`, `quiz_battle_players`, `quiz_battle_answers` para sincronizar lobby, virada de pergunta e ranking.

## Edge function `quiz-battle`

Centraliza ações sensíveis em um único endpoint com validação:
- `create` — gera código único, cria sala + perguntas (chama `generate-questions` quando origem = Flora).
- `join` — adiciona jogador no lobby.
- `start` — host marca `running`, cronômetro começa.
- `next` — host avança pergunta, calcula pontos (base + bônus por velocidade).
- `answer` — jogador registra resposta (servidor valida tempo).
- `finish` — fecha sala e congela ranking.

## UI (mantém o design system atual)

Rotas/componentes novos:
- `src/pages/QuizBattleHost.tsx` — criação + tela do host (lobby, "Começar", controle de virada).
- `src/pages/QuizBattlePlay.tsx` — tela do jogador (4 botões grandes coloridos estilo Kahoot, contador, score).
- `src/pages/QuizBattleJoin.tsx` — entrada por código.
- `src/components/community/QuizBattleTab.tsx` — aba "Quiz Battle" em `/comunidade` listando salas abertas + botão criar/entrar.
- Botão "Criar Quiz Battle" no header de cada `/grupos/:id` que já vincula o `group_id`.

Sem mudanças de paleta/tipografia — só usa tokens existentes.

## Itens explicitamente fora desta entrega

- Modo assíncrono (desafio por link). Pode entrar depois.
- Power-ups, temas visuais customizados, vídeos de fundo.
- Salas privadas com senha extra (o código já é a barreira).

## Ordem de implementação

1. Migration: tabelas + RLS + realtime.
2. Edge function `quiz-battle`.
3. Páginas Host / Join / Play.
4. Aba em `/comunidade` e botão em `/grupos/:id`.
5. Teste manual rápido com 2 abas (host + jogador).
